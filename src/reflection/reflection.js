/**
 * Mindful Social Media Tracker - Reflection Page Controller (Giai đoạn 3 & 4)
 * Quản lý: Thống kê ngày, Bài học phản tư, Trợ lý AI Gemini Coach,
 * Tự tiến hóa từ khóa bộ lọc tĩnh, Linh vật Pet & Hồ sơ kiên trì đường dài.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── State ────────────────────────────────────────────────────────────────────

let selectedRating = 5;
const todayKey = getTodayKey();
let currentDayData = {};

// ─── Render Thống Kê Ngày ─────────────────────────────────────────────────────

function renderStats(data) {
  currentDayData = data;
  const ytSummary = data.youtube?.summary || {};
  const fbSummary = data.facebook?.summary || {};
  const ytLong = data.youtube?.longVideos || { totalWatched: 0, impulsiveCount: 0, usefulCount: 0 };
  const fbLong = data.facebook?.longVideos || { totalWatched: 0, impulsiveCount: 0, usefulCount: 0 };
  const ytShort = data.youtube?.shortVideos || { totalSwipes: 0 };
  const fbReels = data.facebook?.reels || { totalSwipes: 0 };

  const totalActive = (ytSummary.activeTimeSeconds || 0) + (fbSummary.activeTimeSeconds || 0);
  const activeEl = document.getElementById("stat-total-active");
  if (activeEl) activeEl.textContent = formatDuration(totalActive);

  const totalVideos =
    (ytLong.totalWatched || 0) +
    (fbLong.totalWatched || 0) +
    (ytShort.totalSwipes || 0) +
    (fbReels.totalSwipes || 0);
  const totalVideosEl = document.getElementById("stat-total-videos");
  if (totalVideosEl) totalVideosEl.textContent = totalVideos;

  // % Hữu ích vs Xao nhãng
  const totalLong = (ytLong.totalWatched || 0) + (fbLong.totalWatched || 0);
  const totalUseful = (ytLong.usefulCount || 0) + (fbLong.usefulCount || 0);
  const totalImpulsive = (ytLong.impulsiveCount || 0) + (fbLong.impulsiveCount || 0);

  const usefulPct = totalLong > 0 ? Math.round((totalUseful / totalLong) * 100) : 0;
  const distractPct = totalLong > 0 ? Math.round((totalImpulsive / totalLong) * 100) : 0;
  const restPct = Math.max(0, 100 - usefulPct - distractPct);

  const usefulEl = document.getElementById("stat-useful-pct");
  const distractEl = document.getElementById("stat-distract-pct");
  if (usefulEl) usefulEl.textContent = `${usefulPct}%`;
  if (distractEl) distractEl.textContent = `${distractPct}%`;

  const barUseful = document.getElementById("bar-useful");
  const barDistract = document.getElementById("bar-distract");
  if (barUseful) barUseful.style.width = `${usefulPct}%`;
  if (barDistract) barDistract.style.width = `${distractPct + restPct}%`;

  // Phân loại nội dung
  const allDetails = [
    ...(ytLong.details || []),
    ...(fbLong.details || [])
  ];
  renderCategories(allDetails);
}

function renderCategories(details) {
  const container = document.getElementById("categories-list");
  if (!container) return;

  if (!details || details.length === 0) {
    container.innerHTML = `<div class="empty">Chưa có dữ liệu video dài hôm nay.</div>`;
    return;
  }

  const counts = {};
  let totalUsefulSec = 0;

  details.forEach(item => {
    const cat = item.category || "Khác";
    if (!counts[cat]) counts[cat] = { total: 0, useful: 0, watchedSec: 0 };
    counts[cat].total++;
    if (item.isUseful) counts[cat].useful++;
    counts[cat].watchedSec += item.watchedSeconds || 0;
    if (item.isUseful) totalUsefulSec += item.watchedSeconds || 0;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1].total - a[1].total);

  // Dựng DOM an toàn
  container.innerHTML = "";
  sorted.forEach(([cat, stats]) => {
    const pct = stats.total > 0 ? Math.round((stats.useful / stats.total) * 100) : 0;
    const color = pct >= 60 ? "#10B981" : pct >= 30 ? "#F59E0B" : "#EF4444";

    const row = document.createElement("div");
    row.className = "cat-row";

    const leftDiv = document.createElement("div");
    const nameSpan = document.createElement("span");
    nameSpan.style.color = "#F1F5F9";
    nameSpan.textContent = cat;

    const timeSpan = document.createElement("span");
    timeSpan.style.cssText = "color:#64748B; font-size:11px; margin-left:6px;";
    timeSpan.textContent = formatDuration(stats.watchedSec);

    leftDiv.appendChild(nameSpan);
    leftDiv.appendChild(timeSpan);

    const rightDiv = document.createElement("div");
    rightDiv.style.cssText = "display:flex; align-items:center; gap:6px;";

    const pctSpan = document.createElement("span");
    pctSpan.style.cssText = `color:${color}; font-size:12px; font-weight:700;`;
    pctSpan.textContent = `${pct}% hữu ích`;

    const badgeSpan = document.createElement("span");
    badgeSpan.className = "cat-badge";
    badgeSpan.textContent = `${stats.total} video`;

    rightDiv.appendChild(pctSpan);
    rightDiv.appendChild(badgeSpan);

    row.appendChild(leftDiv);
    row.appendChild(rightDiv);
    container.appendChild(row);
  });
}

// ─── Rating Stars ─────────────────────────────────────────────────────────────

function setupRatingStars() {
  const stars = document.querySelectorAll(".star");
  stars.forEach(star => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.getAttribute("data-val"));
      updateStarsUI();
    });
    star.addEventListener("mouseenter", () => {
      const hoverVal = parseInt(star.getAttribute("data-val"));
      stars.forEach(s => {
        s.classList.toggle("active", parseInt(s.getAttribute("data-val")) <= hoverVal);
      });
    });
  });

  const ratingStars = document.getElementById("rating-stars");
  if (ratingStars) {
    ratingStars.addEventListener("mouseleave", updateStarsUI);
  }
}

function updateStarsUI() {
  const stars = document.querySelectorAll(".star");
  stars.forEach(s => {
    s.classList.toggle("active", parseInt(s.getAttribute("data-val")) <= selectedRating);
  });
}

// ─── Load Dữ Liệu Cũ ─────────────────────────────────────────────────────────

function loadExistingReflection(dayData) {
  const ref = dayData.reflection || {};
  if (ref.lesson1) document.getElementById("lesson1").value = ref.lesson1;
  if (ref.lesson2) document.getElementById("lesson2").value = ref.lesson2;
  if (ref.rating) {
    selectedRating = ref.rating;
    updateStarsUI();
  }
}

// ─── 4. AI Reflection Coach (An toàn không innerHTML) ──────────────────────────

function renderAiCoach(coachResult) {
  const statusEl = document.getElementById("ai-coach-status");
  const areaEl = document.getElementById("ai-content-area");
  const feedbackEl = document.getElementById("ai-coach-feedback");
  const remindedSec = document.getElementById("ai-reminded-section");
  const remindedList = document.getElementById("ai-reminded-videos");
  const missionBox = document.getElementById("ai-mission-box");
  const missionEl = document.getElementById("ai-tomorrow-mission");

  if (statusEl) statusEl.style.display = "none";
  if (areaEl) areaEl.style.display = "block";

  if (feedbackEl) {
    let text = coachResult.coachFeedback || "Hãy kiên định với mục tiêu của bạn!";
    if (coachResult.suggestedClassification) {
      text += `\n\n💡 Gợi ý phân loại: ${coachResult.suggestedClassification}`;
    }
    feedbackEl.textContent = text;
  }

  // 2. Video bổ ích được nhắc lại
  if (remindedSec && remindedList) {
    const videos = coachResult.remindedVideos || [];
    remindedList.innerHTML = "";
    if (videos.length > 0) {
      videos.forEach(vTitle => {
        const pill = document.createElement("div");
        pill.className = "ai-video-pill";
        const iconSpan = document.createElement("span");
        iconSpan.textContent = "🎬";
        const titleSpan = document.createElement("span");
        titleSpan.textContent = vTitle;
        pill.appendChild(iconSpan);
        pill.appendChild(titleSpan);
        remindedList.appendChild(pill);
      });
      remindedSec.style.display = "block";
    } else {
      remindedSec.style.display = "none";
    }
  }

  // 3. Sứ mệnh vi mô ngày mai
  if (missionBox && missionEl) {
    if (coachResult.tomorrowMission) {
      missionEl.textContent = coachResult.tomorrowMission;
      missionBox.style.display = "flex";
    } else {
      missionBox.style.display = "none";
    }
  }
}

// ─── 3. Tự Tiến Hóa Bộ Lọc Tĩnh (Suggested Keywords) ─────────────────────────

function renderSuggestedKeywords(suggestions) {
  const container = document.getElementById("suggested-keywords-list");
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "empty";
    emptyDiv.textContent = "Chưa có đề xuất từ khóa mới. Bấm \"Quét Video Chưa Khớp\" để AI phân tích.";
    container.appendChild(emptyDiv);
    return;
  }

  suggestions.forEach(item => {
    const card = document.createElement("div");
    card.className = "kw-card";

    // Cột trái: Từ khóa & Lý do
    const leftDiv = document.createElement("div");
    leftDiv.style.cssText = "display:flex; flex-direction:column; gap:3px;";

    const wordRow = document.createElement("div");
    wordRow.style.cssText = "display:flex; align-items:center; gap:8px;";

    const wordSpan = document.createElement("span");
    wordSpan.style.cssText = "font-weight:700; color:#F8FAFC; font-size:13px;";
    wordSpan.textContent = item.word;

    const confSpan = document.createElement("span");
    confSpan.className = "kw-badge-conf";
    confSpan.textContent = `${item.confidence || 80}% tin cậy`;

    wordRow.appendChild(wordSpan);
    wordRow.appendChild(confSpan);

    const reasonSpan = document.createElement("span");
    reasonSpan.style.cssText = "font-size:11px; color:#94A3B8;";
    reasonSpan.textContent = item.reason || "Xuất hiện trong các video bạn đã xem";

    leftDiv.appendChild(wordRow);
    leftDiv.appendChild(reasonSpan);

    // Cột phải: Các nút hành động
    const rightDiv = document.createElement("div");
    rightDiv.style.cssText = "display:flex; gap:6px;";

    const btnApprove = document.createElement("button");
    btnApprove.className = "btn-kw-action btn-kw-approve";
    btnApprove.textContent = "✓ Thêm vào Bộ lọc";
    btnApprove.addEventListener("click", () => {
      btnApprove.disabled = true;
      btnApprove.textContent = "Đang thêm...";
      chrome.runtime.sendMessage({ type: "APPROVE_KEYWORD", word: item.word }, (res) => {
        if (res && res.ok) {
          card.style.opacity = "0.4";
          card.style.pointerEvents = "none";
          setTimeout(() => {
            renderSuggestedKeywords(res.suggestions || []);
          }, 300);
        }
      });
    });

    const btnDismiss = document.createElement("button");
    btnDismiss.className = "btn-kw-action btn-kw-dismiss";
    btnDismiss.textContent = "✕ Bỏ qua";
    btnDismiss.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "DISMISS_KEYWORD", word: item.word }, (res) => {
        if (res && res.ok) {
          renderSuggestedKeywords(res.suggestions || []);
        }
      });
    });

    rightDiv.appendChild(btnApprove);
    rightDiv.appendChild(btnDismiss);

    card.appendChild(leftDiv);
    card.appendChild(rightDiv);
    container.appendChild(card);
  });
}

function setupEvolveFilterButton() {
  const btn = document.getElementById("btn-trigger-evolve");
  if (!btn) return;

  btn.addEventListener("click", () => {
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "⏳ Đang quét AI...";

    chrome.runtime.sendMessage({ type: "GEMINI_EVOLVE_FILTER" }, (res) => {
      btn.disabled = false;
      btn.textContent = oldText;

      if (res && res.ok) {
        renderSuggestedKeywords(res.suggestions || []);
      } else if (res && res.error) {
        alert(res.error);
      }
    });
  });
}

// ─── 5. Persona & Streak (Long-term) ──────────────────────────────────────────

function renderPersona(persona, petState) {
  const trackedEl = document.getElementById("persona-tracked-days");
  const streakEl = document.getElementById("persona-streak");
  const usefulEl = document.getElementById("persona-avg-useful");

  const streak = petState?.currentStreak ?? petState?.streakDays ?? 0;

  if (trackedEl) trackedEl.textContent = persona?.totalTrackedDays || 1;
  if (streakEl) streakEl.textContent = `${streak} 🔥`;
  if (usefulEl) usefulEl.textContent = `${persona?.avgUsefulPct || 0}%`;
}

// ─── Save & Gọi Gemini Reflection Coach ───────────────────────────────────────

function setupSaveButton() {
  const btn = document.getElementById("btn-save-reflection");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const lesson1 = document.getElementById("lesson1").value.trim();
    const lesson2 = document.getElementById("lesson2").value.trim();

    const reflection = {
      lesson1,
      lesson2,
      rating: selectedRating,
      submittedAt: Date.now()
    };

    // 1. Lưu vào Storage
    chrome.storage.local.get([todayKey, "app_config"], (result) => {
      const existing = result[todayKey] || currentDayData || {};
      existing.reflection = reflection;

      const payload = {};
      payload[todayKey] = existing;

      chrome.storage.local.set(payload, () => {
        const toast = document.getElementById("save-toast");
        if (toast) {
          toast.style.display = "block";
          toast.textContent = "✅ Đã lưu thành công! Đang kết nối Trợ lý AI...";
        }

        // 2. Gọi Trợ lý AI Phản tư Gemini Coach qua Background Service Worker
        btn.disabled = true;
        btn.textContent = "🤖 AI đang phân tích phản tư...";

        const masterGoal = result.app_config?.masterGoal || "Trở thành phiên bản tốt hơn";

        chrome.runtime.sendMessage({
          type: "GEMINI_REFLECT",
          dayData: existing,
          userLessons: { lesson1, lesson2 },
          masterGoal
        }, (res) => {
          btn.disabled = false;
          btn.textContent = "💾 Lưu Nhật Ký Phản Tư & Nhận Phản Hồi AI";

          if (res && res.coachResult) {
            renderAiCoach(res.coachResult);
          }
          if (res && res.persona) {
            chrome.storage.local.get(["pet_state"], (pRes) => {
              renderPersona(res.persona, pRes.pet_state);
            });
          }
          if (toast) {
            toast.textContent = "✅ Đã nhận phản hồi từ AI Coach! Chúc bạn ngủ ngon! 🌟";
            setTimeout(() => { toast.style.display = "none"; }, 5000);
          }
        });
      });
    });
  });
}

// ─── Khởi chạy trang Reflection ───────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const dateBadge = document.getElementById("today-date");
  if (dateBadge) dateBadge.textContent = todayKey;

  setupRatingStars();
  updateStarsUI();
  setupSaveButton();
  setupEvolveFilterButton();

  // Nạp toàn bộ dữ liệu ngày, đề xuất từ khóa, persona và pet state
  chrome.storage.local.get([
    todayKey,
    "suggested_keywords",
    "user_persona",
    "petState",
    "pet_state"
  ], (res) => {
    const dayData = res[todayKey] || {};
    renderStats(dayData);
    loadExistingReflection(dayData);

    renderSuggestedKeywords(res.suggested_keywords || []);
    renderPersona(res.user_persona, res.petState || res.pet_state);
  });
});

// Lắng nghe thay đổi real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes[todayKey]) {
      renderStats(changes[todayKey].newValue || {});
    }
    if (changes.suggested_keywords) {
      renderSuggestedKeywords(changes.suggested_keywords.newValue || []);
    }
    if (changes.user_persona || changes.petState || changes.pet_state) {
      chrome.storage.local.get(["user_persona", "petState", "pet_state"], (res) => {
        renderPersona(res.user_persona, res.petState || res.pet_state);
      });
    }
  }
});
