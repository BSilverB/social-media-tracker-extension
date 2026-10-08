/**
 * Mindful Social Media Tracker - Popup Dashboard Controller
 */

import {
  getFirebaseSyncSettings,
  saveFirebaseSyncSettings,
  testFirebaseConnection,
  pushConfigToFirebase
} from "./src/utils/firebase-service.js";

import {
  normalizeCategory,
  cycleCategory,
  CATEGORY_OPTIONS,
  DEFAULT_TARGET_KEYWORDS,
  DEFAULT_LEISURE_KEYWORDS,
  DEFAULT_DISTRACTION_KEYWORDS
} from "./src/content/modules/keyword-filter.js";

// Lấy ngày hiện tại theo giờ địa phương dạng stats_YYYY-MM-DD
function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `stats_${year}-${month}-${day}`;
}

// Chuyển timestamp sang định dạng HH:mm
function formatTimeHHmm(ts) {
  if (!ts) return "--:--";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Chuyển đổi giây sang định dạng giờ phút giây thân thiện
function formatDuration(seconds) {
  const sec = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Chuyển Tab (YouTube / Facebook / Tổng quan / Cài đặt)
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => (p.style.display = "none"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.style.display = "block";
    });
  });
}

// Helper cập nhật thanh tiến trình đa phân đoạn M1, M2, M3
function updateMilestoneProgress(barId, textId, marks, current, m1, m2, m3, unit) {
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  if (marks.m1) { const el = document.getElementById(marks.m1); if (el) el.innerText = `M1: ${m1}`; }
  if (marks.m2) { const el = document.getElementById(marks.m2); if (el) el.innerText = `M2: ${m2}`; }
  if (marks.m3) { const el = document.getElementById(marks.m3); if (el) el.innerText = `M3: ${m3}`; }

  const max = m3 * 1.15;
  const pct = Math.min(100, Math.round((current / max) * 100));
  if (bar) {
    bar.style.width = `${pct}%`;
    if (current < m1) {
      bar.style.background = "linear-gradient(90deg, #10B981, #059669)";
    } else if (current < m2) {
      bar.style.background = "linear-gradient(90deg, #F59E0B, #D97706)";
    } else if (current < m3) {
      bar.style.background = "linear-gradient(90deg, #F97316, #EA580C)";
    } else {
      bar.style.background = "linear-gradient(90deg, #EF4444, #DC2626)";
    }
  }

  if (text) {
    let status = "An toàn";
    let color = "#10B981";
    if (current >= m3) {
      status = "Trần đỏ M3";
      color = "#EF4444";
    } else if (current >= m2) {
      status = "Cảnh báo M2";
      color = "#F97316";
    } else if (current >= m1) {
      status = "Nhắc nhở M1";
      color = "#F59E0B";
    }
    text.innerHTML = `<b>${current}</b> / ${m1} ${unit} <span style="color:${color}; font-weight:700;">(${status})</span>`;
  }
}

// Cập nhật toàn bộ giao diện từ Storage
function updateDashboard() {
  const todayKey = getTodayKey();
  const todayBadge = document.getElementById("today-badge");
  if (todayBadge) todayBadge.innerText = todayKey;

  chrome.storage.local.get([todayKey, "app_config"], (result) => {
    const data = result[todayKey] || {};
    const thresh = result.app_config?.thresholds || {};

    const ytShortsThresh = thresh.youtube?.shorts || { m1: 15, m2: 30, m3: 45 };
    const ytLongThresh = thresh.youtube?.long || { m1: 3, m2: 5, m3: 8 };
    const fbFeedsThresh = thresh.facebook?.feeds || { m1: 20, m2: 40, m3: 60 };
    const fbReelsThresh = thresh.facebook?.reels || { m1: 15, m2: 30, m3: 45 };

    const ytSummary = data.youtube?.summary || { activeSeconds: 0, passiveSeconds: 0, reloadCount: 0 };
    const ytShorts = data.youtube?.shorts || { totalSwipes: 0, validViews: 0, loopViews: 0 };
    const ytLong = data.youtube?.longVideos || { totalWatched: 0, usefulCount: 0, impulsiveCount: 0 };
    const ytMusic = data.youtube?.musicVideos || { totalWatched: 0, durationSeconds: 0 };

    const fbSummary = data.facebook?.summary || { activeSeconds: 0, passiveSeconds: 0, reloadCount: 0 };
    const fbFeed = data.facebook?.feed || { feedPostsScrolled: 0, feedPostsRead: 0 };
    const fbReels = data.facebook?.reels || { totalSwipes: 0, validViews: 0, loopViews: 0 };

    // --- 1. RENDER YOUTUBE PANEL ---
    const ytActive = ytSummary.activeSeconds || 0;
    const ytPassive = ytSummary.passiveSeconds || 0;
    const ytTotalTime = ytActive + ytPassive;
    const ytActiveRatio = ytTotalTime > 0 ? Math.round((ytActive / ytTotalTime) * 100) : 0;

    document.getElementById("yt-active-time").innerText = formatDuration(ytActive);
    document.getElementById("yt-passive-time").innerText = formatDuration(ytPassive);
    document.getElementById("yt-ratio-bar").style.width = `${ytActiveRatio}%`;
    document.getElementById("yt-reload-badge").innerText = `F5/Home: ${ytSummary.reloadCount || 0}`;

    // Shorts
    const ytShortsTotal = ytShorts.totalSwipes || 0;
    document.getElementById("yt-shorts-swipes").innerText = ytShortsTotal;
    document.getElementById("yt-shorts-valid").innerText = ytShorts.validViews || 0;
    document.getElementById("yt-shorts-loops").innerText = ytShorts.loopViews || 0;

    updateMilestoneProgress(
      "yt-shorts-milestone-bar",
      "yt-shorts-milestone-text",
      { m1: "yt-shorts-m1-mark", m2: "yt-shorts-m2-mark", m3: "yt-shorts-m3-mark" },
      ytShortsTotal,
      ytShortsThresh.m1,
      ytShortsThresh.m2,
      ytShortsThresh.m3,
      "lượt"
    );

    // Long Videos
    const ytLongTotal = ytLong.totalWatched || 0;
    const ytImpulsive = ytLong.impulsiveCount || 0;
    const ytImpulsiveRate = ytLongTotal > 0 ? Math.round((ytImpulsive / ytLongTotal) * 100) : 0;

    document.getElementById("yt-long-total").innerText = ytLongTotal;
    document.getElementById("yt-long-impulsive").innerText = ytImpulsive;
    document.getElementById("yt-impulsive-rate-badge").innerText = `Lướt vội: ${ytImpulsiveRate}%`;

    updateMilestoneProgress(
      "yt-long-milestone-bar",
      "yt-long-milestone-text",
      { m1: "yt-long-m1-mark", m2: "yt-long-m2-mark", m3: "yt-long-m3-mark" },
      ytLongTotal,
      ytLongThresh.m1,
      ytLongThresh.m2,
      ytLongThresh.m3,
      "video"
    );

    // Nhạc tập trung (Music Focus)
    const ytMusicCount = document.getElementById("yt-music-count");
    const ytMusicTime = document.getElementById("yt-music-time");
    if (ytMusicCount) ytMusicCount.innerText = ytMusic.totalWatched || 0;
    if (ytMusicTime) ytMusicTime.innerText = formatDuration(ytMusic.durationSeconds || 0);

    // Danh sách Video dài gần đây
    renderRecentVideos(data.watchedVideos || []);

    // Phân loại danh mục
    renderCategories(data.watchedVideos || []);

    // --- 2. RENDER FACEBOOK PANEL ---
    const fbActive = fbSummary.activeSeconds || 0;
    const fbPassive = fbSummary.passiveSeconds || 0;
    const fbTotalTime = fbActive + fbPassive;
    const fbActiveRatio = fbTotalTime > 0 ? Math.round((fbActive / fbTotalTime) * 100) : 0;

    document.getElementById("fb-active-time").innerText = formatDuration(fbActive);
    document.getElementById("fb-passive-time").innerText = formatDuration(fbPassive);
    document.getElementById("fb-ratio-bar").style.width = `${fbActiveRatio}%`;
    document.getElementById("fb-reload-badge").innerText = `F5/Home: ${fbSummary.reloadCount || 0}`;

    const fbFeedCount = fbFeed.feedPostsScrolled || 0;
    document.getElementById("fb-feed-scrolled").innerText = fbFeedCount;
    document.getElementById("fb-reloads").innerText = fbSummary.reloadCount || 0;

    updateMilestoneProgress(
      "fb-feed-milestone-bar",
      "fb-feed-milestone-text",
      { m1: "fb-feed-m1-mark", m2: "fb-feed-m2-mark", m3: "fb-feed-m3-mark" },
      fbFeedCount,
      fbFeedsThresh.m1,
      fbFeedsThresh.m2,
      fbFeedsThresh.m3,
      "bài"
    );

    const fbReelsTotal = fbReels.totalSwipes || 0;
    document.getElementById("fb-reels-swipes").innerText = fbReelsTotal;
    document.getElementById("fb-reels-valid").innerText = fbReels.validViews || 0;
    document.getElementById("fb-reels-loops").innerText = fbReels.loopViews || 0;

    updateMilestoneProgress(
      "fb-reels-milestone-bar",
      "fb-reels-milestone-text",
      { m1: "fb-reels-m1-mark", m2: "fb-reels-m2-mark", m3: "fb-reels-m3-mark" },
      fbReelsTotal,
      fbReelsThresh.m1,
      fbReelsThresh.m2,
      fbReelsThresh.m3,
      "lượt"
    );

    // --- 3. RENDER TỔNG QUAN PANEL ---
    const ttSummary = data.tiktok?.summary || { activeSeconds: 0, passiveSeconds: 0, reloadCount: 0 };
    const ttShorts = data.tiktok?.shorts || { totalSwipes: 0, loopViews: 0 };
    const ttActive = ttSummary.activeSeconds || 0;
    const ttSwipes = ttShorts.totalSwipes || 0;
    const ttLoops = ttShorts.loopViews || 0;

    const totalActive = ytActive + fbActive + ttActive;
    const totalReloads = (ytSummary.reloadCount || 0) + (fbSummary.reloadCount || 0) + (ttSummary.reloadCount || 0);
    const totalSwipes = ytShortsTotal + fbReelsTotal + ttSwipes;
    const totalLoops = (ytShorts.loopViews || 0) + (fbReels.loopViews || 0) + ttLoops;

    document.getElementById("total-active-time").innerText = formatDuration(totalActive);
    document.getElementById("total-reloads").innerText = totalReloads;
    document.getElementById("total-swipes-all").innerText = totalSwipes;
    document.getElementById("total-loops-all").innerText = totalLoops;

    // Cập nhật Nhật ký nội dung hôm nay (Watch Audit Log) trong tab Tổng quan
    renderPopupAuditLog(data);

    // Cập nhật tóm tắt xu hướng 7 ngày trong tab Tổng quan & Báo Cáo
    updatePopupWeeklyReport();
  });
}

