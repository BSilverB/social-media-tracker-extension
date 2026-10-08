/**
 * Mindful Social Media Tracker - Reflection Page Controller (Giai đoạn 3 & 4)
 * Quản lý: Thống kê ngày, Bài học phản tư, Trợ lý AI Gemini Coach,
 * Tự tiến hóa từ khóa bộ lọc tĩnh, Linh vật Pet & Hồ sơ kiên trì đường dài.
 */

import { normalizeCategory, cycleCategory } from "../content/modules/keyword-filter.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `stats_${year}-${month}-${day}`;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeHHmm(timestamp) {
  if (!timestamp) return "--:--";
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
  const ytShort = data.youtube?.shorts || data.youtube?.shortVideos || { totalSwipes: 0 };
  const fbReels = data.facebook?.reels || { totalSwipes: 0 };

  const totalActive = (ytSummary.activeSeconds ?? ytSummary.activeTimeSeconds ?? 0) + (fbSummary.activeSeconds ?? fbSummary.activeTimeSeconds ?? 0);
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

  // Phân loại nội dung từ watchedVideos
  const watchedVideos = Array.isArray(data.watchedVideos) ? data.watchedVideos : [];
  renderCategories(watchedVideos);
  renderAuditLog(data);
}

function renderCategories(details) {
  const container = document.getElementById("categories-list");
  if (!container) return;

  if (!details || details.length === 0) {
    container.innerHTML = `<div class="empty">Chưa có dữ liệu video hôm nay.</div>`;
    return;
  }

  const counts = {};
  let totalUsefulSec = 0;

  details.forEach(item => {
    const rawCat = item.category || "Chưa rõ";
    const cat = normalizeCategory(rawCat);
    if (!counts[cat]) counts[cat] = { total: 0, useful: 0, watchedSec: 0 };
    counts[cat].total++;
    const isUseful = cat === "Mục tiêu" || item.isUseful || (item.completionPct && item.completionPct >= 80);
    if (isUseful) counts[cat].useful++;
    counts[cat].watchedSec += item.durationSeconds || item.watchedSeconds || 0;
    if (isUseful) totalUsefulSec += item.durationSeconds || item.watchedSeconds || 0;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1].total - a[1].total);

  // Dựng DOM an toàn
  container.innerHTML = "";
  sorted.forEach(([cat, stats]) => {
    const pct = stats.total > 0 ? Math.round((stats.useful / stats.total) * 100) : 0;
    const color = cat === "Mục tiêu" ? "#10B981" : cat === "Giải trí" ? "#F59E0B" : cat === "Lạc lối" ? "#EF4444" : "#94A3B8";

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

// ─── Nhật Ký Nội Dung Hôm Nay (Watch Audit Log) ──────────────────────────────

let currentAuditFilter = "all";
let currentTargetVideoForPopover = null;
let currentDayCachedData = null;

function setupReflectionAuditFilterTabs() {
  const filterBar = document.getElementById("audit-filter-bar");
  if (!filterBar) return;

  filterBar.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".audit-filter-tab");
    if (!tabBtn) return;

    currentAuditFilter = tabBtn.getAttribute("data-filter") || "all";
    filterBar.querySelectorAll(".audit-filter-tab").forEach(b => b.classList.remove("active"));
    tabBtn.classList.add("active");

    if (currentDayCachedData) {
      renderAuditVideosList(currentDayCachedData);
    }
  });
}

function setupReflectionCategoryPopover() {
  const popover = document.getElementById("reflection-category-popover");
  if (!popover) return;

  popover.addEventListener("click", (e) => {
    const item = e.target.closest(".popover-item");
    if (!item || !currentTargetVideoForPopover) return;

    const newCat = item.getAttribute("data-cat");
    const vid = currentTargetVideoForPopover;
    vid.category = newCat;
    vid.userOverridden = true;

    chrome.storage.local.get([todayKey], (res) => {
      const storedDay = res[todayKey] || currentDayCachedData || {};
      if (Array.isArray(storedDay.watchedVideos)) {
        const target = storedDay.watchedVideos.find(v => v.id === vid.id || (v.title === vid.title && v.timestamp === vid.timestamp));
        if (target) {
          target.category = newCat;
          target.userOverridden = true;
        }
      }
      chrome.storage.local.set({ [todayKey]: storedDay }, () => {
        closeReflectionCategoryPopover();
        renderAuditLog(storedDay);
        renderCategories(storedDay.watchedVideos || []);
      });
    });
  });

  document.addEventListener("click", (e) => {
    if (!popover.contains(e.target) && !e.target.closest(".audit-badge")) {
      closeReflectionCategoryPopover();
    }
  });
}

