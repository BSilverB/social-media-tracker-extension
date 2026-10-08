/**
 * Mindful Social Media Tracker - Service Worker (Background Module)
 * Quản lý: Gemini API Client, Bộ lọc 2 lớp & Cache, Tự tiến hóa từ khóa,
 * AI Reflection Coach, Nén Persona đường dài, Gamification Pet & Streak.
 */

import {
  testGeminiApiKey,
  classifyVideoTitle,
  extractSuggestedKeywords,
  generateReflectionCoach,
  generateLongtermReflectionCoach,
  generateChibiPetSprites
} from "./gemini-client.js";

import {
  queueDesktopSyncToFirebase,
  pushDataToFirebase,
  pushConfigToFirebase,
  pushKeywordsWithCloudMerge,
  getFirebaseSyncSettings,
  startFirebaseRealtimeStream
} from "../utils/firebase-service.js";

// ─── Khởi tạo & Alarms ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  setupDailyReflectionAlarm();
  setupDailyMidnightCleanupAlarm();
  cleanOldDaysAndCompressLogs();
  initDefaultState();
});

chrome.runtime.onStartup.addListener(() => {
  setupDailyReflectionAlarm();
  setupDailyMidnightCleanupAlarm();
  cleanOldDaysAndCompressLogs();
});

function initDefaultState() {
  const todayKey = getTodayDateKey();
  chrome.storage.local.get([
    "app_config",
    "pet_state",
    todayKey
  ], (res) => {
    const toSet = {};
    if (!res.app_config) {
      toSet.app_config = {
        syncCode: "MF-8924",
        auto_sync: true,
        masterGoal: "Muốn trở thành phiên bản tốt hơn để gặp người ấy",
        leisureQuotaMinutes: 45,
        geminiApiKey: "",
        emotionalAnchorImage: "",
        thresholds: {
          youtube: { shorts: { m1: 15, m2: 30, m3: 45 }, long: { m1: 3, m2: 5, m3: 8 } },
          facebook: { reels: { m1: 15, m2: 30, m3: 45 }, feeds: { m1: 20, m2: 40, m3: 60 }, long: { m1: 2, m2: 4, m3: 6 } },
          tiktok: { shorts: { m1: 15, m2: 30, m3: 45 } }
        },
        pomodoro: { enabled: false, focusMinutes: 25, breakMinutes: 5 },
        bedtime: { enabled: true, start: "22:30", end: "05:00" },
        reflection: { reminderTime: "22:00" },
        keywords: {
          target: ["lập trình", "tiếng anh", "kỹ năng", "sách", "học", "phát triển", "tài chính", "công nghệ"],
          leisure: ["hài", "game", "gaming", "streamer", "vlog", "ca nhạc", "nấu ăn"],
          distraction: ["drama", "bóc phốt", "hóng biến", "scandal", "cờ bạc", "giật gân"]
        },
        localPreferences: {
          hudPosition: { x: 20, y: 80 },
          grayscaleMode: "threshold_m2"
        }
      };
    }
    if (!res.pet_state) {
      toSet.pet_state = {
        energy: 100,
        mood: "happy",
        currentStreak: 1,
        streakDays: 1,
        lastPokeEnergyTime: 0,
        lastActiveTimestamp: Date.now(),
        mode: "default",
        accessories: {
          unlockedItems: ["sunglasses", "laurel"],
          equippedHead: null
        },
        puppetPhotos: { happy: "", neutral: "", sad: "" },
        aiSprites: { happy: "", neutral: "", sad: "" },
        userPersona: {
          totalTrackedDays: 0,
          streakRecord: 0,
          totalUsefulVideos: 0,
          avgUsefulPct: 0,
          vulnerabilities: [],
          strengths: [],
          history: []
        }
      };
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });
}

function setupDailyReflectionAlarm(forced = false) {
  chrome.storage.local.get(["app_config"], (res) => {
    const reminderTime = res.app_config?.reflection?.reminderTime || "22:00";
    const [targetH, targetM] = reminderTime.split(":").map(Number);
    const validH = isNaN(targetH) ? 22 : targetH;
    const validM = isNaN(targetM) ? 0 : targetM;

    chrome.alarms.get("daily-reflection", (existing) => {
      if (existing && !forced) return;

      const now = new Date();
      const nextTime = new Date();
      nextTime.setHours(validH, validM, 0, 0);

      if (now >= nextTime) {
        nextTime.setDate(nextTime.getDate() + 1);
      }

      const delayMinutes = Math.max(0.5, (nextTime.getTime() - now.getTime()) / (1000 * 60));

      chrome.alarms.clear("daily-reflection", () => {
        chrome.alarms.create("daily-reflection", {
          delayInMinutes: delayMinutes,
          periodInMinutes: 24 * 60
        });
        console.log(`[Mindful SW] Đã đặt alarm phản tư lúc ${validH.toString().padStart(2, "0")}:${validM.toString().padStart(2, "0")} (sau ${Math.round(delayMinutes)} phút)`);
      });
    });
  });
}

function setupDailyMidnightCleanupAlarm() {
  chrome.alarms.get("daily-midnight-cleanup", (existing) => {
    if (existing) return;
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0); // 00:00:05 ngày mai
    const delayMinutes = Math.max(0.5, (midnight.getTime() - now.getTime()) / (1000 * 60));
    chrome.alarms.create("daily-midnight-cleanup", {
      delayInMinutes: delayMinutes,
      periodInMinutes: 24 * 60
    });
    console.log(`[Mindful SW] Đã đặt alarm dọn dẹp lúc 00h00 (sau ${Math.round(delayMinutes)} phút)`);
  });
}