// Cập nhật Báo cáo Xu hướng 7 Ngày (Tuần Này) trong Popup
function updatePopupWeeklyReport() {
  chrome.storage.local.get(null, (items) => {
    const all = items || {};
    const dateKeyRegex = /^stats_\d{4}-\d{2}-\d{2}$/;
    const dates = [];
    for (const k of Object.keys(all)) {
      if (dateKeyRegex.test(k)) dates.push(k.replace("stats_", ""));
    }
    dates.sort(); // Cũ -> mới

    if (dates.length === 0) dates.push(new Date().toISOString().slice(0, 10));

    const recent7Dates = dates.slice(-7);
    const prev7Dates = dates.length > 7 ? dates.slice(-14, -7) : [];

    const summarize = (dateList) => {
      let swipes = 0, reloads = 0, skips = 0, totalEncounters = 0;
      let goalSec = 0, totalSec = 0;
      for (const dStr of dateList) {
        const val = all[`stats_${dStr}`];
        if (!val) continue;
        const yt = val.youtube || {};
        const fb = val.facebook || {};
        const tk = val.tiktok || {};

        const ytSwipes = yt.shorts?.totalSwipes || 0;
        const ytReloads = yt.summary?.reloadCount || 0;
        const ytSkips = (yt.shorts?.impulsiveCount || 0) + (yt.longVideos?.impulsiveCount || 0);

        const fbSwipes = (fb.reels?.totalSwipes || 0) + (fb.feed?.feedPostsScrolled || 0);
        const fbReloads = fb.summary?.reloadCount || 0;
        const fbSkips = (fb.reels?.impulsiveCount || 0) + (fb.longVideos?.impulsiveCount || 0);

        const tkSwipes = tk.shorts?.totalSwipes || 0;
        const tkReloads = tk.summary?.reloadCount || 0;

        const daySwipes = ytSwipes + fbSwipes + tkSwipes;
        swipes += daySwipes;
        reloads += ytReloads + fbReloads + tkReloads;
        skips += ytSkips + fbSkips;
        totalEncounters += daySwipes + (yt.longVideos?.totalWatched || 0) + (fb.longVideos?.totalWatched || 0);

        const activeSec = (yt.summary?.activeSeconds || 0) + (fb.summary?.activeSeconds || 0) + (tk.summary?.activeSeconds || 0);
        totalSec += activeSec;

        const watched = Array.isArray(val.watchedVideos) ? val.watchedVideos : [];
        for (const w of watched) {
          if (w.category === "goal") goalSec += (w.watchedSeconds || 60);
        }
        if (watched.length === 0) {
          goalSec += (yt.longVideos?.usefulCount || 0) * 300;
        }
      }
      const skipPct = totalEncounters > 0 ? Math.round((skips / totalEncounters) * 100) : 0;
      const goalPct = totalSec > 0 ? Math.min(100, Math.round((goalSec / totalSec) * 100)) : 0;
      return { swipes, reloads, skipPct, goalPct };
    };

    const curr = summarize(recent7Dates);
    const prev = prev7Dates.length > 0 ? summarize(prev7Dates) : null;

    const elSwipes = document.getElementById("popup-weekly-swipes");
    const elSwipesDelta = document.getElementById("popup-weekly-swipes-delta");
    const elGoalPct = document.getElementById("popup-weekly-goal-pct");
    const elSkipPct = document.getElementById("popup-weekly-skip-pct");
    const elDeltaBadge = document.getElementById("popup-weekly-delta-badge");
    const elCoachSnippet = document.getElementById("popup-weekly-coach-snippet");

    if (elSwipes) elSwipes.innerText = curr.swipes.toLocaleString();
    if (elGoalPct) elGoalPct.innerText = `${curr.goalPct}%`;
    if (elSkipPct) elSkipPct.innerText = `${curr.skipPct}%`;

    if (prev) {
      const swipeDelta = Math.round(((curr.swipes - prev.swipes) / Math.max(1, prev.swipes)) * 100);
      const isGood = swipeDelta <= 0;
      if (elSwipesDelta) {
        elSwipesDelta.innerText = `${swipeDelta > 0 ? "+" : ""}${swipeDelta}%`;
        elSwipesDelta.style.color = isGood ? "#34D399" : "#F87171";
      }
      if (elDeltaBadge) {
        elDeltaBadge.innerText = `${swipeDelta <= 0 ? "Giảm" : "Tăng"} ${Math.abs(swipeDelta)}% Swipes`;
        elDeltaBadge.style.color = isGood ? "#34D399" : "#F87171";
        elDeltaBadge.style.background = isGood ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)";
      }
      if (elCoachSnippet) {
        elCoachSnippet.innerText = isGood
          ? `Bạn đã giảm được ${Math.abs(swipeDelta)}% lượt lướt so với tuần trước. Cán cân năng lượng đang nghiêng về nội dung Mục tiêu!`
          : `Tuần này số lượt lướt tăng ${swipeDelta}%. Hãy duy trì bài tập thở Box Breathing và hạn mức Pomodoro!`;
      }
    } else {
      if (elSwipesDelta) elSwipesDelta.innerText = "--";
      if (elDeltaBadge) elDeltaBadge.innerText = "Tuần khởi đầu";
      if (elCoachSnippet) {
        elCoachSnippet.innerText = `Đang theo dõi 7 ngày. Hãy duy trì chánh niệm và hạn chế lướt vô thức để giữ năng lượng cho Linh vật!`;
      }
    }
  });
}

// Render các video xem gần đây
function renderRecentVideos(details) {
  const container = document.getElementById("yt-recent-long-list");
  if (!container) return;

  if (!details || details.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:#64748B; text-align:center; padding:8px 0;">Chưa có video dài nào được ghi nhận hôm nay.</div>`;
    return;
  }

  // Lấy tối đa 4 video gần nhất
  const recent = details.slice(0, 4);
  container.innerHTML = recent
    .map((vid) => {
      const impulsiveTag = vid.isImpulsive
        ? `<span class="badge-warn" style="font-size:9px;">Lướt vô thức (&lt;15%)</span>`
        : `<span class="badge-info" style="font-size:9px; background:rgba(16,185,129,0.15); color:#10B981;">Đã xem sâu</span>`;

      return `
        <div class="recent-item">
          <div class="recent-title" title="${vid.title}">${vid.title}</div>
          <div class="recent-meta">
            <span>⏱ ${formatDuration(vid.watchedSeconds)} / ${formatDuration(vid.durationSeconds)}</span>
            <span><span class="badge-cat">${vid.category || "Khác"}</span> ${impulsiveTag}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// Render phân bổ danh mục nội dung (4 nhóm chuẩn: Mục tiêu, Giải trí, Lạc lối, Chưa rõ)
function renderCategories(details) {
  const container = document.getElementById("yt-categories-list");
  if (!container) return;

  if (!details || details.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:#64748B; text-align:center; padding:6px 0;">Chưa có dữ liệu phân loại.</div>`;
    return;
  }

  const counts = { "Mục tiêu": 0, "Giải trí": 0, "Lạc lối": 0, "Chưa rõ": 0 };
  details.forEach((item) => {
    const cat = normalizeCategory(item.category);
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const sorted = Object.entries(counts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:#64748B; text-align:center; padding:6px 0;">Chưa có dữ liệu phân loại.</div>`;
    return;
  }

  container.innerHTML = sorted
    .map(
      ([cat, count]) => `
      <div class="cat-item">
        <span>${cat}</span>
        <span class="cat-count">${count} video</span>
      </div>
    `
    )
    .join("");
}

// ─── Nhật Ký Nội Dung Hôm Nay (Popup Watch Audit Log) ─────────────────────────

let currentAuditFilter = "all";
let currentTargetVideoForPopover = null;
let currentDayCachedData = null;

function setupPopupAuditFilterTabs() {
  const filterBar = document.getElementById("popup-audit-filter-bar");
  if (!filterBar) return;

  filterBar.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".audit-filter-tab");
    if (!tabBtn) return;

    currentAuditFilter = tabBtn.getAttribute("data-filter") || "all";
    filterBar.querySelectorAll(".audit-filter-tab").forEach(b => b.classList.remove("active"));
    tabBtn.classList.add("active");

    if (currentDayCachedData) {
      renderPopupAuditVideosList(currentDayCachedData);
    }
  });
}

function setupCategoryPopover() {
  const popover = document.getElementById("category-picker-popover");
  if (!popover) return;

  // Xử lý chọn nhãn từ Popover
  popover.addEventListener("click", (e) => {
    const item = e.target.closest(".popover-item");
    if (!item || !currentTargetVideoForPopover) return;

    const newCat = item.getAttribute("data-cat");
    const vid = currentTargetVideoForPopover;
    vid.category = newCat;
    vid.userOverridden = true;

    const todayKey = getTodayKey();
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
        closeCategoryPopover();
        renderPopupAuditLog(storedDay);
        renderCategories(storedDay.watchedVideos || []);
      });
    });
  });

  // Đóng popover khi bấm ra ngoài
  document.addEventListener("click", (e) => {
    if (!popover.contains(e.target) && !e.target.closest(".popup-audit-badge")) {
      closeCategoryPopover();
    }
  });
}

function openCategoryPopover(badgeEl, vid) {
  const popover = document.getElementById("category-picker-popover");
  if (!popover) return;

  currentTargetVideoForPopover = vid;
  const rect = badgeEl.getBoundingClientRect();

  popover.style.display = "block";
  // Căn chỉnh vị trí popover ngay bên dưới/trên badge
  const topPos = rect.bottom + window.scrollY + 4;
  const leftPos = Math.max(10, Math.min(window.innerWidth - 130, rect.right - 110 + window.scrollX));

  popover.style.top = `${topPos}px`;
  popover.style.left = `${leftPos}px`;
}

function closeCategoryPopover() {
  const popover = document.getElementById("category-picker-popover");
  if (popover) popover.style.display = "none";
  currentTargetVideoForPopover = null;
}

function renderPopupAuditLog(data) {
  currentDayCachedData = data;
  const rawVideos = Array.isArray(data.watchedVideos) ? data.watchedVideos : [];

  // Lọc video xem sâu (Shorts/Reels >= 2s hoặc video dài không impulsive / completion / >= 180s)
  const deepVideos = rawVideos.filter(v => {
    if (v.contentType === "shorts" || v.contentType === "reels") {
      return (v.watchedSeconds || 0) >= 2;
    }
    return v.isCompletion || (v.watchedSeconds || 0) >= 180 || !v.isImpulsive;
  });

  const ytImpulsive = data.youtube?.shorts?.impulsiveCount || 0;
  const fbImpulsive = data.facebook?.reels?.impulsiveCount || 0;
  const ttImpulsive = data.tiktok?.shorts?.impulsiveCount || 0;
  const ytLongImp = data.youtube?.longVideos?.impulsiveCount || 0;
  const fbLongImp = data.facebook?.longVideos?.impulsiveCount || 0;
  const videoImpCount = rawVideos.filter(v => v.isImpulsive || (v.watchedSeconds || 0) < 2).length;
  const totalImpulsive = Math.max(ytImpulsive + fbImpulsive + ttImpulsive + ytLongImp + fbLongImp, videoImpCount);

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

  const deepCountEl = document.getElementById("popup-audit-deep-count");
  const impulsiveCountEl = document.getElementById("popup-audit-impulsive-count");
  const tabAllCount = document.getElementById("popup-audit-tab-all-count");
  const goalEl = document.getElementById("popup-audit-count-goal");
  const leisureEl = document.getElementById("popup-audit-count-leisure");
  const distEl = document.getElementById("popup-audit-count-distraction");
  const unclassEl = document.getElementById("popup-audit-count-unclassified");
  const noticeBox = document.getElementById("popup-audit-impulsive-banner");
  const noticeText = document.getElementById("popup-audit-impulsive-text");

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

  renderPopupAuditVideosList(data);
}

