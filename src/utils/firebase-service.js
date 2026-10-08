/**
 * Mindful Social Media Tracker - Firebase Service Module
 * Đồng bộ dữ liệu 2 chiều thời gian thực (Real-time Sync Engine) giữa Chrome Extension và Android App
 * Hỗ trợ Server-Sent Events (SSE) Streaming, Debounce 2s, và cấu trúc cây JSON chuẩn users/{syncCode}
 */

export const FIREBASE_CONFIG = {
  authDomain: "mindful-tracker-bc869.firebaseapp.com",
  databaseURL: "https://mindful-tracker-bc869-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mindful-tracker-bc869",
  storageBucket: "mindful-tracker-bc869.firebasestorage.app",
  messagingSenderId: "18907043608",
  appId: "1:18907043608:web:0a98f0709234eb83e9f06d"
};

/**
 * Sinh mã syncCode ngẫu nhiên 6 ký tự định dạng MF-XXXX (VD: MF-8924)
 */
export function generateRandomSyncCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MF-${num}`;
}

/**
 * Lấy cấu hình đồng bộ Firebase lưu trong local storage.
 * Nếu chưa có syncCode, tự động sinh mã mặc định MF-XXXX và lưu lại.
 */
export async function getFirebaseSyncSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      "firebase_sync_code",
      "firebase_sync_user_id", // backward-compatibility
      "firebase_auto_sync",
      "firebase_last_synced",
      "firebase_auth_token"
    ], (res) => {
      let syncCode = res.firebase_sync_code || res.firebase_sync_user_id;
      if (!syncCode || !syncCode.trim()) {
        syncCode = generateRandomSyncCode();
        chrome.storage.local.set({
          firebase_sync_code: syncCode,
          firebase_sync_user_id: syncCode
        });
      } else {
        syncCode = syncCode.replace(/\s+/g, "").toUpperCase();
      }

      resolve({
        syncCode: syncCode,
        syncUserId: syncCode,
        autoSync: res.firebase_auto_sync !== false, // Mặc định bật
        lastSynced: res.firebase_last_synced || null,
        authToken: (res.firebase_auth_token || "").trim()
      });
    });
  });
}

/**
 * Lưu cấu hình đồng bộ Firebase
 */
export async function saveFirebaseSyncSettings({ syncCode, autoSync, authToken }) {
  return new Promise((resolve) => {
    const data = {};
    if (syncCode !== undefined) {
      const cleanCode = syncCode.replace(/\s+/g, "").toUpperCase() || "MF-8924";
      data.firebase_sync_code = cleanCode;
      data.firebase_sync_user_id = cleanCode;
    }
    if (autoSync !== undefined) data.firebase_auto_sync = Boolean(autoSync);
    if (authToken !== undefined) data.firebase_auth_token = authToken.trim();

    chrome.storage.local.set(data, () => resolve(true));
  });
}

/**
 * Xây dựng URL Firebase Realtime Database
 */
export function buildDatabaseUrl(path, authToken = "") {
  let url = `${FIREBASE_CONFIG.databaseURL}/${path}.json`;
  if (authToken) {
    url += `?auth=${encodeURIComponent(authToken)}`;
  }
  return url;
}

/**
 * Kiểm tra kết nối tới Firebase Realtime Database
 */
export async function testFirebaseConnection(customSyncCode = null) {
  try {
    const settings = await getFirebaseSyncSettings();
    let syncCode = customSyncCode ? customSyncCode : settings.syncCode;
    syncCode = (syncCode || "MF-8924").replace(/\s+/g, "").toUpperCase();
    const testUrl = buildDatabaseUrl(`users/${syncCode}/_ping`, settings.authToken);

    const now = Date.now();
    const response = await fetch(testUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pingAt: now,
        client: "Mindful Extension (MV3)",
        status: "connected"
      })
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: "Lỗi 401/403 Permission Denied. Vui lòng kiểm tra Rules trên Firebase RTDB."
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Firebase trả về HTTP ${response.status}: ${response.statusText}`
      };
    }

    return {
      success: true,
      message: `Kết nối thành công tới phòng đồng bộ ${syncCode}!`,
      timestamp: now
    };
  } catch (err) {
    return {
      success: false,
      error: `Không thể kết nối Firebase: ${err.message}`
    };
  }
}