/**
 * Tự động nén và dọn dẹp danh sách video thô lúc 00h00
 * Sau khi tổng kết phản tư cuối ngày, dữ liệu chi tiết được nén thành bản tóm tắt
 * và xóa danh sách thô để nhẹ máy, bảo vệ dung lượng và tính riêng tư.
 */
function cleanOldDaysAndCompressLogs() {
  const todayKey = getTodayDateKey();
  chrome.storage.local.get(null, (allData) => {
    const toUpdate = {};
    for (const [key, value] of Object.entries(allData || {})) {
      if (key.startsWith("stats_") && key < todayKey && value && typeof value === "object") {
        if (Array.isArray(value.watchedVideos) && value.watchedVideos.length > 0) {
          let goalCount = 0;
          let leisureCount = 0;
          let distractionCount = 0;
          let unclassifiedCount = 0;
          const topGoals = [];

          value.watchedVideos.forEach(v => {
            const cat = v.category || "";
            if (cat === "Mục tiêu" || cat === "goal") {
              goalCount++;
              if (topGoals.length < 5 && v.title) topGoals.push(v.title);
            } else if (cat === "Giải trí" || cat === "leisure") {
              leisureCount++;
            } else if (cat === "Lạc lối" || cat === "distraction") {
              distractionCount++;
            } else {
              unclassifiedCount++;
            }
          });

          // Nén thành watchDigest gọn nhẹ
          value.watchDigest = {
            totalLogged: value.watchedVideos.length,
            deepCount: value.watchedVideos.filter(v => (v.watchedSeconds || 0) >= 2 && !v.isImpulsive).length,
            impulsiveCount: value.watchedVideos.filter(v => (v.watchedSeconds || 0) < 2 || v.isImpulsive).length,
            goalCount,
            leisureCount,
            distractionCount,
            unclassifiedCount,
            topGoals,
            compressedAt: Date.now()
          };

          // Dọn dẹp danh sách thô để tiết kiệm bộ nhớ & bảo mật
          value.watchedVideos = [];
          value.unmatchedQueue = [];
          toUpdate[key] = value;
        }
      }
    }

    if (Object.keys(toUpdate).length > 0) {
      chrome.storage.local.set(toUpdate, () => {
        console.log(`[Mindful SW] 🧹 Đã nén và dọn dẹp danh sách video thô cho ${Object.keys(toUpdate).length} ngày cũ.`);
      });
    }
  });
}

// Lắng nghe alarm kích hoạt lúc giờ phản tư và giờ dọn dẹp 00h00
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "daily-reflection") {
    handleDaily22hRoutine();
  }
  if (alarm.name === "daily-midnight-cleanup") {
    cleanOldDaysAndCompressLogs();
  }
});

// Lắng nghe thay đổi giờ phản tư từ storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.app_config) {
    const oldRem = changes.app_config.oldValue?.reflection?.reminderTime;
    const newRem = changes.app_config.newValue?.reflection?.reminderTime;
    if (newRem && newRem !== oldRem) {
      setupDailyReflectionAlarm(true);
    }
  }
});

/**
 * Quy trình tự động lúc 22h00:
 * 1. Mở Tab phản tư
 * 2. Đánh giá Focus Streak trong ngày
 * 3. Chạy AI trích xuất từ khóa nếu có hàng đợi unmatched_queue
 */
async function handleDaily22hRoutine() {
  openReflectionTab();

  const todayKey = getTodayDateKey();
  chrome.storage.local.get([todayKey, "pet_state", "app_config"], async (res) => {
    const dayData = res[todayKey] || {};
    const petState = res.pet_state || { energy: 80, mood: "happy", streakDays: 0, lastStreakDate: null };
    const apiKey = res.app_config?.geminiApiKey;
    const unmatchedQueue = dayData.unmatchedQueue || [];

    // 1. Kiểm tra Streak hôm nay
    checkAndAwardStreak(dayData, petState, todayKey);

    // 2. Tự động tiến hóa bộ lọc nếu có video trong unmatchedQueue
    if (apiKey && unmatchedQueue.length >= 2) {
      try {
        const titles = unmatchedQueue.map(item => item.title).filter(Boolean);
        const newSuggestions = await extractSuggestedKeywords(titles, apiKey);
        if (newSuggestions && newSuggestions.length > 0) {
          const config = res.app_config || {};
          const currentSuggestions = config.suggestedKeywords || [];
          const existingWords = new Set(currentSuggestions.map(s => s.word.toLowerCase()));
          const configWords = new Set((config.keywords?.target || []).map(w => w.toLowerCase()));

          const merged = [...currentSuggestions];
          newSuggestions.forEach(s => {
            if (!existingWords.has(s.word) && !configWords.has(s.word)) {
              merged.push(s);
            }
          });

          config.suggestedKeywords = merged;
          dayData.unmatchedQueue = []; // Xóa hàng đợi đã xử lý

          const toSave = { app_config: config };
          toSave[todayKey] = dayData;
          chrome.storage.local.set(toSave);
          console.log("[Mindful SW] Tự động trích xuất từ khóa 22h00:", merged);
        }
      } catch (e) {
        console.warn("[Mindful SW] Lỗi trích xuất từ khóa 22h:", e);
      }
    }
  });
}