function renderPopupAuditVideosList(data) {
  const container = document.getElementById("popup-audit-videos-list");
  if (!container) return;

  const rawVideos = Array.isArray(data.watchedVideos) ? data.watchedVideos : [];
  const deepVideos = rawVideos.filter(v => {
    if (v.contentType === "shorts" || v.contentType === "reels") {
      return (v.watchedSeconds || 0) >= 2;
    }
    return v.isCompletion || (v.watchedSeconds || 0) >= 180 || !v.isImpulsive;
  });

  // Lọc theo Tab được chọn
  const filtered = deepVideos.filter(v => {
    if (currentAuditFilter === "all") return true;
    return normalizeCategory(v.category) === currentAuditFilter;
  });

  if (filtered.length === 0) {
    const emptyMsg = currentAuditFilter === "all"
      ? "Chưa có video xem sâu nào hôm nay."
      : `Không có video nào thuộc nhóm "${currentAuditFilter}".`;
    container.innerHTML = `<div style="font-size:11px; color:#64748B; text-align:center; padding:12px 0;">${emptyMsg}</div>`;
    return;
  }

  container.innerHTML = "";
  filtered.forEach(vid => {
    const normCat = normalizeCategory(vid.category);
    let badgeClass = "badge-audit-unclassified";
    let badgeIcon = "⏳";
    if (normCat === "Mục tiêu") { badgeClass = "badge-audit-goal"; badgeIcon = "🎯"; }
    else if (normCat === "Giải trí") { badgeClass = "badge-audit-leisure"; badgeIcon = "☕"; }
    else if (normCat === "Lạc lối") { badgeClass = "badge-audit-distraction"; badgeIcon = "🌀"; }

    const itemEl = document.createElement("div");
    itemEl.className = "popup-audit-item";

    const leftEl = document.createElement("div");
    leftEl.style.cssText = "display:flex; align-items:center; gap:6px; min-width:0; flex:1;";

    const timeEl = document.createElement("span");
    timeEl.style.cssText = "font-size:10px; color:var(--text-muted); font-family:monospace; white-space:nowrap;";
    timeEl.textContent = formatTimeHHmm(vid.timestamp);

    const titleEl = document.createElement("span");
    titleEl.style.cssText = "color:#F1F5F9; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;";
    titleEl.textContent = vid.title || "Không rõ tiêu đề";
    titleEl.title = `${vid.title || ""} (${vid.channel || ""})`;

    leftEl.appendChild(timeEl);
    leftEl.appendChild(titleEl);

    const rightEl = document.createElement("div");
    rightEl.style.cssText = "display:flex; align-items:center; gap:6px; flex-shrink:0;";

    // Badge phân loại - Bấm hiện Popover 4 lựa chọn
    const badgeEl = document.createElement("span");
    badgeEl.className = `popup-audit-badge ${badgeClass}`;
    badgeEl.textContent = `${badgeIcon} ${normCat} ▾`;
    badgeEl.title = "Bấm để chọn phân loại nội dung";

    badgeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      openCategoryPopover(badgeEl, vid);
    });

    const durEl = document.createElement("span");
    durEl.style.cssText = "font-size:10px; color:var(--text-muted); white-space:nowrap;";
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

function setupPopupAuditLogToggle() {
  const toggleBtn = document.getElementById("popup-audit-log-toggle");
  const body = document.getElementById("popup-audit-log-body");
  const arrow = document.getElementById("popup-audit-arrow");
  if (!toggleBtn || !body) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "block" : "none";
    if (arrow) {
      arrow.style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
    }
  });
}

// ─── Cấu hình Bộ Lọc Từ Khóa (AI & Máy Cục Bộ) trong Cài đặt ─────────────────

let currentKwCategory = "target"; // "target" | "leisure" | "distraction"

function setupKeywordFilterSettings() {
  const tabTarget = document.getElementById("kw-tab-target");
  const tabLeisure = document.getElementById("kw-tab-leisure");
  const tabDistract = document.getElementById("kw-tab-distraction");
  const inputNew = document.getElementById("kw-input-new");
  const btnAdd = document.getElementById("kw-btn-add");
  const btnReset = document.getElementById("kw-btn-reset-default");

  if (!tabTarget || !inputNew || !btnAdd) return;

  const setTab = (cat) => {
    currentKwCategory = cat;
    [tabTarget, tabLeisure, tabDistract].forEach(b => b.classList.remove("active"));
    if (cat === "target") tabTarget.classList.add("active");
    if (cat === "leisure") tabLeisure.classList.add("active");
    if (cat === "distraction") tabDistract.classList.add("active");
    renderKeywordSettings();
  };

  tabTarget.addEventListener("click", () => setTab("target"));
  tabLeisure.addEventListener("click", () => setTab("leisure"));
  tabDistract.addEventListener("click", () => setTab("distraction"));

  const handleAddKeyword = () => {
    const text = inputNew.value.trim();
    if (!text) return;

    // Cho phép nhập nhiều từ khóa cách nhau bởi dấu phẩy
    const wordsToAdd = text.split(",").map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
    if (wordsToAdd.length === 0) return;

    chrome.storage.local.get(["app_config"], (res) => {
      const config = res.app_config || {};
      config.keywords = config.keywords || {
        target: [...DEFAULT_TARGET_KEYWORDS],
        leisure: [...DEFAULT_LEISURE_KEYWORDS],
        distraction: [...DEFAULT_DISTRACTION_KEYWORDS]
      };

      const list = config.keywords[currentKwCategory] || [];
      wordsToAdd.forEach(w => {
        if (!list.includes(w)) list.push(w);
      });
      config.keywords[currentKwCategory] = list;

      chrome.storage.local.set({ app_config: config }, () => {
        inputNew.value = "";
        renderKeywordSettings();
      });
    });
  };

  btnAdd.addEventListener("click", handleAddKeyword);
  inputNew.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  });

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (confirm("Khôi phục toàn bộ từ khóa (Mục tiêu, Giải trí, Lạc lối) về danh sách mặc định ban đầu?")) {
        chrome.storage.local.get(["app_config"], (res) => {
          const config = res.app_config || {};
          config.keywords = {
            target: [...DEFAULT_TARGET_KEYWORDS],
            leisure: [...DEFAULT_LEISURE_KEYWORDS],
            distraction: [...DEFAULT_DISTRACTION_KEYWORDS]
          };
          chrome.storage.local.set({ app_config: config }, () => {
            renderKeywordSettings();
          });
        });
      }
    });
  }

  renderKeywordSettings();
}

function renderKeywordSettings() {
  const container = document.getElementById("kw-tags-container");
  const countTarget = document.getElementById("kw-count-target");
  const countLeisure = document.getElementById("kw-count-leisure");
  const countDistract = document.getElementById("kw-count-distraction");
  if (!container) return;

  chrome.storage.local.get(["app_config"], (res) => {
    const config = res.app_config || {};
    const kw = config.keywords || {
      target: [...DEFAULT_TARGET_KEYWORDS],
      leisure: [...DEFAULT_LEISURE_KEYWORDS],
      distraction: [...DEFAULT_DISTRACTION_KEYWORDS]
    };

    const targetList = kw.target || DEFAULT_TARGET_KEYWORDS;
    const leisureList = kw.leisure || DEFAULT_LEISURE_KEYWORDS;
    const distractList = kw.distraction || DEFAULT_DISTRACTION_KEYWORDS;

    if (countTarget) countTarget.textContent = `(${targetList.length})`;
    if (countLeisure) countLeisure.textContent = `(${leisureList.length})`;
    if (countDistract) countDistract.textContent = `(${distractList.length})`;

    const activeList = currentKwCategory === "target"
      ? targetList
      : (currentKwCategory === "leisure" ? leisureList : distractList);

    const tagClass = currentKwCategory === "target"
      ? "kw-tag-target"
      : (currentKwCategory === "leisure" ? "kw-tag-leisure" : "kw-tag-distraction");

    if (activeList.length === 0) {
      container.innerHTML = `<div style="font-size:11px; color:var(--text-muted); text-align:center; width:100%; padding:10px 0;">Chưa có từ khóa nào. Nhập và bấm + Thêm ở trên.</div>`;
      return;
    }

    container.innerHTML = "";
    activeList.forEach((word) => {
      const tagEl = document.createElement("span");
      tagEl.className = `kw-tag ${tagClass}`;
      tagEl.textContent = word;

      const btnRemove = document.createElement("button");
      btnRemove.className = "kw-tag-remove";
      btnRemove.textContent = "✕";
      btnRemove.title = `Xóa từ khóa "${word}"`;
      btnRemove.addEventListener("click", () => {
        const updatedList = activeList.filter(w => w !== word);
        config.keywords = config.keywords || {};
        config.keywords[currentKwCategory] = updatedList;
        chrome.storage.local.set({ app_config: config }, () => {
          renderKeywordSettings();
        });
      });

      tagEl.appendChild(btnRemove);
      container.appendChild(tagEl);
    });
  });
}

// Thiết lập nút Reset dữ liệu ngày hiện tại
function setupResetButton() {
  const btn = document.getElementById("btn-reset-day");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại (xóa) toàn bộ số liệu thống kê của ngày hôm nay?")) {
      const todayKey = getTodayKey();
      const dateStr = todayKey.replace("stats_", "");
      const emptyDayData = {
        date: dateStr,
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
          hour: h,
          swipes: 0,
          longVideos: 0,
          feedScrolled: 0,
          reloads: 0,
          activeSeconds: 0
        })),
        temptation: { resistedCount: 0, succumbedCount: 0 },
        watchedVideos: [],
        unmatchedQueue: [],
        reflection: { lesson1: "", lesson2: "", rating: 5, aiFeedback: "", submittedAt: null },
        petEnergyEndOfDay: 100
      };

      const emptyPayload = {};
      emptyPayload[todayKey] = emptyDayData;

      chrome.storage.local.set(emptyPayload, () => {
        updateDashboard();
      });
    }
  });
}

// ─── Helpers: Bộ Chọn Giờ 24H Trực Quan & Thân Thiện ─────────────────────────
function populateTimePicker(hourEl, minEl, timeStr = "22:00", stepMinutes = 5) {
  if (!hourEl || !minEl) return;
  const [h, m] = (timeStr || "22:00").split(":").map(Number);
  const targetH = isNaN(h) ? 22 : h;
  const targetM = isNaN(m) ? 0 : m;

  hourEl.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const val = String(i).padStart(2, "0");
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = `${val}h`;
    if (i === targetH) opt.selected = true;
    hourEl.appendChild(opt);
  }

  minEl.innerHTML = "";
  let closestVal = 0;
  let minDiff = 999;
  for (let i = 0; i < 60; i += stepMinutes) {
    const diff = Math.abs(i - targetM);
    if (diff < minDiff) {
      minDiff = diff;
      closestVal = i;
    }
  }

  for (let i = 0; i < 60; i += stepMinutes) {
    const val = String(i).padStart(2, "0");
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = `${val}p`;
    if (i === closestVal) opt.selected = true;
    minEl.appendChild(opt);
  }
}

function getTimePickerValue(hourEl, minEl, fallback = "22:00") {
  if (!hourEl || !minEl) return fallback;
  return `${hourEl.value || "22"}:${minEl.value || "00"}`;
}

function updateBedtimeSummaryHint() {
  const hintEl = document.getElementById("bedtime-summary-hint");
  const sHour = document.getElementById("cfg-bedtime-start-hour")?.value || "22";
  const sMin = document.getElementById("cfg-bedtime-start-minute")?.value || "30";
  const eHour = document.getElementById("cfg-bedtime-end-hour")?.value || "05";
  const eMin = document.getElementById("cfg-bedtime-end-minute")?.value || "00";

  const startTotal = parseInt(sHour) * 60 + parseInt(sMin);
  const endTotal = parseInt(eHour) * 60 + parseInt(eMin);

  let diffMins = endTotal - startTotal;
  if (diffMins <= 0) diffMins += 24 * 60;

  const diffHours = (diffMins / 60).toFixed(1).replace(".0", "");
  if (hintEl) {
    hintEl.innerHTML = `💡 Bắt đầu ngủ lúc <b>${sHour}:${sMin}</b> tối nay ➔ Thức dậy <b>${eHour}:${eMin}</b> sáng mai (Khoảng <b>${diffHours} tiếng</b> ngủ ngon).`;
  }
}