// ─── DEBOUNCE 2 GIÂY PUSH DESKTOP REALTIME STATS ──────────────────────────────

let desktopSyncTimeout = null;
let pendingDesktopPayload = null;

/**
 * Chuẩn hóa payload desktop theo đúng schema firebase_realtime_db.json
 */
export function buildDesktopHistoryPayload(todayData, now = Date.now()) {
  const yt = todayData.youtube || {};
  const fb = todayData.facebook || {};
  const tt = todayData.tiktok || {};

  return {
    lastUpdated: now,
    youtube: {
      activeSeconds: yt.summary?.activeSeconds ?? yt.summary?.activeTimeSeconds ?? 0,
      passiveSeconds: yt.summary?.passiveSeconds ?? yt.summary?.passiveTimeSeconds ?? 0,
      reloadCount: yt.summary?.reloadCount || 0,
      shorts: {
        swipes: yt.shorts?.totalSwipes ?? yt.shortVideos?.totalSwipes ?? 0,
        validViews: yt.shorts?.validViews ?? yt.shortVideos?.validViews ?? 0,
        impulsiveCount: yt.shorts?.impulsiveCount ?? 0,
        loopViews: yt.shorts?.loopViews ?? 0
      },
      longVideos: {
        watched: yt.longVideos?.totalWatched || 0,
        usefulCount: yt.longVideos?.usefulCount || 0,
        impulsiveCount: yt.longVideos?.impulsiveCount || 0
      },
      musicVideos: {
        watched: yt.musicVideos?.totalWatched || 0,
        durationSeconds: yt.musicVideos?.durationSeconds ?? yt.musicVideos?.totalDurationSeconds ?? 0
      }
    },
    facebook: {
      activeSeconds: fb.summary?.activeSeconds ?? fb.summary?.activeTimeSeconds ?? 0,
      passiveSeconds: fb.summary?.passiveSeconds ?? fb.summary?.passiveTimeSeconds ?? 0,
      reloadCount: fb.summary?.reloadCount || 0,
      feed: {
        postsScrolled: fb.feed?.feedPostsScrolled ?? fb.summary?.feedPostsScrolled ?? 0,
        postsRead: fb.feed?.feedPostsRead ?? 0
      },
      reels: {
        swipes: fb.reels?.totalSwipes || 0,
        validViews: fb.reels?.validViews || 0,
        impulsiveCount: fb.reels?.impulsiveCount || 0,
        loopViews: fb.reels?.loopViews || 0
      },
      longVideos: {
        watched: fb.longVideos?.totalWatched || 0,
        usefulCount: fb.longVideos?.usefulCount || 0,
        impulsiveCount: fb.longVideos?.impulsiveCount || 0
      }
    },
    tiktok: {
      activeSeconds: tt.summary?.activeSeconds ?? tt.summary?.activeTimeSeconds ?? 0,
      passiveSeconds: tt.summary?.passiveSeconds ?? tt.summary?.passiveTimeSeconds ?? 0,
      reloadCount: tt.summary?.reloadCount || 0,
      shorts: {
        swipes: tt.shorts?.totalSwipes || 0,
        validViews: tt.shorts?.validViews || 0,
        impulsiveCount: tt.shorts?.impulsiveCount || 0,
        loopViews: tt.shorts?.loopViews || 0
      }
    }
  };
}

/**
 * Đẩy số liệu Desktop lên Firebase tại nhánh users/{syncCode}/history/{YYYY-MM-DD}
 * Áp dụng cơ chế Debounce 2 giây để tránh spam network.
 */