function openReflectionTab() {
  const reflectionUrl = chrome.runtime.getURL("src/reflection/reflection.html");
  chrome.tabs.query({ url: reflectionUrl }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: reflectionUrl });
    }
  });

  chrome.action.setBadgeText({ text: "🌙" });
  chrome.action.setBadgeBackgroundColor({ color: "#8B5CF6" });
  setTimeout(() => { chrome.action.setBadgeText({ text: "" }); }, 30 * 60 * 1000);
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getTodayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `stats_${y}-${m}-${day}`;
}

/**
 * Đánh giá Focus Streak hôm nay:
 * Tiêu chí: Không vi phạm Mốc 3 (long videos <= m3 và short swipes <= m3)
 */
function checkAndAwardStreak(dayData, petState, todayKey) {
  if (petState.lastStreakDate === todayKey) return; // Đã tính hôm nay

  const ytLong = dayData.youtube?.longVideos?.totalWatched || 0;
  const fbLong = dayData.facebook?.longVideos?.totalWatched || 0;
  const ytShorts = dayData.youtube?.shorts?.totalSwipes || 0;
  const fbReels = dayData.facebook?.reels?.totalSwipes || 0;

  // Tiêu chí thành công: không vi phạm quá đà (ít hơn 12 video dài và 60 shorts)
  const isDisciplined = (ytLong + fbLong <= 10) && (ytShorts + fbReels <= 50);

  // Kỷ luật: Nếu Pet cạn kiệt 0 năng lượng lúc 22h00 -> Mất toàn bộ Streak
  if (petState.energy <= 0) {
    petState.streakDays = 0;
    petState.currentStreak = 0;
    petState.mood = "sad";
  } else if (isDisciplined) {
    petState.streakDays = (petState.streakDays || 0) + 1;
    petState.currentStreak = petState.streakDays;
    petState.energy = Math.min(100, (petState.energy || 80) + 15);
    petState.mood = "happy";
  } else {
    // Vi phạm nhưng chưa cạn kiệt: trừ 1 ngày streak
    petState.streakDays = Math.max(0, (petState.streakDays || 1) - 1);
    petState.currentStreak = petState.streakDays;
    petState.energy = Math.max(0, (petState.energy || 80) - 20);
    petState.mood = petState.energy < 40 ? "sad" : "neutral";
  }

  petState.lastStreakDate = todayKey;
  chrome.storage.local.set({ pet_state: petState });
}

/**
 * Nén dữ liệu ngày thành Digest ngắn gọn (~150 tokens) cho AI Reflection Coach
 */
function buildContextDigest(dayData) {
  const ytSummary = dayData.youtube?.summary || {};
  const fbSummary = dayData.facebook?.summary || {};
  const ytLong = dayData.youtube?.longVideos || { totalWatched: 0, impulsiveCount: 0, usefulCount: 0 };
  const fbLong = dayData.facebook?.longVideos || { totalWatched: 0, impulsiveCount: 0, usefulCount: 0 };
  const ytShorts = dayData.youtube?.shorts?.totalSwipes || 0;
  const fbReels = dayData.facebook?.reels?.totalSwipes || 0;
  const musicVideos = dayData.youtube?.musicVideos || { totalWatched: 0, durationSeconds: 0 };
  const watchedVideos = Array.isArray(dayData.watchedVideos) ? dayData.watchedVideos : [];

  const totalActiveSeconds = (ytSummary.activeSeconds || 0) + (fbSummary.activeSeconds || 0);
  const activeMinutes = Math.round(totalActiveSeconds / 60);

  const totalLong = ytLong.totalWatched + fbLong.totalWatched;
  const totalUseful = (ytLong.usefulCount || 0) + (fbLong.usefulCount || 0);
  const totalImpulsive = (ytLong.impulsiveCount || 0) + (fbLong.impulsiveCount || 0);

  const usefulPct = totalLong > 0 ? Math.round((totalUseful / totalLong) * 100) : 0;
  const distractPct = totalLong > 0 ? Math.round((totalImpulsive / totalLong) * 100) : 0;

  // Lọc các video bổ ích đã xem trọn vẹn (category === "Mục tiêu" hoặc completionPct >= 80)
  const usefulVideos = watchedVideos
    .filter(v => v.category === "Mục tiêu" || (v.completionPct && v.completionPct >= 80))
    .slice(0, 5)
    .map(v => v.title);

  // Lấy danh sách video chưa phân loại được
  const unclassifiedVideos = (dayData.unmatchedQueue && dayData.unmatchedQueue.length > 0)
    ? dayData.unmatchedQueue.slice(0, 10).map(v => v.title)
    : watchedVideos.filter(v => v.category === "Khác" || v.category === "unclassified").slice(0, 10).map(v => v.title);

  return {
    activeMinutes,
    usefulPct,
    distractPct,
    totalVideos: totalLong + ytShorts + fbReels,
    usefulVideos,
    musicVideos,
    studyVideoLogs: watchedVideos.filter(v => v.category === "Mục tiêu").slice(0, 10),
    unclassifiedVideos
  };
}

