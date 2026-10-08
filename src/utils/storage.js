/**
 * Mindful Social Media Tracker - Storage Utility Module
 * Quản lý đọc/ghi chrome.storage.local theo chuẩn đặc tả:
 * 1. "stats_YYYY-MM-DD"
 * 2. "app_config"
 * 3. "pet_state"
 */

// Lấy ngày hiện tại dạng YYYY-MM-DD
export function getDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Lấy key thống kê ngày hiện tại dạng "stats_YYYY-MM-DD"
export function getTodayKey(date = new Date()) {
  return `stats_${getDateStr(date)}`;
}

// Tạo 24 buckets theo giờ
export function createDefaultHourlyBuckets() {
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    swipes: 0,
    longVideos: 0,
    feedScrolled: 0,
    reloads: 0,
    activeSeconds: 0
  }));
}

// Cấu trúc dữ liệu theo ngày mặc định: "stats_YYYY-MM-DD"
export function createDefaultDayData(dateStr = getDateStr()) {
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

// Cấu hình Hệ thống mặc định: "app_config"
export const DEFAULT_CONFIG = {
  syncCode: "MF-8924",
  auto_sync: true,
  masterGoal: "Muốn trở thành phiên bản tốt hơn để gặp người ấy",
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
    target: ["lập trình", "tiếng anh", "kỹ năng", "sách", "học", "phát triển", "tài chính", "công nghệ"],
    leisure: ["hài", "game", "gaming", "streamer", "vlog", "ca nhạc", "nấu ăn"],
    distraction: ["drama", "bóc phốt", "hóng biến", "scandal", "cờ bạc", "giật gân"]
  },
  localPreferences: {
    hudPosition: { x: 20, y: 80 },
    grayscaleMode: "threshold_m2"
  }
};

// Trạng thái Linh vật & Persona mặc định: "pet_state"
export const DEFAULT_PET_STATE = {
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
    vulnerabilities: ["Dễ lướt vô thức sau 21h30", "Hay F5 khi gặp bài khó"],
    strengths: ["Xem trọn vẹn video học tập dài trên 10 phút"],
    history: []
  }
};

/**
 * Cập nhật bucket theo giờ hiện tại
 * @param {object} dayData
 * @param {object} param1 - { swipes, longVideos, feedScrolled, reloads, activeSeconds }
 */
export function recordHourlyMetrics(dayData, { swipes = 0, longVideos = 0, feedScrolled = 0, reloads = 0, activeSeconds = 0 } = {}) {
  if (!dayData || !Array.isArray(dayData.hourly)) return;
  const currentHour = new Date().getHours();
  if (currentHour >= 0 && currentHour < 24) {
    if (!dayData.hourly[currentHour]) {
      dayData.hourly[currentHour] = {
        hour: currentHour,
        swipes: 0,
        longVideos: 0,
        feedScrolled: 0,
        reloads: 0,
        activeSeconds: 0
      };
    }
    const b = dayData.hourly[currentHour];
    if (swipes) b.swipes = (b.swipes || 0) + swipes;
    if (longVideos) b.longVideos = (b.longVideos || 0) + longVideos;
    if (feedScrolled) b.feedScrolled = (b.feedScrolled || 0) + feedScrolled;
    if (reloads) b.reloads = (b.reloads || 0) + reloads;
    if (activeSeconds) b.activeSeconds = (b.activeSeconds || 0) + activeSeconds;
  }
}

// Đọc toàn bộ cấu hình, dữ liệu ngày hiện tại và trạng thái Pet
export function loadAppData(callback) {
  const todayKey = getTodayKey();
  chrome.storage.local.get([todayKey, "app_config", "pet_state", "pomodoro_state"], (result) => {
    // 1. Config
    const config = Object.assign({}, DEFAULT_CONFIG, result.app_config || {});
    config.thresholds = Object.assign({}, DEFAULT_CONFIG.thresholds, config.thresholds || {});
    config.keywords = Object.assign({}, DEFAULT_CONFIG.keywords, config.keywords || {});
    config.localPreferences = Object.assign({}, DEFAULT_CONFIG.localPreferences, config.localPreferences || {});

    // 2. Day data
    const dayData = Object.assign(createDefaultDayData(), result[todayKey] || {});

    // 3. Pet State
    const petState = Object.assign({}, DEFAULT_PET_STATE, result.pet_state || {});

    // 4. Pomodoro state
    const pomodoroState = result.pomodoro_state || {
      enabled: config.pomodoro?.enabled || false,
      sessionType: "focus",
      sessionStartTime: Date.now(),
      durationMinutes: config.pomodoro?.focusMinutes || 25
    };

    if (callback) {
      callback({ config, dayData, petState, pomodoroState, todayKey });
    }
  });
}

// Lưu dữ liệu ngày hiện tại với debouncing an toàn
let saveTimer = null;
let pendingSave = false;

export function saveDayData(dayData, platformKey, immediate = false) {
  pendingSave = true;

  const executeSave = () => {
    if (!pendingSave) return;
    pendingSave = false;
    const todayKey = getTodayKey();

    chrome.storage.local.get([todayKey], (res) => {
      const existing = res[todayKey] || createDefaultDayData();

      if (platformKey === "youtube" && dayData.youtube) {
        existing.youtube = dayData.youtube;
      } else if (platformKey === "facebook" && dayData.facebook) {
        existing.facebook = dayData.facebook;
      } else if (platformKey === "tiktok" && dayData.tiktok) {
        existing.tiktok = dayData.tiktok;
      }

      if (dayData.hourly) existing.hourly = dayData.hourly;
      if (dayData.temptation) existing.temptation = dayData.temptation;
      if (dayData.watchedVideos) existing.watchedVideos = dayData.watchedVideos;
      if (dayData.unmatchedQueue) existing.unmatchedQueue = dayData.unmatchedQueue;
      if (dayData.reflection) existing.reflection = dayData.reflection;
      if (typeof dayData.petEnergyEndOfDay === "number") {
        existing.petEnergyEndOfDay = dayData.petEnergyEndOfDay;
      }

      const payload = {};
      payload[todayKey] = existing;
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

// Lưu trạng thái Pet
export function savePetState(petState, callback) {
  chrome.storage.local.get(["pet_state"], (res) => {
    const existing = res.pet_state || DEFAULT_PET_STATE;
    const merged = Object.assign({}, existing, petState);
    chrome.storage.local.set({ pet_state: merged }, callback);
  });
}

// Lưu cấu hình ứng dụng
export function saveAppConfig(config, callback) {
  chrome.storage.local.get(["app_config"], (res) => {
    const existing = res.app_config || DEFAULT_CONFIG;
    const merged = Object.assign({}, existing, config);
    chrome.storage.local.set({ app_config: merged }, callback);
  });
}

// Lưu vị trí HUD vào app_config.localPreferences.hudPosition
export function saveHUDPosition(pos) {
  chrome.storage.local.get(["app_config"], (res) => {
    const config = res.app_config || DEFAULT_CONFIG;
    if (!config.localPreferences) config.localPreferences = {};
    config.localPreferences.hudPosition = pos;
    chrome.storage.local.set({ app_config: config });
  });
}

// Lưu trạng thái Pomodoro
export function savePomodoroState(state) {
  chrome.storage.local.set({ pomodoro_state: state });
}

// Format giây sang chuỗi ngắn gọn "12m 30s"
export function formatTimeShort(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  return m > 0 ? `${m}m ${remSec}s` : `${remSec}s`;
}