function openReflectionCategoryPopover(badgeEl, vid) {
  const popover = document.getElementById("reflection-category-popover");
  if (!popover) return;

  currentTargetVideoForPopover = vid;
  const rect = badgeEl.getBoundingClientRect();

  popover.style.display = "block";
  const topPos = rect.bottom + window.scrollY + 4;
  const leftPos = Math.max(10, Math.min(window.innerWidth - 130, rect.right - 120 + window.scrollX));

  popover.style.top = `${topPos}px`;
  popover.style.left = `${leftPos}px`;
}

function closeReflectionCategoryPopover() {
  const popover = document.getElementById("reflection-category-popover");
  if (popover) popover.style.display = "none";
  currentTargetVideoForPopover = null;
}

function renderAuditLog(data) {
  currentDayCachedData = data;
  const rawVideos = Array.isArray(data.watchedVideos) ? data.watchedVideos : [];

  // Phân loại video xem sâu (>80% thời lượng hoặc >= 180s hoặc Shorts/Reels >= 2s)
  const deepVideos = rawVideos.filter(v => {
    if (v.contentType === "shorts" || v.contentType === "reels") {
      return (v.watchedSeconds || 0) >= 2;
    }
    return v.isCompletion || (v.watchedSeconds || 0) >= 180 || !v.isImpulsive;
  });

  // Đếm lướt bốc đồng tổng hợp (< 2s)
  const ytImpulsive = data.youtube?.shorts?.impulsiveCount || 0;
  const fbImpulsive = data.facebook?.reels?.impulsiveCount || 0;
  const ttImpulsive = data.tiktok?.shorts?.impulsiveCount || 0;
  const ytLongImp = data.youtube?.longVideos?.impulsiveCount || 0;
  const fbLongImp = data.facebook?.longVideos?.impulsiveCount || 0;
  const videoImpCount = rawVideos.filter(v => v.isImpulsive || (v.watchedSeconds || 0) < 2).length;
  const totalImpulsive = Math.max(ytImpulsive + fbImpulsive + ttImpulsive + ytLongImp + fbLongImp, videoImpCount);

  // Đếm theo 4 nhãn chuẩn
  let countGoal = 0;
  let countLeisure = 0;
  let countDistraction = 0;
  let countUnclassified = 0;

  deepVideos.forEach(v => {
    const cat = normalizeCategory(v.category);
    if (cat === "Mục tiêu") countGoal++;
    else if (cat === "Giải trí") countLeisure++;
    else if (cat === "Lạc lối") countDistraction++;
    else countUnclassified++;
  });

  // Cập nhật DOM các bộ đếm
  const deepCountEl = document.getElementById("audit-deep-count");
  const impulsiveCountEl = document.getElementById("audit-impulsive-count");
  const tabAllCount = document.getElementById("audit-tab-all-count");
  const goalEl = document.getElementById("audit-count-goal");
  const leisureEl = document.getElementById("audit-count-leisure");
  const distEl = document.getElementById("audit-count-distraction");
  const unclassEl = document.getElementById("audit-count-unclassified");
  const noticeBox = document.getElementById("audit-impulsive-notice");
  const noticeText = document.getElementById("audit-impulsive-text");

  if (deepCountEl) deepCountEl.textContent = deepVideos.length;
  if (impulsiveCountEl) impulsiveCountEl.textContent = totalImpulsive;
  if (tabAllCount) tabAllCount.textContent = deepVideos.length;
  if (goalEl) goalEl.textContent = countGoal;
  if (leisureEl) leisureEl.textContent = countLeisure;
  if (distEl) distEl.textContent = countDistraction;
  if (unclassEl) unclassEl.textContent = countUnclassified;

  if (noticeBox && noticeText) {
    if (totalImpulsive > 0) {
      noticeText.textContent = totalImpulsive;
      noticeBox.style.display = "flex";
    } else {
      noticeBox.style.display = "none";
    }
  }

  renderAuditVideosList(data);
}