// ─── Xử lý Message Passing từ Content Script & Popup ──────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 1. Mở tab reflection
  if (msg.type === "OPEN_REFLECTION") {
    openReflectionTab();
    sendResponse({ ok: true });
    return false;
  }

  // 1b. Mở tab dashboard phân tích xu hướng
  if (msg.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
    sendResponse({ ok: true });
    return false;
  }

  // 2. Test Gemini API Key
  if (msg.type === "TEST_GEMINI_KEY") {
    testGeminiApiKey(msg.apiKey).then(res => sendResponse(res));
    return true; // async response
  }

  // 3. Phân loại Lớp 2 (Gemini Classify) kèm Cache
  if (msg.type === "GEMINI_CLASSIFY") {
    handleGeminiClassify(msg).then(res => sendResponse(res));
    return true; // async response
  }

  // 4. Thêm video vào hàng đợi unmatched_queue
  if (msg.type === "ADD_UNMATCHED_VIDEO") {
    handleAddUnmatchedVideo(msg).then(res => sendResponse(res));
    return true;
  }

  // 5. Tự tiến hóa bộ lọc tĩnh (Gợi ý từ khóa)
  if (msg.type === "GEMINI_EVOLVE_FILTER") {
    handleEvolveFilter().then(res => sendResponse(res));
    return true;
  }

  // 6. Chấp nhận từ khóa AI đề xuất vào bộ lọc (target, leisure, hoặc distraction)
  if (msg.type === "APPROVE_KEYWORD") {
    handleApproveKeyword(msg.word, msg.category).then(res => sendResponse(res));
    return true;
  }

  // 6b. Chấp nhận tất cả từ khóa AI đề xuất (Approve All 1-chạm)
  if (msg.type === "APPROVE_ALL_KEYWORDS") {
    handleApproveAllKeywords().then(res => sendResponse(res));
    return true;
  }

  // 7. Bỏ qua từ khóa AI đề xuất
  if (msg.type === "DISMISS_KEYWORD") {
    handleDismissKeyword(msg.word).then(res => sendResponse(res));
    return true;
  }

  // 8. AI Reflection Coach lúc cuối ngày
  if (msg.type === "GEMINI_REFLECT") {
    handleGeminiReflect(msg).then(res => sendResponse(res));
    return true;
  }

  // 8b. AI Reflection Coach Dài Hạn (Tuần / Tháng)
  if (msg.type === "GEMINI_LONGTERM_COACH") {
    handleGeminiLongtermCoach(msg).then(res => sendResponse(res));
    return true;
  }

  // 9. Quản lý trạng thái Pet (Gamification)
  if (msg.type === "GET_PET_STATE") {
    chrome.storage.local.get(["pet_state"], (res) => {
      const pet_state = res.pet_state || { energy: 100, mood: "happy", currentStreak: 1, streakDays: 1, mode: "default" };
      sendResponse({ petState: pet_state, petConfig: pet_state, pet_state });
    });
    return true;
  }

  if (msg.type === "UPDATE_PET_STATE") {
    handleUpdatePetState(msg.deltaEnergy, msg.newMood).then(res => sendResponse(res));
    return true;
  }

  // 10. Tạo Avatar AI Chibi từ ảnh người dùng (1 lần duy nhất)
  if (msg.type === "GENERATE_AI_PET_SPRITES") {
    handleGenerateAiPetSprites(msg.imageBase64).then(res => sendResponse(res));
    return true;
  }

  // 11. Cập nhật cấu hình Pet (Mode, uploaded image, etc.)
  if (msg.type === "UPDATE_PET_CONFIG") {
    chrome.storage.local.get(["pet_state"], (res) => {
      const pet = Object.assign({}, res.pet_state || {}, msg.config || {});
      chrome.storage.local.set({ pet_state: pet }, () => {
        sendResponse({ ok: true, petConfig: pet, pet_state: pet });
      });
    });
    return true;
  }

  // 12. Đóng tab hiện tại theo yêu cầu từ Content Script (Modal Hết phiên / Nút Đóng tab)
  if (msg.type === "CLOSE_CURRENT_TAB") {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: "Không tìm thấy tab ID" });
    }
    return true;
  }

  // 13. Dev Mode: Kích hoạt mở tab phản tư ngay lập tức
  if (msg.type === "TRIGGER_DEV_REFLECTION") {
    openReflectionTab();
    sendResponse({ ok: true });
    return true;
  }

  // 13b. Cập nhật lại lịch báo thức phản tư khi đổi cấu hình
  if (msg.type === "UPDATE_REFLECTION_ALARM") {
    setupDailyReflectionAlarm(true);
    sendResponse({ ok: true });
    return true;
  }

  // 14. Dev Mode: Reset dữ liệu test về trạng thái sạch ban đầu
  if (msg.type === "RESET_DEV_DATA") {
    const todayKey = getTodayDateKey();
    const cleanDayData = {
      date: todayKey.replace("stats_", ""),
      youtube: {
        summary: { activeSeconds: 0, passiveSeconds: 0, reloadCount: 0 },
        shorts: { totalSwipes: 0, validViews: 0, impulsiveCount: 0, loopViews: 0 },
        longVideos: { totalWatched: 0, usefulCount: 0, impulsiveCount: 0 },
        musicVideos: { totalWatched: 0, durationSeconds: 0 }
      },
      facebook: {
        summary: { activeSeconds: 0, passiveSeconds: 0, reloadCount: 0 },
        feed: { feedPostsScrolled: 0, feedPostsRead: 0 },
        reels: { totalSwipes: 0, validViews: 0, impulsiveCount: 0, loopViews: 0 },
        longVideos: { totalWatched: 0, usefulCount: 0, impulsiveCount: 0 }
      },
      tiktok: {
        summary: { activeSeconds: 0, passiveSeconds: 0, reloadCount: 0 },
        shorts: { totalSwipes: 0, validViews: 0, impulsiveCount: 0, loopViews: 0 }
      },
      hourly: Array.from({ length: 24 }, (_, h) => ({
        hour: h, swipes: 0, longVideos: 0, feedScrolled: 0, reloads: 0, activeSeconds: 0
      })),
      temptation: { resistedCount: 0, succumbedCount: 0 },
      watchedVideos: [],
      unmatchedQueue: [],
      reflection: { lesson1: "", lesson2: "", rating: 5, aiFeedback: "", submittedAt: null },
      petEnergyEndOfDay: 100
    };
    const cleanPetState = {
      energy: 100,
      mood: "happy",
      currentStreak: 1,
      streakDays: 1,
      lastPokeEnergyTime: 0,
      lastActiveTimestamp: Date.now(),
      mode: "default",
      accessories: { unlockedItems: ["sunglasses", "laurel"], equippedHead: null },
      puppetPhotos: { happy: "", neutral: "", sad: "" },
      aiSprites: { happy: "", neutral: "", sad: "" },
      userPersona: {
        totalTrackedDays: 0,
        streakRecord: 0,
        totalUsefulVideos: 0,
        avgUsefulPct: 0,
        vulnerabilities: [],
        strengths: [],
        history: []
      }
    };

    const payload = {};
    payload[todayKey] = cleanDayData;
    payload["pet_state"] = cleanPetState;

    chrome.storage.local.set(payload, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

// ─── Controllers Xử Lý Từng Task ──────────────────────────────────────────────

/**
 * Phân loại video qua Lớp 2 (Gemini API) với Token Cache
 */
async function handleGeminiClassify({ videoId, title, watchedSeconds, isShort }) {
  // RULE 1: Tuyệt đối KHÔNG gọi API với Shorts lướt nhanh (< 15s)
  if (isShort && (watchedSeconds || 0) < 15) {
    return { category: "Khác", relevanceScore: 20, cached: false, skippedShort: true };
  }

  if (!title || !videoId) {
    return { category: "Khác", relevanceScore: 30, cached: false };
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(["ai_classification_cache", "app_config"], async (res) => {
      const cache = res.ai_classification_cache || {};

      // 1. Kiểm tra Cache trong storage (Miễn phí 100% token)
      if (cache[videoId]) {
        return resolve({ ...cache[videoId], cached: true });
      }

      const apiKey = res.app_config?.geminiApiKey;
      if (!apiKey) {
        return resolve({ category: "Khác", relevanceScore: 30, noApiKey: true });
      }

      // 2. Gọi Gemini API
      try {
        const result = await classifyVideoTitle(title, apiKey);
        const classification = {
          category: result.category || "Khác",
          relevanceScore: result.relevanceScore || 50,
          timestamp: Date.now()
        };

        // Lưu vào cache
        cache[videoId] = classification;
        // Giữ kích thước cache vừa phải (tối đa 200 items gần nhất)
        const keys = Object.keys(cache);
        if (keys.length > 200) {
          delete cache[keys[0]];
        }
        chrome.storage.local.set({ ai_classification_cache: cache });

        resolve({ ...classification, cached: false });
      } catch (err) {
        resolve({ category: "Khác", relevanceScore: 30, error: err.message });
      }
    });
  });
}

/**
 * Thêm video "lọt lưới" (unmatched) vào hàng đợi trong ngày
 */
async function handleAddUnmatchedVideo({ id, title, watchedSeconds }) {
  if (!id || !title) return { ok: false };

  const todayKey = getTodayDateKey();
  return new Promise((resolve) => {
    chrome.storage.local.get([todayKey], (res) => {
      const dayData = res[todayKey] || {};
      const queue = dayData.unmatchedQueue || [];
      // Tránh trùng lặp
      if (!queue.some(item => item.id === id)) {
        queue.push({ id, title, watchedSeconds: watchedSeconds || 0, timestamp: Date.now() });
        if (queue.length > 40) queue.shift(); // Tối đa 40 video
        dayData.unmatchedQueue = queue;
        const toSave = {};
        toSave[todayKey] = dayData;
        chrome.storage.local.set(toSave);
      }
      resolve({ ok: true, queueLength: queue.length });
    });
  });
}

/**
 * Tự tiến hóa: Gọi Gemini trích xuất từ khóa từ unmatchedQueue trong ngày
 */
async function handleEvolveFilter() {
  const todayKey = getTodayDateKey();
  return new Promise((resolve) => {
    chrome.storage.local.get([todayKey, "app_config"], async (res) => {
      const dayData = res[todayKey] || {};
      const queue = dayData.unmatchedQueue || [];
      const config = res.app_config || {};
      const apiKey = config.geminiApiKey;

      if (!apiKey) {
        return resolve({ ok: false, error: "Chưa cấu hình Google Gemini API Key trong Popup Cài đặt." });
      }
      if (queue.length === 0) {
        return resolve({ ok: true, suggestions: config.suggestedKeywords || [], message: "Hàng đợi trống." });
      }

      const titles = queue.map(item => item.title).filter(Boolean);
      const suggestions = await extractSuggestedKeywords(titles, apiKey);

      const existingSuggestions = config.suggestedKeywords || [];
      const existingWords = new Set(existingSuggestions.map(s => s.word.toLowerCase()));
      const targetWords = new Set((config.keywords?.target || []).map(w => w.toLowerCase()));

      const updatedSuggestions = [...existingSuggestions];
      suggestions.forEach(s => {
        if (!existingWords.has(s.word) && !targetWords.has(s.word)) {
          updatedSuggestions.push(s);
        }
      });

      config.suggestedKeywords = updatedSuggestions;
      dayData.unmatchedQueue = []; // Xóa hàng đợi đã xử lý

      const toSave = { app_config: config };
      toSave[todayKey] = dayData;
      chrome.storage.local.set(toSave);

      resolve({ ok: true, suggestions: updatedSuggestions });
    });
  });
}

/**
 * Thêm từ khóa AI đề xuất vào bộ lọc tương ứng (target, leisure, hoặc distraction)
 * Tự động Deep Merge với Firebase Server để tránh ghi đè dữ liệu.
 */
async function handleApproveKeyword(word, category = "target") {
  if (!word) return { ok: false };
  const cleanWord = word.trim().toLowerCase();
  const validCat = ["target", "leisure", "distraction"].includes(category) ? category : "target";

  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config"], async (res) => {
      const config = res.app_config || {};
      config.keywords = config.keywords || { target: [], leisure: [], distraction: [] };
      const list = config.keywords[validCat] || [];

      if (!list.map(k => k.toLowerCase()).includes(cleanWord)) {
        list.push(cleanWord);
        config.keywords[validCat] = list;
      }

      // Xóa khỏi danh sách đề xuất
      const suggestions = (config.suggestedKeywords || []).filter(s => s.word.toLowerCase() !== cleanWord);
      config.suggestedKeywords = suggestions;

      // Cập nhật local storage
      chrome.storage.local.set({ app_config: config }, async () => {
        // Deep Merge tức thì lên Firebase Server
        try {
          await pushKeywordsWithCloudMerge({ [validCat]: [cleanWord] });
        } catch (_) {}
        resolve({ ok: true, keywords: config.keywords, suggestions, category: validCat });
      });
    });
  });
}