export function queueDesktopSyncToFirebase(dateStr, dayData, petState = null) {
  const cleanDateStr = dateStr.replace("stats_", "");
  pendingDesktopPayload = {
    dateStr: cleanDateStr,
    dayData,
    petState
  };

  if (desktopSyncTimeout) {
    clearTimeout(desktopSyncTimeout);
  }

  desktopSyncTimeout = setTimeout(async () => {
    if (!pendingDesktopPayload) return;
    const { dateStr, dayData, petState } = pendingDesktopPayload;
    pendingDesktopPayload = null;

    try {
      const settings = await getFirebaseSyncSettings();
      if (!settings.autoSync) return;

      const now = Date.now();
      const desktopPayload = buildDesktopHistoryPayload(dayData, now);

      // 1. Cập nhật nhánh desktop trong ngày
      const desktopUrl = buildDatabaseUrl(`users/${settings.syncCode}/history/${dateStr}/desktop`, settings.authToken);
      await fetch(desktopUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(desktopPayload)
      });

      // 2. Cập nhật temptation, hourly, reflection, petEnergyEndOfDay nếu có
      const dayMetaUrl = buildDatabaseUrl(`users/${settings.syncCode}/history/${dateStr}`, settings.authToken);
      const dayMetaPatch = {};
      if (dayData.temptation) {
        dayMetaPatch.temptation = {
          resistedCount: dayData.temptation.resistedCount || 0,
          succumbedCount: dayData.temptation.succumbedCount || 0
        };
      }
      if (Array.isArray(dayData.hourly)) {
        dayMetaPatch.hourly = dayData.hourly;
      }
      if (dayData.reflection && (dayData.reflection.lesson1 || dayData.reflection.submittedAt)) {
        dayMetaPatch.reflection = {
          submittedAt: dayData.reflection.submittedAt || now,
          rating: dayData.reflection.rating || 5,
          lesson1: dayData.reflection.lesson1 || "",
          lesson2: dayData.reflection.lesson2 || "",
          aiFeedback: dayData.reflection.aiFeedback || ""
        };
      }
      if (dayData.petEnergyEndOfDay !== undefined) {
        dayMetaPatch.petEnergyEndOfDay = dayData.petEnergyEndOfDay;
      }

      if (Object.keys(dayMetaPatch).length > 0) {
        await fetch(dayMetaUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dayMetaPatch)
        });
      }

      // 3. Cập nhật petState chuẩn nếu có
      if (petState) {
        const petUrl = buildDatabaseUrl(`users/${settings.syncCode}/petState`, settings.authToken);
        await fetch(petUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            energy: petState.energy ?? 100,
            mood: petState.mood || "happy",
            currentStreak: petState.currentStreak ?? petState.streakDays ?? 1,
            streakDays: petState.streakDays ?? petState.currentStreak ?? 1,
            lastPokeEnergyTime: petState.lastPokeEnergyTime || now,
            mode: petState.mode || "default",
            accessories: petState.accessories || {
              unlockedItems: ["sunglasses", "laurel"],
              equippedHead: null
            },
            knowledgeSeeds: petState.knowledgeSeeds ?? 0,
            customQuotes: Array.isArray(petState.customQuotes) ? petState.customQuotes : [],
            isWilted: Boolean(petState.isWilted),
            evolutionStage: petState.evolutionStage || (
              (petState.currentStreak ?? petState.streakDays ?? 1) >= 21 ? "flowering" :
              (petState.currentStreak ?? petState.streakDays ?? 1) >= 4 ? "growing" : "seedling"
            )
          })
        });

        // 4. Cập nhật deviceHandoff
        const handoffUrl = buildDatabaseUrl(`users/${settings.syncCode}/deviceHandoff`, settings.authToken);
        await fetch(handoffUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastActiveDevice: "desktop",
            lastExitTimestamp: now
          })
        });
      }
    } catch (e) {
      console.warn("[FirebaseService] Lỗi đẩy số liệu Desktop:", e.message);
    }
  }, 2000);
}

/**
 * Helper hợp nhất danh sách từ khóa không trùng lặp (case-insensitive)
 */
function mergeKeywordLists(...lists) {
  const result = [];
  const seen = new Set();
  for (const list of lists) {
    if (Array.isArray(list)) {
      for (const item of list) {
        const clean = String(item || "").trim().toLowerCase();
        if (clean.length >= 2 && !seen.has(clean)) {
          seen.add(clean);
          result.push(clean);
        }
      }
    }
  }
  return result;
}

/**
 * Đọc từ khóa mới nhất từ Firebase, gộp với từ khóa mới và lưu lên cả Local + Cloud
 * Ngăn chặn tuyệt đối tình trạng Extension ghi đè làm mất từ khóa mà App vừa tự học.
 */
