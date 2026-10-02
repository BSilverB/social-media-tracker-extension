/**
 * Mindful Social Media Tracker - Storage Utility Module
 * Quản lý đọc/ghi chrome.storage.local, tạo cấu trúc dữ liệu mặc định theo ngày (YYYY-MM-DD)
 */

// Lấy ngày hiện tại theo giờ địa phương dạng YYYY-MM-DD
export function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Cấu trúc dữ liệu theo ngày mặc định
export function createDefaultDayData() {
  return {
    youtube: {
      summary: { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0 },
      longVideos: {
        totalWatched: 0,
        impulsiveCount: 0,
        usefulCount: 0,
        details: []
      },
      musicVideos: {
        totalWatched: 0,
        totalDurationSeconds: 0
      },
      shortVideos: { totalSwipes: 0, validViews: 0, loopViews: 0 }
    },
    facebook: {
      summary: { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0, feedPostsScrolled: 0 },
      longVideos: {
        totalWatched: 0,
        impulsiveCount: 0,
        usefulCount: 0,
        details: []
      },
      reels: { totalSwipes: 0, validViews: 0, loopViews: 0 }
    },
    studyVideoLogs: [],
    unclassifiedVideos: [],
    reflection: {
      lesson1: "",
      lesson2: "",
      rating: 5,
      submittedAt: null
    }
  };
}

// Cấu hình mặc định của ứng dụng
export const DEFAULT_CONFIG = {
  thresholds: {
    youtube: {
      shorts: { m1: 15, m2: 30, m3: 45 },
      long: { m1: 3, m2: 5, m3: 8 }
    },
    facebook: {
      reels: { m1: 15, m2: 30, m3: 45 },
      feeds: { m1: 20, m2: 40, m3: 60 },
      long: { m1: 2, m2: 4, m3: 6 }
    }
  },
  masterGoal: "Muốn trở thành phiên bản tốt hơn",
  emotionalAnchorImage: "",
  targetKeywords: ["lập trình", "tiếng anh", "kỹ năng", "sách", "học", "phát triển", "tài chính", "công nghệ"],
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
  }
};