/**
 * Duyệt toàn bộ danh sách từ khóa AI đề xuất trong 1 cú click (Approve All)
 * Tự động phân loại theo category của từng từ và Deep Merge với Firebase Server.
 */
async function handleApproveAllKeywords() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config"], async (res) => {
      const config = res.app_config || {};
      const suggestions = config.suggestedKeywords || [];
      if (suggestions.length === 0) {
        return resolve({ ok: true, count: 0, keywords: config.keywords });
      }

      config.keywords = config.keywords || { target: [], leisure: [], distraction: [] };
      const toMerge = { target: [], leisure: [], distraction: [] };

      suggestions.forEach(item => {
        const w = String(item.word || "").trim().toLowerCase();
        let cat = String(item.category || "target").toLowerCase();
        if (!["target", "leisure", "distraction"].includes(cat)) cat = "target";
        if (w.length >= 2) {
          toMerge[cat].push(w);
        }
      });

      // Gộp vào config.keywords local
      ["target", "leisure", "distraction"].forEach(cat => {
        const existing = config.keywords[cat] || [];
        const seen = new Set(existing.map(k => k.toLowerCase()));
        toMerge[cat].forEach(w => {
          if (!seen.has(w)) {
            existing.push(w);
            seen.add(w);
          }
        });
        config.keywords[cat] = existing;
      });

      // Xóa sạch hàng đợi đề xuất sau khi duyệt hết
      config.suggestedKeywords = [];

      chrome.storage.local.set({ app_config: config }, async () => {
        // Đẩy toàn bộ lên Cloud với Deep Merge
        try {
          await pushKeywordsWithCloudMerge(toMerge);
        } catch (_) {}
        resolve({
          ok: true,
          count: suggestions.length,
          keywords: config.keywords,
          suggestions: []
        });
      });
    });
  });
}

