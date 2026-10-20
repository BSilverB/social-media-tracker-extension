(() => {
  // src/utils/storage.js
  function getDateStr(date = /* @__PURE__ */ new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function getTodayKey(date = /* @__PURE__ */ new Date()) {
    return `stats_${getDateStr(date)}`;
  }
  function createDefaultHourlyBuckets() {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      swipes: 0,
      longVideos: 0,
      feedScrolled: 0,
      reloads: 0,
      activeSeconds: 0
    }));
  }
  function createDefaultDayData(dateStr = getDateStr()) {
    return {
      date: dateStr,
      // 1. NỀN TẢNG YOUTUBE
      youtube: {
        summary: {
          activeSeconds: 0,
          passiveSeconds: 0,
          reloadCount: 0
        },
        shorts: {
          totalSwipes: 0,
          validViews: 0,
          impulsiveCount: 0,
          loopViews: 0
        },
        longVideos: {
          totalWatched: 0,
          usefulCount: 0,
          impulsiveCount: 0
        },
        musicVideos: {
          totalWatched: 0,
          durationSeconds: 0
        }
      },
      // 2. NỀN TẢNG FACEBOOK
      facebook: {
        summary: {
          activeSeconds: 0,
          passiveSeconds: 0,
          reloadCount: 0
        },
        feed: {
          feedPostsScrolled: 0,
          feedPostsRead: 0
        },
        reels: {
          totalSwipes: 0,
          validViews: 0,
          impulsiveCount: 0,
          loopViews: 0
        },
        longVideos: {
          totalWatched: 0,
          usefulCount: 0,
          impulsiveCount: 0
        }
      },
      // 3. NỀN TẢNG TIKTOK
      tiktok: {
        summary: {
          activeSeconds: 0,
          passiveSeconds: 0,
          reloadCount: 0
        },
        shorts: {
          totalSwipes: 0,
          validViews: 0,
          impulsiveCount: 0,
          loopViews: 0
        }
      },
      // 4. PHÂN BỔ 24 BUCKETS THEO GIỜ
      hourly: createDefaultHourlyBuckets(),
      // 5. CHỈ SỐ VƯỢT QUA CÁM DỖ (Box Breathing 12s)
      temptation: {
        resistedCount: 0,
        succumbedCount: 0
      },
      // 6. NHẬT KÝ VIDEO TRONG NGÀY
      watchedVideos: [],
      // 7. HÀNG ĐỢI VIDEO LỌT BỘ LỌC TĨNH
      unmatchedQueue: [],
      // 8. KẾT QUẢ PHẢN TƯ CUỐI NGÀY
      reflection: {
        lesson1: "",
        lesson2: "",
        rating: 5,
        aiFeedback: "",
        submittedAt: null
      },
      petEnergyEndOfDay: 100
    };
  }
  var DEFAULT_CONFIG = {
    syncCode: "MF-8924",
    auto_sync: true,
    masterGoal: "Mu\u1ED1n tr\u1EDF th\xE0nh phi\xEAn b\u1EA3n t\u1ED1t h\u01A1n \u0111\u1EC3 g\u1EB7p ng\u01B0\u1EDDi \u1EA5y",
    leisureQuotaMinutes: 45,
    geminiApiKey: "",
    emotionalAnchorImage: "",
    thresholds: {
      youtube: {
        shorts: { m1: 15, m2: 30, m3: 45 },
        long: { m1: 3, m2: 5, m3: 8 }
      },
      facebook: {
        reels: { m1: 15, m2: 30, m3: 45 },
        feeds: { m1: 20, m2: 40, m3: 60 },
        long: { m1: 2, m2: 4, m3: 6 }
      },
      tiktok: {
        shorts: { m1: 15, m2: 30, m3: 45 }
      }
    },
    pomodoro: {
      enabled: false,
      focusMinutes: 25,
      breakMinutes: 5
    },
    bedtime: {
      enabled: true,
      start: "22:30",
      end: "05:00"
    },
    reflection: {
      reminderTime: "22:00"
    },
    keywords: {
      target: ["l\u1EADp tr\xECnh", "ti\u1EBFng anh", "k\u1EF9 n\u0103ng", "s\xE1ch", "h\u1ECDc", "ph\xE1t tri\u1EC3n", "t\xE0i ch\xEDnh", "c\xF4ng ngh\u1EC7"],
      leisure: ["h\xE0i", "game", "gaming", "streamer", "vlog", "ca nh\u1EA1c", "n\u1EA5u \u0103n"],
      distraction: ["drama", "b\xF3c ph\u1ED1t", "h\xF3ng bi\u1EBFn", "scandal", "c\u1EDD b\u1EA1c", "gi\u1EADt g\xE2n"]
    },
    localPreferences: {
      hudPosition: { x: 20, y: 80 },
      grayscaleMode: "threshold_m2"
    }
  };
  var DEFAULT_PET_STATE = {
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
    puppetPhotos: {
      happyImage: "",
      neutralImage: "",
      sadImage: ""
    },
    aiSprites: {
      happy: "",
      neutral: "",
      sad: ""
    },
    userPersona: {
      totalTrackedDays: 0,
      streakRecord: 0,
      totalUsefulVideos: 0,
      avgUsefulPct: 0,
      vulnerabilities: ["D\u1EC5 l\u01B0\u1EDBt v\xF4 th\u1EE9c sau 21h30", "Hay F5 khi g\u1EB7p b\xE0i kh\xF3"],
      strengths: ["Xem tr\u1ECDn v\u1EB9n video h\u1ECDc t\u1EADp d\xE0i tr\xEAn 10 ph\xFAt"],
      history: []
    }
  };
  function recordHourlyMetrics(dayData2, { swipes = 0, longVideos = 0, feedScrolled = 0, reloads = 0, activeSeconds = 0 } = {}) {
    if (!dayData2 || !Array.isArray(dayData2.hourly)) return;
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    if (currentHour >= 0 && currentHour < 24) {
      if (!dayData2.hourly[currentHour]) {
        dayData2.hourly[currentHour] = {
          hour: currentHour,
          swipes: 0,
          longVideos: 0,
          feedScrolled: 0,
          reloads: 0,
          activeSeconds: 0
        };
      }
      const b = dayData2.hourly[currentHour];
      if (swipes) b.swipes = (b.swipes || 0) + swipes;
      if (longVideos) b.longVideos = (b.longVideos || 0) + longVideos;
      if (feedScrolled) b.feedScrolled = (b.feedScrolled || 0) + feedScrolled;
      if (reloads) b.reloads = (b.reloads || 0) + reloads;
      if (activeSeconds) b.activeSeconds = (b.activeSeconds || 0) + activeSeconds;
    }
  }
  function loadAppData(callback) {
    const todayKey = getTodayKey();
    chrome.storage.local.get([todayKey, "app_config", "pet_state", "pomodoro_state"], (result) => {
      const config = Object.assign({}, DEFAULT_CONFIG, result.app_config || {});
      config.thresholds = Object.assign({}, DEFAULT_CONFIG.thresholds, config.thresholds || {});
      config.keywords = Object.assign({}, DEFAULT_CONFIG.keywords, config.keywords || {});
      config.localPreferences = Object.assign({}, DEFAULT_CONFIG.localPreferences, config.localPreferences || {});
      const dayData2 = Object.assign(createDefaultDayData(), result[todayKey] || {});
      const petState = Object.assign({}, DEFAULT_PET_STATE, result.pet_state || {});
      const pomodoroState = result.pomodoro_state || {
        enabled: config.pomodoro?.enabled || false,
        sessionType: "focus",
        sessionStartTime: Date.now(),
        durationMinutes: config.pomodoro?.focusMinutes || 25
      };
      if (callback) {
        callback({ config, dayData: dayData2, petState, pomodoroState, todayKey });
      }
    });
  }
  var saveTimer = null;
  var pendingSave = false;
  function saveDayData(dayData2, platformKey2, immediate = false) {
    pendingSave = true;
    const executeSave = () => {
      if (!pendingSave) return;
      pendingSave = false;
      const targetDate = dayData2?.date || getDateStr();
      const targetKey = `stats_${targetDate}`;
      chrome.storage.local.get([targetKey], (res) => {
        const existing = res[targetKey] || createDefaultDayData(targetDate);
        if (platformKey2 === "youtube" && dayData2.youtube) {
          existing.youtube = dayData2.youtube;
        } else if (platformKey2 === "facebook" && dayData2.facebook) {
          existing.facebook = dayData2.facebook;
        } else if (platformKey2 === "tiktok" && dayData2.tiktok) {
          existing.tiktok = dayData2.tiktok;
        }
        if (dayData2.hourly) existing.hourly = dayData2.hourly;
        if (dayData2.temptation) existing.temptation = dayData2.temptation;
        if (dayData2.watchedVideos) existing.watchedVideos = dayData2.watchedVideos;
        if (dayData2.unmatchedQueue) existing.unmatchedQueue = dayData2.unmatchedQueue;
        if (dayData2.reflection) existing.reflection = dayData2.reflection;
        if (typeof dayData2.petEnergyEndOfDay === "number") {
          existing.petEnergyEndOfDay = dayData2.petEnergyEndOfDay;
        }
        const payload = {};
        payload[targetKey] = existing;
        chrome.storage.local.set(payload);
      });
    };
    if (immediate) {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      executeSave();
    } else if (!saveTimer) {
      saveTimer = setTimeout(() => {
        saveTimer = null;
        executeSave();
      }, 2500);
    }
  }
  function saveHUDPosition(pos) {
    chrome.storage.local.get(["app_config"], (res) => {
      const config = res.app_config || DEFAULT_CONFIG;
      if (!config.localPreferences) config.localPreferences = {};
      config.localPreferences.hudPosition = pos;
      chrome.storage.local.set({ app_config: config });
    });
  }
  function savePomodoroState(state) {
    chrome.storage.local.set({ pomodoro_state: state });
  }
  function formatTimeShort(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return m > 0 ? `${m}m ${remSec}s` : `${remSec}s`;
  }

  // src/content/modules/keyword-filter.js
  var CATEGORY_RULES = {
    "Ph\xE1t tri\u1EC3n b\u1EA3n th\xE2n": [
      /kỷ luật/i,
      /thói quen/i,
      /tư duy/i,
      /động lực/i,
      /phát triển bản thân/i,
      /self[- ]help/i,
      /đọc sách/i,
      /cuốn sách/i,
      /bài học cuộc sống/i,
      /quản lý thời gian/i,
      /năng suất/i,
      /mindset/i,
      /productivity/i,
      /habit/i,
      /discipline/i,
      /motivation/i,
      /thành công/i,
      /triết lý/i
    ],
    "Gi\xE1o d\u1EE5c & C\xF4ng ngh\u1EC7": [
      /học/i,
      /hướng dẫn/i,
      /tutorial/i,
      /bài giảng/i,
      /lập trình/i,
      /code/i,
      /coding/i,
      /khoa học/i,
      /lịch sử/i,
      /tiếng anh/i,
      /english/i,
      /kiến thức/i,
      /kỹ năng/i,
      /giáo dục/i,
      /education/i,
      /course/i,
      /khoá học/i,
      /toán/i,
      /vật lý/i,
      /trí tuệ nhân tạo/i,
      /ai\b/i,
      /công nghệ/i,
      /review công nghệ/i,
      /software/i,
      /developer/i,
      /frontend/i,
      /backend/i
    ],
    "T\xE0i ch\xEDnh & \u0110\u1EA7u t\u01B0": [
      /tiền/i,
      /tài chính/i,
      /đầu tư/i,
      /chứng khoán/i,
      /cổ phiếu/i,
      /crypto/i,
      /bitcoin/i,
      /bất động sản/i,
      /tiết kiệm/i,
      /kinh doanh/i,
      /làm giàu/i,
      /ngân hàng/i,
      /thu nhập/i,
      /finance/i,
      /investment/i,
      /stock/i,
      /business/i,
      /wealth/i,
      /lãi suất/i,
      /khởi nghiệp/i
    ],
    "Gi\u1EA3i tr\xED & \u0110\u1EDDi s\u1ED1ng": [
      /hài/i,
      /troll/i,
      /game/i,
      /gaming/i,
      /streamer/i,
      /funny/i,
      /vlog/i,
      /review phim/i,
      /phim/i,
      /ca nhạc/i,
      /mv\b/i,
      /nhạc/i,
      /song/i,
      /showbiz/i,
      /drama/i,
      /anime/i,
      /manga/i,
      /bóng đá/i,
      /thể thao/i,
      /clip vui/i,
      /meme/i,
      /giải trí/i,
      /dance/i,
      /tiktok/i,
      /trend/i,
      /ẩm thực/i,
      /nấu ăn/i,
      /du lịch/i
    ]
  };
  function categorizeText(text) {
    if (!text || typeof text !== "string") return "Kh\xE1c";
    for (const [catName, regexList] of Object.entries(CATEGORY_RULES)) {
      for (const regex of regexList) {
        if (regex.test(text)) return catName;
      }
    }
    return "Kh\xE1c";
  }
  function classifyByKeywords(title = "", keywordsConfig = {}) {
    if (!title || typeof title !== "string") return "unclassified";
    const lower = title.toLowerCase();
    const targetList = Array.isArray(keywordsConfig.target) ? keywordsConfig.target : [];
    for (const kw of targetList) {
      if (kw && lower.includes(kw.trim().toLowerCase())) return "goal";
    }
    const distractionList = Array.isArray(keywordsConfig.distraction) ? keywordsConfig.distraction : [];
    for (const kw of distractionList) {
      if (kw && lower.includes(kw.trim().toLowerCase())) return "distraction";
    }
    const leisureList = Array.isArray(keywordsConfig.leisure) ? keywordsConfig.leisure : [];
    for (const kw of leisureList) {
      if (kw && lower.includes(kw.trim().toLowerCase())) return "leisure";
    }
    const cat = categorizeText(title);
    if (cat === "Gi\xE1o d\u1EE5c & C\xF4ng ngh\u1EC7" || cat === "Ph\xE1t tri\u1EC3n b\u1EA3n th\xE2n" || cat === "T\xE0i ch\xEDnh & \u0110\u1EA7u t\u01B0") {
      return "goal";
    }
    if (cat === "Gi\u1EA3i tr\xED & \u0110\u1EDDi s\u1ED1ng") {
      return "leisure";
    }
    return "unclassified";
  }
  function normalizeCategory(category) {
    if (!category) return "Ch\u01B0a r\xF5";
    const c = category.toString().toLowerCase().trim();
    if (c === "goal" || c === "m\u1EE5c ti\xEAu") return "M\u1EE5c ti\xEAu";
    if (c === "leisure" || c === "gi\u1EA3i tr\xED") return "Gi\u1EA3i tr\xED";
    if (c === "distraction" || c === "l\u1EA1c l\u1ED1i" || c === "ph\xE2n t\xE2m") return "L\u1EA1c l\u1ED1i";
    return "Ch\u01B0a r\xF5";
  }

  // src/content/modules/tracker.js
  var IDLE_THRESHOLD_MS = 3e4;
  var Tracker = class {
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
      dayData: dayData2,
      platformKey: platformKey2,
      isYT: isYT2,
      isFB: isFB2,
      keywordsConfig,
      onUpdate: onUpdate2,
      onAction: onAction2,
      onImpulsive,
      onUseful,
      getFocusMode,
      isPomodoroFocus,
      onStudyCheckInNeeded,
      onDayRollover
    }) {
      this.dayData = dayData2;
      this.platformKey = platformKey2;
      this.isYT = isYT2;
      this.isFB = isFB2;
      this.keywordsConfig = keywordsConfig || {};
      this.onUpdate = onUpdate2 || (() => {
      });
      this.onAction = onAction2 || (() => {
      });
      this.onImpulsive = onImpulsive || (() => {
      });
      this.onUseful = onUseful || (() => {
      });
      this.getFocusMode = getFocusMode || (() => "music");
      this.isPomodoroFocus = isPomodoroFocus || (() => false);
      this.onStudyCheckInNeeded = onStudyCheckInNeeded || null;
      this.onDayRollover = onDayRollover || null;
      this._lastUserActivity = Date.now();
      this._activityThrottle = 0;
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
      this._adRetryTimeout = null;
      this._checkedInVideos = /* @__PURE__ */ new Set();
      this._currentFBReelId = null;
      this._fbReelTimer = null;
      this._currentFBReelVideoEl = null;
      this._seenFBPosts = /* @__PURE__ */ new Set();
      this._feedScrollObserver = null;
      this._attachPostsTimeout = null;
      this._timeInterval = null;
    }
    setDayData(newDayData) {
      this.dayData = newDayData;
    }
    _checkRolloverBeforeAction() {
      if (this.onDayRollover && this.dayData?.date && this.dayData.date !== getDateStr()) {
        this.onDayRollover();
      }
    }
    // ─── Activity & Time Tracking ─────────────────────────────────────────────
    startActivityTracking() {
      const handleActivity = () => {
        const now = Date.now();
        if (now - this._activityThrottle > 1e3) {
          this._activityThrottle = now;
          this._lastUserActivity = now;
        }
      };
      ["mousemove", "keydown", "wheel", "pointerdown", "touchstart"].forEach((evt) => {
        window.addEventListener(evt, handleActivity, { passive: true });
      });
      this._timeInterval = setInterval(() => {
        if (!document.hidden) {
          if (this.onDayRollover && this.dayData?.date && this.dayData.date !== getDateStr()) {
            this.onDayRollover();
            return;
          }
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
      }, 1e3);
    }
    stopActivityTracking() {
      if (this._timeInterval) clearInterval(this._timeInterval);
    }
    // ─── Reload / F5 Detection ────────────────────────────────────────────────
    checkPageReload() {
      try {
        const navEntries = performance.getEntriesByType("navigation");
        const isReload = navEntries.length > 0 && navEntries[0].type === "reload" || performance.navigation && performance.navigation.type === 1;
        if (isReload) {
          this.dayData[this.platformKey].summary.reloadCount++;
          recordHourlyMetrics(this.dayData, { reloads: 1 });
          this._registerReloadAttempt();
          saveDayData(this.dayData, this.platformKey, true);
        }
      } catch (e) {
      }
    }
    _registerReloadAttempt() {
      const now = Date.now();
      let reloads = [];
      try {
        reloads = JSON.parse(sessionStorage.getItem("mindful_recent_reloads") || "[]");
      } catch (e) {
        reloads = [];
      }
      reloads.push(now);
      reloads = reloads.filter((t) => now - t <= 12e4);
      sessionStorage.setItem("mindful_recent_reloads", JSON.stringify(reloads));
      if (reloads.length >= 3) {
        this._showToast("\u{1F9D8}\u200D\u2642\uFE0F B\u1EA3ng tin ch\u01B0a c\xF3 g\xEC m\u1EDBi \u0111\xE2u, h\xE3y h\xEDt th\u1EDF s\xE2u n\xE0o!", 4500);
        this.onImpulsive("reload_spam");
      }
    }
    _showToast(msg, durationMs = 4e3) {
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
      setTimeout(() => {
        if (toast) toast.style.opacity = "0";
      }, durationMs);
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
      this._checkRolloverBeforeAction();
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
        const shortTitle = this.extractCurrentYTShortTitle() || "YouTube Short";
        const shortChannel = this.extractCurrentYTShortChannel() || "";
        this.recordShortVideoItem({
          id: shortId,
          title: shortTitle,
          channel: shortChannel,
          platform: "youtube",
          contentType: "shorts"
        });
        this.onUpdate();
        saveDayData(this.dayData, "youtube", false);
      }, 2e3);
      this._setupShortLoopTracker("youtube");
    }
    // ─── Music Video Detection ───────────────────────────────────────────────
    isMusicVideo(title = "", channelName = "") {
      if (!this.isYT) return false;
      try {
        const activeChips = document.querySelectorAll(
          "yt-chip-cloud-chip-renderer[selected], #chips yt-chip-cloud-chip-renderer[aria-selected='true'], yt-chip-cloud-chip-renderer"
        );
        for (const chip of activeChips) {
          const text = chip.textContent.trim().toLowerCase();
          if (text === "\xE2m nh\u1EA1c" || text === "nh\u1EA1c" || text === "music") {
            if (chip.hasAttribute("selected") || chip.getAttribute("aria-selected") === "true") {
              return true;
            }
          }
        }
      } catch (_) {
      }
      const ch = (channelName || "").toLowerCase();
      if (ch.endsWith("- topic") || ch.endsWith("- ch\u1EE7 \u0111\u1EC1") || ch.includes("official music") || ch.includes("records") || ch.includes("vevo")) {
        return true;
      }
      if (document.querySelector("ytd-channel-name ytd-badge-supported-renderer [aria-label*='ngh\u1EC7 s\u0129'], ytd-channel-name ytd-badge-supported-renderer [aria-label*='Artist']")) {
        return true;
      }
      const t = (title || "").toLowerCase();
      const musicRegex = /\b(music|lofi|chill|playlist|nhạc|bài hát|soundtrack|acoustic|instrumental|remix|piano|ambient|audio|mv|official music video|karaoke|beat|lyric|lyrics|mashup|ost|medley|guitar|synthwave|relaxing)\b/i;
      return musicRegex.test(t) || musicRegex.test(ch);
    }
    // ─── YouTube Ad Detection ─────────────────────────────────────────────────
    isAdActive() {
      if (!this.isYT) return false;
      try {
        const player = document.querySelector("#movie_player, .html5-video-player, ytm-player, #player");
        if (player) {
          const cls = player.classList;
          if (cls.contains("ad-showing") || cls.contains("ad-interrupting")) {
            return true;
          }
        }
        if (document.querySelector(".ad-showing, .ad-interrupting")) {
          return true;
        }
        const adOverlay = document.querySelector(
          ".ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-skip-button-container, .ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-preview-container, .ytp-ad-duration-remaining, .ytp-ad-message-container"
        );
        if (adOverlay && adOverlay.offsetParent !== null) {
          return true;
        }
        const adModule = document.querySelector(".video-ads.ytp-ad-module, .video-ads");
        if (adModule && adModule.childElementCount > 0 && adModule.offsetParent !== null) {
          return true;
        }
        return false;
      } catch (_) {
        return false;
      }
    }
    // ─── YouTube Long Videos ──────────────────────────────────────────────────
    startYTLongTracking(videoId, targetKeywords = []) {
      if (!videoId || typeof videoId !== "string") return;
      if (videoId === this._currentYTLongId) return;
      if (this.isAdActive()) {
        if (this._adRetryTimeout) clearTimeout(this._adRetryTimeout);
        this._adRetryTimeout = setTimeout(() => {
          this.startYTLongTracking(videoId, targetKeywords);
        }, 1e3);
        return;
      }
      this.endYTLongVideo(targetKeywords);
      this._currentYTLongId = videoId;
      this._currentYTLongWatchedSec = 0;
      this._currentYTLongDuration = 0;
      this._currentYTLongTitle = "";
      this._currentYTLongChannel = "";
      this.onAction();
      const fetchMetadata = () => {
        if (this.isAdActive()) {
          setTimeout(fetchMetadata, 1e3);
          return;
        }
        const titleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title");
        this._currentYTLongTitle = titleEl ? titleEl.textContent.trim() : document.title.replace("- YouTube", "").trim();
        const channelEl = document.querySelector("#channel-name #text, ytd-channel-name yt-formatted-string, .channel-name");
        this._currentYTLongChannel = channelEl ? channelEl.textContent.trim() : "";
        const videoEl = document.querySelector("video.html5-main-video");
        if (videoEl && !this.isAdActive()) {
          this._currentYTLongDuration = videoEl.duration || 0;
        }
      };
      setTimeout(fetchMetadata, 1500);
      if (this._studyCheckInTimeout) {
        clearTimeout(this._studyCheckInTimeout);
        this._studyCheckInTimeout = null;
      }
      if (this.isPomodoroFocus() && this.getFocusMode() === "study") {
        this._studyCheckInTimeout = setTimeout(() => {
          if (this._currentYTLongId === videoId && !this._checkedInVideos.has(videoId) && !this.isAdActive()) {
            if (!this._currentYTLongTitle) {
              const titleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1, h1.title");
              this._currentYTLongTitle = titleEl ? titleEl.textContent.trim() : document.title.replace("- YouTube", "").trim();
            }
            const category = categorizeText(this._currentYTLongTitle);
            const lowerTitle = (this._currentYTLongTitle || "").toLowerCase();
            const matchesKeyword = (targetKeywords || []).some((k) => lowerTitle.includes(k.toLowerCase()));
            const isTargetOrEducational = matchesKeyword || category === "Gi\xE1o d\u1EE5c & C\xF4ng ngh\u1EC7" || category === "Ph\xE1t tri\u1EC3n b\u1EA3n th\xE2n" || category === "T\xE0i ch\xEDnh & \u0110\u1EA7u t\u01B0";
            if (!isTargetOrEducational && category === "Kh\xE1c") {
              this._checkedInVideos.add(videoId);
              this.onStudyCheckInNeeded?.(videoId, this._currentYTLongTitle);
            }
          }
        }, 1e4);
      }
      if (this._ytWatchInterval) clearInterval(this._ytWatchInterval);
      this._ytWatchInterval = setInterval(() => {
        if (this.isAdActive()) {
          return;
        }
        const videoEl = document.querySelector("video.html5-main-video");
        if (videoEl && !videoEl.paused && !document.hidden) {
          this._currentYTLongWatchedSec++;
          if ((!this._currentYTLongDuration || this._currentYTLongDuration === 0) && videoEl.duration) {
            this._currentYTLongDuration = videoEl.duration;
          }
        }
      }, 1e3);
    }
    endYTLongVideo(targetKeywords = []) {
      if (!this._currentYTLongId) return;
      this._checkRolloverBeforeAction();
      if (this._studyCheckInTimeout) {
        clearTimeout(this._studyCheckInTimeout);
        this._studyCheckInTimeout = null;
      }
      if (this._adRetryTimeout) {
        clearTimeout(this._adRetryTimeout);
        this._adRetryTimeout = null;
      }
      if (this._ytWatchInterval) {
        clearInterval(this._ytWatchInterval);
        this._ytWatchInterval = null;
      }
      const watched = Math.round(this._currentYTLongWatchedSec);
      const duration = Math.round(this._currentYTLongDuration);
      const isPomodoroFocusActive = this.isPomodoroFocus();
      const isFocusMusic = isPomodoroFocusActive && this.getFocusMode() === "music";
      if (isFocusMusic) {
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
      const adCurrentlyActive = this.isAdActive();
      if (adCurrentlyActive && watched < 15) {
        this._currentYTLongId = null;
        this._currentYTLongWatchedSec = 0;
        this._currentYTLongDuration = 0;
        this._currentYTLongTitle = "";
        this._currentYTLongChannel = "";
        return;
      }
      if (watched >= 3) {
        const watchPct = duration > 0 ? watched / duration : 0;
        const isUseful = watchPct >= 0.8 || watched >= 180;
        const isImpulsive = !adCurrentlyActive && duration > 60 && watched >= 10 && watched < 45 && watchPct < 0.2;
        const rawCat = classifyByKeywords(this._currentYTLongTitle, this.keywordsConfig);
        const category = normalizeCategory(rawCat);
        const record = {
          id: this._currentYTLongId,
          title: this._currentYTLongTitle || "Kh\xF4ng r\xF5 ti\xEAu \u0111\u1EC1",
          channel: this._currentYTLongChannel || "Kh\xF4ng r\xF5 k\xEAnh",
          platform: "youtube",
          contentType: "long",
          category,
          // "Mục tiêu" | "Giải trí" | "Lạc lối" | "Chưa rõ"
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
          this.onImpulsive("impulsive_video", {
            title: this._currentYTLongTitle,
            watched,
            duration
          });
        }
        if (isUseful) {
          lv.usefulCount = (lv.usefulCount || 0) + 1;
          this.onUseful("useful_video", {
            title: this._currentYTLongTitle,
            watched,
            duration
          });
        }
        if (!this.dayData.watchedVideos) this.dayData.watchedVideos = [];
        this.dayData.watchedVideos.unshift(record);
        if (this.dayData.watchedVideos.length > 60) this.dayData.watchedVideos.pop();
        if (category === "Ch\u01B0a r\xF5" && this._currentYTLongTitle) {
          if (!this.dayData.unmatchedQueue) this.dayData.unmatchedQueue = [];
          const exists = this.dayData.unmatchedQueue.some((u) => u.title === this._currentYTLongTitle);
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
        if (category === "unclassified" && this._currentYTLongTitle && (watched >= 15 || watchPct >= 0.8)) {
          const videoIdToClassify = this._currentYTLongId;
          const videoTitleToClassify = this._currentYTLongTitle;
          if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
              type: "ADD_UNMATCHED_VIDEO",
              id: videoIdToClassify,
              title: videoTitleToClassify,
              watchedSeconds: watched
            }).catch(() => {
            });
            chrome.runtime.sendMessage({
              type: "GEMINI_CLASSIFY",
              videoId: videoIdToClassify,
              title: videoTitleToClassify,
              watchedSeconds: watched,
              isShort: false
            }, (res) => {
              if (res && res.category && res.category !== "Kh\xE1c") {
                record.category = res.category === "Gi\xE1o d\u1EE5c & C\xF4ng ngh\u1EC7" || res.category === "Ph\xE1t tri\u1EC3n b\u1EA3n th\xE2n" ? "goal" : "leisure";
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
      this._checkRolloverBeforeAction();
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
        const reelTitle = this.extractCurrentFBReelTitle() || "Facebook Reel";
        const reelAuthor = this.extractCurrentFBReelAuthor() || "";
        this.recordShortVideoItem({
          id: reelId,
          title: reelTitle,
          channel: reelAuthor,
          platform: "facebook",
          contentType: "reels"
        });
        this.onUpdate();
        saveDayData(this.dayData, "facebook", false);
      }, 2e3);
      this._setupShortLoopTracker("facebook");
    }
    // ─── TikTok Tracking ───────────────────────────────────────────────────────
    handleTikTokSwipe() {
      if (!this.dayData.tiktok) return;
      this._checkRolloverBeforeAction();
      if (this._tiktokViewTimer) {
        clearTimeout(this._tiktokViewTimer);
        this._tiktokViewTimer = null;
        if (this._currentTikTokId) {
          this.dayData.tiktok.shorts.impulsiveCount = (this.dayData.tiktok.shorts.impulsiveCount || 0) + 1;
        }
      }
      const currentUrl = location.href;
      const tikTokIdMatch = currentUrl.match(/\/video\/(\d+)/);
      const tikTokId = tikTokIdMatch ? tikTokIdMatch[1] : `tt_${Date.now()}`;
      this._currentTikTokId = tikTokId;
      this.dayData.tiktok.shorts.totalSwipes++;
      recordHourlyMetrics(this.dayData, { swipes: 1 });
      this.onUpdate();
      saveDayData(this.dayData, "tiktok", false);
      this.onAction();
      this._tiktokViewTimer = setTimeout(() => {
        if (this.dayData.tiktok) {
          this.dayData.tiktok.shorts.validViews++;
        }
        this._tiktokViewTimer = null;
        const title = this.extractCurrentTikTokTitle() || "TikTok Video";
        this.recordShortVideoItem({
          id: tikTokId,
          title,
          channel: "",
          platform: "tiktok",
          contentType: "shorts"
        });
        this.onUpdate();
        saveDayData(this.dayData, "tiktok", false);
      }, 2e3);
      this._setupShortLoopTracker("tiktok");
    }
    // ─── Loop Tracker (Shorts / Reels / TikTok) ───────────────────────────────────────
    _setupShortLoopTracker(platform) {
      setTimeout(() => {
        let video;
        if (platform === "youtube") {
          const container = document.querySelector("ytd-reel-video-renderer[is-active]") || document.querySelector("ytd-shorts");
          video = container ? container.querySelector("video") : document.querySelector("video");
        } else {
          video = document.querySelector("video");
        }
        if (!video || video === this._currentShortVideoEl) return;
        this._currentShortVideoEl = video;
        let lastTime = 0;
        const onTimeUpdate = () => {
          const isOnPage = platform === "youtube" ? location.pathname.startsWith("/shorts") : platform === "tiktok" ? location.hostname.includes("tiktok.com") : location.pathname.includes("/reel");
          if (!isOnPage) {
            video.removeEventListener("timeupdate", onTimeUpdate);
            return;
          }
          if (video.duration > 0 && lastTime > video.duration * 0.8 && video.currentTime < 1) {
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
      }, 1e3);
    }
    // ─── Facebook Feed Observer ───────────────────────────────────────────────
    setupFBFeedObserver() {
      if (this._feedScrollObserver) this._feedScrollObserver.disconnect();
      this._feedScrollObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
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
        posts.forEach((post) => {
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
    // ─── Ghi nhận Video/Shorts vào Nhật ký nội dung hôm nay ────────────────────
    recordShortVideoItem({ id, title, channel, platform, contentType }) {
      if (!this.dayData.watchedVideos) this.dayData.watchedVideos = [];
      const rawCategory = classifyByKeywords(title, this.keywordsConfig);
      const category = normalizeCategory(rawCategory);
      const existingIdx = this.dayData.watchedVideos.findIndex((v) => v.id === id);
      if (existingIdx >= 0) {
        this.dayData.watchedVideos[existingIdx].watchedSeconds = (this.dayData.watchedVideos[existingIdx].watchedSeconds || 2) + 2;
      } else {
        const record = {
          id: id || `short_${Date.now()}`,
          title: title || "Video ng\u1EAFn",
          channel: channel || "",
          platform: platform || "youtube",
          contentType: contentType || "shorts",
          category,
          // "Mục tiêu" | "Giải trí" | "Lạc lối" | "Chưa rõ"
          watchedSeconds: 2,
          durationSeconds: 30,
          isCompletion: false,
          timestamp: Date.now(),
          userOverridden: false
        };
        this.dayData.watchedVideos.unshift(record);
        if (this.dayData.watchedVideos.length > 60) this.dayData.watchedVideos.pop();
      }
    }
    extractCurrentYTShortTitle() {
      try {
        const activeRenderer = document.querySelector("ytd-reel-video-renderer[is-active]");
        if (activeRenderer) {
          const titleEl = activeRenderer.querySelector("h2.title, .title, #overlay .ytReelVideoTitleText, yt-formatted-string.ytd-reel-player-header-renderer");
          if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();
        }
        const globalTitle = document.querySelector("#shorts-container ytd-reel-video-renderer[is-active] .title, ytd-shorts .title");
        if (globalTitle && globalTitle.textContent.trim()) return globalTitle.textContent.trim();
        const docTitle = document.title ? document.title.replace("- YouTube", "").replace("YouTube", "").trim() : "";
        return docTitle || "YouTube Short";
      } catch (_) {
        return "YouTube Short";
      }
    }
    extractCurrentYTShortChannel() {
      try {
        const activeRenderer = document.querySelector("ytd-reel-video-renderer[is-active]");
        if (activeRenderer) {
          const chEl = activeRenderer.querySelector("ytd-channel-name yt-formatted-string, #channel-name, .ytd-channel-name");
          if (chEl && chEl.textContent.trim()) return chEl.textContent.trim();
        }
      } catch (_) {
      }
      return "";
    }
    extractCurrentFBReelTitle() {
      try {
        const reelContainers = document.querySelectorAll("[role='main'] div[tabindex='-1'], [data-pagelet='Reels'], div[aria-label*='Reel']");
        for (const c of reelContainers) {
          const textEl = c.querySelector("span[dir='auto'], div[dir='auto']");
          if (textEl && textEl.textContent.trim() && textEl.textContent.trim().length > 3) {
            return textEl.textContent.trim().slice(0, 100);
          }
        }
        const docTitle = document.title ? document.title.replace(" | Facebook", "").trim() : "";
        return docTitle && docTitle !== "Facebook" ? docTitle : "Facebook Reel";
      } catch (_) {
        return "Facebook Reel";
      }
    }
    extractCurrentFBReelAuthor() {
      try {
        const authorEl = document.querySelector("h2 span, strong span, a[role='link'] strong");
        return authorEl ? authorEl.textContent.trim() : "";
      } catch (_) {
        return "";
      }
    }
    extractCurrentTikTokTitle() {
      try {
        const titleEl = document.querySelector("[data-e2e='browse-video-desc'], .css-j2a19r-SpanText, [data-e2e='video-desc']");
        if (titleEl && titleEl.textContent.trim()) return titleEl.textContent.trim();
        const docTitle = document.title ? document.title.replace(" | TikTok", "").trim() : "";
        return docTitle && docTitle !== "TikTok" ? docTitle : "TikTok Video";
      } catch (_) {
        return "TikTok Video";
      }
    }
    // ─── Flush khi rời trang ─────────────────────────────────────────────────
    flush(targetKeywords = []) {
      if (this.isYT) this.endYTLongVideo(targetKeywords);
      saveDayData(this.dayData, this.platformKey, true);
    }
  };

  // src/content/modules/hud.js
  var HUDManager = class {
    /**
     * @param {object} opts
     * @param {object} opts.dayData
     * @param {string} opts.platformKey  - "youtube" | "facebook"
     * @param {boolean} opts.isYT
     * @param {boolean} opts.isFB
     * @param {Function} opts.getThresholds  - () => { shorts, long }
     * @param {Function} opts.getPomodoroLabel - () => string | null
     * @param {Function} opts.getPomodoroActive - () => boolean
     * @param {Function} opts.onStartPomodoroRequest - () => void
     * @param {Function} opts.onStopPomodoro - () => void
     * @param {boolean} opts.isBreakSession
     */
    constructor({ dayData: dayData2, platformKey: platformKey2, isYT: isYT2, isFB: isFB2, isTT: isTT2, getThresholds: getThresholds2, getPomodoroLabel, getPomodoroActive, onStartPomodoroRequest, onStopPomodoro, petEngine: petEngine2, onFocusModeToggle }) {
      this.dayData = dayData2;
      this.platformKey = platformKey2;
      this.isYT = isYT2;
      this.isFB = isFB2;
      this.isTT = isTT2;
      this.getThresholds = getThresholds2;
      this.getPomodoroLabel = getPomodoroLabel || (() => null);
      this.getPomodoroActive = getPomodoroActive || (() => false);
      this.onStartPomodoroRequest = onStartPomodoroRequest || null;
      this.onStopPomodoro = onStopPomodoro || null;
      this.petEngine = petEngine2 || null;
      this.focusMode = "music";
      this.onFocusModeToggle = onFocusModeToggle || null;
      this._isMinimized = false;
      this._isDragging = false;
      this._hasMoved = false;
      this._dragStartX = 0;
      this._dragStartY = 0;
      this._initialLeft = 0;
      this._initialTop = 0;
      this.hud = this._createHUD();
    }
    setDayData(newDayData) {
      this.dayData = newDayData;
      this.update();
    }
    setFocusMode(mode) {
      this.focusMode = mode;
      this.update();
    }
    _createHUD() {
      const el = document.createElement("div");
      el.id = "mindful-tracker-hud";
      el.style.cssText = `
      position:fixed!important; bottom:20px; right:20px; z-index:2147483640!important;
      background:rgba(15,23,32,0.94)!important; color:#F1F5F9!important;
      padding:8px 12px!important; border-radius:10px!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
      font-size:12px!important; box-shadow:0 8px 24px rgba(0,0,0,0.4)!important;
      backdrop-filter:blur(8px)!important; border:1.5px solid #10B981;
      user-select:none!important; transition:border-color 0.3s ease,box-shadow 0.3s ease;
      display:flex!important; align-items:center!important; gap:8px!important;
      cursor:grab!important; pointer-events:auto!important; touch-action:none!important;
    `;
      (document.body || document.documentElement).appendChild(el);
      el.addEventListener("mousedown", (e) => this._onDragStart(e));
      el.addEventListener("touchstart", (e) => this._onDragStart(e), { passive: true });
      return el;
    }
    // ─── Position ─────────────────────────────────────────────────────────────
    applyPosition(top, left) {
      this.hud.style.bottom = "auto";
      this.hud.style.right = "auto";
      this.hud.style.top = top;
      this.hud.style.left = left;
    }
    // ─── Drag & Drop ──────────────────────────────────────────────────────────
    _onDragStart(e) {
      if (e.target && e.target.closest("#mindful-hud-minimize, #mindful-hud-toggle, #mindful-hud-start-pomodoro, #mindful-hud-stop-pomodoro, #mindful-hud-focus-mode-btn, #mindful-hud-dev-btn, #mindful-pet-widget, button, input, a")) return;
      this._isDragging = true;
      this._hasMoved = false;
      this.hud.style.cursor = "grabbing";
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      this._dragStartX = clientX;
      this._dragStartY = clientY;
      const rect = this.hud.getBoundingClientRect();
      this._initialLeft = rect.left;
      this._initialTop = rect.top;
      window.addEventListener("mousemove", this._onDragMove, { passive: false });
      window.addEventListener("mouseup", this._onDragEnd, { capture: true });
      window.addEventListener("touchmove", this._onDragMove, { passive: false });
      window.addEventListener("touchend", this._onDragEnd, { capture: true });
    }
    _onDragMove = (e) => {
      if (!this._isDragging) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      if (Math.abs(clientX - this._dragStartX) > 3 || Math.abs(clientY - this._dragStartY) > 3) {
        this._hasMoved = true;
      }
      e.preventDefault();
      const maxLeft = window.innerWidth - this.hud.offsetWidth - 10;
      const maxTop = window.innerHeight - this.hud.offsetHeight - 10;
      const newLeft = Math.max(10, Math.min(maxLeft, this._initialLeft + clientX - this._dragStartX));
      const newTop = Math.max(10, Math.min(maxTop, this._initialTop + clientY - this._dragStartY));
      this.applyPosition(`${newTop}px`, `${newLeft}px`);
    };
    _onDragEnd = (e) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      this.hud.style.cursor = "grab";
      window.removeEventListener("mousemove", this._onDragMove);
      window.removeEventListener("mouseup", this._onDragEnd, { capture: true });
      window.removeEventListener("touchmove", this._onDragMove);
      window.removeEventListener("touchend", this._onDragEnd, { capture: true });
      if (this._hasMoved) {
        const suppressClick = (clickEvt) => {
          clickEvt.stopPropagation();
          clickEvt.preventDefault();
        };
        window.addEventListener("click", suppressClick, { capture: true, once: true });
        setTimeout(() => {
          window.removeEventListener("click", suppressClick, { capture: true });
        }, 50);
        saveHUDPosition({ top: this.hud.style.top, left: this.hud.style.left });
      }
    };
    // ─── Render ───────────────────────────────────────────────────────────────
    update(isBreakSession = false) {
      if (!this.hud || this._isDragging) return;
      const threshData = this.getThresholds();
      const ytThresh = threshData.youtube || threshData;
      const fbThresh = threshData.facebook || threshData;
      const summary = this.dayData[this.platformKey].summary;
      let currentCount = 0;
      let targetThresh = { m1: 15, m2: 30, m3: 45 };
      if (this.isYT) {
        if (location.pathname.startsWith("/shorts")) {
          currentCount = this.dayData.youtube.shorts.totalSwipes || 0;
          targetThresh = ytThresh.shorts || { m1: 15, m2: 30, m3: 45 };
        } else {
          currentCount = this.dayData.youtube.longVideos.totalWatched || 0;
          targetThresh = ytThresh.long || { m1: 3, m2: 5, m3: 8 };
        }
      } else if (this.isFB) {
        if (location.pathname.includes("/reel")) {
          currentCount = this.dayData.facebook.reels.totalSwipes || 0;
          targetThresh = fbThresh.reels || { m1: 15, m2: 30, m3: 45 };
        } else if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
          currentCount = this.dayData.facebook.longVideos?.totalWatched || 0;
          targetThresh = fbThresh.long || { m1: 2, m2: 4, m3: 6 };
        } else {
          currentCount = this.dayData.facebook.feed?.feedPostsScrolled || 0;
          targetThresh = fbThresh.feeds || { m1: 20, m2: 40, m3: 60 };
        }
      }
      if (isBreakSession) {
        this.hud.style.borderColor = "#06B6D4";
        this.hud.style.boxShadow = "0 0 12px rgba(6, 182, 212, 0.4)";
      } else if (currentCount < targetThresh.m1) {
        this.hud.style.borderColor = "#10B981";
        this.hud.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      } else if (currentCount < targetThresh.m3) {
        this.hud.style.borderColor = "#F59E0B";
        this.hud.style.boxShadow = "0 0 12px rgba(245,158,11,0.4)";
      } else {
        this.hud.style.borderColor = "#EF4444";
        this.hud.style.boxShadow = "0 0 18px rgba(239,68,68,0.7)";
      }
      const isPomActive = this.getPomodoroActive ? this.getPomodoroActive() : false;
      const pomLabel = this.getPomodoroLabel();
      let sessionBadge = "";
      try {
        const rawSession = sessionStorage.getItem("mindful_session");
        if (rawSession) {
          const sess = JSON.parse(rawSession);
          const remMs = sess.durationMinutes * 60 * 1e3 - (Date.now() - sess.startTime);
          const remSec = Math.max(0, Math.floor(remMs / 1e3));
          const remM = Math.floor(remSec / 60);
          const remS = remSec % 60;
          const timeStr = `${remM}:${String(remS).padStart(2, "0")}`;
          const color = remSec < 120 ? "#EF4444" : "#A78BFA";
          sessionBadge = `<span style="background:rgba(139,92,246,0.22); color:${color}; font-size:10px; padding:2px 6px; border-radius:5px; font-weight:700; border:1px solid rgba(139,92,246,0.35);" title="Th\u1EDDi gian phi\xEAn l\u01B0\u1EDBt c\xF2n l\u1EA1i">\u23F3 ${timeStr}</span>`;
        }
      } catch (_) {
      }
      if (this._isMinimized) {
        this.hud.innerHTML = `
        <span style="cursor:pointer; font-weight:bold; color:#A78BFA;" id="mindful-hud-toggle" title="M\u1EDF r\u1ED9ng HUD">\u{1F4CA} ${formatTimeShort(summary.activeSeconds)}</span>
        ${sessionBadge}
        ${isPomActive && pomLabel ? `<span style="color:#06B6D4; font-size:10px; font-weight:700;">${pomLabel}</span>` : ""}
      `;
        this.hud.querySelector("#mindful-hud-toggle")?.addEventListener("click", () => {
          this._isMinimized = false;
          this.update(isBreakSession);
        });
        return;
      }
      let extraStats = "";
      if (this.isYT) {
        if (location.pathname.startsWith("/shorts")) {
          const s = this.dayData.youtube.shorts;
          extraStats = `| L\u01B0\u1EDBt: <b>${s.totalSwipes}</b> | Xem: <b style="color:#10B981">${s.validViews}</b> | Loop: <b style="color:#F59E0B">${s.loopViews}</b>`;
        } else {
          const l = this.dayData.youtube.longVideos;
          const usefulCount = l.usefulCount || 0;
          extraStats = `| \u0110\xE3 xem: <b>${l.totalWatched}</b> | H\u1EEFu \xEDch: <b style="color:#10B981">${usefulCount}</b> | B\u1ED1c \u0111\u1ED3ng: <b style="color:#EF4444">${l.impulsiveCount}</b>`;
        }
      } else if (this.isFB) {
        if (location.pathname.includes("/reel")) {
          const r = this.dayData.facebook.reels;
          extraStats = `| Reels: <b>${r.totalSwipes}</b> | Xem: <b style="color:#10B981">${r.validViews}</b> | Loop: <b style="color:#F59E0B">${r.loopViews}</b>`;
        } else if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
          const l = this.dayData.facebook.longVideos || { totalWatched: 0, usefulCount: 0, impulsiveCount: 0 };
          extraStats = `| \u0110\xE3 xem: <b>${l.totalWatched}</b> | H\u1EEFu \xEDch: <b style="color:#10B981">${l.usefulCount || 0}</b>`;
        } else {
          extraStats = `| Feed: <b style="color:#60A5FA">${this.dayData.facebook.feed?.feedPostsScrolled || 0}</b>`;
        }
      } else if (this.isTT) {
        const s = this.dayData.tiktok?.shorts || { totalSwipes: 0, loopViews: 0 };
        extraStats = `| TikTok: <b>${s.totalSwipes}</b> | Loop: <b style="color:#F59E0B">${s.loopViews}</b>`;
      }
      const devBtn = this.isDevMode ? `<span style="cursor:pointer; margin-left:4px; font-size:12px; filter:drop-shadow(0 0 4px rgba(245,158,11,0.6));" id="mindful-hud-dev-btn" title="Quick Dev Toolbox">\u{1F6E0}\uFE0F</span>` : "";
      let musicStats = "";
      if (this.isYT) {
        const musicCount = this.dayData.youtube.musicVideos?.totalWatched || 0;
        if (musicCount > 0) {
          musicStats = `<span style="background:rgba(139,92,246,0.2); color:#C4B5FD; font-size:10px; padding:1px 5px; border-radius:4px; font-weight:700;" title="Nh\u1EA1c t\u1EADp trung \u0111\xE3 nghe">\u{1F3B5} ${musicCount} b\xE0i</span>`;
        }
      }
      let pomodoroSection = "";
      let focusToggleBtn = "";
      let stopPomBtn = "";
      if (isPomActive && pomLabel) {
        pomodoroSection = `<span style="background:${isBreakSession ? "rgba(6,182,212,0.2)" : "rgba(139,92,246,0.25)"}; color:${isBreakSession ? "#67E8F9" : "#C4B5FD"}; font-size:11px; padding:2px 7px; border-radius:6px; font-weight:800; border:1px solid ${isBreakSession ? "rgba(6,182,212,0.45)" : "rgba(139,92,246,0.45)"}; display:inline-flex; align-items:center; gap:4px;">${pomLabel}</span>`;
        stopPomBtn = `<span id="mindful-hud-stop-pomodoro" style="cursor:pointer; background:rgba(239,68,68,0.2); color:#FCA5A5; border:1px solid rgba(239,68,68,0.5); font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:3px;" title="D\u1EEBng phi\xEAn Pomodoro">\u23F9 D\u1EEBng</span>`;
        if (this.isYT) {
          focusToggleBtn = `
          <span id="mindful-hud-focus-mode-btn" style="cursor:pointer; background:${this.focusMode === "music" ? "rgba(139,92,246,0.22)" : "rgba(16,185,129,0.22)"}; color:${this.focusMode === "music" ? "#C4B5FD" : "#6EE7B7"}; border:1px solid ${this.focusMode === "music" ? "rgba(139,92,246,0.5)" : "rgba(16,185,129,0.5)"}; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:3px;" title="Chuy\u1EC3n \u0111\u1ED5i Ch\u1EBF \u0111\u1ED9 L\xE0m vi\u1EC7c v\u1EDBi \xC2m nh\u1EA1c / H\u1ECDc t\u1EADp">${this.focusMode === "music" ? "\u{1F3B5} Mode Nh\u1EA1c" : "\u{1F4DA} Mode H\u1ECDc"}</span>
        `;
        }
      } else {
        pomodoroSection = `<span id="mindful-hud-start-pomodoro" style="cursor:pointer; background:linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3)); color:#C4B5FD; border:1px solid rgba(139,92,246,0.5); font-size:10.5px; padding:2px 7px; border-radius:6px; font-weight:700;" title="B\u1EAFt \u0111\u1EA7u phi\xEAn t\u1EADp trung Pomodoro">\u{1F345} B\u1EAFt \u0111\u1EA7u Pomodoro</span>`;
      }
      let petSlot = this.hud.querySelector("#mindful-hud-pet-slot");
      let contentSlot = this.hud.querySelector("#mindful-hud-content");
      if (!petSlot || !contentSlot) {
        this.hud.innerHTML = `
        <span id="mindful-hud-pet-slot" style="display:inline-flex;align-items:center;"></span>
        <span id="mindful-hud-content" style="display:inline-flex;align-items:center;gap:8px;"></span>
      `;
        petSlot = this.hud.querySelector("#mindful-hud-pet-slot");
        contentSlot = this.hud.querySelector("#mindful-hud-content");
        if (this.petEngine && petSlot) {
          this.petEngine.mount(petSlot);
        }
      } else if (this.petEngine && petSlot && !petSlot.hasChildNodes()) {
        this.petEngine.mount(petSlot);
      }
      const activeSec = summary.activeSeconds ?? summary.activeTimeSeconds ?? 0;
      contentSlot.innerHTML = `
      <span style="font-weight:700; color:#A78BFA;">${this.isYT ? "YouTube" : "Facebook"}</span>
      <span>\u23F1 Active: <b style="color:#38BDF8">${formatTimeShort(activeSec)}</b></span>
      ${sessionBadge}
      ${extraStats}
      ${musicStats}
      ${pomodoroSection}
      ${focusToggleBtn}
      ${stopPomBtn}
      ${devBtn}
      <span style="cursor:pointer; margin-left:4px; opacity:0.6; font-size:14px; font-weight:bold;" id="mindful-hud-minimize" title="Thu nh\u1ECF">\u2212</span>
    `;
      contentSlot.querySelector("#mindful-hud-start-pomodoro")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onStartPomodoroRequest?.();
      });
      contentSlot.querySelector("#mindful-hud-stop-pomodoro")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onStopPomodoro?.();
      });
      contentSlot.querySelector("#mindful-hud-focus-mode-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const newMode = this.focusMode === "music" ? "study" : "music";
        this.focusMode = newMode;
        this.onFocusModeToggle?.(newMode);
        this.update(isBreakSession);
      });
      contentSlot.querySelector("#mindful-hud-dev-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this._toggleQuickDevToolbox();
      });
      contentSlot.querySelector("#mindful-hud-minimize")?.addEventListener("click", () => {
        this._isMinimized = true;
        this.update(isBreakSession);
      });
      if (this._toolboxEl) {
        this._updateToolboxPosition();
      }
    }
    // ─── Quick Dev Toolbox (Disabled in production) ───────────────────────────
    setDevMode() {
      this.isDevMode = false;
    }
    _toggleQuickDevToolbox() {
      if (this._toolboxEl) {
        this._toolboxEl.remove();
        this._toolboxEl = null;
        return;
      }
      this._renderQuickDevToolbox();
    }
    _updateToolboxPosition() {
      if (!this._toolboxEl || !this.hud) return;
      const rect = this.hud.getBoundingClientRect();
      const boxWidth = 260;
      let left = rect.left;
      if (left + boxWidth > window.innerWidth - 10) {
        left = window.innerWidth - boxWidth - 10;
      }
      let top = rect.top - 280;
      if (top < 10) {
        top = rect.bottom + 8;
      }
      this._toolboxEl.style.left = `${Math.max(10, left)}px`;
      this._toolboxEl.style.top = `${top}px`;
    }
    _renderQuickDevToolbox() {
      const el = document.createElement("div");
      el.id = "mindful-quick-dev-toolbox";
      el.style.cssText = `
      position:fixed!important; z-index:2147483646!important; width:260px!important;
      background:rgba(15,23,32,0.96)!important; color:#F8FAFC!important;
      border:1.5px solid #F59E0B!important; border-radius:10px!important;
      padding:10px 12px!important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
      font-size:11px!important; box-shadow:0 12px 30px rgba(0,0,0,0.7), 0 0 15px rgba(245,158,11,0.25)!important;
      backdrop-filter:blur(10px)!important; user-select:none!important;
    `;
      el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:5px;">
        <span style="font-weight:700;color:#FBBF24;display:flex;align-items:center;gap:4px;">\u{1F6E0}\uFE0F Quick Dev Toolbox</span>
        <span id="dev-toolbox-close" style="cursor:pointer;color:#94A3B8;font-size:13px;font-weight:bold;">\u2715</span>
      </div>

      <!-- Energy -->
      <div style="font-size:10px;color:#FBBF24;font-weight:700;margin-bottom:3px;">\u26A1 N\u0103ng l\u01B0\u1EE3ng Pet</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px;">
        <button id="qdev-energy-0" style="background:rgba(239,68,68,0.25);border:1px solid #EF4444;color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">0\u26A1</button>
        <button id="qdev-energy-10" style="background:rgba(245,158,11,0.25);border:1px solid #F59E0B;color:#FCD34D;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">10\u26A1</button>
        <button id="qdev-energy-50" style="background:rgba(59,130,246,0.25);border:1px solid #3B82F6;color:#93C5FD;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">50\u26A1</button>
        <button id="qdev-energy-100" style="background:rgba(16,185,129,0.25);border:1px solid #10B981;color:#6EE7B7;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">100\u26A1</button>
      </div>

      <!-- Session -->
      <div style="font-size:10px;color:#C4B5FD;font-weight:700;margin-bottom:3px;">\u{1F3AF} Phi\xEAn L\u01B0\u1EDBt & M\u1EE5c Ti\xEAu</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;">
        <button id="qdev-session-end" style="background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">\u23F1\uFE0F H\u1EBFt gi\u1EDD phi\xEAn</button>
        <button id="qdev-intent-open" style="background:rgba(139,92,246,0.25);border:1px solid rgba(139,92,246,0.5);color:#C4B5FD;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">\u{1F3AF} M\u1EDF Intent</button>
      </div>

      <!-- Milestones -->
      <div style="font-size:10px;color:#67E8F9;font-weight:700;margin-bottom:3px;">\u{1F514} C\u1EA3nh b\xE1o (M1, M2, M3, F5)</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px;">
        <button id="qdev-m1" style="background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);color:#FCD34D;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">M1</button>
        <button id="qdev-m2" style="background:rgba(249,115,22,0.25);border:1px solid rgba(249,115,22,0.5);color:#FDBA74;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">M2</button>
        <button id="qdev-m3" style="background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">M3</button>
        <button id="qdev-f5" style="background:rgba(168,85,247,0.25);border:1px solid rgba(168,85,247,0.5);color:#D8B4FE;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">F5</button>
      </div>

      <!-- System -->
      <div style="font-size:10px;color:#6EE7B7;font-weight:700;margin-bottom:3px;">\u2699\uFE0F Streak & H\u1EC7 Th\u1ED1ng</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">
        <button id="qdev-streak-3" style="background:rgba(16,185,129,0.25);border:1px solid rgba(16,185,129,0.5);color:#6EE7B7;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">\u{1F393} 3 Ng\xE0y</button>
        <button id="qdev-streak-7" style="background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);color:#FCD34D;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">\u{1F451} 7 Ng\xE0y</button>
        <button id="qdev-reflection" style="background:rgba(139,92,246,0.25);border:1px solid rgba(139,92,246,0.5);color:#C4B5FD;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">\u{1F319} 22h00</button>
      </div>
      <button id="qdev-reset" style="width:100%;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">\u{1F504} Kh\xF4i ph\u1EE5c D\u1EEF li\u1EC7u G\u1ED1c</button>
    `;
      (document.body || document.documentElement).appendChild(el);
      this._toolboxEl = el;
      this._updateToolboxPosition();
      el.querySelector("#dev-toolbox-close")?.addEventListener("click", () => this._toggleQuickDevToolbox());
      el.querySelector("#qdev-energy-0")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(0));
      el.querySelector("#qdev-energy-10")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(10));
      el.querySelector("#qdev-energy-50")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(50));
      el.querySelector("#qdev-energy-100")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(100));
      el.querySelector("#qdev-session-end")?.addEventListener("click", () => this.devCallbacks?.expireSession?.());
      el.querySelector("#qdev-intent-open")?.addEventListener("click", () => this.devCallbacks?.openIntent?.());
      el.querySelector("#qdev-m1")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("m1"));
      el.querySelector("#qdev-m2")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("m2"));
      el.querySelector("#qdev-m3")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("m3"));
      el.querySelector("#qdev-f5")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("f5"));
      el.querySelector("#qdev-streak-3")?.addEventListener("click", () => this.devCallbacks?.setStreak?.(3));
      el.querySelector("#qdev-streak-7")?.addEventListener("click", () => this.devCallbacks?.setStreak?.(7));
      el.querySelector("#qdev-reflection")?.addEventListener("click", () => this.devCallbacks?.openReflection?.());
      el.querySelector("#qdev-reset")?.addEventListener("click", () => this.devCallbacks?.resetData?.());
    }
  };

  // src/content/modules/friction.js
  var FrictionManager = class {
    /**
     * @param {object} opts
     * @param {Function} opts.getConfig       - () => { masterGoal, emotionalAnchorImage }
     * @param {Function} opts.onToast         - (msg, ms) => void
     * @param {object} opts.dayData
     * @param {string} opts.platformKey
     */
    constructor({ getConfig, onToast, dayData: dayData2, platformKey: platformKey2 }) {
      this.getConfig = getConfig;
      this.onToast = onToast || (() => {
      });
      this.dayData = dayData2 || null;
      this.platformKey = platformKey2 || "youtube";
      this._isOverlayActive = false;
      this._spaceHoldStart = null;
      this._spaceRAF = null;
      this._graceSwipes = 0;
      this.petEngine = null;
      this._preventScroll = (e) => {
        if (this._isOverlayActive) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
    }
    setDayData(newDayData) {
      this.dayData = newDayData;
    }
    setPetEngine(pe) {
      this.petEngine = pe;
    }
    // ─── Grace swipes (sau khi hold Space 3s) ────────────────────────────────
    get graceSwipes() {
      return this._graceSwipes;
    }
    consumeGrace() {
      if (this._graceSwipes > 0) {
        this._graceSwipes--;
        return true;
      }
      return false;
    }
    // ─── Intentional Entry Modal & Session Limiter ──────────────────────────
    showIntentModal(pe = null) {
      const petEngine2 = pe || this.petEngine;
      const path = location.pathname;
      const isTarget = path.startsWith("/shorts") || path.includes("/reel") || location.hostname.includes("facebook.com") && (path === "/" || path === "") || location.hostname.includes("youtube.com") && (path === "/" || path === "");
      if (!isTarget) return;
      if (sessionStorage.getItem("mindful_session")) return;
      if (document.getElementById("mindful-intent-modal")) return;
      const config = this.getConfig();
      const partnerImg = config.emotionalAnchorImage || "";
      let selectedMins = 15;
      const modal = document.createElement("div");
      modal.id = "mindful-intent-modal";
      modal.style.cssText = `
      position:fixed!important; top:0!important; left:0!important;
      width:100vw!important; height:100vh!important; z-index:2147483647!important;
      background:rgba(8,12,20,0.92)!important; backdrop-filter:blur(14px)!important;
      display:flex!important; align-items:center!important; justify-content:center!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
    `;
      const avatarHtml = partnerImg ? `
      <div style="position:relative; width:72px; height:72px; margin:0 auto 12px; border-radius:50%; padding:3px; background:linear-gradient(135deg, #EC4899, #8B5CF6); box-shadow:0 0 20px rgba(236,72,153,0.4);">
        <img src="${partnerImg}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="Ng\u01B0\u1EDDi \u0111\u1ED3ng h\xE0nh" />
        <span style="position:absolute; bottom:0; right:0; background:#10B981; border:2px solid #161E31; width:16px; height:16px; border-radius:50%; box-shadow:0 0 8px #10B981;" title="Ng\u01B0\u1EDDi th\u01B0\u01A1ng \u0111ang \u0111\u1ED3ng h\xE0nh c\xF9ng b\u1EA1n"></span>
      </div>
    ` : `
      <div style="width:64px; height:64px; margin:0 auto 12px; border-radius:50%; background:linear-gradient(135deg,#8B5CF6,#6366F1); display:flex; align-items:center; justify-content:center; font-size:32px; box-shadow:0 0 20px rgba(139,92,246,0.45);">
        \u{1F3AF}
      </div>
    `;
      modal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:22px;
        padding:26px 24px; width:360px; text-align:center; box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.25); color:#fff; position:relative; animation:mindfulBubblePop 0.3s cubic-bezier(0.16,1,0.3,1);">
        ${avatarHtml}
        <div style="font-size:16px; font-weight:800; margin-bottom:4px; color:#F8FAFC;">
          ${partnerImg ? "Ng\u01B0\u1EDDi th\u01B0\u01A1ng mu\u1ED1n h\u1ECFi b\u1EA1n:" : "X\xE1c \u0111\u1ECBnh M\u1EE5c ti\xEAu Phi\xEAn L\u01B0\u1EDBt"}
        </div>
        <div style="font-size:12.5px; color:#94A3B8; margin-bottom:14px; line-height:1.45;">
          "Ch\xE0o b\u1EA1n! M\u1EE5c ti\xEAu h\xF4m nay b\u1EA1n v\xE0o l\u01B0\u1EDBt l\xE0 g\xEC n\xE8?"
        </div>
        <input type="text" id="mindful-intent-input" placeholder="VD: T\xECm t\xE0i li\u1EC7u h\u1ECDc, xem tin t\u1EE9c 15p..."
          style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.4);
          border:1px solid rgba(255,255,255,0.18); color:#fff; border-radius:10px;
          padding:10px 14px; font-size:13px; margin-bottom:14px; outline:none; transition:border 0.2s;">
        
        <div style="font-size:11.5px; font-weight:600; color:#A78BFA; margin-bottom:8px; text-align:left;">
          \u23F1\uFE0F Ch\u1ECDn th\u1EDDi l\u01B0\u1EE3ng phi\xEAn l\u01B0\u1EDBt:
        </div>
        <div id="mindful-duration-chips" style="display:flex; gap:6px; margin-bottom:18px; justify-content:space-between;">
          <button type="button" class="duration-chip" data-mins="5" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">5p</button>
          <button type="button" class="duration-chip" data-mins="10" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">10p</button>
          <button type="button" class="duration-chip active" data-mins="15" style="flex:1; padding:7px 0; background:linear-gradient(135deg,#8B5CF6,#6366F1); border:1px solid #A78BFA; border-radius:8px; color:#fff; font-size:12px; font-weight:700; cursor:pointer;">15p</button>
          <button type="button" class="duration-chip" data-mins="20" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">20p</button>
          <button type="button" class="duration-chip" data-mins="30" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">30p</button>
        </div>

        <button id="mindful-intent-submit"
          style="width:100%; background:linear-gradient(135deg,#8B5CF6,#6366F1); border:none;
          color:#fff; font-weight:800; padding:12px 0; border-radius:10px; cursor:pointer;
          font-size:13.5px; box-shadow:0 4px 18px rgba(139,92,246,0.45); transition:transform 0.15s;">
          \u{1F680} B\u1EAFt \u0111\u1EA7u phi\xEAn (15 ph\xFAt)
        </button>
      </div>
    `;
      (document.body || document.documentElement).appendChild(modal);
      const input = modal.querySelector("#mindful-intent-input");
      const submitBtn = modal.querySelector("#mindful-intent-submit");
      const chips = modal.querySelectorAll(".duration-chip");
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          chips.forEach((c) => {
            c.classList.remove("active");
            c.style.background = "rgba(255,255,255,0.08)";
            c.style.borderColor = "rgba(255,255,255,0.15)";
            c.style.color = "#CBD5E1";
          });
          chip.classList.add("active");
          chip.style.background = "linear-gradient(135deg,#8B5CF6,#6366F1)";
          chip.style.borderColor = "#A78BFA";
          chip.style.color = "#fff";
          selectedMins = parseInt(chip.getAttribute("data-mins")) || 15;
          if (submitBtn) submitBtn.textContent = `\u{1F680} B\u1EAFt \u0111\u1EA7u phi\xEAn (${selectedMins} ph\xFAt)`;
        });
      });
      setTimeout(() => input?.focus(), 150);
      const submit = () => {
        const val = input.value.trim() || "Gi\u1EA3i tr\xED c\xF3 ki\u1EC3m so\xE1t";
        const sessionData = {
          startTime: Date.now(),
          durationMinutes: selectedMins,
          goal: val,
          extensionsCount: 0,
          expiredNotified: false
        };
        sessionStorage.setItem("mindful_session", JSON.stringify(sessionData));
        sessionStorage.setItem("mindful_session_intent", val);
        modal.remove();
        const goalText = config.masterGoal || "Mu\u1ED1n tr\u1EDF th\xE0nh phi\xEAn b\u1EA3n t\u1ED1t h\u01A1n";
        if (petEngine2 && typeof petEngine2.showPetToast === "function") {
          petEngine2.showPetToast(
            `Phi\xEAn ${selectedMins}p b\u1EAFt \u0111\u1EA7u! M\u1EE5c ti\xEAu: <b>${val}</b>. Nh\u1EDB m\u1EE5c ti\xEAu l\u1EDBn: <i>${goalText}</i>`,
            { title: "B\u1EAFt \u0111\u1EA7u phi\xEAn l\u01B0\u1EDBt" }
          );
        } else {
          this.onToast(`\u{1F31F} B\u1EAFt \u0111\u1EA7u phi\xEAn ${selectedMins}p! M\u1EE5c ti\xEAu l\u1EDBn: <b>${goalText}</b>.`, 4500);
        }
      };
      submitBtn.onclick = submit;
      input.onkeydown = (e) => {
        if (e.key === "Enter") submit();
      };
    }
    // ─── Kiểm Tra Đếm Ngược Phiên Lướt ──────────────────────────────────────
    checkSessionTimer(pe = null) {
      const petEngine2 = pe || this.petEngine;
      const raw = sessionStorage.getItem("mindful_session");
      if (!raw) return;
      try {
        const session = JSON.parse(raw);
        if (!session || session.expiredNotified) return;
        const elapsedMs = Date.now() - session.startTime;
        const totalMs = (session.durationMinutes || 15) * 60 * 1e3;
        if (elapsedMs >= totalMs) {
          session.expiredNotified = true;
          sessionStorage.setItem("mindful_session", JSON.stringify(session));
          this.showSessionExpiredModal(session, petEngine2);
        }
      } catch (e) {
        console.warn("[Mindful] Error parsing session:", e);
      }
    }
    // ─── Modal Hết Giờ Phiên Lướt & Tùy Chọn Gia Hạn ────────────────────────
    showSessionExpiredModal(session, pe = null) {
      const petEngine2 = pe || this.petEngine;
      const config = this.getConfig();
      const partnerImg = config.emotionalAnchorImage || "";
      const extensionsCount = session.extensionsCount || 0;
      const canExtendTimes = extensionsCount < 2;
      const petEnergy = petEngine2 ? petEngine2.energy : 100;
      const hasEnoughEnergy = petEnergy >= 10;
      const canExtend = canExtendTimes && hasEnoughEnergy;
      let subModal = document.getElementById("mindful-session-expired-modal");
      if (subModal) subModal.remove();
      subModal = document.createElement("div");
      subModal.id = "mindful-session-expired-modal";
      subModal.style.cssText = `
      position:fixed!important; top:0!important; left:0!important;
      width:100vw!important; height:100vh!important; z-index:2147483647!important;
      background:rgba(8,12,20,0.92)!important; backdrop-filter:blur(14px)!important;
      display:flex!important; align-items:center!important; justify-content:center!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
    `;
      const avatarHtml = partnerImg ? `
      <div style="position:relative; width:70px; height:70px; margin:0 auto 12px; border-radius:50%; padding:2.5px; background:linear-gradient(135deg, #EC4899, #8B5CF6); box-shadow:0 0 22px rgba(236,72,153,0.5);">
        <img src="${partnerImg}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="Ng\u01B0\u1EDDi \u0111\u1ED3ng h\xE0nh" />
      </div>
    ` : petEngine2 ? `<div style="display:flex; justify-content:center; margin-bottom:12px;">${petEngine2.getPetAvatarHtml(60)}</div>` : `<div style="font-size:44px; margin-bottom:10px;">\u23F0</div>`;
      let extendButtonsHtml = "";
      if (canExtend) {
        extendButtonsHtml = `
        <div style="font-size:12px; font-weight:700; color:#A78BFA; margin-bottom:8px; text-align:left;">
          \u23F1\uFE0F Ho\u1EB7c gia h\u1EA1n th\xEAm (Tr\u1EEB n\u0103ng l\u01B0\u1EE3ng Pet):
        </div>
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <button id="btn-extend-5" style="flex:1; padding:9px 4px; background:rgba(139,92,246,0.18); border:1px solid #8B5CF6; border-radius:8px; color:#F8FAFC; font-size:11.5px; font-weight:700; cursor:pointer;">
            +5p <span style="color:#EF4444; font-size:10px;">(-10\u26A1)</span>
          </button>
          <button id="btn-extend-10" ${petEnergy < 20 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="flex:1; padding:9px 4px; background:rgba(139,92,246,0.18); border:1px solid #8B5CF6; border-radius:8px; color:#F8FAFC; font-size:11.5px; font-weight:700;">
            +10p <span style="color:#EF4444; font-size:10px;">(-20\u26A1)</span>
          </button>
          <button id="btn-extend-15" ${petEnergy < 35 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="flex:1; padding:9px 4px; background:rgba(139,92,246,0.18); border:1px solid #8B5CF6; border-radius:8px; color:#F8FAFC; font-size:11.5px; font-weight:700;">
            +15p <span style="color:#EF4444; font-size:10px;">(-35\u26A1)</span>
          </button>
        </div>
      `;
      } else {
        const reasonMsg = !canExtendTimes ? "\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n 2 l\u1EA7n gia h\u1EA1n cho phi\xEAn n\xE0y." : "Pet \u0111\xE3 qu\xE1 m\u1EC7t (<10\u26A1), kh\xF4ng th\u1EC3 gia h\u1EA1n th\xEAm.";
        extendButtonsHtml = `
        <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:10px; margin-bottom:16px; font-size:12px; color:#FCA5A5;">
          \u{1F6AB} ${reasonMsg}
        </div>
      `;
      }
      subModal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:22px;
        padding:26px 24px; width:380px; text-align:center; box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25); color:#fff; position:relative; animation:mindfulBubblePop 0.3s cubic-bezier(0.16,1,0.3,1);">
        ${avatarHtml}
        <div style="font-size:18px; font-weight:800; margin-bottom:6px; color:#F8FAFC;">
          \u23F0 H\u1EBFt Gi\u1EDD Phi\xEAn L\u01B0\u1EDBt (${session.durationMinutes} ph\xFAt)
        </div>
        <div style="font-size:13px; color:#94A3B8; margin-bottom:18px; line-height:1.5;">
          M\u1EE5c ti\xEAu ban \u0111\u1EA7u c\u1EE7a b\u1EA1n: <b style="color:#F1F5F9;">"${session.goal || "Xem tin t\u1EE9c"}"</b>.<br/>
          B\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh vi\u1EC7c m\xECnh c\u1EA7n l\xE0m ch\u01B0a?
        </div>

        <button id="btn-close-session-tab"
          style="width:100%; background:linear-gradient(135deg,#10B981,#059669); border:none;
          color:#fff; font-weight:800; padding:12px 0; border-radius:10px; cursor:pointer;
          font-size:13.5px; box-shadow:0 4px 18px rgba(16,185,129,0.4); margin-bottom:14px;">
          \u{1F6D1} \u0110\xF3ng Tab & Ngh\u1EC9 Ng\u01A1i (+5\u26A1 N\u0103ng L\u01B0\u1EE3ng)
        </button>

        ${extendButtonsHtml}

        <div style="font-size:11px; color:#64748B;">
          \u0110\xE3 gia h\u1EA1n: ${extensionsCount}/2 l\u1EA7n | N\u0103ng l\u01B0\u1EE3ng Pet: ${petEnergy}\u26A1
        </div>
      </div>
    `;
      (document.body || document.documentElement).appendChild(subModal);
      const closeTabBtn = subModal.querySelector("#btn-close-session-tab");
      if (closeTabBtn) {
        closeTabBtn.onclick = () => {
          sessionStorage.removeItem("mindful_session");
          sessionStorage.removeItem("mindful_session_intent");
          if (petEngine2) petEngine2.reward(5, "session_closed_ontime");
          subModal.remove();
          if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" }, (res) => {
              if (!res || !res.ok) window.close();
            });
          } else {
            window.close();
          }
        };
      }
      const handleExtend = (extraMins, cost) => {
        if (petEngine2) petEngine2.penalize(cost, "session_extension");
        session.durationMinutes += extraMins;
        session.extensionsCount = (session.extensionsCount || 0) + 1;
        session.expiredNotified = false;
        session.startTime = Date.now();
        sessionStorage.setItem("mindful_session", JSON.stringify(session));
        subModal.remove();
        if (petEngine2 && typeof petEngine2.showPetToast === "function") {
          petEngine2.showPetToast(
            `\u0110\xE3 gia h\u1EA1n th\xEAm <b>${extraMins} ph\xFAt</b> (-${cost}\u26A1). H\xE3y t\u1EADp trung ho\xE0n t\u1EA5t nh\xE9!`,
            { title: "Gia h\u1EA1n phi\xEAn l\u01B0\u1EDBt" }
          );
        }
      };
      const btn5 = subModal.querySelector("#btn-extend-5");
      const btn10 = subModal.querySelector("#btn-extend-10");
      const btn15 = subModal.querySelector("#btn-extend-15");
      if (btn5) btn5.onclick = () => handleExtend(5, 10);
      if (btn10) btn10.onclick = () => handleExtend(10, 20);
      if (btn15) btn15.onclick = () => handleExtend(15, 35);
    }
    // ─── Modal Thẩm Định Mục Tiêu Học Tập (10s Study Focus Check-in) ───────────
    showStudyCheckInModal(videoTitle, onConfirmed, onRejected) {
      let modal = document.getElementById("mindful-study-checkin-modal");
      if (modal) modal.remove();
      modal = document.createElement("div");
      modal.id = "mindful-study-checkin-modal";
      modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.78) !important;
      backdrop-filter: blur(10px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 16px !important;
      box-sizing: border-box !important;
    `;
      const petAvatar = this.petEngine ? `<div style="display:flex; justify-content:center; margin-bottom:12px;">${this.petEngine.getPetAvatarHtml(60)}</div>` : `<div style="font-size:44px; margin-bottom:10px;">\u{1F4DA}</div>`;
      modal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:20px;
        padding:26px 24px; max-width:400px; width:100%; text-align:center;
        box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25); color:#fff; position:relative;
        animation:mindfulCardPop 0.3s cubic-bezier(0.16,1,0.3,1);">
        ${petAvatar}
        <div style="font-size:16px; font-weight:800; margin-bottom:6px; color:#F8FAFC;">
          \u{1F4DA} Th\u1EA9m \u0110\u1ECBnh M\u1EE5c Ti\xEAu H\u1ECDc T\u1EADp
        </div>
        <div style="font-size:12.5px; color:#94A3B8; margin-bottom:12px; line-height:1.45; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
          B\u1EA1n \u0111ang xem: <b style="color:#F1F5F9;">"${videoTitle}"</b>
        </div>
        <div style="font-size:12px; color:#CBD5E1; margin-bottom:10px;">
          Video n\xE0y ph\u1EE5c v\u1EE5 m\u1EE5c ti\xEAu h\u1ECDc t\u1EADp g\xEC c\u1EE7a b\u1EA1n?
        </div>
        <input type="text" id="mindful-study-intent-input" placeholder="VD: H\u1ECDc l\u1EADp tr\xECnh Python, luy\u1EC7n nghe ti\u1EBFng Anh..."
          style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.18);
          color:#fff; border-radius:10px; padding:10px 14px; font-size:12.5px; margin-bottom:16px; outline:none;">

        <div style="display:flex; gap:8px;">
          <button id="btn-study-confirm" style="flex:1; background:linear-gradient(135deg,#8B5CF6,#6366F1); border:none;
            color:#fff; font-weight:700; padding:10px 0; border-radius:8px; cursor:pointer; font-size:12px; box-shadow:0 4px 15px rgba(139,92,246,0.4);">
            \u2713 \u0110\xFAng m\u1EE5c ti\xEAu h\u1ECDc
          </button>
          <button id="btn-study-reject" style="flex:1; background:rgba(239,68,68,0.2); border:1px solid #EF4444;
            color:#FCA5A5; font-weight:700; padding:10px 0; border-radius:8px; cursor:pointer; font-size:12px;">
            \u{1F6D1} Video gi\u1EA3i tr\xED (-10\u26A1)
          </button>
        </div>
      </div>
    `;
      (document.body || document.documentElement).appendChild(modal);
      const input = modal.querySelector("#mindful-study-intent-input");
      setTimeout(() => input?.focus(), 150);
      const confirmBtn = modal.querySelector("#btn-study-confirm");
      const rejectBtn = modal.querySelector("#btn-study-reject");
      confirmBtn.onclick = () => {
        const intent = input.value.trim() || "N\u1ED9i dung h\u1ECDc t\u1EADp";
        modal.remove();
        if (onConfirmed) onConfirmed(intent);
      };
      rejectBtn.onclick = () => {
        modal.remove();
        if (onRejected) onRejected();
      };
    }
    // ─── Modal Thiết Lập Chu Kỳ Pomodoro (Cycles, Times & Mode) ───────────────
    showPomodoroSetupModal({ onStart, onCancel } = {}) {
      let modal = document.getElementById("mindful-pomodoro-setup-modal");
      if (modal) modal.remove();
      modal = document.createElement("div");
      modal.id = "mindful-pomodoro-setup-modal";
      modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.82) !important;
      backdrop-filter: blur(12px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 16px !important;
      box-sizing: border-box !important;
    `;
      const petAvatar = this.petEngine ? `<div style="display:flex; justify-content:center; margin-bottom:10px;">${this.petEngine.getPetAvatarHtml(56)}</div>` : `<div style="font-size:42px; margin-bottom:8px;">\u{1F345}</div>`;
      let selectedCycles = 2;
      let selectedFocus = 25;
      let selectedBreak = 5;
      let selectedMode = "music";
      modal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:22px;
        padding:26px 24px; max-width:420px; width:100%; text-align:center;
        box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25); color:#fff; position:relative;
        animation:mindfulCardPop 0.3s cubic-bezier(0.16,1,0.3,1);">

        <button id="btn-close-pom-setup" style="position:absolute; top:14px; right:16px; background:none; border:none; color:#64748B; font-size:18px; cursor:pointer;" title="\u0110\xF3ng">\u2715</button>

        ${petAvatar}
        <div style="font-size:17px; font-weight:800; color:#F8FAFC; margin-bottom:4px;">
          \u{1F345} Thi\u1EBFt L\u1EADp Chu K\u1EF3 Pomodoro
        </div>
        <div style="font-size:12px; color:#94A3B8; margin-bottom:16px; line-height:1.4;">
          Ch\u1ECDn s\u1ED1 hi\u1EC7p v\xE0 ph\u01B0\u01A1ng th\u1EE9c t\u1EADp trung ph\xF9 h\u1EE3p nh\u1EA5t v\u1EDBi b\u1EA1n
        </div>

        <!-- 1. Ch\u1ECDn s\u1ED1 hi\u1EC7p Pomodoro -->
        <div style="text-align:left; margin-bottom:12px;">
          <div style="font-size:11px; font-weight:700; color:#CBD5E1; margin-bottom:6px;">1. S\u1ED1 hi\u1EC7p Pomodoro:</div>
          <div id="pom-cycles-group" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
            <button type="button" class="pom-pill pom-cycle-btn" data-val="1" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">1 Hi\u1EC7p</button>
            <button type="button" class="pom-pill pom-cycle-btn active" data-val="2" style="background:rgba(139,92,246,0.3); border:1.5px solid #8B5CF6; color:#C4B5FD; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">2 Hi\u1EC7p</button>
            <button type="button" class="pom-pill pom-cycle-btn" data-val="3" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">3 Hi\u1EC7p</button>
            <button type="button" class="pom-pill pom-cycle-btn" data-val="4" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">4 Hi\u1EC7p</button>
          </div>
        </div>

        <!-- 2. Th\u1EDDi l\u01B0\u1EE3ng Focus & Break -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left; margin-bottom:14px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:#A78BFA; margin-bottom:5px;">Focus (T\u1EADp trung):</div>
            <select id="pom-focus-select" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(139,92,246,0.4); color:#fff; border-radius:8px; padding:7px 8px; font-size:12px; outline:none; cursor:pointer;">
              <option value="15">15 ph\xFAt</option>
              <option value="25" selected>25 ph\xFAt (Chu\u1EA9n)</option>
              <option value="45">45 ph\xFAt</option>
              <option value="60">60 ph\xFAt</option>
            </select>
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:#06B6D4; margin-bottom:5px;">Break (Ngh\u1EC9 ng\u01A1i):</div>
            <select id="pom-break-select" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(6,182,212,0.4); color:#fff; border-radius:8px; padding:7px 8px; font-size:12px; outline:none; cursor:pointer;">
              <option value="3">3 ph\xFAt</option>
              <option value="5" selected>5 ph\xFAt (Chu\u1EA9n)</option>
              <option value="10">10 ph\xFAt</option>
              <option value="15">15 ph\xFAt</option>
            </select>
          </div>
        </div>

        <!-- 3. Ch\u1ECDn Ch\u1EBF \u0110\u1ED9 Focus -->
        <div style="text-align:left; margin-bottom:18px;">
          <div style="font-size:11px; font-weight:700; color:#CBD5E1; margin-bottom:6px;">2. Ch\u1EBF \u0111\u1ED9 l\xE0m vi\u1EC7c:</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <label id="pom-mode-music-card" style="display:flex; flex-direction:column; gap:3px; padding:10px; background:rgba(139,92,246,0.18); border:1.5px solid #8B5CF6; border-radius:10px; cursor:pointer; transition:all 0.2s;">
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="radio" name="pom-focus-mode" value="music" checked style="accent-color:#8B5CF6;">
                <span style="font-size:12px; font-weight:700; color:#C4B5FD;">\u{1F3B5} Mode Nh\u1EA1c</span>
              </div>
              <span style="font-size:10px; color:#94A3B8; line-height:1.3; margin-top:2px;">M\xE0n h\xECnh \u0110en Tr\u1EAFng, video nh\u1EA1c t\xEDnh ri\xEAng kh\xF4ng t\xEDnh xao nh\xE3ng.</span>
            </label>

            <label id="pom-mode-study-card" style="display:flex; flex-direction:column; gap:3px; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:10px; cursor:pointer; transition:all 0.2s;">
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="radio" name="pom-focus-mode" value="study" style="accent-color:#10B981;">
                <span style="font-size:12px; font-weight:700; color:#6EE7B7;">\u{1F4DA} Mode H\u1ECDc</span>
              </div>
              <span style="font-size:10px; color:#94A3B8; line-height:1.3; margin-top:2px;">M\xE0n h\xECnh gi\u1EEF m\xE0u, sau 10s h\u1ECFi m\u1EE5c ti\xEAu b\xE0i h\u1ECDc xem c\xF3 \xEDch kh\xF4ng.</span>
            </label>
          </div>
        </div>

        <!-- N\xFAt B\u1EAFt \u0111\u1EA7u & H\u1EE7y -->
        <div style="display:flex; gap:8px;">
          <button id="btn-pom-start" style="flex:2; background:linear-gradient(135deg, #8B5CF6, #6366F1); border:none; color:#fff; font-weight:700; padding:11px 0; border-radius:10px; cursor:pointer; font-size:13px; box-shadow:0 4px 15px rgba(139,92,246,0.4);">
            \u{1F680} B\u1EAFt \u0110\u1EA7u Pomodoro
          </button>
          <button id="btn-pom-cancel" style="flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#94A3B8; font-weight:600; padding:11px 0; border-radius:10px; cursor:pointer; font-size:12px;">
            H\u1EE7y
          </button>
        </div>
      </div>
    `;
      (document.body || document.documentElement).appendChild(modal);
      const cycleBtns = modal.querySelectorAll(".pom-cycle-btn");
      cycleBtns.forEach((btn) => {
        btn.onclick = () => {
          cycleBtns.forEach((b) => {
            b.style.background = "rgba(255,255,255,0.06)";
            b.style.borderColor = "rgba(255,255,255,0.12)";
            b.style.color = "#CBD5E1";
          });
          btn.style.background = "rgba(139,92,246,0.3)";
          btn.style.borderColor = "#8B5CF6";
          btn.style.color = "#C4B5FD";
          selectedCycles = parseInt(btn.getAttribute("data-val")) || 2;
        };
      });
      const modeRadios = modal.querySelectorAll("input[name='pom-focus-mode']");
      const musicCard = modal.querySelector("#pom-mode-music-card");
      const studyCard = modal.querySelector("#pom-mode-study-card");
      modeRadios.forEach((radio) => {
        radio.onchange = () => {
          selectedMode = radio.value;
          if (selectedMode === "music") {
            musicCard.style.background = "rgba(139,92,246,0.18)";
            musicCard.style.borderColor = "#8B5CF6";
            studyCard.style.background = "rgba(255,255,255,0.05)";
            studyCard.style.borderColor = "rgba(255,255,255,0.12)";
          } else {
            studyCard.style.background = "rgba(16,185,129,0.18)";
            studyCard.style.borderColor = "#10B981";
            musicCard.style.background = "rgba(255,255,255,0.05)";
            musicCard.style.borderColor = "rgba(255,255,255,0.12)";
          }
        };
      });
      const closeBtn = modal.querySelector("#btn-close-pom-setup");
      const cancelBtn = modal.querySelector("#btn-pom-cancel");
      const startBtn = modal.querySelector("#btn-pom-start");
      const closeModal = () => {
        modal.remove();
        if (onCancel) onCancel();
      };
      closeBtn.onclick = closeModal;
      cancelBtn.onclick = closeModal;
      startBtn.onclick = () => {
        const focusSelect = modal.querySelector("#pom-focus-select");
        const breakSelect = modal.querySelector("#pom-break-select");
        selectedFocus = parseInt(focusSelect?.value) || 25;
        selectedBreak = parseInt(breakSelect?.value) || 5;
        modal.remove();
        if (onStart) {
          onStart({
            totalCycles: selectedCycles,
            focusMinutes: selectedFocus,
            breakMinutes: selectedBreak,
            focusMode: selectedMode
          });
        }
      };
    }
    // ─── Hard Friction Overlay với Bài tập Thở Box Breathing (12s) ───────────
    _injectBreathingStyles() {
      if (typeof document === "undefined") return;
      if (document.getElementById("mindful-breathing-styles")) return;
      const style = document.createElement("style");
      style.id = "mindful-breathing-styles";
      style.textContent = `
      @keyframes mindfulBoxBreathe {
        0% { transform: scale(0.75); box-shadow: 0 0 25px rgba(6, 182, 212, 0.4); background: radial-gradient(circle, #06B6D4 0%, rgba(6, 182, 212, 0.2) 70%); }
        33.33% { transform: scale(1.22); box-shadow: 0 0 45px rgba(6, 182, 212, 0.8); background: radial-gradient(circle, #06B6D4 0%, rgba(6, 182, 212, 0.3) 70%); }
        33.34% { transform: scale(1.22); box-shadow: 0 0 45px rgba(139, 92, 246, 0.8); background: radial-gradient(circle, #8B5CF6 0%, rgba(139, 92, 246, 0.3) 70%); }
        66.66% { transform: scale(1.22); box-shadow: 0 0 50px rgba(139, 92, 246, 0.9); background: radial-gradient(circle, #A78BFA 0%, rgba(139, 92, 246, 0.3) 70%); }
        66.67% { transform: scale(1.22); box-shadow: 0 0 45px rgba(16, 185, 129, 0.8); background: radial-gradient(circle, #10B981 0%, rgba(16, 185, 129, 0.3) 70%); }
        100% { transform: scale(0.75); box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); background: radial-gradient(circle, #10B981 0%, rgba(16, 185, 129, 0.2) 70%); }
      }
      @keyframes mindfulPulseGlow {
        0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4)); }
        50% { transform: scale(1.02); filter: drop-shadow(0 0 28px rgba(139, 92, 246, 0.7)); }
      }
    `;
      (document.head || document.documentElement).appendChild(style);
    }
    /**
     * @param {number} currentCount
     * @param {number} m3Limit
     * @param {string} unitLabel
     */
    showHardFriction(currentCount, m3Limit, unitLabel = "l\u01B0\u1EE3t") {
      if (this._isOverlayActive) return;
      this._isOverlayActive = true;
      this._injectBreathingStyles();
      const config = this.getConfig();
      let overlay = document.getElementById("mindful-friction-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "mindful-friction-overlay";
        overlay.style.cssText = `
        position:fixed!important; top:0!important; left:0!important;
        width:100vw!important; height:100vh!important; z-index:2147483647!important;
        background:rgba(8,12,20,0.96)!important; backdrop-filter:blur(18px)!important;
        display:flex!important; flex-direction:column!important;
        align-items:center!important; justify-content:center!important;
        text-align:center!important; color:#F8FAFC!important;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
        padding:20px!important; box-sizing:border-box!important; user-select:none!important;
        overflow-y:auto!important;
      `;
        (document.body || document.documentElement).appendChild(overlay);
      }
      const anchorSrc = config.emotionalAnchorImage || "";
      const goalText = config.masterGoal || "Mu\u1ED1n tr\u1EDF th\xE0nh phi\xEAn b\u1EA3n t\u1ED1t h\u01A1n";
      const imageHtml = anchorSrc ? `<div style="position:relative; display:inline-block; margin-bottom:12px;">
           <img src="${anchorSrc}" style="width:110px; height:110px; border-radius:50%;
             border:3px solid #8B5CF6; box-shadow:0 0 30px rgba(139,92,246,0.6);
             object-fit:cover; animation:mindfulPulseGlow 3s ease-in-out infinite;">
           <div style="position:absolute; bottom:0; right:0; font-size:22px;">\u2764\uFE0F</div>
         </div>` : `<div style="width:90px; height:90px; border-radius:50%;
           background:rgba(239,68,68,0.15); border:2.5px solid #EF4444;
           display:flex; align-items:center; justify-content:center;
           font-size:42px; margin-bottom:12px; box-shadow:0 0 25px rgba(239,68,68,0.4);">\u{1F6D1}</div>`;
      overlay.innerHTML = `
      <div style="max-width:440px; display:flex; flex-direction:column; align-items:center;">
        ${imageHtml}

        <div style="font-size:20px; font-weight:800; color:#EF4444; margin-bottom:6px; letter-spacing:-0.3px;">
          D\u1EEBng L\u1EA1i M\u1ED9t Ch\xFAt N\xE0o!
        </div>

        <div style="font-size:13px; color:#CBD5E1; margin-bottom:10px; line-height:1.45;">
          B\u1EA1n \u0111\xE3 l\u01B0\u1EDBt <b>${currentCount}</b> ${unitLabel} (V\u01B0\u1EE3t tr\u1EA7n \u0111\u1ECF <b>${m3Limit}</b> ${unitLabel} h\xF4m nay).
        </div>

        <div style="background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.4);
          border-radius:12px; padding:10px 16px; margin-bottom:18px; width:100%; box-sizing:border-box;">
          <div style="font-size:11px; color:#C4B5FD; font-weight:700; text-transform:uppercase;">L\u1EDDi nh\u1EAFc t\u1EEB m\u1EE5c ti\xEAu l\u1EDBn c\u1EE7a b\u1EA1n:</div>
          <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">"${goalText}"</div>
          <div style="font-size:11px; color:#94A3B8; margin-top:3px; font-style:italic;">Ng\u01B0\u1EDDi th\u01B0\u01A1ng lu\xF4n tin b\u1EA1n s\u1EBD l\xE0m ch\u1EE7 \u0111\u01B0\u1EE3c b\u1EA3n th\xE2n!</div>
        </div>

        <!-- Box Breathing Widget 12s (Pet \xF4m v\xF2ng tr\xF2n b\xE0i t\u1EADp th\u1EDF \u0111\u1ED3ng b\u1ED9) -->
        <div style="position:relative; width:160px; height:160px; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
          <!-- SVG Progress Ring 12s -->
          <svg width="160" height="160" style="position:absolute; top:0; left:0; transform:rotate(-90deg); overflow:visible;">
            <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.08)" stroke-width="6" fill="none" />
            <circle id="mindful-breathing-ring" cx="80" cy="80" r="70" stroke="#06B6D4" stroke-width="6" fill="none"
              stroke-linecap="round" stroke-dasharray="440" stroke-dashoffset="440" style="transition: stroke-dashoffset 0.1s linear, stroke 0.4s ease;" />
          </svg>

          <!-- Animated Breathing Orb v\u1EDBi Pet \xF4m v\xF2ng th\u1EDF co gi\xE3n \u0111\u1ED3ng b\u1ED9 -->
          <div id="mindful-breathing-orb" style="width:84px; height:84px; border-radius:50%;
            display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;
            animation: mindfulBoxBreathe 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; will-change:transform;">
            ${this.petEngine ? this.petEngine.getPetAvatarHtml(46) : `<div style="font-size:36px;">\u{1F9D8}</div>`}
            <div id="mindful-breath-countdown" style="position:absolute; bottom:-6px; font-size:10px; font-weight:800; color:#fff; background:rgba(15,23,42,0.9); padding:1px 6px; border-radius:8px; border:1px solid #06B6D4; text-shadow:0 1px 3px rgba(0,0,0,0.6);">12s</div>
          </div>
        </div>

        <!-- Realtime Breathing Phase Instruction -->
        <div id="mindful-breath-instruction" style="font-size:14px; font-weight:700; color:#06B6D4; margin-bottom:20px; min-height:22px; transition:color 0.3s ease;">
          \u{1F32C}\uFE0F H\xEDt v\xE0o th\u1EADt s\xE2u b\u1EB1ng m\u0169i (4s)...
        </div>

        <!-- Actions -->
        <div style="display:flex; gap:10px; width:100%; justify-content:center;">
          <button id="mindful-btn-close-tab" style="flex:1; background:rgba(239,68,68,0.2); border:1.5px solid #EF4444; color:#FCA5A5; font-weight:700; padding:10px 14px; border-radius:10px; cursor:pointer; font-size:12px; transition:all 0.2s;">
            \u{1F6D1} \u0110\xF3ng Tab Ngay
          </button>
          <button id="mindful-btn-continue" disabled style="flex:1; background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.15); color:#64748B; font-weight:700; padding:10px 14px; border-radius:10px; cursor:not-allowed; font-size:12px; transition:all 0.3s;">
            \u23F3 Th\u1EDF h\u1EBFt 12s \u0111\u1EC3 m\u1EDF
          </button>
        </div>
      </div>
    `;
      overlay.style.display = "flex";
      window.addEventListener("wheel", this._preventScroll, { passive: false });
      window.addEventListener("touchmove", this._preventScroll, { passive: false });
      const btnCloseTab = overlay.querySelector("#mindful-btn-close-tab");
      const btnContinue = overlay.querySelector("#mindful-btn-continue");
      const ring = overlay.querySelector("#mindful-breathing-ring");
      const countdownEl = overlay.querySelector("#mindful-breath-countdown");
      const instructEl = overlay.querySelector("#mindful-breath-instruction");
      if (btnCloseTab) {
        btnCloseTab.onclick = () => {
          if (this.dayData?.temptation) {
            this.dayData.temptation.resistedCount = (this.dayData.temptation.resistedCount || 0) + 1;
            saveDayData(this.dayData, this.platformKey, true);
          }
          try {
            window.close();
          } catch (_) {
          }
          setTimeout(() => {
            window.location.href = "about:blank";
          }, 100);
        };
      }
      const totalDuration = 12e3;
      const startTime = Date.now();
      const circumference = 440;
      const intervalTimer = setInterval(() => {
        if (!this._isOverlayActive) {
          clearInterval(intervalTimer);
          return;
        }
        const elapsed = Date.now() - startTime;
        const remainingSecs = Math.max(0, Math.ceil((totalDuration - elapsed) / 1e3));
        const progress = Math.min(1, elapsed / totalDuration);
        if (countdownEl) countdownEl.innerText = `${remainingSecs}s`;
        if (ring) {
          const offset = circumference - progress * circumference;
          ring.style.strokeDashoffset = `${offset}`;
        }
        if (elapsed < 4e3) {
          if (instructEl) {
            instructEl.innerText = "\u{1F32C}\uFE0F H\xEDt v\xE0o th\u1EADt s\xE2u b\u1EB1ng m\u0169i...";
            instructEl.style.color = "#06B6D4";
          }
          if (ring) ring.style.stroke = "#06B6D4";
        } else if (elapsed < 8e3) {
          if (instructEl) {
            instructEl.innerText = "\u{1F9D8} N\xEDn th\u1EDF & th\u1EA3 l\u1ECFng to\xE0n th\xE2n...";
            instructEl.style.color = "#A78BFA";
          }
          if (ring) ring.style.stroke = "#8B5CF6";
        } else if (elapsed < 12e3) {
          if (instructEl) {
            instructEl.innerText = "\u{1F4A8} Th\u1EDF ra t\u1EEB t\u1EEB b\u1EB1ng mi\u1EC7ng...";
            instructEl.style.color = "#10B981";
          }
          if (ring) ring.style.stroke = "#10B981";
        } else {
          clearInterval(intervalTimer);
          if (countdownEl) countdownEl.innerText = "\u2713";
          if (instructEl) {
            instructEl.innerText = "\u2728 T\xE2m tr\xED \u0111\xE3 b\xECnh t\u0129nh l\u1EA1i. B\u1EA1n c\xF3 th\u1EC3 ti\u1EBFp t\u1EE5c!";
            instructEl.style.color = "#10B981";
          }
          if (btnContinue) {
            btnContinue.removeAttribute("disabled");
            btnContinue.style.cursor = "pointer";
            btnContinue.style.background = "linear-gradient(135deg, #8B5CF6, #6366F1)";
            btnContinue.style.borderColor = "#A78BFA";
            btnContinue.style.color = "#FFFFFF";
            btnContinue.style.boxShadow = "0 0 20px rgba(139,92,246,0.6)";
            btnContinue.innerText = "Ti\u1EBFp t\u1EE5c (5 l\u01B0\u1EE3t ho\xE3n)";
            btnContinue.onclick = () => {
              this._graceSwipes = 5;
              this._isOverlayActive = false;
              overlay.style.display = "none";
              window.removeEventListener("wheel", this._preventScroll);
              window.removeEventListener("touchmove", this._preventScroll);
              if (this.dayData?.temptation) {
                this.dayData.temptation.succumbedCount = (this.dayData.temptation.succumbedCount || 0) + 1;
                saveDayData(this.dayData, this.platformKey, false);
              }
              if (this.petEngine) this.petEngine.reward(5, "breathing_complete");
              this.onToast("\u{1F511} B\u1EA1n \u0111\xE3 h\xEDt th\u1EDF s\xE2u, h\u1ED3i ph\u1EE5c +5\u26A1 v\xE0 nh\u1EADn 5 l\u01B0\u1EE3t l\u01B0\u1EDBt ho\xE3n!", 4e3);
            };
          }
        }
      }, 100);
      this._cleanupFriction = () => {
        clearInterval(intervalTimer);
        window.removeEventListener("wheel", this._preventScroll);
        window.removeEventListener("touchmove", this._preventScroll);
      };
    }
    // Kiểm tra có cần trigger friction không (tính cả grace swipes)
    checkAndTrigger(currentCount, m3Limit, unitLabel) {
      if (currentCount >= m3Limit) {
        if (this.consumeGrace()) return;
        if (this.petEngine) {
          this.petEngine.penalize(5, "excess_swipes_post_m3");
        }
        this.showHardFriction(currentCount, m3Limit, unitLabel);
      }
    }
  };

  // src/content/modules/pomodoro.js
  var PomodoroManager = class {
    /**
     * @param {object} opts
     * @param {object} opts.config
     * @param {object} opts.state
     * @param {Function} opts.onUpdate
     * @param {object} opts.petEngine
     * @param {Function} opts.onAllCompleted
     */
    constructor({ config, state, onUpdate: onUpdate2, petEngine: petEngine2, onAllCompleted }) {
      this.config = config.pomodoro || { enabled: false, focusMinutes: 25, breakMinutes: 5 };
      this.onUpdate = onUpdate2 || (() => {
      });
      this.petEngine = petEngine2 || null;
      this.onAllCompleted = onAllCompleted || (() => {
      });
      this.state = Object.assign({
        enabled: false,
        totalCycles: 2,
        currentCycle: 1,
        sessionType: "focus",
        // "focus" | "break"
        sessionStartTime: Date.now(),
        durationMinutes: 25,
        focusMinutes: 25,
        breakMinutes: 5,
        focusMode: "music"
      }, state || {});
      this._intervalTimer = null;
    }
    setPetEngine(engine) {
      this.petEngine = engine;
    }
    get isEnabled() {
      return !!this.state.enabled;
    }
    // Kiểm tra đang trong Break Session không
    get isBreakSession() {
      return this.state.enabled && this.state.sessionType === "break";
    }
    // Kiểm tra đang trong Focus Session không
    get isFocusSession() {
      return this.state.enabled && this.state.sessionType === "focus";
    }
    // Tổng ms còn lại trong session hiện tại
    get remainingMs() {
      const elapsed = Date.now() - (this.state.sessionStartTime || Date.now());
      const totalMs = (this.state.durationMinutes || 25) * 60 * 1e3;
      return Math.max(0, totalMs - elapsed);
    }
    // Khởi động/tiếp tục vòng đếm
    start() {
      if (!this.state.enabled) return;
      if (this._intervalTimer) clearInterval(this._intervalTimer);
      this._intervalTimer = setInterval(() => {
        if (this.remainingMs <= 0) {
          this._handleTransition();
        } else {
          this.onUpdate();
        }
      }, 1e3);
    }
    // Kích hoạt một chu kỳ Pomodoro mới với thiết lập từ người dùng
    startNewSession({ totalCycles = 2, focusMinutes = 25, breakMinutes = 5, focusMode = "music" } = {}) {
      this.state = {
        enabled: true,
        totalCycles: Math.max(1, parseInt(totalCycles) || 2),
        currentCycle: 1,
        sessionType: "focus",
        sessionStartTime: Date.now(),
        durationMinutes: Math.max(1, parseInt(focusMinutes) || 25),
        focusMinutes: Math.max(1, parseInt(focusMinutes) || 25),
        breakMinutes: Math.max(1, parseInt(breakMinutes) || 5),
        focusMode: focusMode || "music"
      };
      savePomodoroState(this.state);
      this.start();
      this.onUpdate();
      if (this.petEngine) {
        this.petEngine.showPetToast(
          `\u{1F3AF} B\u1EAFt \u0111\u1EA7u Chu k\u1EF3 Pomodoro (${this.state.totalCycles} hi\u1EC7p). H\xE3y t\u1EADp trung t\u1ED1i \u0111a trong ${this.state.focusMinutes} ph\xFAt!`,
          { title: "\u{1F345} Pomodoro Kh\u1EDFi \u0110\u1ED9ng" }
        );
      }
    }
    _handleTransition() {
      const wasFocus = this.state.sessionType === "focus";
      if (wasFocus) {
        if (this.petEngine) {
          if (typeof this.petEngine.triggerPomodoroCelebration === "function") {
            this.petEngine.triggerPomodoroCelebration();
          } else {
            this.petEngine.reward(15, "pomodoro_complete");
          }
        }
        if (this.state.currentCycle < this.state.totalCycles) {
          this.state.sessionType = "break";
          this.state.sessionStartTime = Date.now();
          this.state.durationMinutes = this.state.breakMinutes;
          savePomodoroState(this.state);
          this.onUpdate();
          if (this.petEngine) {
            this.petEngine.showPetCenterModal({
              title: "\u{1F389} Tuy\u1EC7t V\u1EDDi! Ho\xE0n Th\xE0nh Hi\u1EC7p Focus!",
              message: `B\u1EA1n \u0111\xE3 t\u1EADp trung tr\u1ECDn v\u1EB9n <b>Hi\u1EC7p ${this.state.currentCycle}/${this.state.totalCycles}</b>! Linh v\u1EADt \u0111\xE3 \u0111\u01B0\u1EE3c n\u1EA1p <b style="color:#FEF08A;">+15\u26A1</b>.<br/><br/>B\xE2y gi\u1EDD h\xE3y \u0111\u1EE9ng d\u1EADy v\u01B0\u01A1n vai, u\u1ED1ng n\u01B0\u1EDBc v\xE0 ngh\u1EC9 ng\u01A1i <b>${this.state.breakMinutes} ph\xFAt</b> nh\xE9! \u2615`,
              actions: [
                {
                  label: "\u2615 B\u1EAFt \u0111\u1EA7u Ngh\u1EC9 ng\u01A1i",
                  primary: true,
                  onClick: (e, modal) => modal.remove()
                }
              ]
            });
          }
        } else {
          if (this.petEngine) {
            this.petEngine.reward(10, "pomodoro_all_cycles_complete");
          }
          const totalDone = this.state.totalCycles;
          this.stop();
          this.state.enabled = false;
          savePomodoroState(this.state);
          this.onAllCompleted();
          this.onUpdate();
          if (this.petEngine) {
            this.petEngine.showPetCenterModal({
              title: "\u{1F3C6} Xu\u1EA5t S\u1EAFc! Ho\xE0n Th\xE0nh Chu K\u1EF3 Pomodoro!",
              message: `Ch\xFAc m\u1EEBng b\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh tr\u1ECDn v\u1EB9n c\u1EA3 <b>${totalDone}/${totalDone} hi\u1EC7p Pomodoro</b> h\xF4m nay! B\u1EA1n th\u1EADt ki\xEAn \u0111\u1ECBnh v\xE0 k\u1EF7 lu\u1EADt.<br/><br/>Linh v\u1EADt \u0111\xE3 \u0111\u01B0\u1EE3c th\u01B0\u1EDFng th\xEAm <b style="color:#FEF08A;">+10\u26A1</b> vinh danh! \u{1F31F}`,
              actions: [
                {
                  label: "\u{1F31F} Tuy\u1EC7t v\u1EDDi!",
                  primary: true,
                  onClick: (e, modal) => modal.remove()
                }
              ]
            });
          }
        }
      } else {
        this.state.currentCycle++;
        this.state.sessionType = "focus";
        this.state.sessionStartTime = Date.now();
        this.state.durationMinutes = this.state.focusMinutes;
        savePomodoroState(this.state);
        this.onUpdate();
        if (this.petEngine) {
          this.petEngine.showPetCenterModal({
            title: "\u{1F3AF} Gi\u1EDD Ngh\u1EC9 \u0110\xE3 H\u1EBFt - B\u1EAFt \u0110\u1EA7u Hi\u1EC7p M\u1EDBi!",
            message: `\u0110\xE3 \u0111\u1EBFn l\xFAc b\u01B0\u1EDBc v\xE0o <b>Hi\u1EC7p ${this.state.currentCycle}/${this.state.totalCycles} Focus</b> (${this.state.focusMinutes} ph\xFAt). H\xE3y gi\u1EEF v\u1EEFng s\u1EF1 t\u1EADp trung cao \u0111\u1ED9 nh\xE9! \u{1F680}`,
            actions: [
              {
                label: "\u{1F680} T\u1EADp trung ngay!",
                primary: true,
                onClick: (e, modal) => modal.remove()
              }
            ]
          });
        }
      }
    }
    // Dừng sớm theo yêu cầu người dùng
    stop() {
      if (this._intervalTimer) {
        clearInterval(this._intervalTimer);
        this._intervalTimer = null;
      }
      this.state.enabled = false;
      savePomodoroState(this.state);
      this.onUpdate();
    }
    // Cập nhật cấu hình từ popup
    updateConfig(newPomodoroConfig, oldPomodoroConfig = null) {
      if (!newPomodoroConfig) return;
      this.config = newPomodoroConfig;
      if (oldPomodoroConfig && oldPomodoroConfig.enabled === true && newPomodoroConfig.enabled === false && this.state.enabled) {
        this.stop();
      }
    }
    // Format nhãn đếm ngược chi tiết cho HUD
    getStatusLabel() {
      if (!this.state.enabled) return null;
      const totalSec = Math.max(0, Math.ceil(this.remainingMs / 1e3));
      const m = Math.floor(totalSec / 60);
      const s = String(totalSec % 60).padStart(2, "0");
      const icon = this.state.sessionType === "focus" ? "\u{1F345}" : "\u2615";
      const stage = this.state.sessionType === "focus" ? "Focus" : "Ngh\u1EC9";
      return `${icon} Hi\u1EC7p ${this.state.currentCycle}/${this.state.totalCycles} ${stage} ${m}:${s}`;
    }
  };

  // src/content/modules/pet-engine.js
  var PetEngine = class {
    constructor({ onStateChange } = {}) {
      this.energy = 100;
      this.mood = "happy";
      this.currentStreak = 0;
      this.streakDays = 0;
      this.config = {
        mode: "default",
        // "default" | "puppet" | "ai_generated"
        uploadedImageBase64: "",
        uploadedPuppetImages: { happy: "", neutral: "", sad: "" },
        aiSprites: { happy: "", neutral: "", sad: "" }
      };
      this.knowledgeSeeds = 0;
      this.customQuotes = [];
      this.isWilted = false;
      this.evolutionStage = "seedling";
      this.isSleeping = false;
      this.isDizzy = false;
      this._idleTimer = null;
      this._dizzyTimer = null;
      this.accessories = {
        unlockedItems: [],
        // ["sunglasses", "laurel"]
        equipped: { head: null, body: null }
      };
      this.energyHistory = [];
      this.lastPokeEnergyTime = 0;
      this._bubbleTimer = null;
      this._speechBubbleEl = null;
      this.onStateChange = onStateChange || (() => {
      });
      this.containerEl = null;
      this._injectStyles();
      this._setupIdleTracking();
      this._initFromStorage();
    }
    _computeEvolutionStage() {
      if (this.streakDays >= 21) return "flowering";
      if (this.streakDays >= 4) return "growing";
      return "seedling";
    }
    _setupIdleTracking() {
      if (typeof window === "undefined") return;
      const resetIdle = () => {
        if (this.isSleeping) {
          this.setSleeping(false);
        }
        if (this._idleTimer) clearTimeout(this._idleTimer);
        this._idleTimer = setTimeout(() => {
          this.setSleeping(true);
        }, 12e4);
      };
      window.addEventListener("mousemove", resetIdle, { passive: true });
      window.addEventListener("keydown", resetIdle, { passive: true });
      window.addEventListener("scroll", resetIdle, { passive: true });
      window.addEventListener("click", resetIdle, { passive: true });
      this._idleTimer = setTimeout(() => {
        this.setSleeping(true);
      }, 12e4);
    }
    setSleeping(sleeping) {
      if (this.isSleeping === sleeping) return;
      this.isSleeping = sleeping;
      this.render();
    }
    updateState(state = {}) {
      if (!state) return;
      this.energy = state.energy ?? this.energy ?? 100;
      this.currentStreak = state.currentStreak ?? state.streakDays ?? this.currentStreak ?? 0;
      this.streakDays = this.currentStreak;
      this.mode = state.mode || this.mode || "default";
      this.config.mode = this.mode;
      if (state.knowledgeSeeds !== void 0) this.knowledgeSeeds = state.knowledgeSeeds;
      if (state.customQuotes !== void 0 && Array.isArray(state.customQuotes)) this.customQuotes = state.customQuotes;
      if (state.isWilted !== void 0) this.isWilted = Boolean(state.isWilted);
      this.evolutionStage = state.evolutionStage || this._computeEvolutionStage();
      if (state.mood) {
        this.mood = state.mood;
      } else {
        this._updateMoodFromEnergy();
      }
      if (state.puppetPhotos) {
        const p = state.puppetPhotos;
        this.config.uploadedPuppetImages = {
          happy: p.happy || p.happyImage || "",
          neutral: p.neutral || p.neutralImage || "",
          sad: p.sad || p.sadImage || ""
        };
        this.config.uploadedImageBase64 = this.config.uploadedPuppetImages.happy || this.config.uploadedPuppetImages.neutral || this.config.uploadedPuppetImages.sad || state.uploadedImageBase64 || "";
      } else if (state.uploadedImageBase64) {
        this.config.uploadedImageBase64 = state.uploadedImageBase64;
      }
      if (state.aiSprites) {
        this.config.aiSprites = state.aiSprites;
      }
      if (state.accessories) {
        this._syncAccessories(state.accessories);
      }
      if (state.lastPokeEnergyTime) {
        this.lastPokeEnergyTime = state.lastPokeEnergyTime;
      }
      if (Array.isArray(state.energyHistory)) {
        this.energyHistory = state.energyHistory;
      }
      this.render();
    }
    // ─── Khởi Tạo & Đồng Bộ Storage ─────────────────────────────────────────────
    _initFromStorage() {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["pet_state"], (res) => {
          if (res && res.pet_state) {
            this.updateState(res.pet_state);
          } else {
            this.render();
          }
        });
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace !== "local") return;
          if (changes.pet_state && changes.pet_state.newValue) {
            this.updateState(changes.pet_state.newValue);
          }
        });
      }
    }
    _syncAccessories(stored) {
      if (stored) {
        this.accessories = {
          unlockedItems: Array.isArray(stored.unlockedItems) ? [...stored.unlockedItems] : [],
          equipped: {
            head: stored.equippedHead !== void 0 ? stored.equippedHead : stored.equipped?.head || null,
            body: null
          }
        };
      }
      this._checkStreakUnlocks();
    }
    _checkStreakUnlocks() {
      let changed = false;
      const currentUnlocked = new Set(this.accessories.unlockedItems || []);
      if (this.streakDays >= 3 && !currentUnlocked.has("sunglasses")) {
        currentUnlocked.add("sunglasses");
        changed = true;
      }
      if (this.streakDays >= 7 && !currentUnlocked.has("laurel")) {
        currentUnlocked.add("laurel");
        changed = true;
      }
      if (changed) {
        this.accessories.unlockedItems = Array.from(currentUnlocked);
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(["pet_state"], (res) => {
            const current = res.pet_state || {};
            current.accessories = {
              unlockedItems: this.accessories.unlockedItems,
              equippedHead: this.accessories.equipped?.head || null
            };
            chrome.storage.local.set({ pet_state: current });
          });
        }
      }
    }
    _updateMoodFromEnergy() {
      if (this.energy >= 70) this.mood = "happy";
      else if (this.energy >= 40) this.mood = "neutral";
      else this.mood = "sad";
    }
    // ─── CSS Keyframes Hoạt Họa Độc Lập ──────────────────────────────────────────
    _injectStyles() {
      if (typeof document === "undefined") return;
      if (document.getElementById("mindful-pet-keyframes")) return;
      const style = document.createElement("style");
      style.id = "mindful-pet-keyframes";
      style.textContent = `
      @keyframes mindfulPetBounce {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-4px) scale(1.05); }
      }
      @keyframes mindfulPetBreathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.03); }
      }
      @keyframes mindfulPetShiver {
        0%, 100% { transform: translate(0, 0); }
        20% { transform: translate(-1.5px, 1px) rotate(-1deg); }
        40% { transform: translate(1.5px, -1px) rotate(1deg); }
        60% { transform: translate(-1px, -1px); }
        80% { transform: translate(1px, 1px); }
      }
      @keyframes mindfulHeartFloat {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(-12px) scale(1); opacity: 0; }
      }
      @keyframes mindfulSweatDrop {
        0% { transform: translateY(0); opacity: 0; }
        30% { opacity: 1; }
        100% { transform: translateY(8px); opacity: 0; }
      }
      @keyframes mindfulBubblePop {
        0% { transform: translateX(-50%) translateY(6px) scale(0.85); opacity: 0; }
        100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
      }
      @keyframes mindfulEnergyFloat {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-24px); opacity: 0; }
      }

      @keyframes mindfulPetDizzy {
        0%, 100% { transform: rotate(0deg) scale(0.96); }
        25% { transform: rotate(-10deg) scale(0.94); }
        50% { transform: rotate(6deg) scale(0.98); }
        75% { transform: rotate(-6deg) scale(0.94); }
      }
      @keyframes mindfulPetSleeping {
        0%, 100% { transform: translateY(1px) scale(0.97); }
        50% { transform: translateY(-1px) scale(1.02); }
      }
      @keyframes mindfulZzzFloat {
        0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
        40% { opacity: 0.9; }
        100% { transform: translate(12px, -18px) scale(1.1); opacity: 0; }
      }
      @keyframes mindfulAuraGrowing {
        0%, 100% { box-shadow: 0 0 6px rgba(16, 185, 129, 0.4), inset 0 0 4px rgba(16, 185, 129, 0.2); }
        50% { box-shadow: 0 0 14px rgba(16, 185, 129, 0.75), inset 0 0 8px rgba(16, 185, 129, 0.4); }
      }
      @keyframes mindfulAuraFlowering {
        0%, 100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(251, 191, 36, 0.3); border-color: #F59E0B; }
        50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.9), 0 0 35px rgba(251, 191, 36, 0.6); border-color: #FBBF24; }
      }
      @keyframes mindfulDroopLeaf {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(3deg) translateY(1px); }
      }

      .mindful-pet-anim-happy {
        animation: mindfulPetBounce 1.2s ease-in-out infinite !important;
      }
      .mindful-pet-anim-neutral {
        animation: mindfulPetBreathe 2.4s ease-in-out infinite !important;
      }
      .mindful-pet-anim-sad {
        animation: mindfulPetShiver 0.6s linear infinite !important;
      }
      .mindful-pet-anim-dizzy {
        animation: mindfulPetDizzy 0.4s ease-in-out infinite !important;
      }
      .mindful-pet-anim-sleeping {
        animation: mindfulPetSleeping 2.6s ease-in-out infinite !important;
      }
      .mindful-aura-growing {
        border-radius: 50% !important;
        animation: mindfulAuraGrowing 2s ease-in-out infinite !important;
      }
      .mindful-aura-flowering {
        border-radius: 50% !important;
        animation: mindfulAuraFlowering 1.8s ease-in-out infinite !important;
      }
    `;
      (document.head || document.documentElement).appendChild(style);
    }
    // ─── 1. Chế Độ "default": Mầm Cây Sprout SVG ─────────────────────────────────
    // ─── Render Phụ Kiện (Head / Body) ──────────────────────────────────────────
    _renderAccessoryHead(mode = "default") {
      const equippedHead = this.accessories?.equipped?.head;
      if (!equippedHead) return "";
      if (equippedHead === "sunglasses") {
        if (mode === "default") {
          return `
          <!-- K\xEDnh r\xE2m c\u1EF1c ng\u1EA7u (Sprout) -->
          <g transform="translate(0, 0)">
            <path d="M 10 20 L 17 20 Q 18 20.5 19 20 L 26 20 Q 27 24 23 24 L 20 24 Q 18 24 17 21 Q 16 24 13 24 L 10 24 Q 7 24 10 20 Z" fill="#0F172A" />
            <rect x="9.5" y="19.5" width="7" height="4.5" rx="1.5" fill="#1E293B" stroke="#38BDF8" stroke-width="0.6"/>
            <rect x="19.5" y="19.5" width="7" height="4.5" rx="1.5" fill="#1E293B" stroke="#38BDF8" stroke-width="0.6"/>
            <line x1="16.5" y1="21.5" x2="19.5" y2="21.5" stroke="#38BDF8" stroke-width="0.8"/>
            <line x1="11" y1="20.5" x2="13" y2="22.5" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
            <line x1="21" y1="20.5" x2="23" y2="22.5" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
          </g>
        `;
        } else if (mode === "puppet") {
          return `
          <div style="position:absolute; top:7px; left:50%; transform:translateX(-50%); width:24px; height:10px; z-index:4; pointer-events:none;">
            <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
              <rect x="2" y="2" width="9" height="5.5" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <rect x="13" y="2" width="9" height="5.5" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <line x1="11" y1="4.5" x2="13" y2="4.5" stroke="#38BDF8" stroke-width="0.8"/>
              <line x1="4" y1="3" x2="7" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.7" stroke-linecap="round"/>
              <line x1="15" y1="3" x2="18" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.7" stroke-linecap="round"/>
            </svg>
          </div>
        `;
        } else {
          return `
          <div style="position:absolute; top:8px; left:50%; transform:translateX(-50%); width:26px; height:10px; z-index:4; pointer-events:none;">
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none">
              <rect x="2" y="2" width="10" height="6" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <rect x="14" y="2" width="10" height="6" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <line x1="12" y1="4.5" x2="14" y2="4.5" stroke="#38BDF8" stroke-width="0.8"/>
              <line x1="4" y1="3" x2="8" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.8" stroke-linecap="round"/>
              <line x1="16" y1="3" x2="20" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
          </div>
        `;
        }
      }
      if (equippedHead === "laurel") {
        if (mode === "default") {
          return `
          <!-- V\xF2ng nguy\u1EC7t qu\u1EBF vinh quang (Sprout) -->
          <g transform="translate(0, 0)">
            <path d="M 8 18 C 7 13, 11 11, 18 11 C 25 11, 29 13, 28 18" stroke="#F59E0B" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <ellipse cx="10" cy="15" rx="2.4" ry="1.2" transform="rotate(-30 10 15)" fill="#FBBF24" />
            <ellipse cx="13" cy="12" rx="2.4" ry="1.2" transform="rotate(-15 13 12)" fill="#FCD34D" />
            <ellipse cx="23" cy="12" rx="2.4" ry="1.2" transform="rotate(15 23 12)" fill="#FCD34D" />
            <ellipse cx="26" cy="15" rx="2.4" ry="1.2" transform="rotate(30 26 15)" fill="#FBBF24" />
            <circle cx="18" cy="11" r="1.5" fill="#EF4444" />
          </g>
        `;
        } else if (mode === "puppet") {
          return `
          <div style="position:absolute; top:-7px; left:50%; transform:translateX(-50%); width:30px; height:14px; z-index:4; pointer-events:none;">
            <svg width="30" height="14" viewBox="0 0 30 14" fill="none">
              <path d="M 4 12 C 4 6, 9 4, 15 4 C 21 4, 26 6, 26 12" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <ellipse cx="7" cy="8" rx="2.8" ry="1.4" transform="rotate(-30 7 8)" fill="#FBBF24" />
              <ellipse cx="11" cy="5" rx="2.8" ry="1.4" transform="rotate(-10 11 5)" fill="#FCD34D" />
              <ellipse cx="19" cy="5" rx="2.8" ry="1.4" transform="rotate(10 19 5)" fill="#FCD34D" />
              <ellipse cx="23" cy="8" rx="2.8" ry="1.4" transform="rotate(30 23 8)" fill="#FBBF24" />
              <circle cx="15" cy="4" r="1.8" fill="#EF4444" />
            </svg>
          </div>
        `;
        } else {
          return `
          <div style="position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:32px; height:14px; z-index:4; pointer-events:none;">
            <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
              <path d="M 4 12 C 4 6, 10 4, 16 4 C 22 4, 28 6, 28 12" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <ellipse cx="7" cy="8" rx="2.8" ry="1.4" transform="rotate(-30 7 8)" fill="#FBBF24" />
              <ellipse cx="11" cy="5" rx="2.8" ry="1.4" transform="rotate(-10 11 5)" fill="#FCD34D" />
              <ellipse cx="21" cy="5" rx="2.8" ry="1.4" transform="rotate(10 21 5)" fill="#FCD34D" />
              <ellipse cx="25" cy="8" rx="2.8" ry="1.4" transform="rotate(30 25 8)" fill="#FBBF24" />
              <circle cx="16" cy="4" r="1.8" fill="#EF4444" />
            </svg>
          </div>
        `;
        }
      }
      return "";
    }
    // ─── 1. Chế Độ "default": Mầm Cây Sprout SVG ─────────────────────────────────
    _renderDefaultSprout(size = 36) {
      const isHappy = this.mood === "happy";
      const isNeutral = this.mood === "neutral";
      const isSad = this.mood === "sad";
      let animClass = isHappy ? "mindful-pet-anim-happy" : isNeutral ? "mindful-pet-anim-neutral" : "mindful-pet-anim-sad";
      if (this.isDizzy) animClass = "mindful-pet-anim-dizzy";
      else if (this.isSleeping) animClass = "mindful-pet-anim-sleeping";
      const potColor = isHappy ? "#8B5CF6" : isSad ? "#475569" : "#06B6D4";
      let leafColor = this.isWilted ? "#EAB308" : isHappy ? "#10B981" : isSad ? "#94A3B8" : "#34D399";
      const eyeColor = isSad ? "#64748B" : "#0F172A";
      const stage = this.evolutionStage || this._computeEvolutionStage();
      let flower = "";
      let auraFilter = "";
      if (stage === "flowering") {
        auraFilter = "filter: drop-shadow(0 0 5px rgba(245,158,11,0.85));";
        flower = `
        <g transform="translate(18, 4)">
          <circle cx="0" cy="0" r="5" fill="#F59E0B" />
          <circle cx="-3.5" cy="-3.5" r="3.2" fill="#FBBF24" />
          <circle cx="3.5" cy="-3.5" r="3.2" fill="#FBBF24" />
          <circle cx="-3.5" cy="3.5" r="3.2" fill="#FBBF24" />
          <circle cx="3.5" cy="3.5" r="3.2" fill="#FBBF24" />
          <circle cx="0" cy="0" r="2.2" fill="#EF4444" />
          <!-- Tia l\u1EA5p l\xE1nh ho\xE0ng kim -->
          <circle cx="-7" cy="-2" r="1.2" fill="#FEF08A" />
          <circle cx="7" cy="-2" r="1.2" fill="#FEF08A" />
        </g>
      `;
      } else if (isHappy && !this.isWilted) {
        flower = `
        <g transform="translate(18, 5)">
          <circle cx="0" cy="0" r="4.5" fill="#F43F5E" />
          <circle cx="-3" cy="-3" r="3" fill="#FDA4AF" />
          <circle cx="3" cy="-3" r="3" fill="#FDA4AF" />
          <circle cx="-3" cy="3" r="3" fill="#FDA4AF" />
          <circle cx="3" cy="3" r="3" fill="#FDA4AF" />
          <circle cx="0" cy="0" r="2.2" fill="#FBBF24" />
        </g>
      `;
      }
      let eyes = "";
      if (this.isDizzy) {
        eyes = `
        <!-- M\u1EAFt xoay v\xF2ng ch\xF3ng m\u1EB7t -->
        <path d="M 12 21 C 12 19, 16 19, 16 21 C 16 23, 13 23, 13 21.5" stroke="${eyeColor}" stroke-width="1.6" fill="none"/>
        <path d="M 20 21 C 20 19, 24 19, 24 21 C 24 23, 21 23, 21 21.5" stroke="${eyeColor}" stroke-width="1.6" fill="none"/>
        <ellipse cx="18" cy="26" rx="2" ry="1.5" fill="${eyeColor}" />
      `;
      } else if (this.isSleeping) {
        eyes = `
        <!-- M\u1EAFt nh\u1EAFm ng\u1EE7 g\u1EADt -->
        <line x1="12" y1="21" x2="16" y2="21" stroke="${eyeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="20" y1="21" x2="24" y2="21" stroke="${eyeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 16 25 Q 18 26 20 25" stroke="${eyeColor}" stroke-width="1.3" fill="none"/>
      `;
      } else if (isHappy) {
        eyes = `
        <path d="M 12 21 Q 14 18 16 21" stroke="${eyeColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M 20 21 Q 22 18 24 21" stroke="${eyeColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M 15 24 Q 18 27 21 24" stroke="#F43F5E" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      `;
      } else if (isSad) {
        eyes = `
        <line x1="12" y1="21" x2="16" y2="23" stroke="${eyeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="20" y1="23" x2="24" y2="21" stroke="${eyeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 15 26 Q 18 23 21 26" stroke="${eyeColor}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <circle cx="27" cy="18" r="1.8" fill="#38BDF8" style="animation: mindfulSweatDrop 1.2s infinite;" />
      `;
      } else {
        eyes = `
        <circle cx="14" cy="21" r="1.8" fill="${eyeColor}"/>
        <circle cx="22" cy="21" r="1.8" fill="${eyeColor}"/>
        <line x1="16" y1="25" x2="20" y2="25" stroke="${eyeColor}" stroke-width="1.5" stroke-linecap="round"/>
      `;
      }
      let leaves = "";
      if (this.isWilted) {
        leaves = `
        <path d="M 18 18 C 18 14, 13 13, 12 12" stroke="#78350F" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="10" cy="13" rx="4" ry="2.2" transform="rotate(-35 10 13)" fill="#EAB308" />
        <ellipse cx="23" cy="17" rx="3.2" ry="1.8" transform="rotate(30 23 17)" fill="#CA8A04" />
      `;
      } else if (stage === "seedling") {
        leaves = `
        <path d="M 18 18 C 18 13, 18 11, 18 10" stroke="#059669" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="18" cy="9.5" rx="3.5" ry="2.2" fill="${leafColor}" />
      `;
      } else if (isSad) {
        leaves = `
        <path d="M 18 18 C 18 13, 13 12, 12 11" stroke="#64748B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="10" cy="12" rx="4.5" ry="2.5" transform="rotate(-30 10 12)" fill="${leafColor}" />
      `;
      } else {
        leaves = `
        <path d="M 18 18 C 18 11, 18 9, 18 8" stroke="#059669" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="13" cy="9" rx="5" ry="3" transform="rotate(-25 13 9)" fill="${leafColor}" />
        <ellipse cx="23" cy="9" rx="5" ry="3" transform="rotate(25 23 9)" fill="${leafColor}" />
      `;
      }
      const accessorySvg = this._renderAccessoryHead("default");
      const zzzBadge = this.isSleeping ? `<span style="position:absolute; top:-8px; right:-6px; font-size:11px; font-weight:800; color:#93C5FD; animation:mindfulZzzFloat 2s infinite; pointer-events:none;">zZ</span>` : "";
      const dizzyBadge = this.isDizzy ? `<span style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:12px; pointer-events:none;">\u{1F4AB}</span>` : "";
      const wiltedBadge = this.isWilted ? `<span style="position:absolute; bottom:-2px; right:-4px; font-size:10px; pointer-events:none;" title="L\xE1 \xFAa do \u0111\u1EE9t chu\u1ED7i">\u{1F342}</span>` : "";
      return `
      <div class="${animClass}" style="position:relative; display:inline-flex; align-items:center; justify-content:center;">
        ${zzzBadge}
        ${dizzyBadge}
        ${wiltedBadge}
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="${auraFilter}">
          ${leaves}
          ${flower}
          <!-- Ch\u1EADu c\xE2y tr\xF2n cute -->
          <rect x="8" y="16" width="20" height="15" rx="5" fill="${potColor}" />
          <ellipse cx="18" cy="16.5" rx="10" ry="2.5" fill="rgba(255,255,255,0.25)" />
          <rect x="9.5" y="18" width="17" height="11.5" rx="3.5" fill="#F8FAFC" />
          ${eyes}
          ${accessorySvg}
        </svg>
      </div>
    `;
    }
    // ─── 2. Chế Độ "puppet": Khung Chibi Ghép Mặt Cắt Dán Offline ───────────────
    _renderPuppet(size = 40) {
      const isHappy = this.mood === "happy";
      const isSad = this.mood === "sad";
      const isNeutral = this.mood === "neutral";
      let animClass = isHappy ? "mindful-pet-anim-happy" : isNeutral ? "mindful-pet-anim-neutral" : "mindful-pet-anim-sad";
      if (this.isDizzy) animClass = "mindful-pet-anim-dizzy";
      else if (this.isSleeping) animClass = "mindful-pet-anim-sleeping";
      const bodyColor = isHappy ? "#8B5CF6" : isSad ? "#475569" : "#06B6D4";
      const stage = this.evolutionStage || this._computeEvolutionStage();
      const auraClass = stage === "flowering" ? "mindful-aura-flowering" : stage === "growing" ? "mindful-aura-growing" : "";
      const puppetImgs = this.config.uploadedPuppetImages || {};
      const dedicatedFaceImg = puppetImgs[this.mood];
      const faceImg = dedicatedFaceImg || this.config.uploadedImageBase64 || puppetImgs.happy || puppetImgs.neutral || puppetImgs.sad || "";
      const overlayHeart = isHappy && !this.isWilted ? `
      <span style="position:absolute; top:-3px; right:-3px; font-size:${Math.max(10, Math.round(size * 0.25))}px; animation:mindfulHeartFloat 1.2s infinite; z-index:5;">\u2764\uFE0F</span>
    ` : "";
      const overlaySweat = isSad ? `
      <span style="position:absolute; top:2px; right:1px; font-size:${Math.max(9, Math.round(size * 0.22))}px; animation:mindfulSweatDrop 1s infinite; z-index:5;">\u{1F4A7}</span>
    ` : "";
      const zzzBadge = this.isSleeping ? `
      <span style="position:absolute; top:-6px; right:-4px; font-size:11px; font-weight:800; color:#93C5FD; animation:mindfulZzzFloat 2s infinite; z-index:6;">zZ</span>
    ` : "";
      const dizzyBadge = this.isDizzy ? `
      <span style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:12px; z-index:6;">\u{1F4AB}</span>
    ` : "";
      const wiltedBadge = this.isWilted ? `
      <span style="position:absolute; bottom:0; left:-2px; font-size:10px; z-index:6;" title="\u0110\u1EE9t chu\u1ED7i - c\u1EA7n 1 phi\xEAn t\u1EADp trung \u0111\u1EC3 ph\u1EE5c h\u1ED3i">\u{1F342}</span>
    ` : "";
      let filterStyle = "";
      if (this.isWilted) {
        filterStyle = "filter: grayscale(0.4) sepia(0.3);";
      } else if (isSad && !dedicatedFaceImg) {
        filterStyle = "filter: grayscale(0.6) contrast(0.85);";
      }
      const faceSize = Math.max(24, Math.round(size * 0.65));
      const svgW = Math.max(30, Math.round(size * 0.85));
      const svgH = Math.max(18, Math.round(size * 0.5));
      const faceElement = faceImg ? `
      <img src="${faceImg}" class="${auraClass}" style="width:${faceSize}px; height:${faceSize}px; border-radius:50%; object-fit:cover; border:1.5px solid #F8FAFC; box-shadow:0 2px 6px rgba(0,0,0,0.3); ${filterStyle}" alt="Pet Face" />
    ` : `
      <div class="${auraClass}" style="width:${faceSize}px; height:${faceSize}px; border-radius:50%; background:linear-gradient(135deg, #6366F1, #8B5CF6); display:flex; align-items:center; justify-content:center; color:#fff; font-size:${Math.round(faceSize * 0.45)}px; font-weight:700;">
        \u{1F464}
      </div>
    `;
      const accessoryHtml = this._renderAccessoryHead("puppet");
      return `
      <div class="${animClass}" style="position:relative; width:${size}px; height:${size}px; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; user-select:none;">
        ${overlayHeart}
        ${overlaySweat}
        ${zzzBadge}
        ${dizzyBadge}
        ${wiltedBadge}
        <div style="position:relative; z-index:2; margin-bottom:-${Math.round(size * 0.15)}px;">
          ${faceElement}
          ${accessoryHtml}
        </div>
        <!-- Khung c\u01A1 th\u1EC3 Chibi nh\u1ECF nh\u1EAFn d\u1EA1ng SVG -->
        <svg width="${svgW}" height="${svgH}" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="z-index:1; overflow:visible;">
          <rect x="7" y="4" width="20" height="12" rx="5" fill="${bodyColor}" />
          <circle cx="5" cy="9" r="3.2" fill="${bodyColor}" />
          <circle cx="29" cy="9" r="3.2" fill="${bodyColor}" />
          <ellipse cx="12" cy="17" rx="2.5" ry="2" fill="#1E293B" />
          <ellipse cx="22" cy="17" rx="2.5" ry="2" fill="#1E293B" />
          ${isHappy ? `<polygon points="17,6 14,9 20,9" fill="#FBBF24" />` : `<circle cx="17" cy="8" r="1.5" fill="#F8FAFC" />`}
        </svg>
      </div>
    `;
    }
    // ─── 3. Chế Độ "ai_generated": Tráo Đổi 3 Sprite AI Biểu Cảm ────────────────
    _renderAiSprite(size = 38) {
      const sprites = this.config.aiSprites || {};
      const spriteDataUri = sprites[this.mood] || sprites.happy || sprites.neutral || sprites.sad;
      if (!spriteDataUri) {
        if (this.config.uploadedImageBase64 || this.config.uploadedPuppetImages && (this.config.uploadedPuppetImages.happy || this.config.uploadedPuppetImages.neutral)) {
          return this._renderPuppet(size);
        }
        return this._renderDefaultSprout(size);
      }
      const isHappy = this.mood === "happy";
      const isSad = this.mood === "sad";
      const isNeutral = this.mood === "neutral";
      let animClass = isHappy ? "mindful-pet-anim-happy" : isNeutral ? "mindful-pet-anim-neutral" : "mindful-pet-anim-sad";
      if (this.isDizzy) animClass = "mindful-pet-anim-dizzy";
      else if (this.isSleeping) animClass = "mindful-pet-anim-sleeping";
      const stage = this.evolutionStage || this._computeEvolutionStage();
      const auraClass = stage === "flowering" ? "mindful-aura-flowering" : stage === "growing" ? "mindful-aura-growing" : "";
      const accessoryHtml = this._renderAccessoryHead("ai_generated");
      const zzzBadge = this.isSleeping ? `<span style="position:absolute; top:-6px; right:-4px; font-size:11px; font-weight:800; color:#93C5FD; animation:mindfulZzzFloat 2s infinite; z-index:6;">zZ</span>` : "";
      const dizzyBadge = this.isDizzy ? `<span style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:12px; z-index:6;">\u{1F4AB}</span>` : "";
      const wiltedBadge = this.isWilted ? `<span style="position:absolute; bottom:0; left:-2px; font-size:10px; z-index:6;">\u{1F342}</span>` : "";
      const filterStyle = this.isWilted ? "filter: grayscale(0.4) sepia(0.25);" : "";
      return `
      <div class="${animClass}" style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; border-radius:8px; overflow:visible;">
        ${zzzBadge}
        ${dizzyBadge}
        ${wiltedBadge}
        <img src="${spriteDataUri}" class="${auraClass}" style="width:100%; height:100%; object-fit:contain; border-radius:8px; ${filterStyle}" alt="AI Pet ${this.mood}" />
        ${accessoryHtml}
      </div>
    `;
    }
    /**
     * Tạo HTML hiển thị Pet tương ứng theo chế độ đang kích hoạt
     */
    getPetAvatarHtml(size = 36) {
      const mode = this.config.mode || this.mode || "default";
      if (mode === "puppet") {
        return this._renderPuppet(size);
      }
      if (mode === "ai_generated") {
        return this._renderAiSprite(size);
      }
      return this._renderDefaultSprout(size);
    }
    /**
     * Tạo HTML hiển thị Pet ôm lấy vòng tròn thở Box Breathing Mốc 3
     */
    getBreathingPetHtml(size = 64) {
      return `
      <div style="position:relative; display:inline-flex; align-items:center; justify-content:center; animation: mindfulBoxBreathe 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; will-change:transform;">
        ${this.getPetAvatarHtml(size)}
      </div>
    `;
    }
    // ─── Gắn Vào HUD & Vẽ Giao Diện ─────────────────────────────────────────────
    mount(parentEl) {
      if (!parentEl) return;
      if (!this.containerEl) {
        this.containerEl = document.createElement("div");
        this.containerEl.id = "mindful-pet-widget";
        this.containerEl.style.cssText = `
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        cursor: pointer;
        user-select: none;
        transition: all 0.25s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      `;
        this.containerEl.title = "Nh\u1EA5p v\xE0o Pet \u0111\u1EC3 tr\xF2 chuy\u1EC7n & n\u1EA1p n\u0103ng l\u01B0\u1EE3ng!";
        this.containerEl.addEventListener("click", (e) => {
          if (e.target.closest("#mindful-pet-speech-bubble")) return;
          e.stopPropagation();
          this.handlePoke();
        });
      }
      if (this.containerEl.parentElement !== parentEl) {
        parentEl.insertBefore(this.containerEl, parentEl.firstChild);
      }
      this.render();
    }
    render() {
      if (!this.containerEl) return;
      const moodIcons = {
        happy: "\u2728",
        neutral: "\u26A1",
        sad: "\u{1F327}\uFE0F"
      };
      const energyColor = this.energy >= 70 ? "#10B981" : this.energy >= 40 ? "#F59E0B" : "#EF4444";
      let bodyEl = this.containerEl.querySelector("#mindful-pet-body-content");
      if (!bodyEl) {
        bodyEl = document.createElement("div");
        bodyEl.id = "mindful-pet-body-content";
        bodyEl.style.cssText = "display:inline-flex; align-items:center; gap:6px;";
        if (this._speechBubbleEl && this._speechBubbleEl.parentElement === this.containerEl) {
          this.containerEl.insertBefore(bodyEl, this._speechBubbleEl);
        } else {
          this.containerEl.appendChild(bodyEl);
        }
      }
      bodyEl.innerHTML = `
      <div style="line-height:0; display:flex; align-items:center;">
        ${this.getPetAvatarHtml(34)}
      </div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        <div style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#F1F5F9;">
          <span>${this.energy}%</span>
          <span>${moodIcons[this.mood] || "\u26A1"}</span>
          ${this.currentStreak > 0 ? `<span style="color:#F59E0B;">\u{1F525}${this.currentStreak}</span>` : ""}
        </div>
        <div style="width:36px; height:4px; background:rgba(255,255,255,0.15); border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${this.energy}%; background:${energyColor}; transition:width 0.4s ease;"></div>
        </div>
      </div>
    `;
    }
    // ─── Tương Tác Poke & Speech Bubble (Hỗ Trợ Cho Ăn Hạt & Lời Thoại Người Thương) ───
    handlePoke() {
      this.cheerUp();
      if (this.isSleeping) {
        this.setSleeping(false);
        this._showSpeechBubble("O\xE1p... T\u1EDB t\u1EC9nh d\u1EADy r\u1ED3i n\xE8! Ch\xE0o b\u1EA1n! \u2728");
        return;
      }
      const now = Date.now();
      const cooldownMs = 30 * 60 * 1e3;
      const canGainEnergy = now - this.lastPokeEnergyTime >= cooldownMs;
      let energyBonusText = "";
      if (canGainEnergy) {
        this.lastPokeEnergyTime = now;
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(["pet_state"], (res) => {
            const current = res.pet_state || {};
            current.lastPokeEnergyTime = now;
            current.lastActiveTimestamp = now;
            chrome.storage.local.set({ pet_state: current });
          });
        }
        this.reward(3, "pet_poke");
        energyBonusText = `<div style="font-size:10px; color:#10B981; font-weight:700; margin-top:2px;">+3\u26A1 N\u0103ng l\u01B0\u1EE3ng ph\u1EE5c h\u1ED3i!</div>`;
      }
      let quote = "";
      if (this.isWilted) {
        quote = "M\u1EA7m xanh \u0111ang b\u1ECB \xFAa do \u0111\u1EE9t chu\u1ED7i... H\xE3y ho\xE0n th\xE0nh 1 phi\xEAn Pomodoro ho\u1EB7c cho t\u1EDB 1 h\u1EA1t m\u1EA7m \u0111\u1EC3 h\u1ED3i sinh nh\xE9! \u{1F342}";
      } else if (this.customQuotes && this.customQuotes.length > 0 && (this.mood === "sad" || Math.random() < 0.7)) {
        quote = this.customQuotes[Math.floor(Math.random() * this.customQuotes.length)];
      } else {
        const reminders = [
          "\u{1F4A7} H\xE3y u\u1ED1ng m\u1ED9t ng\u1EE5m n\u01B0\u1EDBc \u1EA5m nh\xE9!",
          "\u{1F32C}\uFE0F Th\u1EA3 l\u1ECFng vai v\xE0 h\xEDt th\u1EDF s\xE2u 3 nh\u1ECBp n\xE0o!",
          "\u{1F3AF} \u0110\u1EEBng qu\xEAn m\u1EE5c ti\xEAu l\u1EDBn c\u1EE7a b\u1EA1n h\xF4m nay!",
          "\u{1F440} Nh\xECn ra xa 6 m\xE9t trong 20 gi\xE2y \u0111\u1EC3 th\u01B0 gi\xE3n m\u1EAFt!",
          "\u{1F9D8} Ng\u1ED3i th\u1EB3ng l\u01B0ng l\xEAn m\u1ED9t ch\xFAt b\u1EA1n \u01A1i!",
          "\u2728 B\u1EA1n \u0111ang l\xE0m ch\u1EE7 th\u1EDDi gian r\u1EA5t t\u1ED1t!"
        ];
        quote = reminders[Math.floor(Math.random() * reminders.length)];
      }
      let feedBtnHtml = "";
      if (this.knowledgeSeeds > 0) {
        feedBtnHtml = `
        <button id="mindful-pet-feed-btn" style="
          background: linear-gradient(135deg, #10B981, #059669);
          border: none; color: #fff; font-size: 10px; font-weight: 700;
          padding: 4px 10px; border-radius: 6px; cursor: pointer;
          box-shadow: 0 2px 8px rgba(16,185,129,0.4); pointer-events: auto;
        ">
          \u{1F331} Cho \u0103n H\u1EA1t m\u1EA7m (${this.knowledgeSeeds}) +15\u26A1
        </button>
      `;
      }
      const historyBtnHtml = `
      <button id="mindful-pet-history-btn" style="
        background: rgba(139, 92, 246, 0.25); border: 1px solid rgba(139, 92, 246, 0.5);
        color: #C4B5FD; font-size: 9.5px; font-weight: 700; padding: 3px 8px;
        border-radius: 6px; cursor: pointer; pointer-events: auto;
      ">
        \u{1F4DC} L\u1ECBch s\u1EED n\u0103ng l\u01B0\u1EE3ng
      </button>
    `;
      const actionButtonsHtml = `
      <div style="margin-top:6px; display:flex; gap:5px; justify-content:center; flex-wrap:wrap; align-items:center;">
        ${feedBtnHtml}
        ${historyBtnHtml}
      </div>
    `;
      this._showSpeechBubble(quote, `${energyBonusText}${actionButtonsHtml}`, true);
      if (this._speechBubbleEl) {
        const feedBtn = this._speechBubbleEl.querySelector("#mindful-pet-feed-btn");
        if (feedBtn) {
          feedBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.feedSeed();
          });
        }
        const historyBtn = this._speechBubbleEl.querySelector("#mindful-pet-history-btn");
        if (historyBtn) {
          historyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.showEnergyHistoryModal();
          });
        }
      }
    }
    _showSpeechBubble(text, bonusHtml = "", isInteractive = false) {
      if (!this.containerEl) return;
      if (this._speechBubbleEl) {
        this._speechBubbleEl.remove();
        this._speechBubbleEl = null;
      }
      if (this._bubbleTimer) {
        clearTimeout(this._bubbleTimer);
        this._bubbleTimer = null;
      }
      const bubble = document.createElement("div");
      bubble.id = "mindful-pet-speech-bubble";
      this._speechBubbleEl = bubble;
      bubble.style.cssText = `
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(12px);
      border: 1.5px solid rgba(139, 92, 246, 0.45);
      border-radius: 12px;
      padding: 8px 12px;
      color: #F8FAFC;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      text-align: center;
      white-space: normal;
      min-width: 150px;
      max-width: 250px;
      z-index: 2147483647;
      box-shadow: 0 8px 24px rgba(0,0,0,0.55), 0 0 12px rgba(139,92,246,0.3);
      animation: mindfulBubblePop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
    `;
      bubble.innerHTML = `
      <div>${text}</div>
      ${bonusHtml}
      <div style="position:absolute; top:100%; left:50%; transform:translateX(-50%); width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid rgba(15, 23, 42, 0.94);"></div>
    `;
      bubble.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      this.containerEl.appendChild(bubble);
      const startHideTimer = () => {
        if (this._bubbleTimer) clearTimeout(this._bubbleTimer);
        this._bubbleTimer = setTimeout(() => {
          if (this._speechBubbleEl) {
            this._speechBubbleEl.style.transition = "opacity 0.25s ease, transform 0.25s ease";
            this._speechBubbleEl.style.opacity = "0";
            this._speechBubbleEl.style.transform = "translateX(-50%) translateY(4px)";
            setTimeout(() => {
              if (this._speechBubbleEl) {
                this._speechBubbleEl.remove();
                this._speechBubbleEl = null;
              }
            }, 250);
          }
        }, 6500);
      };
      bubble.addEventListener("mouseenter", () => {
        if (this._bubbleTimer) {
          clearTimeout(this._bubbleTimer);
          this._bubbleTimer = null;
        }
      });
      bubble.addEventListener("mouseleave", () => {
        startHideTimer();
      });
      startHideTimer();
    }
    // ─── Kích Hoạt Hành Vi Ngữ Cảnh Thời Gian Thực ─────────────────────────────
    triggerDizzy() {
      this.isDizzy = true;
      this.render();
      if (this._dizzyTimer) clearTimeout(this._dizzyTimer);
      this._dizzyTimer = setTimeout(() => {
        this.isDizzy = false;
        this.render();
      }, 6e3);
      this._showSpeechBubble("Ch\xF3ng m\u1EB7t qu\xE1! B\u1EA3ng tin ch\u01B0a k\u1ECBp c\u1EADp nh\u1EADt \u0111\xE2u m\xE0! \u{1F635}\u{1F4AB}");
    }
    triggerLateNight() {
      this._showSpeechBubble("T\u1EDB bu\u1ED3n ng\u1EE7 r\u1ED3i, ch\xFAng ta c\u1EA5t m\xE1y \u0111i ng\u1EE7 th\xF4i... \u{1F971}\u{1F4A4}");
    }
    triggerPomodoroCelebration() {
      this.reviveFromWilt();
      this.reward(15, "pomodoro_complete");
      this.cheerUp();
      this._showSpeechBubble("Xu\u1EA5t s\u1EAFc l\u1EAFm! B\u1EA1n v\u1EEBa ho\xE0n th\xE0nh m\u1ED9t phi\xEAn t\u1EADp trung tuy\u1EC7t v\u1EDDi! \u{1F389}\u2728");
    }
    addKnowledgeSeed() {
      this.knowledgeSeeds = (this.knowledgeSeeds || 0) + 1;
      this._saveState();
      this.cheerUp();
      this._showSpeechBubble(`+1 H\u1EA1t m\u1EA7m tri th\u1EE9c \u{1F331}! \u0110\xE3 t\xEDch l\u0169y ${this.knowledgeSeeds} h\u1EA1t. Ch\u1EA1m v\xE0o Pet \u0111\u1EC3 cho \u0103n nh\xE9!`);
    }
    feedSeed() {
      if (this.knowledgeSeeds <= 0) return;
      this.knowledgeSeeds--;
      this.reward(15, "knowledge_seed");
      this.reviveFromWilt();
      this._saveState();
      this.cheerUp();
      const remainingText = this.knowledgeSeeds > 0 ? ` (C\xF2n ${this.knowledgeSeeds} h\u1EA1t \u{1F331})` : "";
      let nextFeedBtnHtml = "";
      if (this.knowledgeSeeds > 0) {
        nextFeedBtnHtml = `
        <div style="margin-top:6px; display:flex; justify-content:center;">
          <button id="mindful-pet-feed-btn" style="
            background: linear-gradient(135deg, #10B981, #059669);
            border: none; color: #fff; font-size: 10px; font-weight: 700;
            padding: 4px 10px; border-radius: 6px; cursor: pointer;
            box-shadow: 0 2px 8px rgba(16,185,129,0.4); pointer-events: auto;
          ">
            \u{1F331} Cho \u0103n ti\u1EBFp (${this.knowledgeSeeds}) +15\u26A1
          </button>
        </div>
      `;
      }
      this._showSpeechBubble(
        `Ngon qu\xE1! N\u0103ng l\u01B0\u1EE3ng +15\u26A1 v\xE0 m\u1EA7m xanh b\u1EEBng s\xE1ng! \u{1F331}\u2728${remainingText}`,
        nextFeedBtnHtml,
        true
      );
      if (this.knowledgeSeeds > 0 && this._speechBubbleEl) {
        const feedBtn = this._speechBubbleEl.querySelector("#mindful-pet-feed-btn");
        if (feedBtn) {
          feedBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.feedSeed();
          });
        }
      }
    }
    reviveFromWilt() {
      if (this.isWilted) {
        this.isWilted = false;
        this._saveState();
        this.render();
        this.showPetToast("\u{1F33F} M\u1EA7m xanh \u0111\xE3 h\u1ED3i sinh m\xE0u xanh t\u01B0\u01A1i t\u1ED1t! C\xF9ng nhau ti\u1EBFp t\u1EE5c gi\u1EEF v\u1EEFng chu\u1ED7i nh\xE9! \u2728", {
          title: "H\u1ED3i Sinh S\u1EE9c S\u1ED1ng"
        });
      }
    }
    // ─── Điều Hòa Năng Lượng & Tâm Trạng (State Machine) ─────────────────────────
    _getReasonLabel(reason, type) {
      const map = {
        // Deductions
        impulsive_video: "L\u01B0\u1EDBt video d\xE0i b\u1ED1c \u0111\u1ED3ng",
        reload_spam: "T\u1EA3i l\u1EA1i trang li\xEAn t\u1EE5c (F5 spam)",
        milestone_1: "Ch\u1EA1m ng\u01B0\u1EE1ng m\u1ED1c 1 (C\u1EA3nh b\xE1o nh\u1EB9)",
        milestone_2: "Ch\u1EA1m ng\u01B0\u1EE1ng m\u1ED1c 2 (B\u1EADt m\xE0n h\xECnh x\xE1m)",
        milestone_3: "V\u01B0\u1EE3t ng\u01B0\u1EE1ng m\u1ED1c 3 (Qu\xE1 \u0111\xE0 - Box Breathing)",
        excess_swipes_post_m3: "Ti\u1EBFp t\u1EE5c l\u01B0\u1EDBt sau m\u1ED1c 3",
        session_extension: "Mua th\xEAm th\u1EDDi gian phi\xEAn l\u01B0\u1EDBt",
        study_distraction: "Xem video ngo\xE0i m\u1EE5c ti\xEAu trong gi\u1EDD h\u1ECDc",
        // Rewards
        pomodoro_complete: "Ho\xE0n th\xE0nh hi\u1EC7p t\u1EADp trung Pomodoro",
        pomodoro_all_cycles_complete: "Ho\xE0n th\xE0nh to\xE0n b\u1ED9 chu k\u1EF3 Pomodoro",
        useful_video: "Xem video h\u1ECDc t\u1EADp / h\u1EEFu \xEDch \u2265 80%",
        knowledge_seed: "Cho \u0103n h\u1EA1t gi\u1ED1ng tri th\u1EE9c",
        digital_detox: "R\u1EDDi m\u1EA1ng x\xE3 h\u1ED9i (Digital Detox)",
        session_closed_ontime: "\u0110\xF3ng tab \u0111\xFAng gi\u1EDD theo cam k\u1EBFt",
        breathing_complete: "Ho\xE0n th\xE0nh b\xE0i t\u1EADp th\u1EDF Box Breathing",
        pet_poke: "Ch\u1EA1m t\u01B0\u01A1ng t\xE1c vu\u1ED1t ve Pet",
        study_intent_declared: "X\xE1c nh\u1EADn m\u1EE5c ti\xEAu h\u1ECDc t\u1EADp"
      };
      if (map[reason]) return map[reason];
      return type === "deduct" ? "Tr\u1EEB n\u0103ng l\u01B0\u1EE3ng" : "C\u1ED9ng n\u0103ng l\u01B0\u1EE3ng";
    }
    _logEnergyChange(type, amount, reason, details = null) {
      if (!this.energyHistory) this.energyHistory = [];
      const now = /* @__PURE__ */ new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const label = this._getReasonLabel(reason, type);
      let detailStr = "";
      if (typeof details === "string") {
        detailStr = details;
      } else if (details && details.title) {
        const watchedStr = details.watched ? ` (${details.watched}s)` : "";
        detailStr = `${details.title}${watchedStr}`;
      }
      const entry = {
        id: `eh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        dateStr,
        timeStr,
        type,
        // "deduct" | "reward"
        amount,
        changeStr: type === "deduct" ? `-${amount}\u26A1` : `+${amount}\u26A1`,
        reason,
        label,
        detail: detailStr,
        newEnergy: this.energy
      };
      this.energyHistory.unshift(entry);
      if (this.energyHistory.length > 50) {
        this.energyHistory.pop();
      }
    }
    _saveState() {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["pet_state"], (res) => {
          const current = res.pet_state || {};
          const state = Object.assign({}, current, {
            energy: this.energy,
            mood: this.mood,
            currentStreak: this.currentStreak,
            streakDays: this.streakDays,
            knowledgeSeeds: this.knowledgeSeeds,
            customQuotes: this.customQuotes,
            isWilted: this.isWilted,
            evolutionStage: this._computeEvolutionStage(),
            energyHistory: this.energyHistory || [],
            lastActiveTimestamp: Date.now()
          });
          chrome.storage.local.set({ pet_state: state });
        });
      }
    }
    isCriticalEnergy() {
      return this.energy < 15;
    }
    isZeroEnergy() {
      return this.energy <= 0;
    }
    canExtendSession(cost = 10) {
      return this.energy >= cost && this.energy > 0;
    }
    /**
     * Trừ năng lượng: F5 dồn dập (-5), Mốc 2 (-10), Mốc 3 (-20), gia hạn (+5p: -10, +10p: -20, +15p: -35)
     */
    penalize(amount = 15, reason = "penalty", details = null) {
      let deduct = amount;
      if (reason === "reload_spam") deduct = 5;
      else if (reason === "milestone_1") deduct = 5;
      else if (reason === "milestone_2") deduct = 10;
      else if (reason === "milestone_3" || reason === "impulsive_video") deduct = 20;
      const oldEnergy = this.energy;
      this.energy = Math.max(0, this.energy - deduct);
      const actualDeduct = oldEnergy - this.energy;
      this._logEnergyChange("deduct", actualDeduct, reason, details);
      this._updateMoodFromEnergy();
      this._saveState();
      this.render();
      if (this.containerEl) {
        this.containerEl.style.transform = "scale(0.92) rotate(-6deg)";
        setTimeout(() => {
          if (this.containerEl) this.containerEl.style.transform = "none";
        }, 350);
      }
      this.onStateChange({
        energy: this.energy,
        mood: this.mood,
        isCritical: this.isCriticalEnergy(),
        isZero: this.isZeroEnergy(),
        reason
      });
    }
    /**
     * Hồi phục năng lượng: hoàn thành Pomodoro (+15), xem video hữu ích >= 80% (+10), đóng tab đúng giờ (+5), poke (+3)
     */
    reward(amount = 10, reason = "reward", details = null) {
      let bonus = amount;
      if (reason === "pomodoro_complete") bonus = 15;
      else if (reason === "useful_video") bonus = 10;
      else if (reason === "session_closed_ontime") bonus = 5;
      else if (reason === "pet_poke") bonus = 3;
      const oldEnergy = this.energy;
      this.energy = Math.min(100, this.energy + bonus);
      const actualBonus = this.energy - oldEnergy;
      if (actualBonus > 0 || oldEnergy === 100) {
        this._logEnergyChange("reward", actualBonus > 0 ? actualBonus : bonus, reason, details);
      }
      this._updateMoodFromEnergy();
      this._saveState();
      this.render();
      if (this.containerEl) {
        this.containerEl.style.transform = "scale(1.15) translateY(-3px)";
        setTimeout(() => {
          if (this.containerEl) this.containerEl.style.transform = "none";
        }, 350);
      }
      this.onStateChange({
        energy: this.energy,
        mood: this.mood,
        isCritical: this.isCriticalEnergy(),
        isZero: this.isZeroEnergy(),
        reason
      });
    }
    cheerUp() {
      if (this.containerEl) {
        this.containerEl.style.transform = "scale(1.18)";
        setTimeout(() => {
          if (this.containerEl) this.containerEl.style.transform = "none";
        }, 200);
      }
    }
    // ─── Digital Detox: Hồi phục năng lượng khi tắt ứng dụng / rời xa MXH ───────
    checkIdleRecovery() {
      if (typeof chrome !== "undefined" || !chrome.storage?.local) return;
      chrome.storage.local.get(["lastActiveTimestamp", "pet_state"], (res) => {
        const lastActive = res.pet_state?.lastActiveTimestamp || res.lastActiveTimestamp;
        const now = Date.now();
        if (!lastActive) {
          chrome.storage.local.set({ lastActiveTimestamp: now });
          return;
        }
        const elapsedMinutes = Math.floor((now - lastActive) / (60 * 1e3));
        if (elapsedMinutes >= 30) {
          const bonusSteps = Math.floor(elapsedMinutes / 30);
          const bonus = bonusSteps * 5;
          const oldEnergy = this.energy;
          this.energy = Math.min(100, this.energy + bonus);
          const actualBonus = this.energy - oldEnergy;
          const hrs = Math.floor(elapsedMinutes / 60);
          const mins = elapsedMinutes % 60;
          const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} ph\xFAt`;
          this._logEnergyChange("reward", actualBonus > 0 ? actualBonus : bonus, "digital_detox", `Ngo\u1EA1i tuy\u1EBFn ${timeStr}`);
          this._updateMoodFromEnergy();
          this._saveState();
          this.render();
          chrome.storage.local.set({ lastActiveTimestamp: now });
          this.showPetToast(
            `Ch\xE0o m\u1EEBng b\u1EA1n quay l\u1EA1i! B\u1EA1n \u0111\xE3 r\u1EDDi xa m\u1EA1ng x\xE3 h\u1ED9i \u0111\u01B0\u1EE3c <b>${timeStr}</b>.<br/>Linh v\u1EADt \u0111\xE3 \u0111\u01B0\u1EE3c ngh\u1EC9 ng\u01A1i v\xE0 h\u1ED3i ph\u1EE5c <b style="color:#FEF08A;">+${bonus}\u26A1</b> n\u0103ng l\u01B0\u1EE3ng! \u2728`,
            { title: "\u{1F33F} Ph\u1EE5c H\u1ED3i N\u0103ng L\u01B0\u1EE3ng (Digital Detox)" }
          );
        } else {
          chrome.storage.local.set({ lastActiveTimestamp: now });
        }
      });
    }
    // ─── Modal Nhật Ký Năng Lượng Pet Trên Trang ─────────────────────────────
    showEnergyHistoryModal() {
      const existing = document.getElementById("mindful-pet-energy-history-modal");
      if (existing) existing.remove();
      const overlay = document.createElement("div");
      overlay.id = "mindful-pet-energy-history-modal";
      overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
      background: rgba(15, 23, 42, 0.8) !important;
      backdrop-filter: blur(8px) !important;
      z-index: 2147483647 !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      animation: mindfulBubblePop 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    `;
      const listHtml = this.energyHistory && this.energyHistory.length > 0 ? this.energyHistory.map((item) => {
        const isReward = item.type === "reward";
        const color = isReward ? "#10B981" : "#EF4444";
        const bg = isReward ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
        const border = isReward ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)";
        return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; margin-bottom:6px;">
              <div style="display:flex; flex-direction:column; gap:2px; max-width:72%;">
                <div style="font-size:11px; font-weight:700; color:#F8FAFC;">${item.label}</div>
                ${item.detail ? `<div style="font-size:10px; color:#94A3B8; word-break:break-word;">${item.detail}</div>` : ""}
                <div style="font-size:9.5px; color:#64748B;">${item.dateStr || ""} ${item.timeStr} \u2022 Sau \u0111\u1ED5i: <b style="color:#38BDF8;">${item.newEnergy}%\u26A1</b></div>
              </div>
              <span style="font-size:11px; font-weight:800; color:${color}; background:${bg}; border:1px solid ${border}; padding:2px 7px; border-radius:6px; white-space:nowrap;">
                ${item.changeStr}
              </span>
            </div>
          `;
      }).join("") : `<div style="text-align:center; padding:24px; color:#94A3B8; font-size:11.5px;">Ch\u01B0a c\xF3 s\u1EF1 ki\u1EC7n n\u0103ng l\u01B0\u1EE3ng n\xE0o \u0111\u01B0\u1EE3c ghi nh\u1EADn.</div>`;
      overlay.innerHTML = `
      <div style="
        background: #0F172A;
        border: 1.5px solid rgba(139, 92, 246, 0.4);
        border-radius: 14px;
        width: 100%;
        max-width: 420px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        overflow: hidden;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(30,41,67,0.6);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">\u{1F4DC}</span>
            <span style="font-size:13px; font-weight:700; color:#F8FAFC;">Nh\u1EADt K\xFD N\u0103ng L\u01B0\u1EE3ng Linh V\u1EADt</span>
          </div>
          <button id="mindful-close-history-modal" style="background:none; border:none; color:#94A3B8; font-size:18px; cursor:pointer; line-height:1;">&times;</button>
        </div>

        <div style="padding:8px 16px; background:rgba(0,0,0,0.25); border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; font-size:11px;">
          <span style="color:#94A3B8;">N\u0103ng l\u01B0\u1EE3ng hi\u1EC7n t\u1EA1i: <b style="color:#10B981;">${this.energy}%\u26A1</b></span>
          <button id="mindful-clear-history-modal" style="background:none; border:none; color:#EF4444; font-size:10px; cursor:pointer; text-decoration:underline;">X\xF3a l\u1ECBch s\u1EED</button>
        </div>

        <div style="overflow-y:auto; padding:12px 16px; flex:1;">
          ${listHtml}
        </div>

        <div style="padding:10px 16px; border-top:1px solid rgba(255,255,255,0.08); text-align:right; background:rgba(15,23,42,0.95);">
          <button id="mindful-btn-done-history" style="background:linear-gradient(135deg, #6366F1, #8B5CF6); border:none; color:#fff; font-size:11px; font-weight:700; padding:6px 16px; border-radius:8px; cursor:pointer;">\u0110\xF3ng</button>
        </div>
      </div>
    `;
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      const closeBtn = overlay.querySelector("#mindful-close-history-modal");
      const doneBtn = overlay.querySelector("#mindful-btn-done-history");
      const clearBtn = overlay.querySelector("#mindful-clear-history-modal");
      closeBtn?.addEventListener("click", () => overlay.remove());
      doneBtn?.addEventListener("click", () => overlay.remove());
      clearBtn?.addEventListener("click", () => {
        this.energyHistory = [];
        this._saveState();
        overlay.remove();
        this.showEnergyHistoryModal();
      });
      document.body.appendChild(overlay);
    }
    // ─── Tầng 1: Thông Báo Nhắc Nhở Trọng Tâm (Center Overlay với Backdrop Blur) ───
    showPetToast(message, { duration = 0, title = "Linh v\u1EADt nh\u1EAFc nh\u1EDF" } = {}) {
      let overlay = document.getElementById("mindful-pet-notify-overlay");
      if (overlay) overlay.remove();
      overlay = document.createElement("div");
      overlay.id = "mindful-pet-notify-overlay";
      overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.76) !important;
      backdrop-filter: blur(10px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      opacity: 0;
      transition: opacity 0.25s ease !important;
    `;
      overlay.innerHTML = `
      <div id="mindful-pet-notify-card" style="
        background: #131B2E;
        border: 1.5px solid rgba(139, 92, 246, 0.55);
        border-radius: 20px;
        padding: 26px 22px;
        max-width: 380px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25);
        color: #F8FAFC;
        position: relative;
        transform: scale(0.9);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <button id="mindful-pet-notify-close" style="position:absolute; top:12px; right:14px; background:none; border:none; color:#64748B; font-size:18px; cursor:pointer; line-height:1;" title="\u0110\xF3ng">\u2715</button>
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          ${this.getPetAvatarHtml(60)}
        </div>
        <div style="font-size:15px; font-weight:800; color:#A78BFA; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
          ${title}
        </div>
        <div style="font-size:13.5px; font-weight:500; line-height:1.55; color:#F1F5F9; margin-bottom:20px;">
          ${message}
        </div>
        <button id="mindful-pet-notify-ack" style="
          width: 100%;
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          border: none;
          color: #fff;
          font-weight: 700;
          padding: 11px 0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          box-shadow: 0 4px 15px rgba(139,92,246,0.4);
          transition: transform 0.15s ease;
        ">
          \u2713 T\xF4i \u0111\xE3 hi\u1EC3u
        </button>
      </div>
    `;
      (document.body || document.documentElement).appendChild(overlay);
      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        const card = overlay.querySelector("#mindful-pet-notify-card");
        if (card) card.style.transform = "scale(1)";
      });
      const closeOverlay = () => {
        overlay.style.opacity = "0";
        const card = overlay.querySelector("#mindful-pet-notify-card");
        if (card) card.style.transform = "scale(0.9)";
        setTimeout(() => {
          if (overlay) overlay.remove();
        }, 250);
      };
      overlay.querySelector("#mindful-pet-notify-close")?.addEventListener("click", closeOverlay);
      overlay.querySelector("#mindful-pet-notify-ack")?.addEventListener("click", closeOverlay);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeOverlay();
      });
      if (duration > 0) {
        setTimeout(closeOverlay, duration);
      }
    }
    // ─── Tầng 2: Nhắc Nhở Lớn (Pet Center Modal Glassmorphism) ───────────────────
    showPetCenterModal({ title, message, actions = [], allowClose = true, onClose = null } = {}) {
      let modal = document.getElementById("mindful-pet-center-modal");
      if (modal) modal.remove();
      modal = document.createElement("div");
      modal.id = "mindful-pet-center-modal";
      modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.88) !important;
      backdrop-filter: blur(12px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    `;
      const buttonsHtml = actions.map((act, idx) => `
      <button data-action-idx="${idx}" style="
        flex: 1; min-width: 130px; padding: 11px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s;
        ${act.primary ? "background: linear-gradient(135deg, #8B5CF6, #6366F1); color: #fff; box-shadow: 0 4px 15px rgba(139,92,246,0.4);" : act.danger ? "background: #EF4444; color: #fff;" : "background: rgba(255,255,255,0.08); color: #E2E8F0; border: 1px solid rgba(255,255,255,0.15);"}
        ${act.disabled ? "opacity: 0.45; cursor: not-allowed; pointer-events: none;" : ""}
      ">${act.label}</button>
    `).join("");
      modal.innerHTML = `
      <div style="
        background: #131B2E;
        border: 1.5px solid rgba(139, 92, 246, 0.5);
        border-radius: 20px;
        padding: 28px 24px;
        width: 100%;
        max-width: 440px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.25);
        color: #F8FAFC;
        position: relative;
        animation: mindfulBubblePop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        ${allowClose ? `<button id="mindful-center-modal-close" style="position:absolute; top:14px; right:14px; background:none; border:none; color:#64748B; font-size:18px; cursor:pointer;">\u2715</button>` : ""}
        <div style="display:flex; justify-content:center; margin-bottom:14px;">
          ${this.getPetAvatarHtml(64)}
        </div>
        <div style="font-size:18px; font-weight:800; color:#F8FAFC; margin-bottom:8px;">
          ${title}
        </div>
        <div style="font-size:13px; color:#94A3B8; line-height:1.55; margin-bottom:22px;">
          ${message}
        </div>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          ${buttonsHtml}
        </div>
      </div>
    `;
      (document.body || document.documentElement).appendChild(modal);
      const closeBtn = modal.querySelector("#mindful-center-modal-close");
      if (closeBtn) {
        closeBtn.onclick = () => {
          modal.remove();
          if (onClose) onClose();
        };
      }
      actions.forEach((act, idx) => {
        const btn = modal.querySelector(`[data-action-idx="${idx}"]`);
        if (btn && !act.disabled) {
          btn.onclick = (e) => {
            if (act.onClick) act.onClick(e, modal);
            else modal.remove();
          };
        }
      });
      return modal;
    }
  };

  // src/content/content-core.js
  if (window.top !== window) {
    throw new Error("Mindful Tracker: skipping iframe");
  }
  var hostname = window.location.hostname;
  var isYT = hostname.includes("youtube.com");
  var isFB = hostname.includes("facebook.com");
  var isTT = hostname.includes("tiktok.com");
  if (!isYT && !isFB && !isTT) throw new Error("Mindful Tracker: unsupported platform");
  var platformKey = isYT ? "youtube" : isFB ? "facebook" : "tiktok";
  (function hookHistory() {
    const originalPush = history.pushState;
    history.pushState = function(...args) {
      const ret = originalPush.apply(this, args);
      window.dispatchEvent(new Event("mindful-location-change"));
      return ret;
    };
    const originalReplace = history.replaceState;
    history.replaceState = function(...args) {
      const ret = originalReplace.apply(this, args);
      window.dispatchEvent(new Event("mindful-location-change"));
      return ret;
    };
    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("mindful-location-change"));
    });
  })();
  var appConfig = null;
  var dayData = null;
  var pomodoroManager = null;
  var tracker = null;
  var hud = null;
  var friction = null;
  var petEngine = null;
  var isReady = false;
  var currentFocusMode = "music";
  var triggeredMilestones = { m1: false, m2: false, m3: false };
  var isRollingOverDay = false;
  function checkDayRollover(force = false) {
    if (!isReady || !dayData) return;
    const todayStr = getDateStr();
    if (!force && dayData.date === todayStr) return;
    if (isRollingOverDay) return;
    isRollingOverDay = true;
    console.log(`[Mindful Tracker] \u{1F305} Ph\xE1t hi\u1EC7n m\u1ED1c chuy\u1EC3n ng\xE0y t\u1EEB ${dayData.date} sang ${todayStr}. \u0110ang reset d\u1EEF li\u1EC7u ng\xE0y m\u1EDBi...`);
    const oldDayData = dayData;
    saveDayData(oldDayData, platformKey, true);
    const newDayKey = getTodayKey();
    chrome.storage.local.get([newDayKey], (res) => {
      const freshDayData = res[newDayKey] || createDefaultDayData(todayStr);
      dayData = freshDayData;
      tracker?.setDayData(dayData);
      hud?.setDayData(dayData);
      friction?.setDayData(dayData);
      triggeredMilestones.m1 = false;
      triggeredMilestones.m2 = false;
      triggeredMilestones.m3 = false;
      isRollingOverDay = false;
      evaluateGrayscaleMode();
      onUpdate();
      const d = /* @__PURE__ */ new Date();
      const displayDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      petEngine?.showPetToast(
        `\u{1F319} \u0110\xE3 sang ng\xE0y m\u1EDBi (${displayDate})! Ch\u1EC9 s\u1ED1 l\u01B0\u1EDBt m\u1EA1ng \u0111\xE3 \u0111\u01B0\u1EE3c reset v\u1EC1 0. Khuya r\u1ED3i, h\xE3y ngh\u1EC9 ng\u01A1i s\u1EDBm b\u1EA1n nh\xE9! \u{1F4A4}`,
        { title: "\u{1F305} Chuy\u1EC3n Sang Ng\xE0y M\u1EDBi" }
      );
      petEngine?.triggerLateNight();
    });
  }
  function showToast(msg, durationMs = 4e3) {
    if (petEngine && typeof petEngine.showPetToast === "function") {
      petEngine.showPetToast(msg, { duration: durationMs, title: "Linh v\u1EADt nh\u1EAFc nh\u1EDF" });
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
    setTimeout(() => {
      if (toast) toast.style.opacity = "0";
    }, durationMs);
  }
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
      },
      tiktok: {
        shorts: {
          m1: Number(thresh.tiktok?.shorts?.m1 ?? thresh.shorts?.m1 ?? 15),
          m2: Number(thresh.tiktok?.shorts?.m2 ?? thresh.shorts?.m2 ?? 30),
          m3: Number(thresh.tiktok?.shorts?.m3 ?? thresh.shorts?.m3 ?? 45)
        }
      }
    };
  }
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
    const isPetExhausted = petEngine ? petEngine.isCriticalEnergy() : false;
    if (isPetExhausted) {
      if (!htmlEl.classList.contains("mindful-grayscale-active")) {
        htmlEl.classList.add("mindful-grayscale-active");
      }
      return;
    }
    if (pomodoroManager?.isBreakSession) {
      if (htmlEl.classList.contains("mindful-grayscale-active")) {
        htmlEl.classList.remove("mindful-grayscale-active");
      }
      return;
    }
    const isPomodoroFocus = pomodoroManager ? pomodoroManager.isFocusSession : false;
    if (isPomodoroFocus) {
      const focusMode = pomodoroManager?.state?.focusMode || currentFocusMode;
      if (focusMode === "music") {
        if (!htmlEl.classList.contains("mindful-grayscale-active")) {
          htmlEl.classList.add("mindful-grayscale-active");
        }
        return;
      } else if (focusMode === "study") {
        if (htmlEl.classList.contains("mindful-grayscale-active")) {
          htmlEl.classList.remove("mindful-grayscale-active");
        }
        return;
      }
    }
    const threshData = getThresholds();
    let currentCount = 0;
    let m2Limit = 30;
    if (isYT) {
      if (location.pathname.startsWith("/shorts")) {
        currentCount = dayData?.youtube?.shorts?.totalSwipes || 0;
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
        currentCount = dayData?.facebook?.feed?.feedPostsScrolled || 0;
        m2Limit = threshData.facebook.feeds.m2;
      }
    } else if (isTT) {
      currentCount = dayData?.tiktok?.shorts?.totalSwipes || 0;
      m2Limit = threshData.tiktok.shorts.m2;
    }
    const isOverM2 = currentCount >= m2Limit;
    const now = /* @__PURE__ */ new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    let isBedtime = false;
    const bedtimeCfg = appConfig?.bedtime;
    const isBedtimeEnabled = bedtimeCfg ? bedtimeCfg.enabled !== false : true;
    if (isBedtimeEnabled) {
      const [startH, startM] = (bedtimeCfg?.start || "22:30").split(":").map(Number);
      const [endH, endM] = (bedtimeCfg?.end || "05:00").split(":").map(Number);
      const startTotal = (isNaN(startH) ? 22 : startH) * 60 + (isNaN(startM) ? 30 : startM);
      const endTotal = (isNaN(endH) ? 5 : endH) * 60 + (isNaN(endM) ? 0 : endM);
      if (startTotal > endTotal) {
        isBedtime = currentMins >= startTotal || currentMins < endTotal;
      } else {
        isBedtime = currentMins >= startTotal && currentMins < endTotal;
      }
    }
    const shouldGrayscale = isOverM2 || isBedtime;
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
  function onAction() {
    checkDayRollover();
    evaluateGrayscaleMode();
    if (pomodoroManager?.isBreakSession) return;
    const threshData = getThresholds();
    let currentCount = 0;
    let currentLimits = { m1: 15, m2: 30, m3: 45 };
    let unitLabel = "l\u01B0\u1EE3t l\u01B0\u1EDBt";
    if (isYT) {
      if (location.pathname.startsWith("/shorts")) {
        currentCount = dayData.youtube.shorts.totalSwipes || 0;
        currentLimits = threshData.youtube.shorts;
        unitLabel = "l\u01B0\u1EE3t Shorts";
      } else {
        currentCount = dayData.youtube.longVideos.totalWatched || 0;
        currentLimits = threshData.youtube.long;
        unitLabel = "video d\xE0i";
      }
    } else if (isFB) {
      if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
        currentCount = dayData.facebook.longVideos?.totalWatched || 0;
        currentLimits = threshData.facebook.long;
        unitLabel = "video";
      } else if (location.pathname.includes("/reel")) {
        currentCount = dayData.facebook.reels.totalSwipes || 0;
        currentLimits = threshData.facebook.reels;
        unitLabel = "l\u01B0\u1EE3t Reels";
      } else {
        currentCount = dayData.facebook.feed?.feedPostsScrolled || 0;
        currentLimits = threshData.facebook.feeds;
        unitLabel = "b\xE0i vi\u1EBFt Feed";
      }
    } else if (isTT) {
      currentCount = dayData.tiktok?.shorts?.totalSwipes || 0;
      currentLimits = threshData.tiktok.shorts;
      unitLabel = "video TikTok";
    }
    if (currentCount === 0) {
      triggeredMilestones.m1 = false;
      triggeredMilestones.m2 = false;
      triggeredMilestones.m3 = false;
    }
    if (currentCount >= currentLimits.m1 && !triggeredMilestones.m1 && petEngine) {
      triggeredMilestones.m1 = true;
      petEngine.penalize(5, "milestone_1");
      petEngine.showPetToast(
        `B\u1EA1n \u0111\xE3 xem <b>${currentCount} ${unitLabel}</b> (Ch\u1EA1m M\u1ED1c 1). H\xE3y gi\u1EEF t\u1EC9nh t\xE1o nh\xE9! <b style="color:#F87171;">(-5\u26A1)</b>`,
        { title: "\u26A0\uFE0F C\u1EA3nh B\xE1o M\u1ED1c 1 (M1)" }
      );
    }
    if (currentCount >= currentLimits.m2 && !triggeredMilestones.m2 && petEngine) {
      triggeredMilestones.m2 = true;
      petEngine.penalize(10, "milestone_2");
      petEngine.showPetCenterModal({
        title: "\u26A0\uFE0F C\u1EA3nh B\xE1o M\u1ED1c 2 (M2)!",
        message: `B\u1EA1n \u0111\xE3 l\u01B0\u1EDBt t\u1EDBi <b>${currentCount} ${unitLabel}</b> <b style="color:#F87171;">(-10\u26A1)</b>. Ch\u1EBF \u0111\u1ED9 \u0110en Tr\u1EAFng \u0111\xE3 k\xEDch ho\u1EA1t \u0111\u1EC3 gi\u1EA3m k\xEDch th\xEDch dopamine. B\u1EA1n c\xF3 mu\u1ED1n d\u1EEBng l\u1EA1i \u0111\u1EC3 b\u1EA3o v\u1EC7 n\u0103ng l\u01B0\u1EE3ng Pet?`,
        actions: [
          {
            label: "\u{1F6D1} \u0110\xF3ng Tab Ngay",
            primary: true,
            onClick: () => {
              if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" }, (res) => {
                  if (!res || !res.ok) window.close();
                });
              } else {
                window.close();
              }
            }
          },
          {
            label: "T\xF4i hi\u1EC3u r\u1ED3i",
            onClick: (e, modal) => modal.remove()
          }
        ]
      });
    }
    friction.checkAndTrigger(currentCount, currentLimits.m3, unitLabel);
    if (currentCount >= currentLimits.m3 && !triggeredMilestones.m3 && petEngine) {
      triggeredMilestones.m3 = true;
      petEngine.penalize(20, "milestone_3");
    }
  }
  function onUpdate() {
    if (!isReady || !hud) return;
    hud.update(pomodoroManager?.isBreakSession || false);
    evaluateGrayscaleMode();
  }
  function onRouteChanged() {
    if (!isReady) return;
    checkDayRollover();
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
    if (isTT) {
      friction.showIntentModal();
      tracker.handleTikTokSwipe();
    }
    onUpdate();
  }
  function createDevCallbacks() {
    return {
      setEnergy: (val) => {
        if (!petEngine) return;
        petEngine.energy = val;
        petEngine._updateMood();
        petEngine._saveState();
        evaluateGrayscaleMode();
        onUpdate();
        showToast(`\u26A1 Dev: \u0110\xE3 ch\u1EC9nh n\u0103ng l\u01B0\u1EE3ng Pet: ${val}%`, 2e3);
      },
      rolloverMidnight: () => {
        checkDayRollover(true);
        showToast("\u{1F305} Dev: \u0110\xE3 k\xEDch ho\u1EA1t chuy\u1EC3n ng\xE0y m\u1EDBi (00h00)!", 2500);
      },
      expireSession: () => {
        let sess = null;
        try {
          const raw = sessionStorage.getItem("mindful_session");
          if (raw) sess = JSON.parse(raw);
        } catch (_) {
        }
        if (!sess) {
          sess = {
            goal: "Dev Test Goal",
            durationMinutes: 5,
            startTime: Date.now() - 6 * 60 * 1e3,
            extensionsCount: 0,
            expiredNotified: false
          };
        } else {
          sess.startTime = Date.now() - (sess.durationMinutes * 60 * 1e3 + 1e3);
          sess.expiredNotified = false;
        }
        sessionStorage.setItem("mindful_session", JSON.stringify(sess));
        friction?.checkSessionTimer(petEngine);
        onUpdate();
        showToast("\u23F1\uFE0F Dev: \u0110\xE3 k\xEDch ho\u1EA1t h\u1EBFt gi\u1EDD phi\xEAn l\u01B0\u1EDBt!", 2e3);
      },
      openIntent: () => {
        friction?.showIntentModal();
      },
      triggerMilestone: (type) => {
        if (type === "m1") {
          petEngine?.showPetToast(
            "\u26A0\uFE0F B\u1EA1n \u0111\xE3 xem <b>15 l\u01B0\u1EE3t video li\xEAn t\u1EE5c</b> (Ch\u1EA1m M\u1ED1c 1). H\xE3y gi\u1EEF t\u1EC9nh t\xE1o v\xE0 cho m\u1EAFt ngh\u1EC9 ng\u01A1i nh\xE9!",
            { title: "C\u1EA3nh B\xE1o M\u1ED1c 1 (M1)" }
          );
        } else if (type === "m2") {
          petEngine?.showPetCenterModal({
            title: "\u26A0\uFE0F C\u1EA3nh B\xE1o M\u1ED1c 2 (M2)!",
            message: `B\u1EA1n \u0111\xE3 l\u01B0\u1EDBt t\u1EDBi M\u1ED1c 2 (60 ph\xFAt / 30 video). Ch\u1EBF \u0111\u1ED9 \u0110en Tr\u1EAFng (Grayscale) \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t \u0111\u1EC3 gi\u1EA3m k\xEDch th\xEDch dopamine. B\u1EA1n c\xF3 mu\u1ED1n d\u1EEBng l\u1EA1i \u0111\u1EC3 b\u1EA3o v\u1EC7 n\u0103ng l\u01B0\u1EE3ng Pet?`,
            actions: [
              {
                label: "\u{1F6D1} \u0110\xF3ng Tab Ngay",
                danger: true,
                onClick: () => {
                  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" }, (res) => {
                      if (!res || !res.ok) window.close();
                    });
                  } else {
                    window.close();
                  }
                }
              },
              {
                label: "T\xF4i hi\u1EC3u r\u1ED3i (-10\u26A1)",
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
          friction?.showHardFriction(45, 45, "l\u01B0\u1EE3t l\u01B0\u1EDBt");
        } else if (type === "f5") {
          petEngine?.showPetToast(
            "\u{1F504} B\u1EA1n \u0111ang b\u1EA5m F5 li\xEAn t\u1EE5c t\xECm dopamine m\u1EDBi. H\xE3y h\xEDt m\u1ED9t h\u01A1i th\u1EADt s\xE2u v\xE0 th\u01B0 gi\xE3n m\u1ED9t ch\xFAt n\xE0o!",
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
        showToast(`\u{1F525} Dev: \u0110\xE3 c\u1EADp nh\u1EADt streak ${days} ng\xE0y!`, 2e3);
      },
      openReflection: () => {
        chrome.runtime.sendMessage({ type: "TRIGGER_DEV_REFLECTION" });
      },
      resetData: () => {
        chrome.runtime.sendMessage({ type: "RESET_DEV_DATA" }, () => {
          showToast("\u2713 Dev: \u0110\xE3 kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u g\u1ED1c! \u0110ang t\u1EA3i l\u1EA1i trang...", 2e3);
          setTimeout(() => location.reload(), 1e3);
        });
      }
    };
  }
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === "MIDNIGHT_DAY_ROLLOVER" || req.type === "DEV_MIDNIGHT_ROLLOVER") {
      checkDayRollover(true);
      sendResponse({ ok: true });
      return true;
    }
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
    if (req.type === "TRIGGER_POMODORO_SETUP") {
      triggerPomodoroSetup();
      sendResponse({ ok: true });
      return true;
    }
    if (req.type === "STOP_POMODORO") {
      pomodoroManager?.stop();
      evaluateGrayscaleMode();
      onUpdate();
      sendResponse({ ok: true });
      return true;
    }
  });
  function triggerPomodoroSetup() {
    if (!friction) return;
    friction.showPomodoroSetupModal({
      onStart: (setup) => {
        currentFocusMode = setup.focusMode || "music";
        chrome.storage.local.set({ focus_mode_type: currentFocusMode });
        if (hud) hud.setFocusMode(currentFocusMode);
        pomodoroManager?.startNewSession(setup);
        evaluateGrayscaleMode();
        onUpdate();
      }
    });
  }
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
      evaluateGrayscaleMode();
      onUpdate();
    }
    if (changes.pomodoro_state?.newValue) {
      if (pomodoroManager) {
        pomodoroManager.state = changes.pomodoro_state.newValue;
        if (pomodoroManager.state.focusMode) {
          currentFocusMode = pomodoroManager.state.focusMode;
          if (hud) hud.setFocusMode(currentFocusMode);
        }
        evaluateGrayscaleMode();
        onUpdate();
      }
    }
    if (changes.focus_mode_type !== void 0) {
      currentFocusMode = changes.focus_mode_type.newValue || "music";
      if (hud) hud.setFocusMode(currentFocusMode);
      evaluateGrayscaleMode();
      onUpdate();
    }
    if (changes.dev_mode_enabled !== void 0) {
      if (hud) {
        hud.setDevMode(!!changes.dev_mode_enabled.newValue, createDevCallbacks());
        hud.update();
      }
    }
    if (changes.pet_state?.newValue) {
      const newPet = changes.pet_state.newValue;
      if (petEngine && newPet) {
        petEngine.energy = newPet.energy ?? petEngine.energy;
        petEngine.mood = newPet.mood ?? petEngine.mood;
        petEngine.currentStreak = newPet.currentStreak ?? petEngine.currentStreak;
        petEngine.streakDays = newPet.streakDays ?? petEngine.streakDays;
        petEngine.render();
        evaluateGrayscaleMode();
        onUpdate();
      }
    }
  });
  loadAppData(({ config, dayData: loaded, petState, pomodoroState }) => {
    appConfig = config;
    dayData = loaded;
    petEngine = new PetEngine();
    petEngine.checkIdleRecovery();
    friction = new FrictionManager({
      getConfig: () => appConfig,
      onToast: showToast,
      dayData,
      platformKey
    });
    friction.setPetEngine(petEngine);
    petEngine.onStateChange = () => {
      evaluateGrayscaleMode();
      onUpdate();
    };
    hud = new HUDManager({
      dayData,
      platformKey,
      isYT,
      isFB,
      isTT,
      getThresholds,
      getPomodoroLabel: () => pomodoroManager?.getStatusLabel() || null,
      getPomodoroActive: () => pomodoroManager?.isEnabled || false,
      onStartPomodoroRequest: () => {
        triggerPomodoroSetup();
      },
      onStopPomodoro: () => {
        pomodoroManager?.stop();
        showToast("\u23F9 \u0110\xE3 d\u1EEBng phi\xEAn Pomodoro.", 2500);
        evaluateGrayscaleMode();
        onUpdate();
      },
      petEngine,
      onFocusModeToggle: (newMode) => {
        currentFocusMode = newMode;
        chrome.storage.local.set({ focus_mode_type: newMode });
        if (pomodoroManager && pomodoroManager.isEnabled) {
          pomodoroManager.state.focusMode = newMode;
          chrome.storage.local.set({ pomodoro_state: pomodoroManager.state });
        }
        evaluateGrayscaleMode();
        onUpdate();
        showToast(
          newMode === "music" ? "\u{1F3B5} Mode Nh\u1EA1c: M\xE0n h\xECnh \u0110en Tr\u1EAFng, video nh\u1EA1c t\xEDnh th\u1ED1ng k\xEA ri\xEAng" : "\u{1F4DA} Mode H\u1ECDc: M\xE0n h\xECnh m\xE0u, h\u1ECFi m\u1EE5c ti\xEAu b\xE0i h\u1ECDc sau 10s xem",
          3500
        );
      }
    });
    const hudPos = appConfig?.localPreferences?.hudPosition;
    if (hudPos?.top && hudPos?.left) {
      hud.applyPosition(hudPos.top, hudPos.left);
    } else if (hudPos?.x !== void 0 && hudPos?.y !== void 0) {
      hud.applyPosition(`${hudPos.y}px`, `${hudPos.x}px`);
    }
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
    pomodoroManager = new PomodoroManager({
      config,
      state: pomodoroState,
      petEngine,
      onUpdate: () => {
        onUpdate();
      },
      onAllCompleted: () => {
        evaluateGrayscaleMode();
        onUpdate();
      }
    });
    if (pomodoroState?.enabled) {
      if (pomodoroState.focusMode) {
        currentFocusMode = pomodoroState.focusMode;
        if (hud) hud.setFocusMode(currentFocusMode);
      }
      pomodoroManager.start();
    }
    tracker = new Tracker({
      dayData,
      platformKey,
      isYT,
      isFB,
      keywordsConfig: appConfig?.keywords,
      onUpdate,
      onAction,
      getFocusMode: () => pomodoroManager?.state?.focusMode || currentFocusMode,
      isPomodoroFocus: () => !!(pomodoroManager && pomodoroManager.isFocusSession),
      onStudyCheckInNeeded: (videoId, videoTitle) => {
        if (!pomodoroManager || !pomodoroManager.isFocusSession || (pomodoroManager?.state?.focusMode || currentFocusMode) !== "study") return;
        friction.showStudyCheckInModal(
          videoTitle,
          (intent) => {
            if (!dayData.watchedVideos) dayData.watchedVideos = [];
            let targetVid = dayData.watchedVideos.find((v) => v.id === videoId);
            if (targetVid) {
              targetVid.category = "goal";
              targetVid.userOverridden = true;
            } else {
              dayData.watchedVideos.unshift({
                id: videoId,
                title: videoTitle,
                channel: "",
                platform: "youtube",
                category: "goal",
                watchedSeconds: 15,
                durationSeconds: 0,
                isCompletion: true,
                timestamp: Date.now(),
                userOverridden: true
              });
            }
            saveDayData(dayData, "youtube", true);
            petEngine?.reward(5, "study_intent_declared");
            showToast(`\u{1F3AF} M\u1EE5c ti\xEAu: "${intent}". \u0110\xE3 th\u01B0\u1EDFng +5\u26A1!`, 3500);
            onUpdate();
          },
          () => {
            petEngine?.penalize(10, "study_distraction");
            showToast("\u26A0\uFE0F Video kh\xF4ng ph\u1EE5c v\u1EE5 m\u1EE5c ti\xEAu h\u1ECDc t\u1EADp. \u0110\xE3 tr\u1EEB 10\u26A1!", 3500);
            onUpdate();
          }
        );
      },
      onImpulsive: (reason) => {
        petEngine?.penalize(reason === "reload_spam" ? 5 : 20, reason);
        if (reason === "reload_spam") {
          petEngine?.triggerDizzy();
        }
      },
      onUseful: () => {
        petEngine?.reward(10, "useful_video");
        petEngine?.addKnowledgeSeed();
      },
      onDayRollover: () => checkDayRollover()
    });
    tracker.startActivityTracking();
    tracker.checkPageReload();
    tracker.setupHomeClickDetection();
    if (isFB) tracker.setupFBFeedObserver();
    isReady = true;
    evaluateGrayscaleMode();
    setInterval(evaluateGrayscaleMode, 3e4);
    let hasTriggeredLateNightNotice = false;
    const checkLateNight = () => {
      const currentHour = (/* @__PURE__ */ new Date()).getHours();
      if ((currentHour >= 23 || currentHour < 5) && !hasTriggeredLateNightNotice) {
        hasTriggeredLateNightNotice = true;
        setTimeout(() => {
          petEngine?.triggerLateNight();
        }, 4e3);
      }
    };
    checkLateNight();
    setInterval(() => {
      checkDayRollover();
      friction?.checkSessionTimer(petEngine);
      onUpdate();
    }, 5e3);
    setInterval(() => {
      chrome.storage.local.set({ lastActiveTimestamp: Date.now() });
      checkLateNight();
    }, 6e4);
    onRouteChanged();
  });
  window.addEventListener("mindful-location-change", onRouteChanged);
  if (isYT) {
    window.addEventListener("yt-navigate-finish", onRouteChanged);
  }
  var lastUrl = location.href;
  var urlObserver = new MutationObserver(() => {
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
  var doFlush = () => {
    chrome.storage.local.set({ lastActiveTimestamp: Date.now() });
    tracker?.flush(appConfig?.targetKeywords || []);
  };
  window.addEventListener("beforeunload", doFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) doFlush();
  });
})();