// Đọc toàn bộ cấu hình và dữ liệu ngày hiện tại
export function loadAppData(callback) {
  const todayKey = getTodayKey();
  chrome.storage.local.get([todayKey, "app_config", "hud_position", "pomodoro_state"], (result) => {
    // 1. Config
    const config = Object.assign({}, DEFAULT_CONFIG, result.app_config || {});
    
    // Tự động tương thích ngược và merge thresholds
    const rawThresh = result.app_config?.thresholds;
    if (rawThresh) {
      if (rawThresh.youtube || rawThresh.facebook) {
        config.thresholds = {
          youtube: {
            shorts: Object.assign({}, DEFAULT_CONFIG.thresholds.youtube.shorts, rawThresh.youtube?.shorts),
            long: Object.assign({}, DEFAULT_CONFIG.thresholds.youtube.long, rawThresh.youtube?.long)
          },
          facebook: {
            reels: Object.assign({}, DEFAULT_CONFIG.thresholds.facebook.reels, rawThresh.facebook?.reels),
            feeds: Object.assign({}, DEFAULT_CONFIG.thresholds.facebook.feeds, rawThresh.facebook?.feeds),
            long: Object.assign({}, DEFAULT_CONFIG.thresholds.facebook.long, rawThresh.facebook?.long)
          }
        };
      } else {
        // Cấu trúc cũ dạng { shorts: {...}, long: {...} } -> migrate sang cấu trúc nền tảng
        const oldShorts = rawThresh.shorts || DEFAULT_CONFIG.thresholds.youtube.shorts;
        const oldLong = rawThresh.long || DEFAULT_CONFIG.thresholds.youtube.long;
        config.thresholds = {
          youtube: {
            shorts: Object.assign({}, DEFAULT_CONFIG.thresholds.youtube.shorts, oldShorts),
            long: Object.assign({}, DEFAULT_CONFIG.thresholds.youtube.long, oldLong)
          },
          facebook: {
            reels: Object.assign({}, DEFAULT_CONFIG.thresholds.facebook.reels, oldShorts),
            feeds: Object.assign({}, DEFAULT_CONFIG.thresholds.facebook.feeds),
            long: Object.assign({}, DEFAULT_CONFIG.thresholds.facebook.long, oldLong)
          }
        };
      }
    } else {
      config.thresholds = JSON.parse(JSON.stringify(DEFAULT_CONFIG.thresholds));
    }

    if (result.app_config?.pomodoro) {
      config.pomodoro = Object.assign({}, DEFAULT_CONFIG.pomodoro, result.app_config.pomodoro);
    }

    // 2. Day data
    const rawDay = result[todayKey];
    const dayData = createDefaultDayData();

    if (rawDay) {
      if (rawDay.youtube) {
        dayData.youtube.summary = Object.assign({}, dayData.youtube.summary, rawDay.youtube.summary);
        dayData.youtube.shortVideos = Object.assign({}, dayData.youtube.shortVideos, rawDay.youtube.shortVideos);
        dayData.youtube.musicVideos = Object.assign({ totalWatched: 0, totalDurationSeconds: 0 }, rawDay.youtube.musicVideos || {});
        if (rawDay.youtube.longVideos) {
          dayData.youtube.longVideos.totalWatched = rawDay.youtube.longVideos.totalWatched || 0;
          dayData.youtube.longVideos.impulsiveCount = rawDay.youtube.longVideos.impulsiveCount || 0;
          dayData.youtube.longVideos.usefulCount = rawDay.youtube.longVideos.usefulCount || 0;
          dayData.youtube.longVideos.details = Array.isArray(rawDay.youtube.longVideos.details)
            ? rawDay.youtube.longVideos.details
            : [];
        }
      }
      if (rawDay.facebook) {
        dayData.facebook.summary = Object.assign({}, dayData.facebook.summary, rawDay.facebook.summary);
        dayData.facebook.reels = Object.assign({}, dayData.facebook.reels, rawDay.facebook.reels);
        if (rawDay.facebook.longVideos) {
          dayData.facebook.longVideos.totalWatched = rawDay.facebook.longVideos.totalWatched || 0;
          dayData.facebook.longVideos.impulsiveCount = rawDay.facebook.longVideos.impulsiveCount || 0;
          dayData.facebook.longVideos.usefulCount = rawDay.facebook.longVideos.usefulCount || 0;
          dayData.facebook.longVideos.details = Array.isArray(rawDay.facebook.longVideos.details)
            ? rawDay.facebook.longVideos.details
            : [];
        }
      }
      dayData.studyVideoLogs = Array.isArray(rawDay.studyVideoLogs) ? rawDay.studyVideoLogs : [];
      if (rawDay.reflection) {
        dayData.reflection = Object.assign({}, dayData.reflection, rawDay.reflection);
      }
    }

    // 3. HUD pos
    const hudPosition = result.hud_position || null;

    // 4. Pomodoro state
    const pomodoroState = result.pomodoro_state || {
      enabled: config.pomodoro?.enabled || false,
      sessionType: "focus",
      sessionStartTime: Date.now(),
      durationMinutes: config.pomodoro?.focusMinutes || 25
    };

    if (callback) callback({ config, dayData, hudPosition, pomodoroState, todayKey });
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
      if (platformKey === "youtube") {
        existing.youtube = dayData.youtube;
      } else if (platformKey === "facebook") {
        existing.facebook = dayData.facebook;
      }
      if (dayData.studyVideoLogs) {
        existing.studyVideoLogs = dayData.studyVideoLogs;
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

// Lưu vị trí HUD
export function saveHUDPosition(pos) {
  chrome.storage.local.set({ hud_position: pos });
}

// Lưu trạng thái Pomodoro
export function savePomodoroState(state) {
  chrome.storage.local.set({ pomodoro_state: state });
}

// Lưu cấu hình ứng dụng
export function saveAppConfig(config, callback) {
  chrome.storage.local.set({ app_config: config }, callback);
}

// Format giây sang chuỗi ngắn gọn "12m 30s"
export function formatTimeShort(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  return m > 0 ? `${m}m ${remSec}s` : `${remSec}s`;
}