/**
 * Bỏ qua từ khóa AI đề xuất
 */
async function handleDismissKeyword(word) {
  if (!word) return { ok: false };
  const cleanWord = word.trim().toLowerCase();

  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config"], (res) => {
      const config = res.app_config || {};
      const suggestions = (config.suggestedKeywords || []).filter(s => s.word.toLowerCase() !== cleanWord);
      config.suggestedKeywords = suggestions;
      chrome.storage.local.set({ app_config: config }, () => {
        resolve({ ok: true, suggestions });
      });
    });
  });
}

/**
 * AI Reflection Coach: Tạo nhận xét thấu cảm và cập nhật Persona đường dài
 */
async function handleGeminiReflect({ dayData, userLessons, masterGoal }) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config", "pet_state"], async (res) => {
      const config = res.app_config || {};
      const apiKey = config.geminiApiKey;
      const pet = res.pet_state || {};
      const digest = buildContextDigest(dayData);

      if (!apiKey) {
        return resolve({
          ok: false,
          error: "Vui lòng nhập Gemini API Key trong Popup để mở khóa AI Reflection Coach.",
          coachResult: {
            coachFeedback: "Bạn đã hoàn thành việc ghi lại bài học hôm nay! Hãy cấu hình Gemini API Key để nhận lời khuyên thấu cảm từ AI.",
            remindedVideos: digest.usefulVideos,
            tomorrowMission: "Duy trì ghi nhận tiến độ mỗi ngày lúc 22h00."
          }
        });
      }

      const coachResult = await generateReflectionCoach({ digest, userLessons, masterGoal }, apiKey);

      // Cập nhật User Persona đường dài (Long-term Persona) trong pet_state
      const persona = pet.userPersona || {
        totalTrackedDays: 0,
        streakRecord: 0,
        totalUsefulVideos: 0,
        avgUsefulPct: 0,
        vulnerabilities: [],
        strengths: [],
        history: []
      };

      persona.totalTrackedDays = (persona.totalTrackedDays || 0) + 1;
      persona.totalUsefulVideos = (persona.totalUsefulVideos || 0) + digest.usefulVideos.length;

      // Tính trung bình % hữu ích
      const currentAvg = persona.avgUsefulPct || 0;
      persona.avgUsefulPct = Math.round((currentAvg * (persona.totalTrackedDays - 1) + digest.usefulPct) / persona.totalTrackedDays);

      persona.history = persona.history || [];
      persona.history.unshift({
        date: getTodayDateKey(),
        usefulPct: digest.usefulPct,
        activeMinutes: digest.activeMinutes,
        tomorrowMission: coachResult.tomorrowMission
      });
      if (persona.history.length > 30) persona.history.pop(); // Giữ tối đa 30 ngày

      pet.userPersona = persona;
      chrome.storage.local.set({ pet_state: pet });

      resolve({ ok: true, coachResult, persona });
    });
  });
}