export async function pushKeywordsWithCloudMerge(newKeywords = {}) {
  try {
    const settings = await getFirebaseSyncSettings();
    if (!settings.syncCode) return null;

    const kwUrl = buildDatabaseUrl(`users/${settings.syncCode}/config/keywords`, settings.authToken);

    // 1. Đọc từ khóa hiện có trên Firebase Server
    let cloudKeywords = {};
    try {
      const res = await fetch(kwUrl);
      if (res.ok) {
        cloudKeywords = (await res.json()) || {};
      }
    } catch (err) {
      console.warn("[FirebaseService] Không thể đọc cloud keywords trước khi merge:", err.message);
    }

    // 2. Lấy từ khóa trong local storage
    const local = await new Promise((res) => chrome.storage.local.get(["app_config"], res));
    const currentCfg = local.app_config || {};
    const localKeywords = currentCfg.keywords || { target: [], leisure: [], distraction: [] };

    // 3. Hợp nhất 3 nguồn: Cloud + Local + New
    const mergedKeywords = {
      target: mergeKeywordLists(cloudKeywords.target, localKeywords.target, newKeywords.target),
      leisure: mergeKeywordLists(cloudKeywords.leisure, localKeywords.leisure, newKeywords.leisure),
      distraction: mergeKeywordLists(cloudKeywords.distraction, localKeywords.distraction, newKeywords.distraction)
    };

    // 4. Cập nhật local storage
    currentCfg.keywords = mergedKeywords;
    await new Promise((res) => chrome.storage.local.set({ app_config: currentCfg }, res));

    // 5. Đẩy lên Firebase nhánh config/keywords
    await fetch(kwUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mergedKeywords)
    });

    console.log("[FirebaseService] 🟢 Đã Deep Merge và đẩy từ khóa lên Firebase thành công:", mergedKeywords);
    return mergedKeywords;
  } catch (err) {
    console.warn("[FirebaseService] Lỗi pushKeywordsWithCloudMerge:", err.message);
    return null;
  }
}

/**
 * Cập nhật cấu hình chung lên users/{syncCode}/config theo đúng schema
 * Áp dụng Read-Latest-Cloud & Deep Merge cho keywords để không ghi đè chéo.
 * TUYỆT ĐỐI KHÔNG GỬI API KEY GEMINI LÊN CLOUD (Bảo mật 100%)
 */
export async function pushConfigToFirebase(config) {
  try {
    const settings = await getFirebaseSyncSettings();
    const url = buildDatabaseUrl(`users/${settings.syncCode}/config`, settings.authToken);
    const kwUrl = buildDatabaseUrl(`users/${settings.syncCode}/config/keywords`, settings.authToken);

    // 1. Đọc từ khóa hiện tại trên Cloud để Deep Merge trước khi ghi
    let cloudKeywords = {};
    try {
      const kwRes = await fetch(kwUrl);
      if (kwRes.ok) {
        cloudKeywords = (await kwRes.json()) || {};
      }
    } catch (_) {}

    const localKeywords = config.keywords || {};
    const finalKeywords = {
      target: mergeKeywordLists(cloudKeywords.target, localKeywords.target),
      leisure: mergeKeywordLists(cloudKeywords.leisure, localKeywords.leisure),
      distraction: mergeKeywordLists(cloudKeywords.distraction, localKeywords.distraction)
    };

    // Nếu Cloud có từ mới mà local chưa có, đồng bộ lại vào local
    if (
      finalKeywords.target.length > (localKeywords.target?.length || 0) ||
      finalKeywords.leisure.length > (localKeywords.leisure?.length || 0) ||
      finalKeywords.distraction.length > (localKeywords.distraction?.length || 0)
    ) {
      config.keywords = finalKeywords;
      chrome.storage.local.set({ app_config: config });
    }

    const safeConfig = {
      syncCode: settings.syncCode,
      masterGoal: config.masterGoal || "Muốn trở thành phiên bản tốt hơn để gặp người ấy",
      leisureQuotaMinutes: Number(config.leisureQuotaMinutes || 45),
      pomodoro: {
        enabled: Boolean(config.pomodoro?.enabled),
        focusMinutes: Number(config.pomodoro?.focusMinutes || 25),
        breakMinutes: Number(config.pomodoro?.breakMinutes || 5)
      },
      bedtime: {
        enabled: config.bedtime?.enabled !== false,
        start: config.bedtime?.start || "22:30",
        end: config.bedtime?.end || "05:00"
      },
      reflection: {
        reminderTime: config.reflection?.reminderTime || "22:00"
      },
      thresholds: {
        youtube: {
          shorts: {
            m1: Number(config.thresholds?.youtube?.shorts?.m1 ?? 15),
            m2: Number(config.thresholds?.youtube?.shorts?.m2 ?? 30),
            m3: Number(config.thresholds?.youtube?.shorts?.m3 ?? 45)
          },
          long: {
            m1: Number(config.thresholds?.youtube?.long?.m1 ?? 3),
            m2: Number(config.thresholds?.youtube?.long?.m2 ?? 5),
            m3: Number(config.thresholds?.youtube?.long?.m3 ?? 8)
          }
        },
        facebook: {
          reels: {
            m1: Number(config.thresholds?.facebook?.reels?.m1 ?? 15),
            m2: Number(config.thresholds?.facebook?.reels?.m2 ?? 30),
            m3: Number(config.thresholds?.facebook?.reels?.m3 ?? 45)
          },
          feeds: {
            m1: Number(config.thresholds?.facebook?.feeds?.m1 ?? 20),
            m2: Number(config.thresholds?.facebook?.feeds?.m2 ?? 40),
            m3: Number(config.thresholds?.facebook?.feeds?.m3 ?? 60)
          },
          long: {
            m1: Number(config.thresholds?.facebook?.long?.m1 ?? 2),
            m2: Number(config.thresholds?.facebook?.long?.m2 ?? 4),
            m3: Number(config.thresholds?.facebook?.long?.m3 ?? 6)
          }
        },
        tiktok: {
          shorts: {
            m1: Number(config.thresholds?.tiktok?.shorts?.m1 ?? 15),
            m2: Number(config.thresholds?.tiktok?.shorts?.m2 ?? 30),
            m3: Number(config.thresholds?.tiktok?.shorts?.m3 ?? 45)
          }
        }
      },
      keywords: finalKeywords
    };

    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeConfig)
    });
  } catch (err) {
    console.warn("[FirebaseService] Lỗi đẩy config lên cloud:", err.message);
  }
}