function renderAuditVideosList(data) {
  const container = document.getElementById("audit-videos-list");
  if (!container) return;

  const rawVideos = Array.isArray(data.watchedVideos) ? data.watchedVideos : [];
  const deepVideos = rawVideos.filter(v => {
    if (v.contentType === "shorts" || v.contentType === "reels") {
      return (v.watchedSeconds || 0) >= 2;
    }
    return v.isCompletion || (v.watchedSeconds || 0) >= 180 || !v.isImpulsive;
  });

  // Lọc theo Tab đang chọn
  const filtered = deepVideos.filter(v => {
    if (currentAuditFilter === "all") return true;
    return normalizeCategory(v.category) === currentAuditFilter;
  });

  if (filtered.length === 0) {
    const emptyMsg = currentAuditFilter === "all"
      ? "Chưa có video xem sâu nào được ghi nhận hôm nay."
      : `Không có video nào thuộc nhóm "${currentAuditFilter}".`;
    container.innerHTML = `<div class="empty">${emptyMsg}</div>`;
    return;
  }

  container.innerHTML = "";
  filtered.forEach(vid => {
    const normCat = normalizeCategory(vid.category);
    let badgeClass = "audit-badge-unclassified";
    let badgeIcon = "⏳";
    if (normCat === "Mục tiêu") { badgeClass = "audit-badge-goal"; badgeIcon = "🎯"; }
    else if (normCat === "Giải trí") { badgeClass = "audit-badge-leisure"; badgeIcon = "☕"; }
    else if (normCat === "Lạc lối") { badgeClass = "audit-badge-distraction"; badgeIcon = "🌀"; }

    const itemEl = document.createElement("div");
    itemEl.className = "audit-item";

    const leftEl = document.createElement("div");
    leftEl.className = "audit-item-left";

    const timeEl = document.createElement("span");
    timeEl.className = "audit-item-time";
    timeEl.textContent = formatTimeHHmm(vid.timestamp);

    const titleEl = document.createElement("span");
    titleEl.className = "audit-item-title";
    titleEl.textContent = vid.title || "Không rõ tiêu đề";
    titleEl.title = `${vid.title || ""} (${vid.channel || ""})`;

    leftEl.appendChild(timeEl);
    leftEl.appendChild(titleEl);

    const rightEl = document.createElement("div");
    rightEl.className = "audit-item-right";

    // Badge phân loại - Bấm hiện Popover chọn nhanh
    const badgeEl = document.createElement("span");
    badgeEl.className = `audit-badge ${badgeClass}`;
    badgeEl.textContent = `${badgeIcon} ${normCat} ▾`;
    badgeEl.title = "Bấm để chọn phân loại nội dung";

    badgeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      openReflectionCategoryPopover(badgeEl, vid);
    });

    const durEl = document.createElement("span");
    durEl.className = "audit-item-dur";
    const watchedSec = vid.watchedSeconds || 0;
    const durSec = vid.durationSeconds || 0;
    if (durSec > 0 && durSec > watchedSec) {
      durEl.textContent = `${formatDuration(watchedSec)} / ${formatDuration(durSec)}`;
    } else {
      durEl.textContent = formatDuration(watchedSec);
    }

    rightEl.appendChild(badgeEl);
    rightEl.appendChild(durEl);

    itemEl.appendChild(leftEl);
    itemEl.appendChild(rightEl);
    container.appendChild(itemEl);
  });
}

function setupAuditLogToggle() {
  const toggleBtn = document.getElementById("audit-log-toggle");
  const body = document.getElementById("audit-log-body");
  const arrow = document.getElementById("audit-log-arrow");
  if (!toggleBtn || !body) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "block" : "none";
    if (arrow) {
      arrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
    }
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
      existing.reflection = Object.assign(existing.reflection || {}, reflection);

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
  if (dateBadge) dateBadge.textContent = todayKey.replace("stats_", "");

  setupRatingStars();
  updateStarsUI();
  setupSaveButton();
  setupEvolveFilterButton();
  setupAuditLogToggle();
  setupReflectionAuditFilterTabs();
  setupReflectionCategoryPopover();

  // Nạp toàn bộ dữ liệu ngày, đề xuất từ khóa, persona và pet state
  chrome.storage.local.get([
    todayKey,
    "app_config",
    "pet_state"
  ], (res) => {
    const dayData = res[todayKey] || {};
    const appConfig = res.app_config || {};
    const petState = res.pet_state || {};
    renderStats(dayData);
    loadExistingReflection(dayData);

    renderSuggestedKeywords(appConfig.suggestedKeywords || []);
    renderPersona(petState.userPersona, petState);
  });
});

// Lắng nghe thay đổi real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes[todayKey]) {
      renderStats(changes[todayKey].newValue || {});
    }
    if (changes.app_config) {
      renderSuggestedKeywords(changes.app_config.newValue?.suggestedKeywords || []);
    }
    if (changes.pet_state) {
      const pet = changes.pet_state.newValue || {};
      renderPersona(pet.userPersona, pet);
    }
  }
});