/**
 * Cập nhật điểm năng lượng và tâm trạng của Linh vật Pet (Pet State Machine)
 * - happy: energy >= 70
 * - neutral: 40 <= energy <= 69
 * - sad: energy < 40
 */
async function handleUpdatePetState(deltaEnergy = 0, newMood = null) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["pet_state"], (res) => {
      const pet = res.pet_state || { energy: 100, mood: "happy", currentStreak: 1, streakDays: 1 };
      if (deltaEnergy !== 0) {
        pet.energy = Math.max(0, Math.min(100, (pet.energy ?? 100) + deltaEnergy));
      }
      if (newMood) {
        pet.mood = newMood;
      } else {
        // Tự động suy biến mood theo energy
        if (pet.energy >= 70) pet.mood = "happy";
        else if (pet.energy >= 40) pet.mood = "neutral";
        else pet.mood = "sad";
      }

      pet.streakDays = pet.streakDays ?? pet.currentStreak ?? 1;
      pet.currentStreak = pet.streakDays;

      chrome.storage.local.set({ pet_state: pet }, () => {
        resolve({ ok: true, petState: pet, pet_state: pet });
      });
    });
  });
}

/**
 * AI Reflection Coach Dài Hạn: Tổng kết hành vi và chuyển biến tâm lý theo tuần / tháng
 */
async function handleGeminiLongtermCoach({
  periodType = "tuần",
  periodLabel = "",
  currentSummary = {},
  prevSummary = null,
  masterGoal = "",
  vulnerableHours = "",
  topStrengths = ""
} = {}) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config", "pet_state"], async (res) => {
      const config = res.app_config || {};
      const apiKey = config.geminiApiKey;
      const pet = res.pet_state || {};
      const userMasterGoal = masterGoal || config.masterGoal || "Trở thành phiên bản tốt hơn để gặp người ấy";

      if (!apiKey) {
        return resolve({
          ok: false,
          error: "Chưa cấu hình Google Gemini API Key trong Popup."
        });
      }

      const result = await generateLongtermReflectionCoach({
        periodType,
        periodLabel,
        currentSummary,
        prevSummary,
        masterGoal: userMasterGoal,
        vulnerableHours,
        topStrengths
      }, apiKey);

      resolve(result);
    });
  });
}

/**
 * Xử lý tạo 3 sprite Chibi SVG qua Gemini Vision API
 */
async function handleGenerateAiPetSprites(imageBase64) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config", "pet_state"], async (res) => {
      const apiKey = res.app_config?.geminiApiKey;
      if (!apiKey) {
        return resolve({ ok: false, error: "Vui lòng cấu hình Google Gemini API Key trong Popup trước khi tạo Avatar AI." });
      }

      try {
        const result = await generateChibiPetSprites(imageBase64, apiKey);
        if (result && result.sprites) {
          const pet = res.pet_state || { mode: "ai_generated", aiSprites: {} };
          pet.aiSprites = result.sprites;
          pet.mode = "ai_generated";

          chrome.storage.local.set({ pet_state: pet }, () => {
            resolve({ ok: true, sprites: result.sprites, fallback: result.fallback || false });
          });
        } else {
          resolve({ ok: false, error: "AI không tạo được sprite ảnh." });
        }
      } catch (err) {
        resolve({ ok: false, error: err.message });
      }
    });
  });
}

// ─── Firebase Realtime Database Sync Listeners ─────────────────────────────────

let isApplyingRemoteUpdate = false;
let configPushDebounceTimeout = null;

