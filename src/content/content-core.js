/**
 * Mindful Social Media Tracker - Content Main (Entry Point)
 * Tổng hợp và điều phối tất cả các modules: Tracker, HUD, Friction, Pomodoro, KeywordFilter
 * Chỉ chạy trên top-level window và chỉ trên youtube.com / facebook.com
 */

import { loadAppData, saveDayData, getTodayKey } from "../utils/storage.js";
import { Tracker } from "./modules/tracker.js";
import { HUDManager } from "./modules/hud.js";
import { FrictionManager } from "./modules/friction.js";
import { PomodoroManager } from "./modules/pomodoro.js";
import { PetEngine } from "./modules/pet-engine.js";

// ─── Guard: chỉ chạy top-level window ────────────────────────────────────────
if (window.top !== window) {
  throw new Error("Mindful Tracker: skipping iframe");
}

const hostname = window.location.hostname;
const isYT = hostname.includes("youtube.com");
const isFB = hostname.includes("facebook.com");
if (!isYT && !isFB) throw new Error("Mindful Tracker: unsupported platform");

const platformKey = isYT ? "youtube" : "facebook";

// ─── Hook SPA Navigation (pushState / replaceState / popstate) ───────────────
(function hookHistory() {
  const originalPush = history.pushState;
  history.pushState = function (...args) {
    const ret = originalPush.apply(this, args);
    window.dispatchEvent(new Event("mindful-location-change"));
    return ret;
  };

  const originalReplace = history.replaceState;
  history.replaceState = function (...args) {
    const ret = originalReplace.apply(this, args);
    window.dispatchEvent(new Event("mindful-location-change"));
    return ret;
  };

  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("mindful-location-change"));
  });
})();

// ─── State (shared across modules) ───────────────────────────────────────────
let appConfig = null;
let dayData = null;
let pomodoroManager = null;
let tracker = null;
let hud = null;
let friction = null;
let petEngine = null;
let isReady = false;
let currentFocusMode = "music";
const triggeredMilestones = { m1: false, m2: false, m3: false };

// ─── Toast helper (ưu tiên hiển thị Pet Toast sinh động) ─────────────────────
function showToast(msg, durationMs = 4000) {
  if (petEngine && typeof petEngine.showPetToast === "function") {
    petEngine.showPetToast(msg, { duration: durationMs, title: "Linh vật nhắc nhở" });
    return;
  }
  let toast = document.getElementById("mindful-toast-notify");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mindful-toast-notify";
    toast.style.cssText = `
      position:fixed!important; top:24px!important; left:50%!important;
      transform:translateX(-50%)!important; z-index:2147483647!important;
      background:rgba(15,23,32,0.96)!important; color:#F8FAFC!important;
      padding:12px 22px!important; border-radius:30px!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
      font-size:13px!important; font-weight:600!important;
      box-shadow:0 10px 35px rgba(0,0,0,0.6)!important;
      backdrop-filter:blur(12px)!important; border:1.5px solid #8B5CF6!important;
      transition:all 0.3s ease!important; opacity:0; pointer-events:none!important;
    `;
    (document.body || document.documentElement).appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.opacity = "1";
  setTimeout(() => { if (toast) toast.style.opacity = "0"; }, durationMs);
}

// ─── Tính ngưỡng từ config riêng theo từng nền tảng ─────────────────────────
function getThresholds() {
  const thresh = appConfig?.thresholds || {};
  return {
    youtube: {
      shorts: {
        m1: Number(thresh.youtube?.shorts?.m1 ?? thresh.shorts?.m1 ?? 15),
        m2: Number(thresh.youtube?.shorts?.m2 ?? thresh.shorts?.m2 ?? 30),
        m3: Number(thresh.youtube?.shorts?.m3 ?? thresh.shorts?.m3 ?? 45)
      },
      long: {
        m1: Number(thresh.youtube?.long?.m1 ?? thresh.long?.m1 ?? 3),
        m2: Number(thresh.youtube?.long?.m2 ?? thresh.long?.m2 ?? 5),
        m3: Number(thresh.youtube?.long?.m3 ?? thresh.long?.m3 ?? 8)
      }
    },
    facebook: {
      reels: {
        m1: Number(thresh.facebook?.reels?.m1 ?? thresh.shorts?.m1 ?? 15),
        m2: Number(thresh.facebook?.reels?.m2 ?? thresh.shorts?.m2 ?? 30),
        m3: Number(thresh.facebook?.reels?.m3 ?? thresh.shorts?.m3 ?? 45)
      },
      feeds: {
        m1: Number(thresh.facebook?.feeds?.m1 ?? 20),
        m2: Number(thresh.facebook?.feeds?.m2 ?? 40),
        m3: Number(thresh.facebook?.feeds?.m3 ?? 60)
      },
      long: {
        m1: Number(thresh.facebook?.long?.m1 ?? thresh.long?.m1 ?? 2),
        m2: Number(thresh.facebook?.long?.m2 ?? thresh.long?.m2 ?? 4),
        m3: Number(thresh.facebook?.long?.m3 ?? thresh.long?.m3 ?? 6)
      }
    }
  };
}

