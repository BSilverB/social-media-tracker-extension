/**
 * Mindful Social Media Tracker - Tracker Module
 * Chuyên trách: Đếm Swipes/Views/Loops, theo dõi % Completion Rate video dài,
 * bắt F5/Reload, click Home, và quản lý Active Time.
 */

import { saveDayData, formatTimeShort } from "../../utils/storage.js";
import { categorizeText } from "./keyword-filter.js";

const IDLE_THRESHOLD_MS = 30000;

export class Tracker {
  /**
   * @param {object} opts
   * @param {object} opts.dayData     - Tham chiếu đến dayData chia sẻ
   * @param {string} opts.platformKey - "youtube" | "facebook"
   * @param {boolean} opts.isYT
   * @param {boolean} opts.isFB
   * @param {Function} opts.onUpdate  - Callback gọi khi dữ liệu thay đổi
   * @param {Function} opts.onAction  - Callback trigger friction check
   * @param {Function} opts.getFocusMode - () => "music" | "study"
   * @param {Function} opts.onStudyCheckInNeeded - (videoId, title) => void
   */
  constructor({ dayData, platformKey, isYT, isFB, onUpdate, onAction, onImpulsive, onUseful, getFocusMode, onStudyCheckInNeeded }) {
    this.dayData = dayData;
    this.platformKey = platformKey;
    this.isYT = isYT;
    this.isFB = isFB;
    this.onUpdate = onUpdate || (() => {});
    this.onAction = onAction || (() => {});
    this.onImpulsive = onImpulsive || (() => {});
    this.onUseful = onUseful || (() => {});
    this.getFocusMode = getFocusMode || (() => "music");
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
          this.dayData[this.platformKey].summary.activeTimeSeconds++;
        } else {
          this.dayData[this.platformKey].summary.passiveTimeSeconds++;
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
        this._registerReloadAttempt();
        this.onUpdate();
        saveDayData(this.dayData, "youtube", false);
      } else if (this.isFB && target.closest("a[aria-label='Facebook'], svg[aria-label='Facebook'], a[href='/?ref=logo'], a[href='/']")) {
        this.dayData.facebook.summary.reloadCount++;
        this._registerReloadAttempt();
        this.onUpdate();
        saveDayData(this.dayData, "facebook", false);
      }
    }, true);
  }

  // ─── YouTube Shorts ───────────────────────────────────────────────────────

  handleYTShorts(shortId) {
    if (!shortId || shortId === this._currentYTShortId) return;
    this._currentYTShortId = shortId;

    this.dayData.youtube.shortVideos.totalSwipes++;
    this.onUpdate();
    saveDayData(this.dayData, "youtube", false);
    this.onAction();

    if (this._shortViewTimer) clearTimeout(this._shortViewTimer);
    this._shortViewTimer = setTimeout(() => {
      this.dayData.youtube.shortVideos.validViews++;
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

    // Nếu đang ở Chế độ Học tập (Study Focus), sau 10s xem nếu chưa phân loại được thì trigger check-in
    if (this.getFocusMode() === "study") {
      this._studyCheckInTimeout = setTimeout(() => {
        if (this._currentYTLongId === videoId && !this._checkedInVideos.has(videoId)) {
          const category = categorizeText(this._currentYTLongTitle);
          const lowerTitle = (this._currentYTLongTitle || "").toLowerCase();
          const matchesKeyword = (targetKeywords || []).some(k => lowerTitle.includes(k.toLowerCase()));
          if (!matchesKeyword && category === "Khác") {
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
    const isFocusMusic = this.getFocusMode() === "music";
    const isMusic = this.isMusicVideo(this._currentYTLongTitle, this._currentYTLongChannel);

    if (isFocusMusic && isMusic) {
      if (watched >= 5) {
        if (!this.dayData.youtube.musicVideos) {
          this.dayData.youtube.musicVideos = { totalWatched: 0, totalDurationSeconds: 0 };
        }
        this.dayData.youtube.musicVideos.totalWatched++;
        this.dayData.youtube.musicVideos.totalDurationSeconds += watched;
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

      // Completion Rate Logic (Giai đoạn 3)
      const isUseful = watchPct >= 0.80 || watched >= 180;          // >= 80% hoặc >= 3 phút đủ thời lượng dài
      const isImpulsive = duration > 60 && watchPct < 0.15;         // < 15% và video > 1 phút

      let category = categorizeText(this._currentYTLongTitle);

      const record = {
        id: this._currentYTLongId,
        title: this._currentYTLongTitle || "Không rõ tiêu đề",
        watchedSeconds: watched,
        durationSeconds: duration,
        completionPct: duration > 0 ? Math.round(watchPct * 100) : null,
        category,
        isImpulsive,
        isUseful,
        isImpulsiveSkip: isImpulsive,
        timestamp: Date.now()
      };

      const lv = this.dayData.youtube.longVideos;
      lv.totalWatched++;
      if (isImpulsive) {
        lv.impulsiveCount++;
        this.onImpulsive("impulsive_video");
      }
      if (isUseful) {
        lv.usefulCount = (lv.usefulCount || 0) + 1;
        this.onUseful("useful_video");
      }

      lv.details.unshift(record);
      if (lv.details.length > 50) lv.details.pop();

      saveDayData(this.dayData, "youtube", true);
      this.onUpdate();
      this.onAction();

      // ─── LỚP 2: GEMINI API FALLBACK NẾU LỚP 1 KHÔNG NHẬN DIỆN ĐƯỢC ──────────
      // Chỉ áp dụng với video dài xem >= 15s hoặc xem >= 80% (Tiết kiệm token Free Tier)
      if (category === "Khác" && this._currentYTLongTitle && (watched >= 15 || watchPct >= 0.80)) {
        const videoIdToClassify = this._currentYTLongId;
        const videoTitleToClassify = this._currentYTLongTitle;

        // 1. Đưa vào hàng đợi tạm unmatched_queue cho cơ chế tự tiến hóa lúc 22h00
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: "ADD_UNMATCHED_VIDEO",
            id: videoIdToClassify,
            title: videoTitleToClassify,
            watchedSeconds: watched
          }).catch(() => {});

          // 2. Gửi yêu cầu phân loại ngầm sang Background Service Worker
          // (Background kiểm tra Token Cache trước, không tốn token nếu đã phân loại)
          chrome.runtime.sendMessage({
            type: "GEMINI_CLASSIFY",
            videoId: videoIdToClassify,
            title: videoTitleToClassify,
            watchedSeconds: watched,
            isShort: false
          }, (res) => {
            if (res && res.category && res.category !== "Khác") {
              // Cập nhật lại bản ghi trong chi tiết video
              record.category = res.category;
              record.relevanceScore = res.relevanceScore;

              if (res.relevanceScore >= 60 && !record.isUseful) {
                record.isUseful = true;
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
    this._currentFBReelId = reelId;

    this.dayData.facebook.reels.totalSwipes++;
    this.onUpdate();
    saveDayData(this.dayData, "facebook", false);
    this.onAction();

    if (this._fbReelTimer) clearTimeout(this._fbReelTimer);
    this._fbReelTimer = setTimeout(() => {
      this.dayData.facebook.reels.validViews++;
      this.onUpdate();
      saveDayData(this.dayData, "facebook", false);
    }, 2000);

    this._setupShortLoopTracker("facebook");
  }

  // ─── Loop Tracker (Shorts / Reels) ───────────────────────────────────────

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
          : location.pathname.includes("/reel");

        if (!isOnPage) {
          video.removeEventListener("timeupdate", onTimeUpdate);
          return;
        }
        if (video.duration > 0 && lastTime > video.duration * 0.8 && video.currentTime < 1.0) {
          if (platform === "youtube") {
            this.dayData.youtube.shortVideos.loopViews++;
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
          this.dayData.youtube.shortVideos.loopViews++;
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
            this.dayData.facebook.summary.feedPostsScrolled++;
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