// 1. Tự động đồng bộ Debounce khi dayData, pet_state hoặc app_config thay đổi
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  const d = new Date();
  const todayKey = `stats_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (changes[todayKey] || changes.pet_state) {
    chrome.storage.local.get([todayKey, "pet_state"], (res) => {
      const todayData = res[todayKey] || {};
      const pet = res.pet_state || {};
      queueDesktopSyncToFirebase(todayKey, todayData, pet);
    });
  }

  // Tự động đẩy cấu hình lên Firebase khi app_config thay đổi tại local
  if (changes.app_config && !isApplyingRemoteUpdate) {
    const newCfg = changes.app_config.newValue;
    if (newCfg) {
      if (configPushDebounceTimeout) clearTimeout(configPushDebounceTimeout);
      configPushDebounceTimeout = setTimeout(() => {
        pushConfigToFirebase(newCfg).catch((err) => {
          console.warn("[SW] Lỗi tự động đẩy config lên Firebase:", err);
        });
      }, 1000);
    }
  }
});

// 2. Cập nhật Device Handoff khi tắt cửa sổ trình duyệt
chrome.windows?.onRemoved?.addListener(() => {
  chrome.windows.getAll((windows) => {
    if (!windows || windows.length === 0) {
      // Cửa sổ cuối cùng đã đóng
      pushDataToFirebase().catch(() => {});
    }
  });
});

// 3. Xử lý dữ liệu thời gian thực từ Cloud đổ về qua SSE Stream
async function handleFirebaseRealtimeEvent(eventData) {
  if (!eventData || !eventData.data) return;
  const { path, data } = eventData;

  try {
    // A. Nhận cấu hình từ Cloud (/config hoặc full snapshot /)
    if (path === "/config" || (path === "/" && data && data.config)) {
      const remoteConfig = path === "/config" ? data : data.config;
      if (remoteConfig && typeof remoteConfig === "object") {
        const local = await new Promise((res) => chrome.storage.local.get(["app_config"], res));
        const currentCfg = local.app_config || {};

        const updatedCfg = {
          ...currentCfg,
          masterGoal: remoteConfig.masterGoal ?? currentCfg.masterGoal,
          leisureQuotaMinutes: remoteConfig.leisureQuotaMinutes ?? currentCfg.leisureQuotaMinutes,
          pomodoro: remoteConfig.pomodoro ? { ...currentCfg.pomodoro, ...remoteConfig.pomodoro } : currentCfg.pomodoro,
          bedtime: remoteConfig.bedtime ? { ...currentCfg.bedtime, ...remoteConfig.bedtime } : currentCfg.bedtime,
          reflection: remoteConfig.reflection ? { ...currentCfg.reflection, ...remoteConfig.reflection } : currentCfg.reflection,
          thresholds: remoteConfig.thresholds ? { ...currentCfg.thresholds, ...remoteConfig.thresholds } : currentCfg.thresholds,
          keywords: remoteConfig.keywords ? { ...currentCfg.keywords, ...remoteConfig.keywords } : currentCfg.keywords
        };

        if (JSON.stringify(updatedCfg) !== JSON.stringify(currentCfg)) {
          isApplyingRemoteUpdate = true;
          await chrome.storage.local.set({ app_config: updatedCfg });
          setTimeout(() => { isApplyingRemoteUpdate = false; }, 1500);
          console.log("[SW] 🟢 Đã đồng bộ app_config mới từ Cloud về Extension!");

          // Báo cho các tabs đang mở cập nhật mốc tức thì
          chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: "CONFIG_UPDATED", config: updatedCfg }).catch(() => {});
              }
            }
          });
        }
      }
    }

    // B. Nhận cập nhật Thú cưng (/petState hoặc /sharedState)
    if (path === "/petState" || path === "/sharedState" || (path === "/" && data && (data.petState || data.sharedState))) {
      const petSource = (path === "/petState" || path === "/sharedState") ? data : (data.petState || data.sharedState);
      if (petSource && typeof petSource === "object") {
        const local = await new Promise((res) => chrome.storage.local.get(["pet_state"], res));
        const currentPet = local.pet_state || {};

        const updatedPet = {
          ...currentPet,
          energy: petSource.energy ?? petSource.petEnergy ?? currentPet.energy,
          streakDays: petSource.streakDays ?? petSource.streak ?? currentPet.streakDays,
          currentStreak: petSource.currentStreak ?? petSource.streak ?? currentPet.currentStreak,
          mood: petSource.mood ?? petSource.petMood ?? currentPet.mood
        };

        if (JSON.stringify(updatedPet) !== JSON.stringify(currentPet)) {
          isApplyingRemoteUpdate = true;
          await chrome.storage.local.set({ pet_state: updatedPet });
          setTimeout(() => { isApplyingRemoteUpdate = false; }, 1500);
        }
      }
    }
  } catch (err) {
    console.warn("[SW] Lỗi xử lý SSE Event:", err);
  }
}

function initRealtimeSync() {
  getFirebaseSyncSettings().then((settings) => {
    if (settings.autoSync && settings.syncCode) {
      startFirebaseRealtimeStream((eventData) => {
        handleFirebaseRealtimeEvent(eventData);
      });
    }
  });
}

// Khởi chạy Realtime SSE Stream
initRealtimeSync();


