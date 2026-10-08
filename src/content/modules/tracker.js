/**
 * Mindful Social Media Tracker - Tracker Module
 * Chuyên trách: Đếm Swipes/Views/Loops, theo dõi % Completion Rate video dài,
 * bắt F5/Reload, click Home, và quản lý Active Time.
 */

import { saveDayData, formatTimeShort, recordHourlyMetrics } from "../../utils/storage.js";
import { categorizeText, classifyByKeywords } from "./keyword-filter.js";

const IDLE_THRESHOLD_MS = 30000;

export class Tracker {
  /**
   * @param {object} opts
   * @param {object} opts.dayData     - Tham chiếu đến dayData chia sẻ
   * @param {string} opts.platformKey - "youtube" | "facebook" | "tiktok"
   * @param {boolean} opts.isYT
   * @param {boolean} opts.isFB
   * @param {object} opts.keywordsConfig
   * @param {Function} opts.onUpdate  - Callback gọi khi dữ liệu thay đổi
   * @param {Function} opts.onAction  - Callback trigger friction check
   * @param {Function} opts.getFocusMode - () => "music" | "study"
   * @param {Function} opts.onStudyCheckInNeeded - (videoId, title) => void
   */
  constructor({
    dayData,
    platformKey,
    isYT,
    isFB,
    keywordsConfig,
    onUpdate,
    onAction,
    onImpulsive,
    onUseful,
    getFocusMode,
    isPomodoroFocus,
    onStudyCheckInNeeded
  }) {
    this.dayData = dayData;
    this.platformKey = platformKey;
    this.isYT = isYT;
    this.isFB = isFB;
    this.keywordsConfig = keywordsConfig || {};
    this.onUpdate = onUpdate || (() => {});
    this.onAction = onAction || (() => {});
    this.onImpulsive = onImpulsive || (() => {});
    this.onUseful = onUseful || (() => {});
    this.getFocusMode = getFocusMode || (() => "music");
    this.isPomodoroFocus = isPomodoroFocus || (() => false);
    this.onStudyCheckInNeeded = onStudyCheckInNeeded || null;

    this._lastUserActivity = Date.now();
    this._activityThrottle = 0;

    // YouTube state
    this._currentYTShortId = null;
    this._shortViewTimer = null;
    this._currentShortVideoEl = null;
    this._currentYTLongId = null;
    this._currentYTLongTitle = "";
    this._currentYTLongChannel = "";
    this._currentYTLongDuration = 0;
    this._currentYTLongWatchedSec = 0;
    this._ytWatchInterval = null;
    this._studyCheckInTimeout = null;
    this._checkedInVideos = new Set();

    // Facebook state
    this._currentFBReelId = null;
    this._fbReelTimer = null;
    this._currentFBReelVideoEl = null;
    this._seenFBPosts = new Set();
    this._feedScrollObserver = null;
    this._attachPostsTimeout = null;

    this._timeInterval = null;
  }

  // ─── Activity & Time Tracking ─────────────────────────────────────────────