// ─── SERVER-SENT EVENTS (SSE) REALTIME STREAMING ──────────────────────────────

let activeEventSourceReader = null;
let isStreamConnecting = false;

/**
 * Khởi tạo kết nối Server-Sent Events (SSE) streaming tới Firebase Realtime Database
 * Endpoint: https://[DB].firebasedatabase.app/users/{syncCode}.json với header Accept: text/event-stream
 * Zero-dependency, bundle nhẹ, tự động kích hoạt callback onUpdate(path, data)
 */
export async function startFirebaseRealtimeStream(onDataCallback) {
  if (isStreamConnecting) return;
  isStreamConnecting = true;

  try {
    const settings = await getFirebaseSyncSettings();
    if (!settings.autoSync) {
      isStreamConnecting = false;
      return;
    }

    const streamUrl = buildDatabaseUrl(`users/${settings.syncCode}`, settings.authToken);

    // Đóng reader cũ nếu có
    if (activeEventSourceReader) {
      try { activeEventSourceReader.cancel(); } catch (_) {}
      activeEventSourceReader = null;
    }

    const response = await fetch(streamUrl, {
      headers: {
        "Accept": "text/event-stream"
      }
    });

    if (!response.ok) {
      console.warn("[FirebaseSSE] Kết nối SSE thất bại:", response.status);
      isStreamConnecting = false;
      setTimeout(() => startFirebaseRealtimeStream(onDataCallback), 10000); // Thử lại sau 10s
      return;
    }

    const reader = response.body.getReader();
    activeEventSourceReader = reader;
    const decoder = new TextDecoder();
    let buffer = "";

    isStreamConnecting = false;
    console.log(`[FirebaseSSE] 🟢 Đã kết nối Realtime SSE tới users/${settings.syncCode}`);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // giữ lại phần chưa hoàn chỉnh

      let currentEvent = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.replace("event:", "").trim();
        } else if (trimmed.startsWith("data:")) {
          const rawData = trimmed.replace("data:", "").trim();
          if (rawData && rawData !== "null") {
            try {
              const parsed = JSON.parse(rawData);
              if (onDataCallback) {
                onDataCallback({
                  event: currentEvent || "put",
                  path: parsed.path || "/",
                  data: parsed.data !== undefined ? parsed.data : parsed
                });
              }
            } catch (err) {
              // bỏ qua keep-alive ping
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[FirebaseSSE] Luồng SSE bị ngắt kết nối:", err.message);
    isStreamConnecting = false;
    // Tự động kết nối lại sau 5 giây nếu bị rớt mạng
    setTimeout(() => startFirebaseRealtimeStream(onDataCallback), 5000);
  }
}

/**
 * Đẩy toàn bộ dữ liệu ngày hôm nay và sao lưu lên Firebase
 */
/**
 * Đẩy toàn bộ dữ liệu ngày hôm nay và sao lưu lên Firebase
 */
export async function pushDataToFirebase(customSyncCode = null) {
  try {
    const settings = await getFirebaseSyncSettings();
    let syncCode = customSyncCode ? customSyncCode : settings.syncCode;
    syncCode = (syncCode || "MF-8924").replace(/\s+/g, "").toUpperCase();

    const allData = await new Promise((resolve) => chrome.storage.local.get(null, resolve));
    const now = Date.now();
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayKey = `stats_${todayStr}`;
    const todayData = allData[todayKey] || allData[todayStr] || {};

    // 1. Cập nhật nhánh desktop ngày hôm nay (bao gồm YouTube, Facebook và TikTok chi tiết)
    const desktopPayload = buildDesktopHistoryPayload(todayData, now);
    const desktopUrl = buildDatabaseUrl(`users/${syncCode}/history/${todayStr}/desktop`, settings.authToken);
    await fetch(desktopUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(desktopPayload)
    });

    // 2. Cập nhật temptation, hourly, reflection, petEnergyEndOfDay
    const dayMetaUrl = buildDatabaseUrl(`users/${syncCode}/history/${todayStr}`, settings.authToken);
    const dayMetaPatch = {};
    if (todayData.temptation) {
      dayMetaPatch.temptation = {
        resistedCount: todayData.temptation.resistedCount || 0,
        succumbedCount: todayData.temptation.succumbedCount || 0
      };
    }
    if (Array.isArray(todayData.hourly)) {
      dayMetaPatch.hourly = todayData.hourly;
    }
    if (todayData.reflection && (todayData.reflection.lesson1 || todayData.reflection.submittedAt)) {
      dayMetaPatch.reflection = {
        submittedAt: todayData.reflection.submittedAt || now,
        rating: todayData.reflection.rating || 5,
        lesson1: todayData.reflection.lesson1 || "",
        lesson2: todayData.reflection.lesson2 || "",
        aiFeedback: todayData.reflection.aiFeedback || ""
      };
    }
    if (todayData.petEnergyEndOfDay !== undefined) {
      dayMetaPatch.petEnergyEndOfDay = todayData.petEnergyEndOfDay;
    }

    if (Object.keys(dayMetaPatch).length > 0) {
      await fetch(dayMetaUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dayMetaPatch)
      });
    }

    // 3. Cập nhật petState & deviceHandoff
    const petState = allData.pet_state || {};
    const petUrl = buildDatabaseUrl(`users/${syncCode}/petState`, settings.authToken);
    await fetch(petUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        energy: petState.energy ?? 100,
        mood: petState.mood || "happy",
        currentStreak: petState.currentStreak ?? petState.streakDays ?? 1,
        streakDays: petState.streakDays ?? petState.currentStreak ?? 1,
        lastPokeEnergyTime: petState.lastPokeEnergyTime || now,
        mode: petState.mode || "default",
        accessories: petState.accessories || {
          unlockedItems: ["sunglasses", "laurel"],
          equippedHead: null
        },
        knowledgeSeeds: petState.knowledgeSeeds ?? 0,
        customQuotes: Array.isArray(petState.customQuotes) ? petState.customQuotes : [],
        isWilted: Boolean(petState.isWilted),
        evolutionStage: petState.evolutionStage || (
          (petState.currentStreak ?? petState.streakDays ?? 1) >= 21 ? "flowering" :
          (petState.currentStreak ?? petState.streakDays ?? 1) >= 4 ? "growing" : "seedling"
        )
      })
    });

    const handoffUrl = buildDatabaseUrl(`users/${syncCode}/deviceHandoff`, settings.authToken);
    await fetch(handoffUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastActiveDevice: "desktop",
        lastExitTimestamp: now
      })
    });

    // 4. Đẩy cấu hình an toàn (KHÔNG API KEY)
    if (allData.app_config) {
      await pushConfigToFirebase(allData.app_config);
    }

    // 5. Lưu lại mốc đồng bộ
    await chrome.storage.local.set({ firebase_last_synced: now });

    return {
      success: true,
      message: `Đã sao lưu đồng bộ thành công lên Firebase (${syncCode})!`,
      timestamp: now
    };
  } catch (err) {
    return {
      success: false,
      error: `Lỗi sao lưu lên Firebase: ${err.message}`
    };
  }
}

