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
  generateChibiPetSprites
} from "./gemini-client.js";

// ─── Khởi tạo & Alarms ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  setupDailyReflectionAlarm();
  initDefaultState();
});

chrome.runtime.onStartup.addListener(() => {
  setupDailyReflectionAlarm();
});

function initDefaultState() {
  chrome.storage.local.get([
    "pet_state",
    "petState",
    "petConfig",
    "user_persona",
    "unmatched_queue",
    "suggested_keywords"
  ], (res) => {
    const toSet = {};
    if (!res.petState && !res.pet_state) {
      const defaultState = {
        energy: 100,
        mood: "happy", // "happy" | "neutral" | "sad"
        currentStreak: 0,
        streakDays: 0,
        lastStreakDate: null,
        level: 1
      };
      toSet.petState = defaultState;
      toSet.pet_state = defaultState;
    }
    if (!res.petConfig) {
      toSet.petConfig = {
        mode: "default", // "default" | "puppet" | "ai_generated"
        uploadedImageBase64: "",
        aiSprites: {
          happy: "",
          neutral: "",
          sad: ""
        }
      };
    }
    if (!res.user_persona) {
      toSet.user_persona = {
        totalTrackedDays: 0,
        streakRecord: 0,
        totalUsefulVideos: 0,
        avgUsefulPct: 0,
        history: [] // Danh sách digest 7-30 ngày gần nhất
      };
    }
    if (!res.unmatched_queue) {
      toSet.unmatched_queue = [];
    }
    if (!res.suggested_keywords) {
      toSet.suggested_keywords = [];
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });
}

function setupDailyReflectionAlarm() {
  chrome.alarms.get("daily-reflection", (existing) => {
    if (existing) return;

    const now = new Date();
    const next22h = new Date();
    next22h.setHours(22, 0, 0, 0);

    if (now >= next22h) {
      next22h.setDate(next22h.getDate() + 1);
    }

    const delayMinutes = (next22h.getTime() - now.getTime()) / (1000 * 60);

    chrome.alarms.create("daily-reflection", {
      delayInMinutes: delayMinutes,
      periodInMinutes: 24 * 60
    });

    console.log(`[Mindful SW] Đã đặt alarm 22h00 (sau ${Math.round(delayMinutes)} phút)`);
  });
}

// Lắng nghe alarm kích hoạt lúc 22h00
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "daily-reflection") {
    handleDaily22hRoutine();
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
  chrome.storage.local.get([todayKey, "pet_state", "unmatched_queue", "gemini_api_key", "suggested_keywords", "app_config"], async (res) => {
    const dayData = res[todayKey] || {};
    const petState = res.pet_state || { energy: 80, mood: "happy", streakDays: 0, lastStreakDate: null };
    const apiKey = res.gemini_api_key;
    const unmatchedQueue = res.unmatched_queue || [];

    // 1. Kiểm tra Streak hôm nay
    checkAndAwardStreak(dayData, petState, todayKey);

    // 2. Tự động tiến hóa bộ lọc nếu có video trong unmatched_queue
    if (apiKey && unmatchedQueue.length >= 2) {
      try {
        const titles = unmatchedQueue.map(item => item.title).filter(Boolean);
        const newSuggestions = await extractSuggestedKeywords(titles, apiKey);
        if (newSuggestions && newSuggestions.length > 0) {
          const currentSuggestions = res.suggested_keywords || [];
          const existingWords = new Set(currentSuggestions.map(s => s.word.toLowerCase()));
          const configWords = new Set((res.app_config?.targetKeywords || []).map(w => w.toLowerCase()));

          const merged = [...currentSuggestions];
          newSuggestions.forEach(s => {
            if (!existingWords.has(s.word) && !configWords.has(s.word)) {
              merged.push(s);
            }
          });

          chrome.storage.local.set({
            suggested_keywords: merged,
            unmatched_queue: [] // Xóa hàng đợi đã xử lý
          });
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
  return `${y}-${m}-${day}`;
}

/**
 * Đánh giá Focus Streak hôm nay:
 * Tiêu chí: Không vi phạm Mốc 3 (long videos <= m3 và short swipes <= m3)
 */
function checkAndAwardStreak(dayData, petState, todayKey) {
  if (petState.lastStreakDate === todayKey) return; // Đã tính hôm nay

  const ytLong = dayData.youtube?.longVideos?.totalWatched || 0;
  const fbLong = dayData.facebook?.longVideos?.totalWatched || 0;
  const ytShorts = dayData.youtube?.shortVideos?.totalSwipes || 0;
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
  chrome.storage.local.set({ pet_state: petState, petState: petState });
}

/**
 * Nén dữ liệu ngày thành Digest ngắn gọn (~150 tokens) cho AI Reflection Coach
 */
function buildContextDigest(dayData) {
  const ytSummary = dayData.youtube?.summary || {};
  const fbSummary = dayData.facebook?.summary || {};
  const ytLong = dayData.youtube?.longVideos || { totalWatched: 0, impulsiveCount: 0, usefulCount: 0, details: [] };
  const fbLong = dayData.facebook?.longVideos || { totalWatched: 0, impulsiveCount: 0, usefulCount: 0, details: [] };
  const ytShorts = dayData.youtube?.shortVideos?.totalSwipes || 0;
  const fbReels = dayData.facebook?.reels?.totalSwipes || 0;
  const musicVideos = dayData.youtube?.musicVideos || { totalWatched: 0, totalDurationSeconds: 0 };
  const studyVideoLogs = Array.isArray(dayData.studyVideoLogs) ? dayData.studyVideoLogs.slice(0, 10) : [];

  const totalActiveSeconds = (ytSummary.activeTimeSeconds || 0) + (fbSummary.activeTimeSeconds || 0);
  const activeMinutes = Math.round(totalActiveSeconds / 60);

  const totalLong = ytLong.totalWatched + fbLong.totalWatched;
  const totalUseful = (ytLong.usefulCount || 0) + (fbLong.usefulCount || 0);
  const totalImpulsive = (ytLong.impulsiveCount || 0) + (fbLong.impulsiveCount || 0);

  const usefulPct = totalLong > 0 ? Math.round((totalUseful / totalLong) * 100) : 0;
  const distractPct = totalLong > 0 ? Math.round((totalImpulsive / totalLong) * 100) : 0;

  // Lọc các video bổ ích đã xem trọn vẹn (isUseful === true hoặc completionPct >= 80)
  const allDetails = [...(ytLong.details || []), ...(fbLong.details || [])];
  const usefulVideos = allDetails
    .filter(v => v.isUseful || (v.completionPct && v.completionPct >= 80))
    .slice(0, 5)
    .map(v => v.title);

  // Lấy danh sách video chưa phân loại được
  const unclassifiedVideos = (dayData.unclassifiedVideos && dayData.unclassifiedVideos.length > 0)
    ? dayData.unclassifiedVideos.slice(0, 10).map(v => v.title)
    : allDetails.filter(v => v.category === "Khác").slice(0, 10).map(v => v.title);

  return {
    activeMinutes,
    usefulPct,
    distractPct,
    totalVideos: totalLong + ytShorts + fbReels,
    usefulVideos,
    musicVideos,
    studyVideoLogs,
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

  // 6. Chấp nhận từ khóa AI đề xuất vào targetKeywords
  if (msg.type === "APPROVE_KEYWORD") {
    handleApproveKeyword(msg.word).then(res => sendResponse(res));
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

  // 9. Quản lý trạng thái Pet (Gamification)
  if (msg.type === "GET_PET_STATE") {
    chrome.storage.local.get(["petState", "pet_state", "petConfig"], (res) => {
      const petState = res.petState || res.pet_state || { energy: 100, mood: "happy", currentStreak: 0, streakDays: 0 };
      const petConfig = res.petConfig || { mode: "default", uploadedImageBase64: "", aiSprites: {} };
      sendResponse({ petState, petConfig, pet_state: petState });
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
    chrome.storage.local.get(["petConfig"], (res) => {
      const updated = Object.assign({}, res.petConfig || {}, msg.config || {});
      chrome.storage.local.set({ petConfig: updated }, () => {
        sendResponse({ ok: true, petConfig: updated });
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

  // 13. Dev Mode: Kích hoạt mở tab phản tư 22h00 ngay lập tức
  if (msg.type === "TRIGGER_DEV_REFLECTION") {
    openReflectionTab();
    sendResponse({ ok: true });
    return true;
  }

  // 14. Dev Mode: Reset dữ liệu test về trạng thái sạch ban đầu
  if (msg.type === "RESET_DEV_DATA") {
    const todayKey = getTodayDateKey();
    const cleanDayData = {
      youtube: {
        summary: { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0 },
        longVideos: { totalWatched: 0, impulsiveCount: 0, usefulCount: 0, details: [] },
        shortVideos: { totalSwipes: 0, validViews: 0, loopViews: 0 }
      },
      facebook: {
        summary: { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0, feedPostsScrolled: 0 },
        longVideos: { totalWatched: 0, impulsiveCount: 0, usefulCount: 0, details: [] },
        reels: { totalSwipes: 0, validViews: 0, loopViews: 0 }
      },
      reflection: { lesson1: "", lesson2: "", rating: 5, submittedAt: null },
      studyVideoLogs: [],
      unclassifiedVideos: []
    };
    const cleanPetState = {
      energy: 100,
      mood: "happy",
      currentStreak: 0,
      streakDays: 0,
      lastStreakDate: null
    };

    const payload = {};
    payload[todayKey] = cleanDayData;
    payload["petState"] = cleanPetState;
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
    chrome.storage.local.get(["ai_classification_cache", "gemini_api_key"], async (res) => {
      const cache = res.ai_classification_cache || {};

      // 1. Kiểm tra Cache trong storage (Miễn phí 100% token)
      if (cache[videoId]) {
        return resolve({ ...cache[videoId], cached: true });
      }

      const apiKey = res.gemini_api_key;
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
 * Thêm video "lọt lưới" (unmatched) vào hàng đợi
 */
async function handleAddUnmatchedVideo({ id, title, watchedSeconds }) {
  if (!id || !title) return { ok: false };

  return new Promise((resolve) => {
    chrome.storage.local.get(["unmatched_queue"], (res) => {
      const queue = res.unmatched_queue || [];
      // Tránh trùng lặp
      if (!queue.some(item => item.id === id)) {
        queue.push({ id, title, watchedSeconds: watchedSeconds || 0, timestamp: Date.now() });
        if (queue.length > 40) queue.shift(); // Tối đa 40 video
        chrome.storage.local.set({ unmatched_queue: queue });
      }
      resolve({ ok: true, queueLength: queue.length });
    });
  });
}

/**
 * Tự tiến hóa: Gọi Gemini trích xuất từ khóa từ unmatched_queue
 */
async function handleEvolveFilter() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["unmatched_queue", "gemini_api_key", "suggested_keywords", "app_config"], async (res) => {
      const queue = res.unmatched_queue || [];
      const apiKey = res.gemini_api_key;

      if (!apiKey) {
        return resolve({ ok: false, error: "Chưa cấu hình Google Gemini API Key trong Popup Cài đặt." });
      }
      if (queue.length === 0) {
        return resolve({ ok: true, suggestions: res.suggested_keywords || [], message: "Hàng đợi trống." });
      }

      const titles = queue.map(item => item.title).filter(Boolean);
      const suggestions = await extractSuggestedKeywords(titles, apiKey);

      const existingSuggestions = res.suggested_keywords || [];
      const existingWords = new Set(existingSuggestions.map(s => s.word.toLowerCase()));
      const targetWords = new Set((res.app_config?.targetKeywords || []).map(w => w.toLowerCase()));

      const updatedSuggestions = [...existingSuggestions];
      suggestions.forEach(s => {
        if (!existingWords.has(s.word) && !targetWords.has(s.word)) {
          updatedSuggestions.push(s);
        }
      });

      chrome.storage.local.set({
        suggested_keywords: updatedSuggestions,
        unmatched_queue: [] // Xóa hàng đợi đã xử lý
      });

      resolve({ ok: true, suggestions: updatedSuggestions });
    });
  });
}

/**
 * Thêm từ khóa AI đề xuất vào targetKeywords
 */
async function handleApproveKeyword(word) {
  if (!word) return { ok: false };
  const cleanWord = word.trim().toLowerCase();

  return new Promise((resolve) => {
    chrome.storage.local.get(["app_config", "suggested_keywords"], (res) => {
      const config = res.app_config || {};
      const keywords = Array.isArray(config.targetKeywords) ? config.targetKeywords : [];

      if (!keywords.map(k => k.toLowerCase()).includes(cleanWord)) {
        keywords.push(cleanWord);
        config.targetKeywords = keywords;
      }

      // Xóa khỏi danh sách đề xuất
      const suggestions = (res.suggested_keywords || []).filter(s => s.word.toLowerCase() !== cleanWord);

      chrome.storage.local.set({ app_config: config, suggested_keywords: suggestions }, () => {
        resolve({ ok: true, keywords, suggestions });
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
    chrome.storage.local.get(["suggested_keywords"], (res) => {
      const suggestions = (res.suggested_keywords || []).filter(s => s.word.toLowerCase() !== cleanWord);
      chrome.storage.local.set({ suggested_keywords: suggestions }, () => {
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
    chrome.storage.local.get(["gemini_api_key", "user_persona"], async (res) => {
      const apiKey = res.gemini_api_key;
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

      // Cập nhật User Persona đường dài (Long-term Persona)
      const persona = res.user_persona || {
        totalTrackedDays: 0,
        streakRecord: 0,
        totalUsefulVideos: 0,
        avgUsefulPct: 0,
        history: []
      };

      persona.totalTrackedDays = (persona.totalTrackedDays || 0) + 1;
      persona.totalUsefulVideos = (persona.totalUsefulVideos || 0) + digest.usefulVideos.length;

      // Tính trung bình % hữu ích
      const currentAvg = persona.avgUsefulPct || 0;
      persona.avgUsefulPct = Math.round((currentAvg * (persona.totalTrackedDays - 1) + digest.usefulPct) / persona.totalTrackedDays);

      persona.history.unshift({
        date: getTodayDateKey(),
        usefulPct: digest.usefulPct,
        activeMinutes: digest.activeMinutes,
        tomorrowMission: coachResult.tomorrowMission
      });
      if (persona.history.length > 30) persona.history.pop(); // Giữ tối đa 30 ngày

      chrome.storage.local.set({ user_persona: persona });

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
    chrome.storage.local.get(["petState", "pet_state"], (res) => {
      const pet = res.petState || res.pet_state || { energy: 100, mood: "happy", currentStreak: 0, streakDays: 0 };
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

      pet.streakDays = pet.streakDays ?? pet.currentStreak ?? 0;
      pet.currentStreak = pet.streakDays;

      chrome.storage.local.set({ petState: pet, pet_state: pet }, () => {
        resolve({ ok: true, petState: pet });
      });
    });
  });
}

/**
 * Xử lý tạo 3 sprite Chibi SVG qua Gemini Vision API
 */
async function handleGenerateAiPetSprites(imageBase64) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["gemini_api_key", "petConfig"], async (res) => {
      const apiKey = res.gemini_api_key;
      if (!apiKey) {
        return resolve({ ok: false, error: "Vui lòng cấu hình Google Gemini API Key trong Popup trước khi tạo Avatar AI." });
      }

      try {
        const result = await generateChibiPetSprites(imageBase64, apiKey);
        if (result && result.sprites) {
          const petConfig = res.petConfig || { mode: "ai_generated", uploadedImageBase64: imageBase64, aiSprites: {} };
          petConfig.aiSprites = result.sprites;
          petConfig.uploadedImageBase64 = imageBase64;
          petConfig.mode = "ai_generated";

          chrome.storage.local.set({ petConfig }, () => {
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