  startActivityTracking() {
    const handleActivity = () => {
      const now = Date.now();
      if (now - this._activityThrottle > 1000) {
        this._activityThrottle = now;
        this._lastUserActivity = now;
      }
    };

    ["mousemove", "keydown", "wheel", "pointerdown", "touchstart"].forEach(evt => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    this._timeInterval = setInterval(() => {
      if (!document.hidden) {
        const timeSinceActivity = Date.now() - this._lastUserActivity;
        if (timeSinceActivity <= IDLE_THRESHOLD_MS) {
          this.dayData[this.platformKey].summary.activeSeconds++;
          recordHourlyMetrics(this.dayData, { activeSeconds: 1 });
        } else {
          this.dayData[this.platformKey].summary.passiveSeconds++;
        }
        this.onUpdate();
        saveDayData(this.dayData, this.platformKey, false);
      }
    }, 1000);
  }

  stopActivityTracking() {
    if (this._timeInterval) clearInterval(this._timeInterval);
  }

  // ─── Reload / F5 Detection ────────────────────────────────────────────────

  checkPageReload() {
    try {
      const navEntries = performance.getEntriesByType("navigation");
      const isReload =
        (navEntries.length > 0 && navEntries[0].type === "reload") ||
        (performance.navigation && performance.navigation.type === 1);

      if (isReload) {
        this.dayData[this.platformKey].summary.reloadCount++;
        recordHourlyMetrics(this.dayData, { reloads: 1 });
        this._registerReloadAttempt();
        saveDayData(this.dayData, this.platformKey, true);
      }
    } catch (e) {}
  }

  _registerReloadAttempt() {
    const now = Date.now();
    let reloads = [];
    try {
      reloads = JSON.parse(sessionStorage.getItem("mindful_recent_reloads") || "[]");
    } catch (e) { reloads = []; }

    reloads.push(now);
    reloads = reloads.filter(t => now - t <= 120000);
    sessionStorage.setItem("mindful_recent_reloads", JSON.stringify(reloads));

    if (reloads.length >= 3) {
      this._showToast("🧘‍♂️ Bảng tin chưa có gì mới đâu, hãy hít thở sâu nào!", 4500);
      this.onImpulsive("reload_spam");
    }
  }

  _showToast(msg, durationMs = 4000) {
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
        text-align:center!important;
      `;
      (document.body || document.documentElement).appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.style.opacity = "1";
    setTimeout(() => { if (toast) toast.style.opacity = "0"; }, durationMs);
  }

  setupHomeClickDetection() {
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!target) return;

      if (this.isYT && target.closest("a#logo, ytd-topbar-logo-renderer, a[href='/']")) {
        this.dayData.youtube.summary.reloadCount++;
        recordHourlyMetrics(this.dayData, { reloads: 1 });
        this._registerReloadAttempt();
        this.onUpdate();
        saveDayData(this.dayData, "youtube", false);
      } else if (this.isFB && target.closest("a[aria-label='Facebook'], svg[aria-label='Facebook'], a[href='/?ref=logo'], a[href='/']")) {
        this.dayData.facebook.summary.reloadCount++;
        recordHourlyMetrics(this.dayData, { reloads: 1 });
        this._registerReloadAttempt();
        this.onUpdate();
        saveDayData(this.dayData, "facebook", false);
      }
    }, true);
  }

  // ─── YouTube Shorts ───────────────────────────────────────────────────────

  handleYTShorts(shortId) {
    if (!shortId || shortId === this._currentYTShortId) return;

    // Nếu chuyển video trước 2s -> tính là lướt bốc đồng (impulsive < 2s)
    if (this._shortViewTimer) {
      clearTimeout(this._shortViewTimer);
      this._shortViewTimer = null;
      if (this._currentYTShortId) {
        this.dayData.youtube.shorts.impulsiveCount++;
      }
    }

    this._currentYTShortId = shortId;
    this.dayData.youtube.shorts.totalSwipes++;
    recordHourlyMetrics(this.dayData, { swipes: 1 });
    this.onUpdate();
    saveDayData(this.dayData, "youtube", false);
    this.onAction();

    this._shortViewTimer = setTimeout(() => {
      this.dayData.youtube.shorts.validViews++;
      this._shortViewTimer = null;
      this.onUpdate();
      saveDayData(this.dayData, "youtube", false);
    }, 2000);

    this._setupShortLoopTracker("youtube");
  }

  // ─── Music Video Detection ───────────────────────────────────────────────
  isMusicVideo(title = "", channelName = "") {
    if (!this.isYT) return false;

    // 1. Kiểm tra filter chips trên đầu trang YouTube (ví dụ chip "Âm nhạc" / "Music")
    try {
      const activeChips = document.querySelectorAll(
        "yt-chip-cloud-chip-renderer[selected], #chips yt-chip-cloud-chip-renderer[aria-selected='true'], yt-chip-cloud-chip-renderer"
      );
      for (const chip of activeChips) {
        const text = chip.textContent.trim().toLowerCase();
        if (text === "âm nhạc" || text === "nhạc" || text === "music") {
          if (chip.hasAttribute("selected") || chip.getAttribute("aria-selected") === "true") {
            return true;
          }
        }
      }
    } catch (_) {}

    // 2. Kiểm tra tên kênh nghệ sĩ / Official Music / Topic
    const ch = (channelName || "").toLowerCase();
    if (ch.endsWith("- topic") || ch.endsWith("- chủ đề") || ch.includes("official music") || ch.includes("records") || ch.includes("vevo")) {
      return true;
    }

    // 3. Kiểm tra huy hiệu nghệ sĩ chính thức (Official Artist Channel)
    if (document.querySelector("ytd-channel-name ytd-badge-supported-renderer [aria-label*='nghệ sĩ'], ytd-channel-name ytd-badge-supported-renderer [aria-label*='Artist']")) {
      return true;
    }

    // 4. Regex từ khóa âm nhạc trong tiêu đề hoặc kênh
    const t = (title || "").toLowerCase();
    const musicRegex = /\b(music|lofi|chill|playlist|nhạc|bài hát|soundtrack|acoustic|instrumental|remix|piano|ambient|audio|mv|official music video|karaoke|beat|lyric|lyrics|mashup|ost|medley|guitar|synthwave|relaxing)\b/i;
    return musicRegex.test(t) || musicRegex.test(ch);
  }

  // ─── YouTube Long Videos ──────────────────────────────────────────────────

  startYTLongTracking(videoId, targetKeywords = []) {
    if (videoId === this._currentYTLongId) return;
    this.endYTLongVideo(targetKeywords);

    this._currentYTLongId = videoId;
    this._currentYTLongWatchedSec = 0;
    this._currentYTLongDuration = 0;
    this._currentYTLongTitle = "";
    this._currentYTLongChannel = "";
    this.onAction();

    // Lấy tiêu đề, kênh & thời lượng sau khi DOM ổn định
    setTimeout(() => {
      const titleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1");
      this._currentYTLongTitle = titleEl
        ? titleEl.textContent.trim()
        : document.title.replace("- YouTube", "").trim();

      const channelEl = document.querySelector("#channel-name #text, ytd-channel-name yt-formatted-string");
      this._currentYTLongChannel = channelEl ? channelEl.textContent.trim() : "";

      const videoEl = document.querySelector("video.html5-main-video");
      if (videoEl) this._currentYTLongDuration = videoEl.duration || 0;
    }, 1500);

    // Xóa timer check-in cũ nếu có
    if (this._studyCheckInTimeout) {
      clearTimeout(this._studyCheckInTimeout);
      this._studyCheckInTimeout = null;
    }

    // TÁCH BẠCH RÕ RÀNG: Chỉ khi Pomodoro BẬT VÀ ở chu kỳ FOCUS VÀ Mode là "study":
    // (Nếu không mở Pomodoro, hoặc đang ở giai đoạn Relax/Break, hoặc Mode là Music -> TUYỆT ĐỐI KHÔNG HỎI)
    if (this.isPomodoroFocus() && this.getFocusMode() === "study") {
      this._studyCheckInTimeout = setTimeout(() => {
        if (this._currentYTLongId === videoId && !this._checkedInVideos.has(videoId)) {
          if (!this._currentYTLongTitle) {
            const titleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1");
            this._currentYTLongTitle = titleEl
              ? titleEl.textContent.trim()
              : document.title.replace("- YouTube", "").trim();
          }

          const category = categorizeText(this._currentYTLongTitle);
          const lowerTitle = (this._currentYTLongTitle || "").toLowerCase();
          const matchesKeyword = (targetKeywords || []).some(k => lowerTitle.includes(k.toLowerCase()));
          
          const isTargetOrEducational = matchesKeyword || 
            category === "Giáo dục & Công nghệ" ||
            category === "Phát triển bản thân" ||
            category === "Tài chính & Đầu tư";

          // Nếu hệ thống nhận định là KHÔNG phân loại được (category === "Khác" và không khớp mục tiêu):
          if (!isTargetOrEducational && category === "Khác") {
            this._checkedInVideos.add(videoId);
            this.onStudyCheckInNeeded?.(videoId, this._currentYTLongTitle);
          }
        }
      }, 10000);
    }

    // Đếm giây xem thực tế
    if (this._ytWatchInterval) clearInterval(this._ytWatchInterval);
    this._ytWatchInterval = setInterval(() => {
      const videoEl = document.querySelector("video.html5-main-video");
      if (videoEl && !videoEl.paused && !document.hidden) {
        this._currentYTLongWatchedSec++;
        if (!this._currentYTLongDuration && videoEl.duration) {
          this._currentYTLongDuration = videoEl.duration;
        }
      }
    }, 1000);
  }

  endYTLongVideo(targetKeywords = []) {
    if (!this._currentYTLongId) return;

    if (this._studyCheckInTimeout) {
      clearTimeout(this._studyCheckInTimeout);
      this._studyCheckInTimeout = null;
    }

    if (this._ytWatchInterval) {
      clearInterval(this._ytWatchInterval);
      this._ytWatchInterval = null;
    }

    const watched = Math.round(this._currentYTLongWatchedSec);
    const duration = Math.round(this._currentYTLongDuration);

    // KIỂM TRA MODE NHẠC TẬP TRUNG (MUSIC FOCUS)
    // TÁCH BẠCH RÕ RÀNG: Chỉ tính nhạc riêng khi BẬT Pomodoro VÀ đang ở chu kỳ FOCUS VÀ Mode là Music.
    // Còn nếu KHÔNG mở Pomodoro, hoặc ở chu kỳ Relax/Break: video ca nhạc và mọi video dài đều được tính
    // bình thường vào danh mục video dài (longVideos)!
    const isPomodoroFocusActive = this.isPomodoroFocus();
    const isFocusMusic = isPomodoroFocusActive && this.getFocusMode() === "music";
    const isMusic = this.isMusicVideo(this._currentYTLongTitle, this._currentYTLongChannel);

    if (isFocusMusic && isMusic) {
      if (watched >= 5) {
        if (!this.dayData.youtube.musicVideos) {
          this.dayData.youtube.musicVideos = { totalWatched: 0, durationSeconds: 0 };
        }
        this.dayData.youtube.musicVideos.totalWatched++;
        this.dayData.youtube.musicVideos.durationSeconds = (this.dayData.youtube.musicVideos.durationSeconds || 0) + watched;
        saveDayData(this.dayData, "youtube", true);
        this.onUpdate();
        this.onAction();
      }
      this._currentYTLongId = null;
      this._currentYTLongWatchedSec = 0;
      this._currentYTLongDuration = 0;
      this._currentYTLongTitle = "";
      this._currentYTLongChannel = "";
      return;
    }

    if (watched >= 3) {
      const watchPct = duration > 0 ? (watched / duration) : 0;

      // Completion Rate Logic
      const isUseful = watchPct >= 0.80 || watched >= 180;          // >= 80% hoặc >= 3 phút đủ thời lượng dài
      const isImpulsive = duration > 60 && watchPct < 0.15;         // < 15% và video > 1 phút

      const category = classifyByKeywords(this._currentYTLongTitle, this.keywordsConfig);

      const record = {
        id: this._currentYTLongId,
        title: this._currentYTLongTitle || "Không rõ tiêu đề",
        channel: this._currentYTLongChannel || "Không rõ kênh",
        platform: "youtube",
        category, // "goal" | "leisure" | "distraction" | "unclassified"
        watchedSeconds: watched,
        durationSeconds: duration,
        isCompletion: Boolean(isUseful),
        timestamp: Date.now(),
        userOverridden: false
      };

      const lv = this.dayData.youtube.longVideos;
      lv.totalWatched++;
      recordHourlyMetrics(this.dayData, { longVideos: 1 });

      if (isImpulsive) {
        lv.impulsiveCount++;
        this.onImpulsive("impulsive_video");
      }
      if (isUseful) {
        lv.usefulCount = (lv.usefulCount || 0) + 1;
        this.onUseful("useful_video");
      }

      if (!this.dayData.watchedVideos) this.dayData.watchedVideos = [];
      this.dayData.watchedVideos.unshift(record);
      if (this.dayData.watchedVideos.length > 50) this.dayData.watchedVideos.pop();

      // Lưu lại các video chưa phân loại vào unmatchedQueue để AI xử lý lúc 22h00
      if (category === "unclassified" && this._currentYTLongTitle) {
        if (!this.dayData.unmatchedQueue) this.dayData.unmatchedQueue = [];
        const exists = this.dayData.unmatchedQueue.some(u => u.title === this._currentYTLongTitle);
        if (!exists) {
          this.dayData.unmatchedQueue.push({
            id: this._currentYTLongId,
            title: this._currentYTLongTitle,
            watchedSeconds: watched,
            timestamp: Date.now()
          });
          if (this.dayData.unmatchedQueue.length > 25) this.dayData.unmatchedQueue.shift();
        }
      }

      saveDayData(this.dayData, "youtube", true);
      this.onUpdate();
      this.onAction();

      // ─── LỚP 2: GEMINI API FALLBACK NẾU LỚP 1 KHÔNG NHẬN DIỆN ĐƯỢC ──────────
      if (category === "unclassified" && this._currentYTLongTitle && (watched >= 15 || watchPct >= 0.80)) {
        const videoIdToClassify = this._currentYTLongId;
        const videoTitleToClassify = this._currentYTLongTitle;

        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: "ADD_UNMATCHED_VIDEO",
            id: videoIdToClassify,
            title: videoTitleToClassify,
            watchedSeconds: watched
          }).catch(() => {});

          chrome.runtime.sendMessage({
            type: "GEMINI_CLASSIFY",
            videoId: videoIdToClassify,
            title: videoTitleToClassify,
            watchedSeconds: watched,
            isShort: false
          }, (res) => {
            if (res && res.category && res.category !== "Khác") {
              record.category = (res.category === "Giáo dục & Công nghệ" || res.category === "Phát triển bản thân") ? "goal" : "leisure";
              record.relevanceScore = res.relevanceScore;

              if (res.relevanceScore >= 60 && !record.isCompletion) {
                record.isCompletion = true;
                lv.usefulCount = (lv.usefulCount || 0) + 1;
                this.onUseful("gemini_reclassified_useful");
              }

              saveDayData(this.dayData, "youtube", false);
              this.onUpdate();
            }
          });
        }
      }
    }

    this._currentYTLongId = null;
    this._currentYTLongWatchedSec = 0;
    this._currentYTLongDuration = 0;
    this._currentYTLongTitle = "";
    this._currentYTLongChannel = "";
  }

  // ─── Facebook Reels ───────────────────────────────────────────────────────

  handleFBReel(reelId) {
    if (!reelId || reelId === this._currentFBReelId) return;

    if (this._fbReelTimer) {
      clearTimeout(this._fbReelTimer);
      this._fbReelTimer = null;
      if (this._currentFBReelId) {
        this.dayData.facebook.reels.impulsiveCount++;
      }
    }

    this._currentFBReelId = reelId;
    this.dayData.facebook.reels.totalSwipes++;
    recordHourlyMetrics(this.dayData, { swipes: 1 });
    this.onUpdate();
    saveDayData(this.dayData, "facebook", false);
    this.onAction();

    this._fbReelTimer = setTimeout(() => {
      this.dayData.facebook.reels.validViews++;
      this._fbReelTimer = null;
      this.onUpdate();
      saveDayData(this.dayData, "facebook", false);
    }, 2000);

    this._setupShortLoopTracker("facebook");
  }

  // ─── TikTok Tracking ───────────────────────────────────────────────────────

  handleTikTokSwipe() {
    if (!this.dayData.tiktok) return;
    this.dayData.tiktok.shorts.totalSwipes++;
    recordHourlyMetrics(this.dayData, { swipes: 1 });
    this.onUpdate();
    saveDayData(this.dayData, "tiktok", false);
    this.onAction();

    this._setupShortLoopTracker("tiktok");
  }

  // ─── Loop Tracker (Shorts / Reels / TikTok) ───────────────────────────────────────

  _setupShortLoopTracker(platform) {
    setTimeout(() => {
      let video;
      if (platform === "youtube") {
        const container =
          document.querySelector("ytd-reel-video-renderer[is-active]") ||
          document.querySelector("ytd-shorts");
        video = container ? container.querySelector("video") : document.querySelector("video");
      } else {
        video = document.querySelector("video");
      }

      if (!video || video === this._currentShortVideoEl) return;
      this._currentShortVideoEl = video;

      let lastTime = 0;
      const onTimeUpdate = () => {
        const isOnPage = platform === "youtube"
          ? location.pathname.startsWith("/shorts")
          : (platform === "tiktok" ? location.hostname.includes("tiktok.com") : location.pathname.includes("/reel"));

        if (!isOnPage) {
          video.removeEventListener("timeupdate", onTimeUpdate);
          return;
        }
        if (video.duration > 0 && lastTime > video.duration * 0.8 && video.currentTime < 1.0) {
          if (platform === "youtube") {
            this.dayData.youtube.shorts.loopViews++;
          } else if (platform === "tiktok") {
            if (this.dayData.tiktok) this.dayData.tiktok.shorts.loopViews++;
          } else {
            this.dayData.facebook.reels.loopViews++;
          }
          this.onUpdate();
          saveDayData(this.dayData, platform, false);
        }
        lastTime = video.currentTime;
      };

      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ended", () => {
        if (platform === "youtube") {
          this.dayData.youtube.shorts.loopViews++;
        } else if (platform === "tiktok") {
          if (this.dayData.tiktok) this.dayData.tiktok.shorts.loopViews++;
        } else {
          this.dayData.facebook.reels.loopViews++;
        }
        this.onUpdate();
        saveDayData(this.dayData, platform, false);
      });
    }, 1000);
  }

  // ─── Facebook Feed Observer ───────────────────────────────────────────────

  setupFBFeedObserver() {
    if (this._feedScrollObserver) this._feedScrollObserver.disconnect();

    this._feedScrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const sig = el.getAttribute("data-post-sig");
          if (sig && !this._seenFBPosts.has(sig)) {
            this._seenFBPosts.add(sig);
            if (!this.dayData.facebook.feed) {
              this.dayData.facebook.feed = { feedPostsScrolled: 0, feedPostsRead: 0 };
            }
            this.dayData.facebook.feed.feedPostsScrolled++;
            recordHourlyMetrics(this.dayData, { feedScrolled: 1 });
            this.onUpdate();
            saveDayData(this.dayData, "facebook", false);
            this._feedScrollObserver.unobserve(el);
            this.onAction();
          }
        }
      });
    }, { threshold: 0.3 });

    this.attachFBFeedPosts();
  }

  attachFBFeedPosts() {
    if (this._attachPostsTimeout) return;
    this._attachPostsTimeout = setTimeout(() => {
      this._attachPostsTimeout = null;
      if (!this._feedScrollObserver) return;
      const posts = document.querySelectorAll("div.html-div");
      posts.forEach(post => {
        if (post.innerText && post.innerText.length > 150 && post.offsetHeight > 100) {
          const sig = post.innerText.substring(0, 60).replace(/\n/g, " ").trim();
          if (sig && !this._seenFBPosts.has(sig)) {
            post.setAttribute("data-post-sig", sig);
            this._feedScrollObserver.observe(post);
          }
        }
      });
    }, 300);
  }

  // ─── Flush khi rời trang ─────────────────────────────────────────────────

  flush(targetKeywords = []) {
    if (this.isYT) this.endYTLongVideo(targetKeywords);
    saveDayData(this.dayData, this.platformKey, true);
  }
}