/**
 * Kéo dữ liệu từ Firebase về máy
 */
export async function pullDataFromFirebase(customSyncCode = null) {
  try {
    const settings = await getFirebaseSyncSettings();
    let syncCode = customSyncCode ? customSyncCode : settings.syncCode;
    syncCode = (syncCode || "MF-8924").replace(/\s+/g, "").toUpperCase();

    const url = buildDatabaseUrl(`users/${syncCode}`, settings.authToken);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const cloudData = await response.json();
    if (!cloudData) {
      return {
        success: false,
        error: "Chưa có dữ liệu nào trên Firebase cho mã phòng này."
      };
    }

    // Cập nhật cấu hình từ cloud nếu có
    if (cloudData.config) {
      const local = await new Promise((res) => chrome.storage.local.get(["app_config"], res));
      const currentCfg = local.app_config || {};
      const updatedCfg = {
        ...currentCfg,
        masterGoal: cloudData.config.masterGoal || currentCfg.masterGoal,
        leisureQuotaMinutes: cloudData.config.leisureQuotaMinutes || currentCfg.leisureQuotaMinutes,
        pomodoro: cloudData.config.pomodoro || currentCfg.pomodoro,
        bedtime: cloudData.config.bedtime || currentCfg.bedtime,
        reflection: cloudData.config.reflection || currentCfg.reflection,
        thresholds: cloudData.config.thresholds || currentCfg.thresholds,
        keywords: cloudData.config.keywords || currentCfg.keywords
      };
      await chrome.storage.local.set({ app_config: updatedCfg });
    }

    // Cập nhật petState (ưu tiên petState chuẩn, fallback sharedState)
    const petSource = cloudData.petState || cloudData.sharedState;
    if (petSource) {
      const local = await new Promise((res) => chrome.storage.local.get(["pet_state"], res));
      const pet = local.pet_state || {};
      pet.energy = petSource.energy ?? petSource.petEnergy ?? pet.energy;
      pet.streakDays = petSource.streakDays ?? petSource.streak ?? pet.streakDays;
      pet.currentStreak = petSource.currentStreak ?? pet.streakDays;
      pet.mood = petSource.mood ?? petSource.petMood ?? pet.mood;
      if (petSource.mode) pet.mode = petSource.mode;
      if (petSource.accessories) pet.accessories = petSource.accessories;
      if (petSource.lastPokeEnergyTime) pet.lastPokeEnergyTime = petSource.lastPokeEnergyTime;
      if (petSource.knowledgeSeeds !== undefined) pet.knowledgeSeeds = petSource.knowledgeSeeds;
      if (petSource.customQuotes !== undefined && Array.isArray(petSource.customQuotes)) pet.customQuotes = petSource.customQuotes;
      if (petSource.isWilted !== undefined) pet.isWilted = Boolean(petSource.isWilted);
      if (petSource.evolutionStage) pet.evolutionStage = petSource.evolutionStage;
      await chrome.storage.local.set({ pet_state: pet });
    }

    const now = Date.now();
    await chrome.storage.local.set({ firebase_last_synced: now });

    return {
      success: true,
      message: `Đã khôi phục dữ liệu từ phòng ${syncCode} thành công!`,
      timestamp: now
    };
  } catch (err) {
    return {
      success: false,
      error: `Lỗi kéo dữ liệu từ Firebase: ${err.message}`
    };
  }
}

/**
 * Tự động đồng bộ lên Firebase nếu bật Auto-sync
 */
export async function triggerAutoSyncIfEnabled() {
  const settings = await getFirebaseSyncSettings();
  if (settings.autoSync) {
    return await pushDataToFirebase();
  }
}