// ─── Chế Độ Đen Trắng (Grayscale Demotivation Mode) ─────────────────────────
function injectGrayscaleStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("mindful-grayscale-style")) return;
  const style = document.createElement("style");
  style.id = "mindful-grayscale-style";
  style.textContent = `
    html.mindful-grayscale-active {
      filter: grayscale(100%) !important;
      transition: filter 0.5s ease-in-out !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function evaluateGrayscaleMode() {
  if (!isReady || !appConfig) return;
  injectGrayscaleStyle();

  const htmlEl = document.documentElement;

  // Kỷ luật tối cao: Năng lượng Pet cạn kiệt (< 15⚡) -> LUÔN CƯỠNG CHẾ ĐEN TRẮNG
  const isPetExhausted = petEngine ? petEngine.isCriticalEnergy() : false;
  if (isPetExhausted) {
    if (!htmlEl.classList.contains("mindful-grayscale-active")) {
      htmlEl.classList.add("mindful-grayscale-active");
    }
    return;
  }

  // Nếu người dùng chọn Chế độ Học tập (Study Focus): Màn hình LUÔN GIỮ MÀU (Full Color)
  // để người dùng đọc tài liệu, xem slide bài giảng, code, hình ảnh học tập
  if (currentFocusMode === "study") {
    if (htmlEl.classList.contains("mindful-grayscale-active")) {
      htmlEl.classList.remove("mindful-grayscale-active");
    }
    return;
  }

  // (a) Đang trong Mode Làm việc với Âm nhạc (Music Focus) hoặc Pomodoro Focus
  const isPomodoroFocus = pomodoroManager?.isFocusSession || false;
  const isMusicFocus = currentFocusMode === "music";

  // (b) Vượt Mốc cảnh báo 2 (theo nền tảng hiện tại)
  const threshData = getThresholds();
  let currentCount = 0;
  let m2Limit = 30;

  if (isYT) {
    if (location.pathname.startsWith("/shorts")) {
      currentCount = dayData?.youtube?.shortVideos?.totalSwipes || 0;
      m2Limit = threshData.youtube.shorts.m2;
    } else {
      currentCount = dayData?.youtube?.longVideos?.totalWatched || 0;
      m2Limit = threshData.youtube.long.m2;
    }
  } else if (isFB) {
    if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
      currentCount = dayData?.facebook?.longVideos?.totalWatched || 0;
      m2Limit = threshData.facebook.long.m2;
    } else if (location.pathname.includes("/reel")) {
      currentCount = dayData?.facebook?.reels?.totalSwipes || 0;
      m2Limit = threshData.facebook.reels.m2;
    } else {
      currentCount = dayData?.facebook?.summary?.feedPostsScrolled || 0;
      m2Limit = threshData.facebook.feeds.m2;
    }
  }
  const isOverM2 = currentCount >= m2Limit;

  // (c) Khung giờ ban đêm sau 22h30 hoặc trước 05h00 sáng
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const isLateNight = currentMins >= (22 * 60 + 30) || currentMins < (5 * 60);

  const shouldGrayscale = isMusicFocus || isPomodoroFocus || isOverM2 || isLateNight;

  if (shouldGrayscale) {
    if (!htmlEl.classList.contains("mindful-grayscale-active")) {
      htmlEl.classList.add("mindful-grayscale-active");
    }
  } else {
    if (htmlEl.classList.contains("mindful-grayscale-active")) {
      htmlEl.classList.remove("mindful-grayscale-active");
    }
  }
}

// ─── Kiểm tra friction trigger & cảnh báo phân tầng ─────────────────────────
function onAction() {
  evaluateGrayscaleMode();

  // Không kích hoạt friction khi đang Break Session
  if (pomodoroManager?.isBreakSession) return;

  const threshData = getThresholds();
  let currentCount = 0;
  let currentLimits = { m1: 15, m2: 30, m3: 45 };
  let unitLabel = "lượt lướt";

  if (isYT) {
    if (location.pathname.startsWith("/shorts")) {
      currentCount = dayData.youtube.shortVideos.totalSwipes || 0;
      currentLimits = threshData.youtube.shorts;
      unitLabel = "lượt Shorts";
    } else {
      currentCount = dayData.youtube.longVideos.totalWatched || 0;
      currentLimits = threshData.youtube.long;
      unitLabel = "video dài";
    }
  } else if (isFB) {
    if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
      currentCount = dayData.facebook.longVideos?.totalWatched || 0;
      currentLimits = threshData.facebook.long;
      unitLabel = "video";
    } else if (location.pathname.includes("/reel")) {
      currentCount = dayData.facebook.reels.totalSwipes || 0;
      currentLimits = threshData.facebook.reels;
      unitLabel = "lượt Reels";
    } else {
      currentCount = dayData.facebook.summary.feedPostsScrolled || 0;
      currentLimits = threshData.facebook.feeds;
      unitLabel = "bài viết Feed";
    }
  }

  // Reset cờ cảnh báo nếu count quay về 0 (xóa dữ liệu ngày)
  if (currentCount === 0) {
    triggeredMilestones.m1 = false;
    triggeredMilestones.m2 = false;
    triggeredMilestones.m3 = false;
  }

  // Cảnh báo nhẹ Mốc 1 (Pet Center Toast + Phạt 5⚡)
  if (currentCount >= currentLimits.m1 && !triggeredMilestones.m1 && petEngine) {
    triggeredMilestones.m1 = true;
    petEngine.penalize(5, "milestone_1");
    petEngine.showPetToast(
      `Bạn đã xem <b>${currentCount} ${unitLabel}</b> (Chạm Mốc 1). Hãy giữ tỉnh táo nhé! <b style="color:#F87171;">(-5⚡)</b>`,
      { title: "⚠️ Cảnh Báo Mốc 1 (M1)" }
    );
  }

  // Cảnh báo lớn Mốc 2 (Pet Center Modal + Phạt 10⚡)
  if (currentCount >= currentLimits.m2 && !triggeredMilestones.m2 && petEngine) {
    triggeredMilestones.m2 = true;
    petEngine.penalize(10, "milestone_2");
    petEngine.showPetCenterModal({
      title: "⚠️ Cảnh Báo Mốc 2 (M2)!",
      message: `Bạn đã lướt tới <b>${currentCount} ${unitLabel}</b> <b style="color:#F87171;">(-10⚡)</b>. Chế độ Đen Trắng đã kích hoạt để giảm kích thích dopamine. Bạn có muốn dừng lại để bảo vệ năng lượng Pet?`,
      actions: [
        {
          label: "🛑 Đóng Tab Ngay",
          primary: true,
          onClick: () => {
            if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" }, (res) => { if (!res || !res.ok) window.close(); });
            } else { window.close(); }
          }
        },
        {
          label: "Tôi hiểu rồi",
          onClick: (e, modal) => modal.remove()
        }
      ]
    });
  }

  // Mốc 3: Hard Friction Overlay với Box Breathing 12s + Phạt 20⚡
  friction.checkAndTrigger(currentCount, currentLimits.m3, unitLabel);

  if (currentCount >= currentLimits.m3 && !triggeredMilestones.m3 && petEngine) {
    triggeredMilestones.m3 = true;
    petEngine.penalize(20, "milestone_3");
  }
}

// ─── Update HUD & Grayscale ───────────────────────────────────────────────────
function onUpdate() {
  if (!isReady || !hud) return;
  hud.update(pomodoroManager?.isBreakSession || false);
  evaluateGrayscaleMode();
}

// ─── Xử lý route thay đổi ────────────────────────────────────────────────────
function onRouteChanged() {
  if (!isReady) return;
  const path = location.pathname;
  const targetKeywords = appConfig?.targetKeywords || [];

  if (isYT) {
    if (path.startsWith("/shorts")) {
      tracker.endYTLongVideo(targetKeywords);
      friction.showIntentModal();
      const match = path.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      const shortId = match ? match[1] : path;
      tracker.handleYTShorts(shortId);
    } else if (path === "/watch") {
      const params = new URLSearchParams(location.search);
      const videoId = params.get("v");
      if (videoId) tracker.startYTLongTracking(videoId, targetKeywords);
    } else {
      tracker.endYTLongVideo(targetKeywords);
    }
  }

  if (isFB) {
    const isFBReel = path.includes("/reel/") || path.includes("/reels/");
    if (isFBReel) {
      friction.showIntentModal();
      const match = path.match(/\/reels?\/([a-zA-Z0-9_-]+)/);
      const reelId = match ? match[1] : path;
      tracker.handleFBReel(reelId);
    }
    if (path === "/" || path === "") {
      friction.showIntentModal();
      tracker.attachFBFeedPosts();
    }
  }

  onUpdate();
}

// ─── Dev Test Mode Callbacks & Handlers ───────────────────────────────────────
function createDevCallbacks() {
  return {
    setEnergy: (val) => {
      if (!petEngine) return;
      petEngine.energy = val;
      petEngine._updateMood();
      petEngine._saveState();
      evaluateGrayscaleMode();
      onUpdate();
      showToast(`⚡ Dev: Đã chỉnh năng lượng Pet: ${val}%`, 2000);
    },
    expireSession: () => {
      let sess = null;
      try {
        const raw = sessionStorage.getItem("mindful_session");
        if (raw) sess = JSON.parse(raw);
      } catch (_) {}

      if (!sess) {
        sess = {
          goal: "Dev Test Goal",
          durationMinutes: 5,
          startTime: Date.now() - (6 * 60 * 1000),
          extensionsCount: 0,
          expiredNotified: false
        };
      } else {
        sess.startTime = Date.now() - (sess.durationMinutes * 60 * 1000 + 1000);
        sess.expiredNotified = false;
      }
      sessionStorage.setItem("mindful_session", JSON.stringify(sess));
      friction?.checkSessionTimer(petEngine);
      onUpdate();
      showToast("⏱️ Dev: Đã kích hoạt hết giờ phiên lướt!", 2000);
    },
    openIntent: () => {
      friction?.showIntentModal();
    },
    triggerMilestone: (type) => {
      if (type === "m1") {
        petEngine?.showPetToast(
          "⚠️ Bạn đã xem <b>15 lượt video liên tục</b> (Chạm Mốc 1). Hãy giữ tỉnh táo và cho mắt nghỉ ngơi nhé!",
          { title: "Cảnh Báo Mốc 1 (M1)" }
        );
      } else if (type === "m2") {
        petEngine?.showPetCenterModal({
          title: "⚠️ Cảnh Báo Mốc 2 (M2)!",
          message: `Bạn đã lướt tới Mốc 2 (60 phút / 30 video). Chế độ Đen Trắng (Grayscale) đã được kích hoạt để giảm kích thích dopamine. Bạn có muốn dừng lại để bảo vệ năng lượng Pet?`,
          actions: [
            {
              label: "🛑 Đóng Tab Ngay",
              danger: true,
              onClick: () => {
                if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
                  chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" }, (res) => { if (!res || !res.ok) window.close(); });
                } else { window.close(); }
              }
            },
            {
              label: "Tôi hiểu rồi (-10⚡)",
              primary: true,
              onClick: (e, modal) => {
                petEngine?.penalize(10, "milestone_2");
                modal.remove();
              }
            }
          ]
        });
      } else if (type === "m3") {
        if (petEngine) petEngine.penalize(20, "milestone_3");
        friction?.showHardFriction(45, 45, "lượt lướt");
      } else if (type === "f5") {
        petEngine?.showPetToast(
          "🔄 Bạn đang bấm F5 liên tục tìm dopamine mới. Hãy hít một hơi thật sâu và thư giãn một chút nào!",
          { title: "Dopamine Reload Spam" }
        );
      }
    },
    setStreak: (days) => {
      if (!petEngine) return;
      petEngine.currentStreak = days;
      petEngine.streakDays = days;
      petEngine.lastStreakDate = getTodayKey();
      petEngine._saveState();

      chrome.storage.local.get(["petAccessories"], (res) => {
        const accessories = res.petAccessories || { unlockedItems: [], equipped: { head: null, body: null } };
        const unlocked = new Set(accessories.unlockedItems || []);
        if (days >= 3) unlocked.add("sunglasses");
        else unlocked.delete("sunglasses");
        if (days >= 7) unlocked.add("laurel");
        else unlocked.delete("laurel");
        accessories.unlockedItems = Array.from(unlocked);
        chrome.storage.local.set({ petAccessories: accessories });
      });

      onUpdate();
      showToast(`🔥 Dev: Đã cập nhật streak ${days} ngày!`, 2000);
    },
    openReflection: () => {
      chrome.runtime.sendMessage({ type: "TRIGGER_DEV_REFLECTION" });
    },
    resetData: () => {
      chrome.runtime.sendMessage({ type: "RESET_DEV_DATA" }, () => {
        showToast("✓ Dev: Đã khôi phục dữ liệu gốc! Đang tải lại trang...", 2000);
        setTimeout(() => location.reload(), 1000);
      });
    }
  };
}

// ─── Lắng nghe lệnh từ Popup Dev Test Mode ────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  const callbacks = createDevCallbacks();
  if (req.type === "DEV_EXPIRE_SESSION") {
    callbacks.expireSession();
    sendResponse({ ok: true });
    return true;
  }
  if (req.type === "DEV_OPEN_INTENT") {
    callbacks.openIntent();
    sendResponse({ ok: true });
    return true;
  }
  if (req.type === "DEV_TRIGGER_MILESTONE") {
    callbacks.triggerMilestone(req.milestone);
    sendResponse({ ok: true });
    return true;
  }
});

// ─── Lắng nghe thay đổi storage (từ popup) ───────────────────────────────────
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  const todayKey = getTodayKey();
  if (changes[todayKey]?.newValue) {
    const remote = changes[todayKey].newValue;
    if (isYT && remote.youtube) dayData.youtube = remote.youtube;
    else if (isFB && remote.facebook) dayData.facebook = remote.facebook;
    onUpdate();
  }

  if (changes.app_config?.newValue) {
    appConfig = Object.assign({}, appConfig, changes.app_config.newValue);
    if (pomodoroManager && appConfig.pomodoro) {
      pomodoroManager.updateConfig(appConfig.pomodoro);
    }
    onUpdate();
  }

  if (changes.pomodoro_state?.newValue) {
    if (pomodoroManager) {
      pomodoroManager.state = changes.pomodoro_state.newValue;
      onUpdate();
    }
  }

  if (changes.focus_mode_type !== undefined) {
    currentFocusMode = changes.focus_mode_type.newValue || "music";
    if (hud) hud.setFocusMode(currentFocusMode);
    evaluateGrayscaleMode();
    onUpdate();
  }

  if (changes.dev_mode_enabled !== undefined) {
    if (hud) {
      hud.setDevMode(!!changes.dev_mode_enabled.newValue, createDevCallbacks());
      hud.update();
    }
  }

  if (changes.petState?.newValue || changes.pet_state?.newValue) {
    const newPet = changes.petState?.newValue || changes.pet_state?.newValue;
    if (petEngine && newPet) {
      petEngine.energy = newPet.energy ?? petEngine.energy;
      petEngine.mood = newPet.mood ?? petEngine.mood;
      petEngine.currentStreak = newPet.currentStreak ?? petEngine.currentStreak;
      petEngine.streakDays = newPet.streakDays ?? petEngine.streakDays;
      petEngine._renderPet();
      evaluateGrayscaleMode();
      onUpdate();
    }
  }
});

// ─── KHỞI TẠO ────────────────────────────────────────────────────────────────
loadAppData(({ config, dayData: loaded, hudPosition, pomodoroState }) => {
  appConfig = config;
  dayData = loaded;

  // Khởi tạo Pet Engine & Cơ chế Hồi năng lượng Offline (Digital Detox)
  petEngine = new PetEngine();
  petEngine.checkIdleRecovery();

  // Khởi tạo Friction Manager & liên kết Pet Engine
  friction = new FrictionManager({
    getConfig: () => appConfig,
    onToast: showToast
  });
  friction.setPetEngine(petEngine);

  // Lắng nghe thay đổi trạng thái Pet để cập nhật Grayscale ngay lập tức khi Pet kiệt sức (<15⚡)
  petEngine.onStateChange = () => {
    evaluateGrayscaleMode();
    onUpdate();
  };

  // Khởi tạo HUD Manager & Gắn bộ chuyển Mode (Âm nhạc ↔ Học tập)
  hud = new HUDManager({
    dayData,
    platformKey,
    isYT,
    isFB,
    getThresholds,
    getPomodoroLabel: () => pomodoroManager?.getStatusLabel() || null,
    petEngine,
    onFocusModeToggle: (newMode) => {
      currentFocusMode = newMode;
      chrome.storage.local.set({ focus_mode_type: newMode });
      evaluateGrayscaleMode();
      onUpdate();
      showToast(
        newMode === "music"
          ? "🎵 Mode Nhạc: Màn hình Đen Trắng, video nhạc tính thống kê riêng"
          : "📚 Mode Học: Màn hình màu, hỏi mục tiêu bài học sau 10s xem",
        3500
      );
    }
  });

  if (hudPosition?.top && hudPosition?.left) {
    hud.applyPosition(hudPosition.top, hudPosition.left);
  }

  // Khởi tạo trạng thái Focus Mode & Dev Mode từ storage
  chrome.storage.local.get(["dev_mode_enabled", "focus_mode_type"], (res) => {
    if (res.focus_mode_type) {
      currentFocusMode = res.focus_mode_type;
      if (hud) hud.setFocusMode(currentFocusMode);
    }
    if (hud) {
      hud.setDevMode(!!res.dev_mode_enabled, createDevCallbacks());
      hud.update();
    }
    evaluateGrayscaleMode();
  });

  // Khởi tạo Pomodoro Manager
  pomodoroManager = new PomodoroManager({
    config,
    state: pomodoroState,
    onUpdate: () => {
      onUpdate();
      if (pomodoroManager?.isBreakSession) {
        petEngine?.reward(15, "pomodoro_complete");
      }
    }
  });
  pomodoroManager.start();

  // Khởi tạo Tracker tích hợp Chế độ Nhạc & Chế độ Học
  tracker = new Tracker({
    dayData,
    platformKey,
    isYT,
    isFB,
    onUpdate,
    onAction,
    getFocusMode: () => currentFocusMode,
    onStudyCheckInNeeded: (videoId, videoTitle) => {
      if (currentFocusMode !== "study") return;
      friction.showStudyCheckInModal(
        videoTitle,
        (intent) => {
          if (!dayData.studyVideoLogs) dayData.studyVideoLogs = [];
          dayData.studyVideoLogs.push({
            id: videoId,
            title: videoTitle,
            userIntent: intent,
            timestamp: Date.now()
          });
          saveDayData(dayData, "youtube", true);
          petEngine?.reward(5, "study_intent_declared");
          showToast(`🎯 Mục tiêu: "${intent}". Đã thưởng +5⚡!`, 3500);
          onUpdate();
        },
        () => {
          petEngine?.penalize(10, "study_distraction");
          showToast("⚠️ Video không phục vụ mục tiêu học tập. Đã trừ 10⚡!", 3500);
          onUpdate();
        }
      );
    },
    onImpulsive: (reason) => {
      petEngine?.penalize(reason === "reload_spam" ? 5 : 20, reason);
    },
    onUseful: () => {
      petEngine?.reward(10, "useful_video");
    }
  });

  tracker.startActivityTracking();
  tracker.checkPageReload();
  tracker.setupHomeClickDetection();

  if (isFB) tracker.setupFBFeedObserver();

  isReady = true;
  evaluateGrayscaleMode();
  setInterval(evaluateGrayscaleMode, 30000);

  // Đếm ngược phiên lướt và cập nhật HUD định kỳ mỗi 5s
  setInterval(() => {
    friction?.checkSessionTimer(petEngine);
    onUpdate();
  }, 5000);

  // Ghi nhận mốc hoạt động mỗi 60s để tính Digital Detox Idle Recovery
  setInterval(() => {
    chrome.storage.local.set({ lastActiveTimestamp: Date.now() });
  }, 60000);

  onRouteChanged();
});

// ─── SPA Navigation Listeners ─────────────────────────────────────────────────
window.addEventListener("mindful-location-change", onRouteChanged);

if (isYT) {
  window.addEventListener("yt-navigate-finish", onRouteChanged);
}

// Fallback MutationObserver cho các SPA không dùng pushState đầy đủ
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onRouteChanged();
  } else if (isFB && (location.pathname === "/" || location.pathname === "")) {
    tracker?.attachFBFeedPosts();
  }
});

urlObserver.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true
});

window.addEventListener("popstate", onRouteChanged);

// ─── Cleanup khi đóng / chuyển tab ───────────────────────────────────────────
const doFlush = () => {
  chrome.storage.local.set({ lastActiveTimestamp: Date.now() });
  tracker?.flush(appConfig?.targetKeywords || []);
};

window.addEventListener("beforeunload", doFlush);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) doFlush();
});