// Quản lý Cấu hình & Cảnh báo (Nâng cấp mốc riêng từng nền tảng, Pomodoro & Keywords)
function setupSettings() {
  // YouTube inputs
  const ytShortsM1 = document.getElementById("cfg-yt-shorts-m1");
  const ytShortsM2 = document.getElementById("cfg-yt-shorts-m2");
  const ytShortsM3 = document.getElementById("cfg-yt-shorts-m3");
  const ytLongM1 = document.getElementById("cfg-yt-long-m1");
  const ytLongM2 = document.getElementById("cfg-yt-long-m2");
  const ytLongM3 = document.getElementById("cfg-yt-long-m3");

  // Facebook inputs
  const fbReelsM1 = document.getElementById("cfg-fb-reels-m1");
  const fbReelsM2 = document.getElementById("cfg-fb-reels-m2");
  const fbReelsM3 = document.getElementById("cfg-fb-reels-m3");
  const fbFeedsM1 = document.getElementById("cfg-fb-feeds-m1");
  const fbFeedsM2 = document.getElementById("cfg-fb-feeds-m2");
  const fbFeedsM3 = document.getElementById("cfg-fb-feeds-m3");
  const fbLongM1 = document.getElementById("cfg-fb-long-m1");
  const fbLongM2 = document.getElementById("cfg-fb-long-m2");
  const fbLongM3 = document.getElementById("cfg-fb-long-m3");

  const goalInput = document.getElementById("cfg-master-goal");
  const imgFileInput = document.getElementById("cfg-img-file");
  const imgUrlInput = document.getElementById("cfg-img-url");
  const imgPreview = document.getElementById("cfg-img-preview");
  const imgPlaceholder = document.getElementById("cfg-img-placeholder");

  // Pomodoro controls
  const pomodoroEnabled = document.getElementById("cfg-pomodoro-enabled");
  const pomodoroFocus = document.getElementById("cfg-pomodoro-focus");
  const pomodoroBreak = document.getElementById("cfg-pomodoro-break");

  // Keywords textarea
  const keywordsInput = document.getElementById("cfg-keywords");

  const btnSave = document.getElementById("btn-save-cfg");
  if (!btnSave) return;

  // Gemini API Key controls (Giai đoạn 4)
  const geminiKeyInput = document.getElementById("cfg-gemini-key");
  const btnToggleKey = document.getElementById("btn-toggle-key-visibility");
  const btnTestKey = document.getElementById("btn-test-gemini-key");
  const geminiStatus = document.getElementById("cfg-gemini-status");

  // Bedtime & Reflection schedule inputs (Chuẩn 24h)
  const bedtimeEnabled = document.getElementById("cfg-bedtime-enabled");
  const bedStartHour = document.getElementById("cfg-bedtime-start-hour");
  const bedStartMin = document.getElementById("cfg-bedtime-start-minute");
  const bedEndHour = document.getElementById("cfg-bedtime-end-hour");
  const bedEndMin = document.getElementById("cfg-bedtime-end-minute");
  const refHour = document.getElementById("cfg-reflection-hour");
  const refMin = document.getElementById("cfg-reflection-minute");

  // Nạp cấu hình & API Key đã lưu
  chrome.storage.local.get(["app_config"], (result) => {
    const config = result.app_config || {};
    const thresholds = config.thresholds || {};
    const ytThresh = thresholds.youtube || {};
    const fbThresh = thresholds.facebook || {};
    const ttThresh = thresholds.tiktok || {};

    // Khởi tạo các dropdown giờ 24h cho Bedtime & Reflection
    if (bedtimeEnabled) bedtimeEnabled.checked = config.bedtime?.enabled !== false;
    populateTimePicker(refHour, refMin, config.reflection?.reminderTime || "22:00", 5);
    populateTimePicker(bedStartHour, bedStartMin, config.bedtime?.start || "22:30", 5);
    populateTimePicker(bedEndHour, bedEndMin, config.bedtime?.end || "05:00", 5);
    updateBedtimeSummaryHint();

    [bedStartHour, bedStartMin, bedEndHour, bedEndMin].forEach(el => {
      el?.addEventListener("change", updateBedtimeSummaryHint);
    });

    if (geminiKeyInput && config.geminiApiKey) {
      geminiKeyInput.value = config.geminiApiKey;
    }

    // Điền YouTube
    if (ytShortsM1) ytShortsM1.value = ytThresh.shorts?.m1 ?? 15;
    if (ytShortsM2) ytShortsM2.value = ytThresh.shorts?.m2 ?? 30;
    if (ytShortsM3) ytShortsM3.value = ytThresh.shorts?.m3 ?? 45;
    if (ytLongM1) ytLongM1.value = ytThresh.long?.m1 ?? 3;
    if (ytLongM2) ytLongM2.value = ytThresh.long?.m2 ?? 5;
    if (ytLongM3) ytLongM3.value = ytThresh.long?.m3 ?? 8;

    // Điền Facebook
    if (fbReelsM1) fbReelsM1.value = fbThresh.reels?.m1 ?? 15;
    if (fbReelsM2) fbReelsM2.value = fbThresh.reels?.m2 ?? 30;
    if (fbReelsM3) fbReelsM3.value = fbThresh.reels?.m3 ?? 45;
    if (fbFeedsM1) fbFeedsM1.value = fbThresh.feeds?.m1 ?? 20;
    if (fbFeedsM2) fbFeedsM2.value = fbThresh.feeds?.m2 ?? 40;
    if (fbFeedsM3) fbFeedsM3.value = fbThresh.feeds?.m3 ?? 60;
    if (fbLongM1) fbLongM1.value = fbThresh.long?.m1 ?? 2;
    if (fbLongM2) fbLongM2.value = fbThresh.long?.m2 ?? 4;
    if (fbLongM3) fbLongM3.value = fbThresh.long?.m3 ?? 6;

    if (goalInput) goalInput.value = config.masterGoal || "Muốn trở thành phiên bản tốt hơn để gặp người ấy";

    // Pomodoro
    if (pomodoroEnabled) pomodoroEnabled.checked = config.pomodoro?.enabled || false;
    if (pomodoroFocus) pomodoroFocus.value = config.pomodoro?.focusMinutes ?? 25;
    if (pomodoroBreak) pomodoroBreak.value = config.pomodoro?.breakMinutes ?? 5;

    // Keywords - mỗi từ 1 dòng
    const targetKws = config.keywords?.target || config.targetKeywords || [];
    if (keywordsInput && Array.isArray(targetKws)) {
      keywordsInput.value = targetKws.join("\n");
    }

    if (config.emotionalAnchorImage) {
      if (imgPreview) { imgPreview.src = config.emotionalAnchorImage; imgPreview.style.display = "block"; }
      if (imgPlaceholder) imgPlaceholder.style.display = "none";
      if (imgUrlInput && config.emotionalAnchorImage.startsWith("http")) {
        imgUrlInput.value = config.emotionalAnchorImage;
      }
    }
  });

  // Toggle ẩn/hiện API Key
  if (btnToggleKey && geminiKeyInput) {
    btnToggleKey.addEventListener("click", () => {
      const isPass = geminiKeyInput.type === "password";
      geminiKeyInput.type = isPass ? "text" : "password";
      btnToggleKey.textContent = isPass ? "🔒" : "👁️";
    });
  }

  // Test kết nối Gemini API
  if (btnTestKey && geminiKeyInput) {
    btnTestKey.addEventListener("click", () => {
      const key = geminiKeyInput.value.trim();
      if (!key) {
        showGeminiStatus("⚠️ Vui lòng nhập API Key trước khi test.", "#EF4444");
        return;
      }

      showGeminiStatus("⏳ Đang kiểm tra kết nối tới Gemini 3.6 Flash...", "#38BDF8");
      btnTestKey.disabled = true;

      chrome.runtime.sendMessage({ type: "TEST_GEMINI_KEY", apiKey: key }, (res) => {
        btnTestKey.disabled = false;
        if (res && res.ok) {
          showGeminiStatus("✅ Kết nối thành công! API Key hoạt động hoàn hảo.", "#10B981");
        } else {
          showGeminiStatus(`❌ Lỗi: ${res?.error || "Không thể kết nối API."}`, "#EF4444");
        }
      });
    });
  }

  function showGeminiStatus(msg, color) {
    if (!geminiStatus) return;
    geminiStatus.textContent = msg;
    geminiStatus.style.color = color;
    geminiStatus.style.display = "block";
  }

  // Firebase Realtime Sync controls
  const syncCodeInput = document.getElementById("cfg-sync-code");
  const autoSyncCheckbox = document.getElementById("cfg-auto-sync");
  const btnTestFirebase = document.getElementById("btn-test-firebase-sync");
  const firebaseStatusEl = document.getElementById("firebase-sync-status");

  getFirebaseSyncSettings().then((fbSettings) => {
    if (syncCodeInput) syncCodeInput.value = fbSettings.syncCode || "";
    if (autoSyncCheckbox) autoSyncCheckbox.checked = fbSettings.autoSync !== false;
    if (firebaseStatusEl) {
      if (fbSettings.lastSynced) {
        const timeStr = new Date(fbSettings.lastSynced).toLocaleTimeString("vi-VN");
        firebaseStatusEl.textContent = `✓ Đã đồng bộ gần nhất lúc ${timeStr}`;
        firebaseStatusEl.style.color = "#10B981";
      } else {
        firebaseStatusEl.textContent = `Chưa đồng bộ (Mã: ${fbSettings.syncCode})`;
        firebaseStatusEl.style.color = "var(--text-muted)";
      }
    }
  });

  if (btnTestFirebase && syncCodeInput) {
    btnTestFirebase.addEventListener("click", async () => {
      const code = syncCodeInput.value.trim().toUpperCase();
      if (!code) {
        if (firebaseStatusEl) {
          firebaseStatusEl.textContent = "⚠️ Vui lòng nhập mã Sync Code!";
          firebaseStatusEl.style.color = "#EF4444";
        }
        return;
      }
      if (firebaseStatusEl) {
        firebaseStatusEl.textContent = "⏳ Đang kiểm tra kết nối tới Firebase RTDB...";
        firebaseStatusEl.style.color = "#38BDF8";
      }
      btnTestFirebase.disabled = true;
      const res = await testFirebaseConnection(code);
      btnTestFirebase.disabled = false;
      if (res && res.success) {
        if (firebaseStatusEl) {
          firebaseStatusEl.textContent = `✅ ${res.message}`;
          firebaseStatusEl.style.color = "#10B981";
        }
      } else {
        if (firebaseStatusEl) {
          firebaseStatusEl.textContent = `❌ ${res?.error || "Không thể kết nối"}`;
          firebaseStatusEl.style.color = "#EF4444";
        }
      }
    });
  }

  // Tải ảnh từ file & nén qua Canvas
  if (imgFileInput) {
    imgFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 400;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
          else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          if (imgPreview) { imgPreview.src = dataUrl; imgPreview.style.display = "block"; }
          if (imgPlaceholder) imgPlaceholder.style.display = "none";
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (imgUrlInput) {
    imgUrlInput.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      if (url) {
        if (imgPreview) { imgPreview.src = url; imgPreview.style.display = "block"; }
        if (imgPlaceholder) imgPlaceholder.style.display = "none";
      }
    });
  }

  // Lưu cài đặt & Gemini Key
  btnSave.addEventListener("click", () => {
    const ytShortsM1Val = parseInt(ytShortsM1?.value) || 15;
    const ytShortsM2Val = parseInt(ytShortsM2?.value) || 30;
    const ytShortsM3Val = parseInt(ytShortsM3?.value) || 45;
    const ytLongM1Val = parseInt(ytLongM1?.value) || 3;
    const ytLongM2Val = parseInt(ytLongM2?.value) || 5;
    const ytLongM3Val = parseInt(ytLongM3?.value) || 8;

    const fbReelsM1Val = parseInt(fbReelsM1?.value) || 15;
    const fbReelsM2Val = parseInt(fbReelsM2?.value) || 30;
    const fbReelsM3Val = parseInt(fbReelsM3?.value) || 45;
    const fbFeedsM1Val = parseInt(fbFeedsM1?.value) || 20;
    const fbFeedsM2Val = parseInt(fbFeedsM2?.value) || 40;
    const fbFeedsM3Val = parseInt(fbFeedsM3?.value) || 60;
    const fbLongM1Val = parseInt(fbLongM1?.value) || 2;
    const fbLongM2Val = parseInt(fbLongM2?.value) || 4;
    const fbLongM3Val = parseInt(fbLongM3?.value) || 6;

    const masterGoal = goalInput?.value.trim() || "Muốn trở thành phiên bản tốt hơn";
    const geminiKey = geminiKeyInput?.value.trim() || "";

    let emotionalAnchorImage = "";
    if (imgPreview?.style.display !== "none" && imgPreview?.src) {
      emotionalAnchorImage = imgPreview.src;
    }

    // Xử lý keywords (tách theo dòng, lọc trống)
    const targetKeywords = keywordsInput
      ? keywordsInput.value.split("\n").map(k => k.trim()).filter(k => k.length > 0)
      : [];

    const syncCodeVal = syncCodeInput ? syncCodeInput.value.trim().toUpperCase() : "";
    const autoSyncVal = autoSyncCheckbox ? autoSyncCheckbox.checked : true;

    chrome.storage.local.get(["app_config"], (cfgRes) => {
      const existingCfg = cfgRes.app_config || {};
      const finalSyncCode = syncCodeVal || existingCfg.syncCode || "MF-8924";
      const finalAutoSync = autoSyncCheckbox ? autoSyncVal : (existingCfg.auto_sync !== false);
      const app_config = {
        syncCode: finalSyncCode,
        auto_sync: finalAutoSync,
        masterGoal,
        leisureQuotaMinutes: existingCfg.leisureQuotaMinutes || 45,
        geminiApiKey: geminiKey,
        emotionalAnchorImage,
        thresholds: {
          youtube: {
            shorts: { m1: ytShortsM1Val, m2: ytShortsM2Val, m3: ytShortsM3Val },
            long: { m1: ytLongM1Val, m2: ytLongM2Val, m3: ytLongM3Val }
          },
          facebook: {
            reels: { m1: fbReelsM1Val, m2: fbReelsM2Val, m3: fbReelsM3Val },
            feeds: { m1: fbFeedsM1Val, m2: fbFeedsM2Val, m3: fbFeedsM3Val },
            long: { m1: fbLongM1Val, m2: fbLongM2Val, m3: fbLongM3Val }
          },
          tiktok: {
            shorts: { m1: 15, m2: 30, m3: 45 }
          }
        },
        pomodoro: {
          enabled: pomodoroEnabled?.checked || false,
          focusMinutes: parseInt(pomodoroFocus?.value) || 25,
          breakMinutes: parseInt(pomodoroBreak?.value) || 5
        },
        bedtime: {
          enabled: bedtimeEnabled ? bedtimeEnabled.checked : true,
          start: getTimePickerValue(bedStartHour, bedStartMin, "22:30"),
          end: getTimePickerValue(bedEndHour, bedEndMin, "05:00")
        },
        reflection: {
          reminderTime: getTimePickerValue(refHour, refMin, "22:00")
        },
        keywords: {
          target: targetKeywords,
          leisure: existingCfg.keywords?.leisure || ["hài", "game", "gaming", "streamer", "vlog", "ca nhạc", "nấu ăn"],
          distraction: existingCfg.keywords?.distraction || ["drama", "bóc phốt", "hóng biến", "scandal", "cờ bạc", "giật gân"]
        },
        localPreferences: existingCfg.localPreferences || {
          hudPosition: { x: 20, y: 80 },
          grayscaleMode: "threshold_m2"
        }
      };

      saveFirebaseSyncSettings({
        syncCode: finalSyncCode,
        autoSync: finalAutoSync
      });

      chrome.storage.local.set({ app_config }, () => {
        // Đẩy cấu hình lên Firebase tức thì
        pushConfigToFirebase(app_config).catch((err) => {
          console.warn("[Popup] Lỗi đẩy cấu hình tức thì:", err);
        });
        chrome.runtime.sendMessage({ type: "UPDATE_REFLECTION_ALARM" }).catch(() => {});
        const toast = document.getElementById("cfg-save-toast");
        if (toast) {
          toast.style.display = "block";
          setTimeout(() => { toast.style.display = "none"; }, 2500);
        }
      });
    });
  });
}

// ─── Điều khiển & Đồng hồ đếm ngược Pomodoro Đa Hiệp ──────────────────────────
let popupPomTimer = null;

function setupPomodoroControls() {
  const setupBox = document.getElementById("popup-pom-setup-box");
  const runningBox = document.getElementById("popup-pom-running-box");
  const statusBadge = document.getElementById("popup-pom-status-badge");
  const runningTimerEl = document.getElementById("popup-pom-running-timer");
  const runningModeEl = document.getElementById("popup-pom-running-mode");
  const btnStart = document.getElementById("btn-popup-start-pom");
  const btnStop = document.getElementById("btn-popup-stop-pom");
  const cyclesSelect = document.getElementById("cfg-pomodoro-cycles");
  const focusInput = document.getElementById("cfg-pomodoro-focus");
  const breakInput = document.getElementById("cfg-pomodoro-break");
  const modeMusicLabel = document.getElementById("popup-mode-music-label");
  const modeStudyLabel = document.getElementById("popup-mode-study-label");
  const modeRadios = document.querySelectorAll('input[name="popup-pom-mode"]');

  // Đổi style khi chọn mode
  modeRadios.forEach(r => {
    r.addEventListener("change", () => {
      if (r.value === "music") {
        if (modeMusicLabel) {
          modeMusicLabel.style.background = "rgba(139,92,246,0.18)";
          modeMusicLabel.style.borderColor = "#8B5CF6";
        }
        if (modeStudyLabel) {
          modeStudyLabel.style.background = "rgba(255,255,255,0.05)";
          modeStudyLabel.style.borderColor = "rgba(255,255,255,0.12)";
        }
      } else {
        if (modeStudyLabel) {
          modeStudyLabel.style.background = "rgba(16,185,129,0.18)";
          modeStudyLabel.style.borderColor = "#10B981";
        }
        if (modeMusicLabel) {
          modeMusicLabel.style.background = "rgba(255,255,255,0.05)";
          modeMusicLabel.style.borderColor = "rgba(255,255,255,0.12)";
        }
      }
    });
  });

  function renderPomodoroState(state) {
    if (state && state.enabled) {
      if (setupBox) setupBox.style.display = "none";
      if (runningBox) runningBox.style.display = "block";
      if (statusBadge) statusBadge.style.display = "inline-block";

      const updateCountdown = () => {
        const elapsed = Date.now() - (state.sessionStartTime || Date.now());
        const totalMs = (state.durationMinutes || 25) * 60 * 1000;
        const remMs = Math.max(0, totalMs - elapsed);
        const remSec = Math.ceil(remMs / 1000);
        const m = Math.floor(remSec / 60);
        const s = String(remSec % 60).padStart(2, "0");
        const icon = state.sessionType === "focus" ? "🍅" : "☕";
        const stage = state.sessionType === "focus" ? "Focus" : "Nghỉ";

        if (runningTimerEl) {
          runningTimerEl.textContent = `${icon} Hiệp ${state.currentCycle}/${state.totalCycles} ${stage} ${m}:${s}`;
          runningTimerEl.style.color = state.sessionType === "focus" ? "#38BDF8" : "#34D399";
        }
        if (runningModeEl) {
          runningModeEl.textContent = `Mode: ${state.focusMode === "music" ? "🎵 Làm việc với Âm nhạc" : "📚 Chế độ Học tập"}`;
        }
      };

      updateCountdown();
      if (popupPomTimer) clearInterval(popupPomTimer);
      popupPomTimer = setInterval(updateCountdown, 1000);
    } else {
      if (popupPomTimer) {
        clearInterval(popupPomTimer);
        popupPomTimer = null;
      }
      if (runningBox) runningBox.style.display = "none";
      if (setupBox) setupBox.style.display = "block";
      if (statusBadge) statusBadge.style.display = "none";
    }
  }

  // Load trạng thái ban đầu
  chrome.storage.local.get(["pomodoro_state", "focus_mode_type"], (res) => {
    if (res.pomodoro_state) {
      renderPomodoroState(res.pomodoro_state);
    }
    if (res.focus_mode_type) {
      const targetRadio = document.querySelector(`input[name="popup-pom-mode"][value="${res.focus_mode_type}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event("change"));
      }
    }
  });

  // Lắng nghe thay đổi storage từ tab web
  chrome.storage.onChanged.addListener((changes, ns) => {
    if (ns === "local" && changes.pomodoro_state) {
      renderPomodoroState(changes.pomodoro_state.newValue);
    }
  });

  // Nút Bắt đầu Pomodoro
  if (btnStart) {
    btnStart.addEventListener("click", () => {
      const totalCycles = parseInt(cyclesSelect?.value) || 2;
      const focusMinutes = parseInt(focusInput?.value) || 25;
      const breakMinutes = parseInt(breakInput?.value) || 5;
      const selectedMode = document.querySelector('input[name="popup-pom-mode"]:checked')?.value || "music";

      const newPomState = {
        enabled: true,
        totalCycles,
        currentCycle: 1,
        sessionType: "focus",
        sessionStartTime: Date.now(),
        durationMinutes: focusMinutes,
        focusMinutes,
        breakMinutes,
        focusMode: selectedMode
      };

      chrome.storage.local.set({
        pomodoro_state: newPomState,
        focus_mode_type: selectedMode
      }, () => {
        renderPomodoroState(newPomState);
        chrome.tabs.query({ active: true }, (tabs) => {
          tabs.forEach(t => {
            if (t.id) chrome.tabs.sendMessage(t.id, { type: "START_POMODORO", setup: newPomState }).catch(() => {});
          });
        });
      });
    });
  }

  // Nút Dừng Pomodoro
  if (btnStop) {
    btnStop.addEventListener("click", () => {
      chrome.storage.local.get(["pomodoro_state"], (res) => {
        const s = res.pomodoro_state || {};
        s.enabled = false;
        chrome.storage.local.set({ pomodoro_state: s }, () => {
          renderPomodoroState(s);
          chrome.tabs.query({ active: true }, (tabs) => {
            tabs.forEach(t => {
              if (t.id) chrome.tabs.sendMessage(t.id, { type: "STOP_POMODORO" }).catch(() => {});
            });
          });
        });
      });
    });
  }
}

// ─── Thiết lập Linh vật Pet Đa Chế Độ (Giai đoạn 4) ───────────────────────────
function setupPetControls() {
  const radioModes = document.querySelectorAll('input[name="pet-mode"]');
  const petUploadSection = document.getElementById("pet-upload-section");
  const petAiSection = document.getElementById("pet-ai-section");
  const petImageFile = document.getElementById("pet-image-file");
  const petCropPreview = document.getElementById("pet-crop-preview");
  const petCropPlaceholder = document.getElementById("pet-crop-placeholder");
  const btnGenerateAiPet = document.getElementById("btn-generate-ai-pet");
  const petAiStatus = document.getElementById("pet-ai-status");

  // Nạp cấu hình Pet hiện tại từ pet_state
  chrome.storage.local.get(["pet_state"], (res) => {
    const petState = res.pet_state || { mode: "default", puppetPhotos: {}, aiSprites: {} };
    const currentMode = petState.mode || "default";

    // Chọn đúng radio
    radioModes.forEach(r => {
      r.checked = (r.value === currentMode);
    });

    togglePetModeUI(currentMode);

    // Hiển thị 3 ảnh Puppet theo từng cảm xúc
    const puppetImgs = petState.puppetPhotos || {};
    renderPuppetSlotPreview("happy", puppetImgs.happy);
    renderPuppetSlotPreview("neutral", puppetImgs.neutral);
    renderPuppetSlotPreview("sad", puppetImgs.sad);

    // Hiển thị 3 sprite AI nếu đã có
    if (petState.aiSprites) {
      renderSpritePreviews(petState.aiSprites);
    }
  });

  function renderPuppetSlotPreview(mood, base64Url) {
    const previewEl = document.getElementById(`pet-crop-${mood}-preview`);
    const placeholderEl = document.getElementById(`pet-crop-${mood}-placeholder`);
    if (previewEl && placeholderEl) {
      if (base64Url) {
        previewEl.src = base64Url;
        previewEl.style.display = "block";
        placeholderEl.style.display = "none";
      } else {
        previewEl.src = "";
        previewEl.style.display = "none";
        placeholderEl.style.display = "block";
      }
    }
  }

  function togglePetModeUI(mode) {
    if (mode === "default") {
      if (petUploadSection) petUploadSection.style.display = "none";
      if (petAiSection) petAiSection.style.display = "none";
    } else if (mode === "puppet") {
      if (petUploadSection) petUploadSection.style.display = "block";
      if (petAiSection) petAiSection.style.display = "none";
    } else if (mode === "ai_generated") {
      if (petUploadSection) petUploadSection.style.display = "block";
      if (petAiSection) petAiSection.style.display = "block";
    }
  }

  // Chuyển đổi radio mode
  radioModes.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const selectedMode = e.target.value;
      togglePetModeUI(selectedMode);

      chrome.storage.local.get(["pet_state"], (res) => {
        const petState = res.pet_state || {};
        petState.mode = selectedMode;
        chrome.storage.local.set({ pet_state: petState }, () => {
          updatePetBanner();
        });
      });
    });
  });

  // Helper cắt tròn và nén Base64
  function cropFileToCircleBase64(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const targetSize = 160;
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.beginPath();
        ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.88);
        callback(croppedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Cấu hình 3 ô tải ảnh Puppet: Happy, Neutral, Sad
  ["happy", "neutral", "sad"].forEach((mood) => {
    const trigger = document.getElementById(`slot-trigger-${mood}`);
    const fileInput = document.getElementById(`pet-img-${mood}-file`);

    if (trigger && fileInput) {
      trigger.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        cropFileToCircleBase64(file, (croppedBase64) => {
          renderPuppetSlotPreview(mood, croppedBase64);

          chrome.storage.local.get(["pet_state"], (res) => {
            const petState = res.pet_state || { mode: "puppet" };
            if (!petState.puppetPhotos) petState.puppetPhotos = {};
            petState.puppetPhotos[mood] = croppedBase64;

            chrome.storage.local.set({ pet_state: petState }, () => {
              updatePetBanner();
            });
          });
        });
      });
    }
  });

  // Nút xóa ảnh từng slot Puppet
  document.querySelectorAll(".btn-clear-puppet-slot").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = btn.getAttribute("data-slot");
      if (!slot) return;

      renderPuppetSlotPreview(slot, null);

      chrome.storage.local.get(["pet_state"], (res) => {
        const petState = res.pet_state || {};
        if (petState.puppetPhotos && petState.puppetPhotos[slot]) {
          delete petState.puppetPhotos[slot];
        }
        chrome.storage.local.set({ pet_state: petState }, () => {
          updatePetBanner();
        });
      });
    });
  });

  // Tải ảnh cá nhân & Cắt tròn bằng HTML5 Canvas cục bộ (Legacy fallback)
  if (petImageFile) {
    petImageFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      cropFileToCircleBase64(file, (croppedBase64) => {
        chrome.storage.local.get(["pet_state"], (res) => {
          const petState = res.pet_state || { mode: "puppet" };
          if (!petState.puppetPhotos) petState.puppetPhotos = {};
          petState.puppetPhotos.happy = croppedBase64;
          renderPuppetSlotPreview("happy", croppedBase64);

          chrome.storage.local.set({ pet_state: petState }, () => {
            updatePetBanner();
          });
        });
      });
    });
  }

  // Nút Tạo Avatar AI Chibi
  if (btnGenerateAiPet) {
    btnGenerateAiPet.addEventListener("click", () => {
      chrome.storage.local.get(["pet_state", "app_config"], (res) => {
        const petState = res.pet_state || {};
        const config = res.app_config || {};
        const puppetImgs = petState.puppetPhotos || {};
        const fallbackImg = puppetImgs.happy || puppetImgs.neutral || puppetImgs.sad;
        if (!fallbackImg) {
          showPetAiStatus("⚠️ Vui lòng chọn ảnh trước khi tạo Avatar AI.", "#EF4444");
          return;
        }
        if (!config.geminiApiKey) {
          showPetAiStatus("⚠️ Vui lòng nhập Gemini API Key ở ô phía trên trước.", "#EF4444");
          return;
        }

        showPetAiStatus("⏳ Đang gọi Gemini AI phân tích ảnh và sinh 3 sprite Chibi...", "#38BDF8");
        btnGenerateAiPet.disabled = true;

        chrome.runtime.sendMessage({
          type: "GENERATE_AI_PET_SPRITES",
          imageBase64: fallbackImg
        }, (resp) => {
          btnGenerateAiPet.disabled = false;
          if (resp && resp.ok && resp.sprites) {
            showPetAiStatus("✅ Đã tạo thành công bộ 3 Avatar Chibi AI!", "#10B981");
            renderSpritePreviews(resp.sprites);
            updatePetBanner();
          } else {
            showPetAiStatus(`❌ Lỗi: ${resp?.error || "Không thể tạo sprite."}`, "#EF4444");
          }
        });
      });
    });
  }

  function showPetAiStatus(msg, color) {
    if (!petAiStatus) return;
    petAiStatus.textContent = msg;
    petAiStatus.style.color = color;
    petAiStatus.style.display = "block";
  }

  function renderSpritePreviews(sprites) {
    if (!sprites) return;
    const hEl = document.getElementById("sprite-happy-preview");
    const nEl = document.getElementById("sprite-neutral-preview");
    const sEl = document.getElementById("sprite-sad-preview");

    if (sprites.happy && hEl) {
      hEl.innerHTML = `<img src="${sprites.happy}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" alt="Happy">`;
    }
    if (sprites.neutral && nEl) {
      nEl.innerHTML = `<img src="${sprites.neutral}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" alt="Neutral">`;
    }
    if (sprites.sad && sEl) {
      sEl.innerHTML = `<img src="${sprites.sad}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" alt="Sad">`;
    }
  }
}

// ─── Render Linh vật Pet & Focus Streak (Hỗ trợ 3 Chế Độ & Phụ Kiện) ─────────
function updatePetBanner() {
  chrome.storage.local.get(["pet_state"], (res) => {
    const pet = res.pet_state || {
      energy: 100,
      mood: "happy",
      currentStreak: 0,
      mode: "default",
      accessories: { unlockedItems: [], equipped: { head: null, body: null } },
      puppetPhotos: {},
      aiSprites: {},
      knowledgeSeeds: 0,
      customQuotes: [],
      isWilted: false,
      evolutionStage: "seedling"
    };
    const mode = pet.mode || "default";
    const accessories = pet.accessories || { unlockedItems: [], equipped: { head: null, body: null } };
    const equippedHead = accessories.equipped?.head || null;

    const avatarEl = document.getElementById("popup-pet-avatar");
    const moodEl = document.getElementById("popup-pet-mood-badge");
    const stageEl = document.getElementById("popup-pet-stage-badge");
    const wiltedEl = document.getElementById("popup-pet-wilted-badge");
    const seedsEl = document.getElementById("popup-banner-seeds");
    const seedsBadgeEl = document.getElementById("popup-seeds-badge");
    const barEl = document.getElementById("popup-pet-energy-bar");
    const textEl = document.getElementById("popup-pet-energy-text");
    const streakEl = document.getElementById("popup-streak-days");

    const energy = pet.energy ?? 100;
    const mood = energy >= 70 ? "happy" : energy >= 40 ? "neutral" : "sad";
    const streak = pet.currentStreak ?? pet.streakDays ?? 0;
    const stage = pet.evolutionStage || (streak >= 21 ? "flowering" : (streak >= 4 ? "growing" : "seedling"));
    const seeds = pet.knowledgeSeeds || 0;

    if (streakEl) streakEl.textContent = streak;
    if (textEl) textEl.textContent = `${energy}%`;
    if (seedsEl) seedsEl.textContent = seeds;
    if (seedsBadgeEl) seedsBadgeEl.textContent = `${seeds} Hạt`;

    if (wiltedEl) {
      wiltedEl.style.display = pet.isWilted ? "inline-block" : "none";
    }

    if (stageEl) {
      if (stage === "flowering") {
        stageEl.textContent = "🌸 Nở hoa (21+ ngày)";
        stageEl.style.background = "rgba(245,158,11,0.25)";
        stageEl.style.color = "#FBBF24";
      } else if (stage === "growing") {
        stageEl.textContent = "🌿 Trưởng thành (4+ ngày)";
        stageEl.style.background = "rgba(16,185,129,0.2)";
        stageEl.style.color = "#34D399";
      } else {
        stageEl.textContent = "🌱 Mầm non (1-3 ngày)";
        stageEl.style.background = "rgba(6,182,212,0.2)";
        stageEl.style.color = "#67E8F9";
      }
    }

    if (barEl) {
      barEl.style.width = `${energy}%`;
      barEl.style.background = energy >= 70
        ? "linear-gradient(90deg, #10B981, #06B6D4)"
        : energy >= 40
        ? "linear-gradient(90deg, #F59E0B, #EAB308)"
        : "linear-gradient(90deg, #EF4444, #F87171)";
    }

    const moods = {
      happy: { text: "✨ Rất tốt", bg: "rgba(16,185,129,0.2)", color: "#10B981" },
      neutral: { text: "⚡ Ổn định", bg: "rgba(6,182,212,0.2)", color: "#06B6D4" },
      sad: { text: "🌧️ Mệt mỏi", bg: "rgba(239,68,68,0.2)", color: "#EF4444" }
    };
    const m = moods[mood] || moods.happy;
    if (moodEl) {
      moodEl.textContent = m.text;
      moodEl.style.background = m.bg;
      moodEl.style.color = m.color;
    }

    if (!avatarEl) return;

    // Hào quang aura layer theo stage
    const auraStyle = stage === "flowering"
      ? "box-shadow: 0 0 12px rgba(245,158,11,0.8); border: 2px solid #F59E0B;"
      : stage === "growing"
      ? "box-shadow: 0 0 8px rgba(16,185,129,0.7); border: 1.5px solid #10B981;"
      : "border: 1.5px solid #fff;";

    // Phụ kiện SVG layer cho Puppet / AI
    const puppetAccessory = equippedHead === "sunglasses"
      ? `<div style="position:absolute; top:7px; left:50%; transform:translateX(-50%); width:22px; height:8px; pointer-events:none; z-index:3;">
           <svg width="22" height="8" viewBox="0 0 22 8" fill="none"><rect x="1" y="1" width="8" height="5" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/><rect x="13" y="1" width="8" height="5" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/><line x1="9" y1="3.5" x2="13" y2="3.5" stroke="#38BDF8" stroke-width="0.8"/></svg>
         </div>`
      : equippedHead === "laurel"
      ? `<div style="position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:26px; height:12px; pointer-events:none; z-index:3;">
           <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><path d="M 3 10 C 3 5, 8 3, 13 3 C 18 3, 23 5, 23 10" stroke="#F59E0B" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="13" cy="3" r="1.5" fill="#EF4444"/></svg>
         </div>`
      : "";

    // 1. CHẾ ĐỘ PUPPET: Ghép mặt tròn vào body chibi
    if (mode === "puppet") {
      const puppetImgs = pet.puppetPhotos || {};
      const faceImg = puppetImgs[mood] || puppetImgs.happy || puppetImgs.neutral;
      const bodyColor = mood === "happy" ? "#8B5CF6" : mood === "sad" ? "#475569" : "#06B6D4";
      const filterStyle = pet.isWilted
        ? "filter: grayscale(0.4) sepia(0.3);"
        : (mood === "sad" && !puppetImgs.sad ? "filter: grayscale(0.55);" : "");

      const faceHtml = faceImg
        ? `<img src="${faceImg}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;${auraStyle};${filterStyle}" alt="Pet">`
        : `<div style="width:24px;height:24px;border-radius:50%;background:#8B5CF6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;${auraStyle}">👤</div>`;

      const wiltedMark = pet.isWilted ? `<span style="position:absolute;bottom:0;left:0;font-size:9px;">🍂</span>` : "";

      avatarEl.innerHTML = `
        <div style="position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; width:34px; height:34px;">
          ${wiltedMark}
          <div style="margin-bottom:-5px; z-index:2; position:relative;">
            ${faceHtml}
            ${puppetAccessory}
          </div>
          <svg width="28" height="15" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="z-index:1;">
            <rect x="7" y="4" width="20" height="12" rx="5" fill="${bodyColor}" />
            <circle cx="5" cy="9" r="3" fill="${bodyColor}" />
            <circle cx="29" cy="9" r="3" fill="${bodyColor}" />
            <ellipse cx="12" cy="17" rx="2.5" ry="2" fill="#1E293B" />
            <ellipse cx="22" cy="17" rx="2.5" ry="2" fill="#1E293B" />
          </svg>
        </div>
      `;
      return;
    }

    // 2. CHẾ ĐỘ AI GENERATED: Tráo đổi 3 Sprite AI biểu cảm
    if (mode === "ai_generated" && pet.aiSprites && (pet.aiSprites[mood] || pet.aiSprites.happy)) {
      const spriteUri = pet.aiSprites[mood] || pet.aiSprites.happy;
      const filterStyle = pet.isWilted ? "filter: grayscale(0.4) sepia(0.3);" : "";
      const wiltedMark = pet.isWilted ? `<span style="position:absolute;bottom:0;left:0;font-size:9px;">🍂</span>` : "";
      avatarEl.innerHTML = `
        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:visible; ${auraStyle}">
          ${wiltedMark}
          <img src="${spriteUri}" style="width:100%; height:100%; object-fit:contain; border-radius:6px; ${filterStyle}" alt="AI Pet ${mood}">
          ${puppetAccessory}
        </div>
      `;
      return;
    }

    // 3. CHẾ ĐỘ DEFAULT: Mầm cây Sprout SVG
    const potColor = mood === "happy" ? "#8B5CF6" : mood === "sad" ? "#475569" : "#06B6D4";
    const leafColor = pet.isWilted ? "#EAB308" : (mood === "happy" ? "#10B981" : mood === "sad" ? "#94A3B8" : "#34D399");
    
    let flower = "";
    if (stage === "flowering") {
      flower = `<circle cx="17" cy="4" r="4.2" fill="#F59E0B" /><circle cx="17" cy="4" r="2" fill="#FEF08A" />`;
    } else if (mood === "happy" && !pet.isWilted) {
      flower = `<circle cx="17" cy="4" r="3.5" fill="#F43F5E" /><circle cx="17" cy="4" r="1.5" fill="#FBBF24" />`;
    }

    const eyes = mood === "happy"
      ? `<path d="M 11 20 Q 13 17 15 20" stroke="#0F172A" stroke-width="1.6" fill="none"/><path d="M 19 20 Q 21 17 23 20" stroke="#0F172A" stroke-width="1.6" fill="none"/>`
      : mood === "sad"
      ? `<line x1="11" y1="20" x2="15" y2="22" stroke="#64748B" stroke-width="1.6"/><line x1="19" y1="22" x2="23" y2="20" stroke="#64748B" stroke-width="1.6"/><circle cx="25" cy="18" r="1.5" fill="#38BDF8"/>`
      : `<circle cx="13" cy="20" r="1.5" fill="#0F172A"/><circle cx="21" cy="20" r="1.5" fill="#0F172A"/>`;

    const sproutAccessory = equippedHead === "sunglasses"
      ? `<g><rect x="9.5" y="18.5" width="6.5" height="4" rx="1.2" fill="#0F172A" stroke="#38BDF8" stroke-width="0.5"/><rect x="18" y="18.5" width="6.5" height="4" rx="1.2" fill="#0F172A" stroke="#38BDF8" stroke-width="0.5"/><line x1="16" y1="20.5" x2="18" y2="20.5" stroke="#38BDF8" stroke-width="0.7"/></g>`
      : equippedHead === "laurel"
      ? `<g><path d="M 8 16 C 8 11, 12 10, 17 10 C 22 10, 26 11, 26 16" stroke="#F59E0B" stroke-width="1.1" fill="none"/><circle cx="17" cy="10" r="1.3" fill="#EF4444"/></g>`
      : "";

    avatarEl.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 17 17 C 17 10, 17 8, 17 7" stroke="#059669" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="12" cy="8" rx="4.5" ry="2.8" transform="rotate(-25 12 8)" fill="${leafColor}" />
        <ellipse cx="22" cy="8" rx="4.5" ry="2.8" transform="rotate(25 22 8)" fill="${leafColor}" />
        ${flower}
        <rect x="7" y="15" width="20" height="15" rx="5" fill="${potColor}" />
        <rect x="8.5" y="17" width="17" height="11.5" rx="3.5" fill="#F8FAFC" />
        ${eyes}
        ${sproutAccessory}
      </svg>
    `;
  });
}

// ─── Điều Khiển Kho Hạt Giống Tri Thức & Câu Nói Truyền Cảm Hứng ────────────
function setupKnowledgeAndQuotesControls() {
  const btnFeed = document.getElementById("btn-feed-pet-seed");
  const quotesList = document.getElementById("custom-quotes-list");
  const inputNewQuote = document.getElementById("input-new-custom-quote");
  const btnAddQuote = document.getElementById("btn-add-custom-quote");
  const btnPresetPartner = document.getElementById("btn-apply-quotes-partner");
  const btnPresetGoal = document.getElementById("btn-apply-quotes-goal");

  // 1. Cho Pet ăn hạt mầm
  if (btnFeed) {
    btnFeed.onclick = () => {
      chrome.storage.local.get(["pet_state"], (res) => {
        const pet = res.pet_state || {};
        const currentSeeds = pet.knowledgeSeeds || 0;
        if (currentSeeds <= 0) {
          showDevToast("⚠️ Bạn chưa có hạt mầm nào! Hãy xem video học tập ≥ 80% để nhận hạt.");
          return;
        }
        pet.knowledgeSeeds = currentSeeds - 1;
        pet.energy = Math.min(100, (pet.energy || 0) + 15);
        pet.isWilted = false;
        pet.mood = pet.energy >= 70 ? "happy" : pet.energy >= 40 ? "neutral" : "sad";
        chrome.storage.local.set({ pet_state: pet }, () => {
          updatePetBanner();
          renderQuotesList();
          showDevToast("🌱 Đã cho Pet ăn! +15⚡ năng lượng và phục hồi mầm xanh tươi tốt!");
        });
      });
    };
  }

  // 2. Render danh sách câu khích lệ
  function renderQuotesList() {
    if (!quotesList) return;
    chrome.storage.local.get(["pet_state"], (res) => {
      const pet = res.pet_state || {};
      const quotes = Array.isArray(pet.customQuotes) ? pet.customQuotes : [];
      if (quotes.length === 0) {
        quotesList.innerHTML = `<div style="font-size:10px; color:var(--text-muted); font-style:italic;">Chưa có câu nói nào. Chọn mẫu gợi ý hoặc tự nhập câu mới phía dưới.</div>`;
        return;
      }
      quotesList.innerHTML = quotes.map((q, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:4px 8px;">
          <span style="font-size:11px; color:#F1F5F9; flex:1;">"${q}"</span>
          <button type="button" class="btn-delete-quote" data-idx="${idx}" style="background:none; border:none; color:#EF4444; font-size:12px; cursor:pointer; padding:0 4px;" title="Xóa">✕</button>
        </div>
      `).join("");

      quotesList.querySelectorAll(".btn-delete-quote").forEach((btn) => {
        btn.onclick = (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
          quotes.splice(idx, 1);
          pet.customQuotes = quotes;
          chrome.storage.local.set({ pet_state: pet }, () => {
            renderQuotesList();
            showDevToast("✓ Đã xóa câu nói.");
          });
        };
      });
    });
  }

  // 3. Thêm câu nói mới
  if (btnAddQuote && inputNewQuote) {
    btnAddQuote.onclick = () => {
      const val = inputNewQuote.value.trim();
      if (!val) return;
      chrome.storage.local.get(["pet_state"], (res) => {
        const pet = res.pet_state || {};
        const quotes = Array.isArray(pet.customQuotes) ? [...pet.customQuotes] : [];
        if (quotes.length >= 5) {
          showDevToast("⚠️ Tối đa 5 câu nói truyền cảm hứng!");
          return;
        }
        quotes.push(val);
        pet.customQuotes = quotes;
        chrome.storage.local.set({ pet_state: pet }, () => {
          inputNewQuote.value = "";
          renderQuotesList();
          showDevToast("✓ Đã thêm câu nói truyền cảm hứng mới!");
        });
      });
    };
  }

  // 4. Mẫu Người Thương
  if (btnPresetPartner) {
    btnPresetPartner.onclick = () => {
      const partnerPresets = [
        "Anh hứa hôm nay hoàn thành mục tiêu cơ mà! 💖",
        "Cố lên bạn ơi, người ta đang đợi bạn đấy! ✨",
        "Đừng lướt vô thức nữa, làm xong việc sớm rồi về với tớ nhé! 🌸"
      ];
      chrome.storage.local.get(["pet_state"], (res) => {
        const pet = res.pet_state || {};
        pet.customQuotes = partnerPresets;
        chrome.storage.local.set({ pet_state: pet }, () => {
          renderQuotesList();
          showDevToast("💖 Đã áp dụng mẫu câu Người Thương!");
        });
      });
    };
  }

  // 5. Mẫu Mục Tiêu Lớn
  if (btnPresetGoal) {
    btnPresetGoal.onclick = () => {
      const goalPresets = [
        "Kỷ luật hôm nay là tự do ngày mai! 🎯",
        "Tập trung cho tương lai rực rỡ, không bỏ cuộc! 🚀",
        "Mỗi phút xao nhãng đang lùi xa mục tiêu của bạn! 🔥"
      ];
      chrome.storage.local.get(["pet_state"], (res) => {
        const pet = res.pet_state || {};
        pet.customQuotes = goalPresets;
        chrome.storage.local.set({ pet_state: pet }, () => {
          renderQuotesList();
          showDevToast("🎯 Đã áp dụng mẫu câu Mục Tiêu Lớn!");
        });
      });
    };
  }

  renderQuotesList();
}

// Điều khiển Tủ Đồ Phụ Kiện (Wardrobe)
function setupWardrobeControls() {
  const badgeStreak = document.getElementById("pet-wardrobe-streak-badge");
  const btnSunglasses = document.getElementById("btn-toggle-sunglasses");
  const btnLaurel = document.getElementById("btn-toggle-laurel");

  chrome.storage.local.get(["pet_state"], (res) => {
    const pet = res.pet_state || {};
    const streak = pet.currentStreak ?? pet.streakDays ?? 0;
    if (badgeStreak) badgeStreak.textContent = `🔥 ${streak} ngày`;

    const accessories = pet.accessories || { unlockedItems: [], equipped: { head: null, body: null } };
    const unlocked = new Set(accessories.unlockedItems || []);
    if (streak >= 3) unlocked.add("sunglasses");
    if (streak >= 7) unlocked.add("laurel");
    accessories.unlockedItems = Array.from(unlocked);

    const equippedHead = accessories.equipped?.head;

    // 1. Kính Râm (Streak >= 3)
    if (btnSunglasses) {
      const isSunglassesUnlocked = unlocked.has("sunglasses");
      if (!isSunglassesUnlocked) {
        btnSunglasses.textContent = "🔒 Cần Streak 3d";
        btnSunglasses.disabled = true;
        btnSunglasses.style.opacity = "0.5";
        btnSunglasses.style.cursor = "not-allowed";
        btnSunglasses.style.background = "rgba(255,255,255,0.05)";
        btnSunglasses.style.color = "#94A3B8";
      } else {
        btnSunglasses.disabled = false;
        btnSunglasses.style.opacity = "1";
        btnSunglasses.style.cursor = "pointer";
        if (equippedHead === "sunglasses") {
          btnSunglasses.textContent = "✓ Đang Đeo (Tháo)";
          btnSunglasses.style.background = "rgba(16, 185, 129, 0.25)";
          btnSunglasses.style.borderColor = "rgba(16, 185, 129, 0.6)";
          btnSunglasses.style.color = "#34D399";
        } else {
          btnSunglasses.textContent = "Đeo Ngay";
          btnSunglasses.style.background = "linear-gradient(135deg, #8B5CF6, #6366F1)";
          btnSunglasses.style.borderColor = "rgba(139, 92, 246, 0.5)";
          btnSunglasses.style.color = "#FFFFFF";
        }

        btnSunglasses.onclick = () => {
          accessories.equipped = accessories.equipped || {};
          accessories.equipped.head = equippedHead === "sunglasses" ? null : "sunglasses";
          pet.accessories = accessories;
          chrome.storage.local.set({ pet_state: pet }, () => {
            setupWardrobeControls();
            updatePetBanner();
          });
        };
      }
    }

    // 2. Vòng Nguyệt Quế (Streak >= 7)
    if (btnLaurel) {
      const isLaurelUnlocked = unlocked.has("laurel");
      if (!isLaurelUnlocked) {
        btnLaurel.textContent = "🔒 Cần Streak 7d";
        btnLaurel.disabled = true;
        btnLaurel.style.opacity = "0.5";
        btnLaurel.style.cursor = "not-allowed";
        btnLaurel.style.background = "rgba(255,255,255,0.05)";
        btnLaurel.style.color = "#94A3B8";
      } else {
        btnLaurel.disabled = false;
        btnLaurel.style.opacity = "1";
        btnLaurel.style.cursor = "pointer";
        if (equippedHead === "laurel") {
          btnLaurel.textContent = "✓ Đang Đeo (Tháo)";
          btnLaurel.style.background = "rgba(16, 185, 129, 0.25)";
          btnLaurel.style.borderColor = "rgba(16, 185, 129, 0.6)";
          btnLaurel.style.color = "#34D399";
        } else {
          btnLaurel.textContent = "Đeo Ngay";
          btnLaurel.style.background = "linear-gradient(135deg, #F59E0B, #D97706)";
          btnLaurel.style.borderColor = "rgba(245, 158, 11, 0.5)";
          btnLaurel.style.color = "#FFFFFF";
        }

        btnLaurel.onclick = () => {
          accessories.equipped = accessories.equipped || {};
          accessories.equipped.head = equippedHead === "laurel" ? null : "laurel";
          pet.accessories = accessories;
          chrome.storage.local.set({ pet_state: pet }, () => {
            setupWardrobeControls();
            updatePetBanner();
          });
        };
      }
    }
  });
}

// Nút mở trang Phản Tư
function setupReflectionButton() {
  const btn = document.getElementById("btn-open-reflection");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const url = chrome.runtime.getURL("src/reflection/reflection.html");
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  });
}

// Nút mở trang Dashboard (hỗ trợ cả nút header và nút footer)
function setupDashboardButton() {
  const openDashboard = (e) => {
    e?.preventDefault();
    const url = chrome.runtime.getURL("src/dashboard/dashboard.html");
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  const btnFooter = document.getElementById("btn-open-dashboard");
  if (btnFooter) btnFooter.addEventListener("click", openDashboard);

  const btnHeader = document.getElementById("header-btn-dashboard");
  if (btnHeader) btnHeader.addEventListener("click", openDashboard);

  const btnPopupFull = document.getElementById("btn-popup-open-full-dashboard");
  if (btnPopupFull) btnPopupFull.addEventListener("click", openDashboard);
}

// ─── Dev Test Mode Controller ────────────────────────────────────────────────
function showDevToast(msg) {
  const toast = document.getElementById("dev-toast-msg");
  if (!toast) return;
  toast.innerText = msg;
  toast.style.display = "block";
  setTimeout(() => {
    if (toast) toast.style.display = "none";
  }, 2500);
}

function sendDevMessageToActiveTab(msg, onReply) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, msg, (res) => {
        if (chrome.runtime.lastError) {
          showDevToast("⚠️ Tab hiện tại không phải YouTube/Facebook hoặc chưa reload!");
        } else {
          if (onReply) onReply(res);
        }
      });
    } else {
      showDevToast("⚠️ Không tìm thấy tab hoạt động!");
    }
  });
}

function setupDevMode() {
  const toggleDev = document.getElementById("toggle-dev-mode");
  const tabDevBtn = document.getElementById("tab-dev");
  const devEnergyVal = document.getElementById("dev-energy-val");
  const sliderEnergy = document.getElementById("dev-slider-energy");

  if (!toggleDev || !tabDevBtn) return;

  // 1. Kiểm tra trạng thái lưu
  chrome.storage.local.get(["dev_mode_enabled", "pet_state"], (res) => {
    const isEnabled = !!res.dev_mode_enabled;
    toggleDev.checked = isEnabled;
    tabDevBtn.style.display = isEnabled ? "flex" : "none";

    const pet = res.pet_state || { energy: 100 };
    if (devEnergyVal) devEnergyVal.innerText = `${pet.energy ?? 100}%`;
    if (sliderEnergy) sliderEnergy.value = pet.energy ?? 100;
  });

  // 2. Chuyển đổi công tắc Dev
  toggleDev.addEventListener("change", () => {
    const enabled = toggleDev.checked;
    chrome.storage.local.set({ dev_mode_enabled: enabled });
    tabDevBtn.style.display = enabled ? "flex" : "none";
    if (!enabled && tabDevBtn.classList.contains("active")) {
      const tabYt = document.getElementById("tab-yt");
      if (tabYt) tabYt.click();
    }
  });

  // 3. Helper cập nhật năng lượng Pet
  const applyEnergy = (val) => {
    val = Math.max(0, Math.min(100, Number(val) || 0));
    if (sliderEnergy) sliderEnergy.value = val;
    if (devEnergyVal) devEnergyVal.innerText = `${val}%`;

    chrome.storage.local.get(["pet_state"], (res) => {
      const state = res.pet_state || { energy: 100, mood: "happy" };
      state.energy = val;
      if (val >= 50) state.mood = "happy";
      else if (val >= 20) state.mood = "neutral";
      else state.mood = "sad";

      chrome.storage.local.set({ pet_state: state }, () => {
        updatePetBanner();
        showDevToast(`⚡ Đã chỉnh năng lượng Pet: ${val}%`);
      });
    });
  };

  document.getElementById("dev-btn-energy-0")?.addEventListener("click", () => applyEnergy(0));
  document.getElementById("dev-btn-energy-10")?.addEventListener("click", () => applyEnergy(10));
  document.getElementById("dev-btn-energy-50")?.addEventListener("click", () => applyEnergy(50));
  document.getElementById("dev-btn-energy-100")?.addEventListener("click", () => applyEnergy(100));

  sliderEnergy?.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    if (devEnergyVal) devEnergyVal.innerText = `${val}%`;
  });
  sliderEnergy?.addEventListener("change", (e) => {
    applyEnergy(Number(e.target.value));
  });

  // 4. Phiên lướt & Mục tiêu
  document.getElementById("dev-btn-expire-session")?.addEventListener("click", () => {
    sendDevMessageToActiveTab({ type: "DEV_EXPIRE_SESSION" }, () => {
      showDevToast("⏱️ Đã kích hoạt hết giờ phiên lướt!");
    });
  });

  document.getElementById("dev-btn-open-intent")?.addEventListener("click", () => {
    sendDevMessageToActiveTab({ type: "DEV_OPEN_INTENT" }, () => {
      showDevToast("🎯 Đã mở khung hỏi Mục tiêu!");
    });
  });

  // 5. Mốc Cảnh báo & Ma sát (M1, M2, M3, F5)
  document.getElementById("dev-btn-trigger-m1")?.addEventListener("click", () => {
    sendDevMessageToActiveTab({ type: "DEV_TRIGGER_MILESTONE", milestone: "m1" }, () => {
      showDevToast("🔔 Đã kích hoạt Mốc 1 (Toast Pet)");
    });
  });

  document.getElementById("dev-btn-trigger-m2")?.addEventListener("click", () => {
    sendDevMessageToActiveTab({ type: "DEV_TRIGGER_MILESTONE", milestone: "m2" }, () => {
      showDevToast("⚠️ Đã kích hoạt Mốc 2 (Modal 10s)");
    });
  });

  document.getElementById("dev-btn-trigger-m3")?.addEventListener("click", () => {
    sendDevMessageToActiveTab({ type: "DEV_TRIGGER_MILESTONE", milestone: "m3" }, () => {
      showDevToast("🚫 Đã kích hoạt Mốc 3 (Modal Chặn)");
    });
  });

  document.getElementById("dev-btn-trigger-f5")?.addEventListener("click", () => {
    sendDevMessageToActiveTab({ type: "DEV_TRIGGER_MILESTONE", milestone: "f5" }, () => {
      showDevToast("⚡ Đã kích hoạt cảnh báo F5 Spam");
    });
  });

  // 6. Streak Focus (0, 3, 7)
  const applyStreak = (days) => {
    chrome.storage.local.get(["petState", "pet_state", "petAccessories"], (res) => {
      const state = res.petState || res.pet_state || { energy: 100, mood: "happy" };
      state.currentStreak = days;
      state.streakDays = days;
      state.lastStreakDate = getTodayKey();

      const accessories = res.petAccessories || { unlockedItems: [], equipped: { head: null, body: null } };
      const unlocked = new Set(accessories.unlockedItems || []);
      if (days >= 3) unlocked.add("sunglasses");
      else unlocked.delete("sunglasses");
      if (days >= 7) unlocked.add("laurel");
      else unlocked.delete("laurel");
      accessories.unlockedItems = Array.from(unlocked);

      chrome.storage.local.set({ petState: state, pet_state: state, petAccessories: accessories }, () => {
        updatePetBanner();
        setupWardrobeControls();
        showDevToast(`🔥 Đã thiết lập Streak: ${days} ngày!`);
      });
    });
  };

  document.getElementById("dev-btn-streak-0")?.addEventListener("click", () => applyStreak(0));
  document.getElementById("dev-btn-streak-3")?.addEventListener("click", () => applyStreak(3));
  document.getElementById("dev-btn-streak-7")?.addEventListener("click", () => applyStreak(7));

  // 7. Hệ thống: 22h Phản tư & Pomodoro Break
  document.getElementById("dev-btn-reflection-22h")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "TRIGGER_DEV_REFLECTION" }, () => {
      showDevToast("🌙 Đã mở trang Phản tư 22h00!");
    });
  });

  document.getElementById("dev-btn-toggle-pomodoro")?.addEventListener("click", () => {
    chrome.storage.local.get(["pomodoro_state"], (res) => {
      const current = res.pomodoro_state || { isBreak: false, mode: "focus" };
      const newBreak = !current.isBreak;
      current.isBreak = newBreak;
      current.mode = newBreak ? "break" : "focus";
      chrome.storage.local.set({ pomodoro_state: current }, () => {
        showDevToast(`🍅 Pomodoro: ${newBreak ? "☕ Đang nghỉ ngơi (Break)" : "🎯 Đang tập trung (Focus)"}`);
      });
    });
  });

  // 8. Reset toàn bộ dữ liệu Test
  document.getElementById("dev-btn-reset-all")?.addEventListener("click", () => {
    if (!confirm("Bạn có chắc chắn muốn khôi phục dữ liệu gốc không? (Năng lượng 100⚡, Streak 0 ngày, xóa dữ liệu test hôm nay)")) return;
    chrome.runtime.sendMessage({ type: "RESET_DEV_DATA" }, () => {
      showDevToast("✓ Đã khôi phục dữ liệu gốc!");
      updateDashboard();
      updatePetBanner();
      setupWardrobeControls();
    });
  });
}

// ─── Digital Detox: Hồi phục năng lượng khi tắt ứng dụng ─────────────────────
function checkIdleRecoveryPopup() {
  chrome.storage.local.get(["lastActiveTimestamp", "petState", "pet_state"], (res) => {
    const lastActive = res.lastActiveTimestamp;
    const now = Date.now();
    if (!lastActive) {
      chrome.storage.local.set({ lastActiveTimestamp: now });
      return;
    }
    const elapsedMinutes = Math.floor((now - lastActive) / (60 * 1000));
    if (elapsedMinutes >= 30) {
      const bonusSteps = Math.floor(elapsedMinutes / 30);
      const bonus = bonusSteps * 5;
      const pet = res.petState || res.pet_state || { energy: 100, mood: "happy" };
      const oldEnergy = pet.energy ?? 100;
      const newEnergy = Math.min(100, oldEnergy + bonus);
      pet.energy = newEnergy;
      if (newEnergy >= 50) pet.mood = "happy";
      else if (newEnergy >= 20) pet.mood = "neutral";

      chrome.storage.local.set({
        petState: pet,
        pet_state: pet,
        lastActiveTimestamp: now
      }, () => {
        updatePetBanner();
        const hrs = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} phút`;
        const toast = document.createElement("div");
        toast.style.cssText = `
          position:fixed; top:12px; left:50%; transform:translateX(-50%); z-index:999999;
          background:linear-gradient(135deg, rgba(16,185,129,0.95), rgba(6,182,212,0.95));
          color:#fff; padding:8px 14px; border-radius:12px; font-size:11px; font-weight:700;
          box-shadow:0 8px 25px rgba(0,0,0,0.5); text-align:center; max-width:320px;
          animation:mindfulBubblePop 0.3s ease;
        `;
        toast.innerHTML = `🌿 Digital Detox (${timeStr})<br/><span style="font-size:10px; font-weight:normal;">Pet đã được nghỉ ngơi và hồi phục <b style="color:#FEF08A;">+${bonus}⚡</b>!</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
      });
    } else {
      chrome.storage.local.set({ lastActiveTimestamp: now });
    }
  });
}

// Khởi chạy khi popup load
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupResetButton();
  setupSettings();
  setupPomodoroControls();
  setupPetControls();
  setupWardrobeControls();
  setupKnowledgeAndQuotesControls();
  setupReflectionButton();
  setupDashboardButton();
  setupPopupAuditLogToggle();
  setupPopupAuditFilterTabs();
  setupCategoryPopover();
  setupKeywordFilterSettings();
  setupDevMode();
  updateDashboard();
  updatePetBanner();
  checkIdleRecoveryPopup();
});

// Lắng nghe thay đổi real-time từ storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    updateDashboard();
    if (changes.petState || changes.pet_state || changes.petConfig || changes.petAccessories) {
      updatePetBanner();
      setupWardrobeControls();
      setupKnowledgeAndQuotesControls();
    }
  }
});
