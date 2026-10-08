/**
 * Mindful Social Media Tracker — Long-Term Psychological Analytics Dashboard
 * 
 * Quản lý:
 * 1. Phân tích chuyển biến tâm lý theo chu kỳ: Tuần (T2 -> CN), Tháng & 30 Ngày gần nhất.
 * 2. 3 Nhóm chỉ số cốt lõi: Impulsive Metrics, Intentional Metrics, Discipline & Gamification.
 * 3. 5 Biểu đồ tương tác thuần Canvas/CSS:
 *    - Biểu đồ Cột Chồng (Stacked Bar Chart: 4 danh mục Mục tiêu/Giải trí/Lạc lối/Chưa rõ).
 *    - Biểu đồ Đường Xu Hướng Kép (Multi-Line Chart: Swipes vs F5).
 *    - Bản đồ Nhiệt Hoạt Động (Hourly Activity Heatmap: 7 ngày x 24 giờ & Điểm mù tâm lý).
 *    - Biểu đồ Vành Khuyên (Donut Chart: Phân bổ danh mục & Đám mây từ khóa).
 *    - Thanh Đo So Sánh Chú Ý (Attention Span Gauge: Xem sâu >=80% vs Bỏ dở <15%).
 * 4. AI Reflection Coach: Phân tích Heuristic tâm lý Offline + Nút đào sâu bằng Gemini Flash.
 * 5. Chế độ Demo Dữ Liệu Mẫu (4 tuần tiến bộ rõ nét) & Sao lưu / Khôi phục JSON.
 */

// ─── STATE TOÀN CỤC ──────────────────────────────────────────────────────────

let allStorageData = {};
let appConfig = {};
let petState = {};
let isDevMode = false;
let isDemoMode = false;

// Chu kỳ thời gian hiện tại
let cycleMode = "week"; // "week" | "month" | "rolling30"
let cycleIndex = 0;     // 0 = kỳ hiện tại, -1 = kỳ trước, -2 = kỳ trước nữa...
let availableCycles = [];

// Cache tooltip
const tooltipEl = document.getElementById("chart-tooltip");

// ─── TIỆN ÍCH ĐỊNH DẠNG ───────────────────────────────────────────────────────

function formatDuration(seconds) {
  const sec = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function showToast(msg) {
  const toast = document.getElementById("dashboard-toast");
  if (!toast) return;
  toast.innerHTML = msg;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 4000);
}

function showChartTooltip(x, y, text) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = text;
  tooltipEl.style.left = `${x + 12}px`;
  tooltipEl.style.top = `${y - 28}px`;
  tooltipEl.style.display = "block";
}

function hideChartTooltip() {
  if (tooltipEl) tooltipEl.style.display = "none";
}

// ─── DỮ LIỆU MẪU TIẾN BỘ TÂM LÝ 4 TUẦN (DEMO MODE) ──────────────────────────

function generate4WeekDemoData() {
  const demoData = {};
  const today = new Date();
  
  // Tạo 28 ngày dữ liệu (4 tuần)
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0 = Chủ Nhật, 1..6 = T2..T7
    const weekIndex = Math.floor((27 - i) / 7); // 0 (tuần 1 - nghiện nhất) -> 3 (tuần 4 - kiểm soát tốt nhất)

    // Hành vi cải thiện dần qua 4 tuần
    // Tuần 1: swipes cao (40-60/ngày), F5 cao (8-14), ít xem sâu, nhiều bỏ dở
    // Tuần 4: swipes thấp (10-20/ngày), F5 thấp (1-3), nhiều xem sâu, ít bỏ dở
    const factor = 1 - (weekIndex * 0.25); // 1.0 -> 0.75 -> 0.5 -> 0.25
    
    // Đêm thứ 4 và thứ 6 là điểm mù (vulnerable window)
    const isVulnerableNight = (dayOfWeek === 3 || dayOfWeek === 5);
    const bonusVulnerable = isVulnerableNight ? (weekIndex < 3 ? 15 : 4) : 0;

    const ytShorts = Math.max(4, Math.round((25 + Math.random() * 15 + bonusVulnerable) * factor));
    const fbReels = Math.max(2, Math.round((18 + Math.random() * 12 + bonusVulnerable) * factor));
    const fbFeed = Math.max(5, Math.round((20 + Math.random() * 10) * factor));
    const totalSwipes = ytShorts + fbReels + fbFeed;

    const reloads = Math.max(1, Math.round((10 + Math.random() * 6 + (isVulnerableNight ? 4 : 0)) * factor));
    const activeSec = Math.round((2400 + totalSwipes * 45) * factor);
    const passiveSec = Math.round(600 * factor);

    // Categories: Tuần 1 nhiều Distraction, Tuần 4 nhiều Goal
    const goalRatio = 0.2 + (weekIndex * 0.18); // 20% -> 74%
    const distractRatio = Math.max(0.1, 0.6 - (weekIndex * 0.14)); // 60% -> 18%
    const leisureRatio = 0.15;
    const unclassRatio = Math.max(0.05, 1 - (goalRatio + distractRatio + leisureRatio));

    const totalLong = Math.max(2, Math.round(3 + weekIndex * 1.5));
    const usefulCount = Math.round(totalLong * goalRatio);
    const impulsiveCount = Math.round(totalLong * (1 - goalRatio) * 0.6);

    // Hourly buckets (24h)
    const hourly = Array.from({ length: 24 }, (_, h) => {
      let hSwipes = 0;
      let hReloads = 0;
      if (h >= 8 && h <= 11) {
        hSwipes = Math.round(totalSwipes * 0.1);
        hReloads = Math.round(reloads * 0.1);
      } else if (h >= 12 && h <= 13) {
        hSwipes = Math.round(totalSwipes * 0.2);
        hReloads = Math.round(reloads * 0.2);
      } else if (h >= 19 && h <= 21) {
        hSwipes = Math.round(totalSwipes * 0.25);
        hReloads = Math.round(reloads * 0.2);
      } else if (h >= 22 && h <= 23) {
        // Khung giờ tối muộn cao đột biến ở tuần 1 & 2
        const nightFactor = isVulnerableNight ? 0.45 : 0.3;
        hSwipes = Math.round(totalSwipes * nightFactor);
        hReloads = Math.round(reloads * nightFactor);
      }
      return {
        hour: h,
        swipes: hSwipes,
        longVideos: h === 20 ? usefulCount : 0,
        feedScrolled: Math.round(hSwipes * 0.3),
        reloads: hReloads,
        activeSeconds: Math.round(hSwipes * 60)
      };
    });

    // Watched videos logs
    const watchedVideos = [
      {
        title: "Lộ trình Fullstack Web & AI Master 2026",
        channel: "Tech Hub",
        category: "goal",
        watchedSeconds: 650,
        durationSeconds: 700,
        isCompletion: true,
        timestamp: d.getTime()
      },
      {
        title: "Phương pháp Deep Work: Kiểm soát dopamine",
        channel: "Mind Mastery",
        category: "goal",
        watchedSeconds: 900,
        durationSeconds: 1000,
        isCompletion: true,
        timestamp: d.getTime()
      },
      {
        title: "Review Bàn phím cơ & Setup góc làm việc",
        channel: "Tech Life",
        category: "leisure",
        watchedSeconds: 200,
        durationSeconds: 400,
        isCompletion: false,
        timestamp: d.getTime()
      },
      {
        title: "Drama livestream tranh cãi nảy lửa cực căng",
        channel: "Góc Hóng Biến",
        category: "distraction",
        watchedSeconds: 45,
        durationSeconds: 600,
        isCompletion: false,
        timestamp: d.getTime()
      }
    ];

    demoData[`stats_${dateStr}`] = {
      date: dateStr,
      youtube: {
        summary: { activeSeconds: Math.round(activeSec * 0.6), passiveSeconds: passiveSec, reloadCount: Math.round(reloads * 0.6) },
        shorts: { totalSwipes: ytShorts, validViews: Math.round(ytShorts * 0.4), impulsiveCount: Math.round(ytShorts * 0.5 * factor), loopViews: Math.round(ytShorts * 0.1) },
        longVideos: { totalWatched: totalLong, usefulCount, impulsiveCount }
      },
      facebook: {
        summary: { activeSeconds: Math.round(activeSec * 0.4), passiveSeconds: 0, reloadCount: Math.round(reloads * 0.4) },
        feed: { feedPostsScrolled: fbFeed, feedPostsRead: Math.round(fbFeed * 0.3) },
        reels: { totalSwipes: fbReels, validViews: Math.round(fbReels * 0.4), impulsiveCount: Math.round(fbReels * 0.5 * factor), loopViews: 0 },
        longVideos: { totalWatched: 1, usefulCount: 0, impulsiveCount: 1 }
      },
      hourly,
      temptation: {
        resistedCount: 1 + weekIndex * 2,
        succumbedCount: Math.max(0, 3 - weekIndex)
      },
      watchedVideos,
      petEnergyEndOfDay: Math.min(100, 50 + weekIndex * 15 + Math.round(Math.random() * 10))
    };
  }

  return demoData;
}

// ─── TẢI & CHUẨN HÓA DỮ LIỆU TỪ CHROME STORAGE ───────────────────────────────

async function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      allStorageData = items || {};
      appConfig = allStorageData.app_config || {};
      petState = allStorageData.pet_state || {};
      isDevMode = Boolean(allStorageData.devMode || allStorageData.dev_mode);

      // Hiển thị nút demo nếu đang ở chế độ Test
      const demoBtn = document.getElementById("btn-toggle-demo");
      if (demoBtn) {
        demoBtn.style.display = isDevMode ? "inline-flex" : "none";
        demoBtn.classList.toggle("active", isDemoMode);
      }

      buildAvailableCycles();
      resolve();
    });
  });
}

// Chuẩn hóa một record ngày
function normalizeDayRecord(dateStr, val) {
  if (!val || typeof val !== "object") return null;

  const yt = val.youtube || {};
  const fb = val.facebook || {};
  const tk = val.tiktok || {};

  const ytActive = yt.summary?.activeSeconds ?? yt.summary?.activeTimeSeconds ?? 0;
  const ytPassive = yt.summary?.passiveSeconds ?? yt.summary?.passiveTimeSeconds ?? 0;
  const ytReloads = yt.summary?.reloadCount || 0;
  const ytShorts = yt.shorts?.totalSwipes ?? yt.shortVideos?.totalSwipes ?? 0;
  const ytShortsImpulsive = yt.shorts?.impulsiveCount || 0;
  const ytLongWatched = yt.longVideos?.totalWatched || 0;
  const ytUseful = yt.longVideos?.usefulCount ?? 0;
  const ytLongImpulsive = yt.longVideos?.impulsiveCount ?? 0;

  const fbActive = fb.summary?.activeSeconds ?? fb.summary?.activeTimeSeconds ?? 0;
  const fbPassive = fb.summary?.passiveSeconds ?? fb.summary?.passiveTimeSeconds ?? 0;
  const fbReloads = fb.summary?.reloadCount || 0;
  const fbFeed = fb.feed?.feedPostsScrolled ?? fb.summary?.feedPostsScrolled ?? 0;
  const fbReels = fb.reels?.totalSwipes || 0;
  const fbReelsImpulsive = fb.reels?.impulsiveCount || 0;
  const fbLongWatched = fb.longVideos?.totalWatched || 0;
  const fbUseful = fb.longVideos?.usefulCount ?? 0;
  const fbLongImpulsive = fb.longVideos?.impulsiveCount ?? 0;

  const tkActive = tk.summary?.activeSeconds || 0;
  const tkReloads = tk.summary?.reloadCount || 0;
  const tkShorts = tk.shorts?.totalSwipes || 0;
  const tkShortsImpulsive = tk.shorts?.impulsiveCount || 0;

  const activeSec = ytActive + fbActive + tkActive;
  const passiveSec = ytPassive + fbPassive;
  const totalSwipes = ytShorts + fbReels + fbFeed + tkShorts;
  const totalReloads = ytReloads + fbReloads + tkReloads;
  const totalLong = ytLongWatched + fbLongWatched;
  const totalUseful = ytUseful + fbUseful;

  // Tổng số lần bỏ dở / lướt bốc đồng (Skips < 15% thời lượng hoặc shorts < 2s)
  const totalSkips = ytShortsImpulsive + fbReelsImpulsive + tkShortsImpulsive + ytLongImpulsive + fbLongImpulsive;
  const totalVideosEncountered = totalSwipes + totalLong;
  const impulsiveSkipPct = totalVideosEncountered > 0 ? Math.round((totalSkips / totalVideosEncountered) * 100) : 0;

  // Phân bổ categories từ watchedVideos
  let goalSec = 0;
  let leisureSec = 0;
  let distractSec = 0;
  let unclassSec = 0;
  const watched = Array.isArray(val.watchedVideos) ? val.watchedVideos : [];

  for (const v of watched) {
    const sec = v.watchedSeconds || 60;
    const cat = v.category || "unclassified";
    if (cat === "goal") goalSec += sec;
    else if (cat === "leisure") leisureSec += sec;
    else if (cat === "distraction") distractSec += sec;
    else unclassSec += sec;
  }

  // Nếu không có watchedVideos chi tiết, nội suy từ usefulCount và swipes
  if (watched.length === 0) {
    const approxTotal = Math.max(1, activeSec);
    const usefulEstimateSec = totalUseful * 300;
    goalSec = Math.min(approxTotal, usefulEstimateSec);
    distractSec = Math.min(approxTotal - goalSec, totalSwipes * 30);
    leisureSec = Math.max(0, approxTotal - goalSec - distractSec);
  }

  // Temptation box breathing
  const temptation = val.temptation || {};
  const resisted = temptation.resistedCount || 0;
  const succumbed = temptation.succumbedCount || 0;

  // Pet energy
  const petEnergy = val.petEnergyEndOfDay ?? 100;

  // Hourly buckets
  const hourly = Array.isArray(val.hourly) ? val.hourly : [];

  return {
    date: dateStr,
    activeSec,
    passiveSec,
    totalSec: activeSec + passiveSec,
    totalSwipes,
    totalReloads,
    totalLong,
    totalUseful,
    totalSkips,
    impulsiveSkipPct,
    categories: {
      goalSec,
      leisureSec,
      distractSec,
      unclassSec
    },
    temptation: {
      resisted,
      succumbed
    },
    petEnergy,
    hourly,
    watchedVideos: watched
  };
}

// ─── TỔ CHỨC CÁC CHU KỲ THỜI GIAN (TUẦN / THÁNG / 30 NGÀY) ──────────────────

function buildAvailableCycles() {
  const dataSource = isDemoMode ? generate4WeekDemoData() : allStorageData;
  const dateKeyRegex = /^stats_\d{4}-\d{2}-\d{2}$/;
  const dateStrings = [];

  for (const key of Object.keys(dataSource)) {
    if (dateKeyRegex.test(key)) {
      dateStrings.push(key.replace("stats_", ""));
    }
  }

  dateStrings.sort(); // Tăng dần (cũ -> mới)

  // Nếu không có dữ liệu, thêm ngày hôm nay làm mặc định
  if (dateStrings.length === 0) {
    dateStrings.push(new Date().toISOString().slice(0, 10));
  }

  availableCycles = [];

  if (cycleMode === "week") {
    // Nhóm theo tuần ISO (Thứ Hai đến Chủ Nhật)
    const weekMap = new Map();
    for (const dStr of dateStrings) {
      const d = new Date(dStr + "T00:00:00");
      // Tìm Thứ Hai của tuần
      const day = d.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = monday.toISOString().slice(0, 10);
      const sunStr = sunday.toISOString().slice(0, 10);
      const weekKey = `${monStr}_${sunStr}`;

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          key: weekKey,
          label: `Tuần ${formatDateBrief(monStr)} - ${formatDateBrief(sunStr)}`,
          startDate: monStr,
          endDate: sunStr,
          dates: []
        });
      }
      weekMap.get(weekKey).dates.push(dStr);
    }
    availableCycles = Array.from(weekMap.values());
  } else if (cycleMode === "month") {
    // Nhóm theo tháng lịch
    const monthMap = new Map();
    for (const dStr of dateStrings) {
      const mKey = dStr.slice(0, 7); // YYYY-MM
      if (!monthMap.has(mKey)) {
        const [y, m] = mKey.split("-");
        monthMap.set(mKey, {
          key: mKey,
          label: `Tháng ${m}/${y}`,
          startDate: `${mKey}-01`,
          endDate: `${mKey}-31`,
          dates: []
        });
      }
      monthMap.get(mKey).dates.push(dStr);
    }
    availableCycles = Array.from(monthMap.values());
  } else {
    // Rolling 30 ngày gần nhất
    const lastDateStr = dateStrings[dateStrings.length - 1];
    const lastDate = new Date(lastDateStr + "T00:00:00");
    const startDate = new Date(lastDate);
    startDate.setDate(lastDate.getDate() - 29);
    const startStr = startDate.toISOString().slice(0, 10);

    const dates = dateStrings.filter(d => d >= startStr && d <= lastDateStr);
    availableCycles = [
      {
        key: "rolling30",
        label: `30 Ngày: ${formatDateBrief(startStr)} - ${formatDateBrief(lastDateStr)}`,
        startDate: startStr,
        endDate: lastDateStr,
        dates
      }
    ];
  }

  // Mặc định chọn kỳ mới nhất
  cycleIndex = availableCycles.length - 1;
}

function formatDateBrief(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return `${parts[2]}/${parts[1]}`;
}

// ─── TỔNG HỢP SỐ LIỆU CHU KỲ (SUMMARY) ──────────────────────────────────────

function getCycleRecords(cycleObj) {
  if (!cycleObj) return [];
  const dataSource = isDemoMode ? generate4WeekDemoData() : allStorageData;
  const records = [];

  // Tạo đầy đủ các ngày trong chu kỳ (để biểu đồ không bị gãy đoạn)
  const start = new Date(cycleObj.startDate + "T00:00:00");
  const end = new Date(cycleObj.endDate + "T00:00:00");
  const cur = new Date(start);

  while (cur <= end) {
    const dStr = cur.toISOString().slice(0, 10);
    const rawVal = dataSource[`stats_${dStr}`];
    const normalized = normalizeDayRecord(dStr, rawVal) || {
      date: dStr,
      activeSec: 0,
      passiveSec: 0,
      totalSec: 0,
      totalSwipes: 0,
      totalReloads: 0,
      totalLong: 0,
      totalUseful: 0,
      totalSkips: 0,
      impulsiveSkipPct: 0,
      categories: { goalSec: 0, leisureSec: 0, distractSec: 0, unclassSec: 0 },
      temptation: { resisted: 0, succumbed: 0 },
      petEnergy: 100,
      hourly: [],
      watchedVideos: []
    };
    records.push(normalized);
    cur.setDate(cur.getDate() + 1);
  }

  return records;
}

function summarizeRecords(records) {
  let totalActive = 0;
  let totalPassive = 0;
  let totalSwipes = 0;
  let totalReloads = 0;
  let totalLong = 0;
  let totalUseful = 0;
  let totalSkips = 0;
  let totalGoalSec = 0;
  let totalLeisureSec = 0;
  let totalDistractSec = 0;
  let totalUnclassSec = 0;
  let totalResisted = 0;
  let totalSuccumbed = 0;
  let petEnergySum = 0;

  // Lưới 7x24 cho heatmap
  // Hàng 0 = Thứ Hai, ... Hàng 6 = Chủ Nhật
  const heatmap7x24 = Array.from({ length: 7 }, () => Array(24).fill(0));
  const watchedAll = [];

  // Focus Streak tính trong kỳ
  let focusStreak = 0;
  let currentRun = 0;

  for (const r of records) {
    totalActive += r.activeSec;
    totalPassive += r.passiveSec;
    totalSwipes += r.totalSwipes;
    totalReloads += r.totalReloads;
    totalLong += r.totalLong;
    totalUseful += r.totalUseful;
    totalSkips += r.totalSkips;

    totalGoalSec += r.categories.goalSec;
    totalLeisureSec += r.categories.leisureSec;
    totalDistractSec += r.categories.distractSec;
    totalUnclassSec += r.categories.unclassSec;

    totalResisted += r.temptation.resisted;
    totalSuccumbed += r.temptation.succumbed;
    petEnergySum += r.petEnergy;

    if (Array.isArray(r.watchedVideos)) {
      watchedAll.push(...r.watchedVideos);
    }

    // Kiểm tra Mốc 3 vi phạm (trần đỏ: e.g. swipes >= 45 hoặc reloads >= 30)
    const hitM3 = r.totalSwipes >= 45 || r.totalReloads >= 25;
    if (!hitM3 && r.totalSec > 0) {
      currentRun++;
      if (currentRun > focusStreak) focusStreak = currentRun;
    } else if (hitM3) {
      currentRun = 0;
    }

    // Cộng dồn vào heatmap 7x24
    const d = new Date(r.date + "T00:00:00");
    const dayIdx = (d.getDay() + 6) % 7; // Chuyển Chủ Nhật (0) thành 6, T2 thành 0
    if (Array.isArray(r.hourly)) {
      for (const h of r.hourly) {
        if (h && typeof h.hour === "number" && h.hour >= 0 && h.hour < 24) {
          heatmap7x24[dayIdx][h.hour] += (h.swipes || 0) + (h.reloads || 0);
        }
      }
    }
  }

  const daysCount = Math.max(1, records.length);
  const totalEncounters = totalSwipes + totalLong;
  const impulsiveSkipPct = totalEncounters > 0 ? Math.round((totalSkips / totalEncounters) * 100) : 0;
  const deepWatchPct = totalLong > 0 ? Math.round((totalUseful / totalLong) * 100) : 0;

  const totalCatSec = Math.max(1, totalGoalSec + totalLeisureSec + totalDistractSec + totalUnclassSec);
  const goalPct = Math.round((totalGoalSec / totalCatSec) * 100);
  const leisurePct = Math.round((totalLeisureSec / totalCatSec) * 100);
  const distractPct = Math.round((totalDistractSec / totalCatSec) * 100);
  const unclassPct = Math.max(0, 100 - (goalPct + leisurePct + distractPct));

  const temptationTotal = totalResisted + totalSuccumbed;
  const temptationResistPct = temptationTotal > 0 ? Math.round((totalResisted / temptationTotal) * 100) : 100;

  const avgPetEnergy = Math.round(petEnergySum / daysCount);

  // Tìm khung giờ chết (Vulnerable Window)
  let maxHourSum = 0;
  let vulnerableHour = 22;
  let vulnerableDayIdx = 2; // Thứ 4
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (heatmap7x24[d][h] > maxHourSum) {
        maxHourSum = heatmap7x24[d][h];
        vulnerableHour = h;
        vulnerableDayIdx = d;
      }
    }
  }

  const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
  const vulnerableLabel = maxHourSum > 10
    ? `${dayNames[vulnerableDayIdx]} sau ${vulnerableHour}:00 (Mật độ ${maxHourSum} lượt)`
    : "Không phát hiện điểm mù quá tải rõ rệt";

  return {
    daysCount,
    totalActive,
    totalPassive,
    totalSwipes,
    totalReloads,
    totalLong,
    totalUseful,
    totalSkips,
    impulsiveSkipPct,
    deepWatchPct,
    goalPct,
    leisurePct,
    distractPct,
    unclassPct,
    focusStreak: Math.max(focusStreak, petState.streakDays || petState.currentStreak || 1),
    totalResisted,
    totalSuccumbed,
    temptationResistPct,
    avgPetEnergy,
    heatmap7x24,
    vulnerableHour,
    vulnerableDayIdx,
    vulnerableLabel,
    watchedAll
  };
}

// ─── CẬP NHẬT GIAO DIỆN CHU KỲ & 3 NHÓM CHỈ SỐ CỐT LÕI ───────────────────────

function renderCycleUI() {
  if (availableCycles.length === 0) return;

  const currentCycle = availableCycles[cycleIndex];
  const prevCycle = cycleIndex > 0 ? availableCycles[cycleIndex - 1] : null;

  document.getElementById("cycle-label").innerText = currentCycle.label;
  document.getElementById("btn-cycle-prev").disabled = (cycleIndex <= 0);
  document.getElementById("btn-cycle-next").disabled = (cycleIndex >= availableCycles.length - 1);

  const currentRecords = getCycleRecords(currentCycle);
  const currentSummary = summarizeRecords(currentRecords);

  let prevSummary = null;
  if (prevCycle) {
    const prevRecords = getCycleRecords(prevCycle);
    prevSummary = summarizeRecords(prevRecords);
  }

  // 1. Nhóm Impulsive Metrics
  document.getElementById("metric-swipes-val").innerText = currentSummary.totalSwipes.toLocaleString();
  document.getElementById("metric-reloads-val").innerText = currentSummary.totalReloads.toLocaleString();
  document.getElementById("metric-skips-val").innerText = `${currentSummary.impulsiveSkipPct}%`;

  renderDelta("metric-swipes-delta", currentSummary.totalSwipes, prevSummary?.totalSwipes, true);
  renderDelta("metric-reloads-delta", currentSummary.totalReloads, prevSummary?.totalReloads, true);
  renderDelta("metric-skips-delta", currentSummary.impulsiveSkipPct, prevSummary?.impulsiveSkipPct, true);

  // 2. Nhóm Intentional Metrics
  document.getElementById("metric-goal-ratio-val").innerText = `${currentSummary.goalPct}%`;
  document.getElementById("metric-deep-val").innerText = `${currentSummary.deepWatchPct}%`;
  document.getElementById("metric-time-val").innerText = formatDuration(currentSummary.totalActive);

  renderDelta("metric-goal-ratio-delta", currentSummary.goalPct, prevSummary?.goalPct, false);
  renderDelta("metric-deep-delta", currentSummary.deepWatchPct, prevSummary?.deepWatchPct, false);
  renderDelta("metric-time-delta", currentSummary.totalActive, prevSummary?.totalActive, true);

  // 3. Nhóm Discipline & Gamification
  document.getElementById("metric-streak-val").innerText = `${currentSummary.focusStreak} ngày`;
  document.getElementById("metric-resist-val").innerText = `${currentSummary.temptationResistPct}%`;
  document.getElementById("metric-resist-badge").innerText = `${currentSummary.totalResisted} lần vượt qua`;
  document.getElementById("metric-pet-val").innerText = `${currentSummary.avgPetEnergy}⚡`;

  const petMoodText = currentSummary.avgPetEnergy >= 70 ? "✨ Tươi tỉnh" : currentSummary.avgPetEnergy >= 40 ? "😐 Bình thường" : "🥀 Mệt mỏi";
  const moodBadge = document.getElementById("metric-pet-mood");
  moodBadge.innerText = petMoodText;
  moodBadge.className = `metric-delta ${currentSummary.avgPetEnergy >= 70 ? "delta-pos" : currentSummary.avgPetEnergy >= 40 ? "delta-neutral" : "delta-neg"}`;

  // Badge so sánh tổng quan ở thanh điều hướng
  const compBadge = document.getElementById("cycle-comparison-badge");
  if (prevSummary) {
    const swipeDelta = calcPctChange(currentSummary.totalSwipes, prevSummary.totalSwipes);
    const reloadDelta = calcPctChange(currentSummary.totalReloads, prevSummary.totalReloads);
    const isGood = swipeDelta <= 0;
    compBadge.className = `comparison-badge ${isGood ? "down-good" : "up-bad"}`;
    compBadge.innerHTML = `So với kỳ trước: <b>${swipeDelta > 0 ? "+" : ""}${swipeDelta}% Swipes</b> | <b>${reloadDelta > 0 ? "+" : ""}${reloadDelta}% F5</b>`;
  } else {
    compBadge.className = "comparison-badge";
    compBadge.innerHTML = "Kỳ khởi đầu — Chưa có dữ liệu kỳ trước";
  }

  // Render 5 Biểu đồ
  renderStackedBarChart(currentRecords);
  renderMultiLineChart(currentRecords);
  renderHourlyHeatmap(currentSummary.heatmap7x24, currentSummary.vulnerableLabel);
  renderDonutChart(currentSummary);
  renderAttentionGauge(currentSummary);

  // Render Bảng chi tiết
  renderHistoryTable(currentRecords);

  // Render AI Coach Insight
  renderAiCoachInsight(currentSummary, prevSummary);
}

function calcPctChange(curr, prev) {
  if (!prev || prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function renderDelta(elId, curr, prev, lowerIsBetter) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (prev === undefined || prev === null) {
    el.innerText = "--";
    el.className = "metric-delta delta-neutral";
    return;
  }
  const pct = calcPctChange(curr, prev);
  const isPositive = pct > 0;
  const isZero = pct === 0;

  const text = isZero ? "0%" : `${isPositive ? "+" : ""}${pct}%`;
  el.innerText = text;

  if (isZero) {
    el.className = "metric-delta delta-neutral";
  } else if (lowerIsBetter) {
    el.className = `metric-delta ${isPositive ? "delta-neg" : "delta-pos"}`;
  } else {
    el.className = `metric-delta ${isPositive ? "delta-pos" : "delta-neg"}`;
  }
}

// ─── SETUP CANVAS HIDPI SCALING ──────────────────────────────────────────────

function setupCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const container = canvas.parentElement;
  const rect = container ? container.getBoundingClientRect() : { width: 440, height: 250 };
  const dpr = window.devicePixelRatio || 1;

  const width = Math.max(300, Math.floor(rect.width || container.clientWidth || 440));
  const height = Math.max(180, Math.floor(rect.height || container.clientHeight || 250));

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, width, height, canvas };
}

// ─── BIỂU ĐỒ 1: STACKED BAR CHART (CÁN CÂN NĂNG LƯỢNG) ───────────────────────

function renderStackedBarChart(records) {
  const setup = setupCanvas("chart-stacked-bars");
  if (!setup) return;
  const { ctx, width, height, canvas } = setup;

  ctx.clearRect(0, 0, width, height);
  if (records.length === 0) return;

  const padding = { top: 25, right: 15, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max minutes
  let maxMin = 60;
  for (const r of records) {
    const mins = Math.ceil(r.totalSec / 60);
    if (mins > maxMin) maxMin = mins;
  }
  maxMin = Math.ceil(maxMin / 30) * 30; // bội số 30p

  // Lưới ngang
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fillStyle = "#64748B";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + (chartH / steps) * i;
    const val = Math.round(maxMin - (maxMin / steps) * i);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val}m`, padding.left - 6, y + 3);
  }

  // Vẽ các cột chồng
  const n = records.length;
  const colWidth = Math.min(32, Math.max(10, (chartW / n) * 0.65));
  const stepX = chartW / n;
  const barsData = [];

  records.forEach((r, idx) => {
    const x = padding.left + stepX * idx + (stepX - colWidth) / 2;
    const cat = r.categories;
    const goalMin = cat.goalSec / 60;
    const leisureMin = cat.leisureSec / 60;
    const distractMin = cat.distractSec / 60;
    const unclassMin = cat.unclassSec / 60;

    const goalH = (goalMin / maxMin) * chartH;
    const leisureH = (leisureMin / maxMin) * chartH;
    const distractH = (distractMin / maxMin) * chartH;
    const unclassH = (unclassMin / maxMin) * chartH;

    let curY = padding.top + chartH;

    // 1. Mục tiêu (Xanh ngọc)
    if (goalH > 0) {
      curY -= goalH;
      ctx.fillStyle = "#10B981";
      ctx.fillRect(x, curY, colWidth, goalH);
    }
    // 2. Giải trí (Tím)
    if (leisureH > 0) {
      curY -= leisureH;
      ctx.fillStyle = "#8B5CF6";
      ctx.fillRect(x, curY, colWidth, leisureH);
    }
    // 3. Lạc lối (Đỏ)
    if (distractH > 0) {
      curY -= distractH;
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(x, curY, colWidth, distractH);
    }
    // 4. Chưa rõ (Xám)
    if (unclassH > 0) {
      curY -= unclassH;
      ctx.fillStyle = "#64748B";
      ctx.fillRect(x, curY, colWidth, unclassH);
    }

    // Nhãn ngày ngắn (MM-DD)
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "center";
    const dateLabel = r.date.slice(5);
    ctx.fillText(dateLabel, x + colWidth / 2, height - 12);

    barsData.push({
      x,
      y: curY,
      w: colWidth,
      h: padding.top + chartH - curY,
      record: r
    });
  });

  // Hover Tooltip cho Stacked Bar
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hit = barsData.find(b => mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= padding.top + chartH);
    if (hit) {
      const r = hit.record;
      showChartTooltip(e.clientX, e.clientY, `
        <b>Ngày: ${r.date}</b><br/>
        🎯 Mục tiêu: ${Math.round(r.categories.goalSec / 60)}m<br/>
        🎮 Giải trí: ${Math.round(r.categories.leisureSec / 60)}m<br/>
        🛑 Lạc lối: ${Math.round(r.categories.distractSec / 60)}m<br/>
        📱 Tổng swipes: ${r.totalSwipes}
      `);
    } else {
      hideChartTooltip();
    }
  };

  canvas.onmouseleave = hideChartTooltip;
}

// ─── BIỂU ĐỒ 2: MULTI-LINE CHART (ĐỐI CHIẾU ĐỘ DỐC CƠN NGHIỆN) ───────────────

function renderMultiLineChart(records) {
  const setup = setupCanvas("chart-multi-line");
  if (!setup) return;
  const { ctx, width, height, canvas } = setup;

  ctx.clearRect(0, 0, width, height);
  if (records.length === 0) return;

  const padding = { top: 25, right: 20, bottom: 35, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max value (swipes hoặc reloads)
  let maxVal = 30;
  for (const r of records) {
    if (r.totalSwipes > maxVal) maxVal = r.totalSwipes;
    if (r.totalReloads > maxVal) maxVal = r.totalReloads;
  }
  maxVal = Math.ceil(maxVal / 10) * 10;

  // Trục & Lưới ngang
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fillStyle = "#64748B";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + (chartH / steps) * i;
    const val = Math.round(maxVal - (maxVal / steps) * i);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(val, padding.left - 6, y + 3);
  }

  const n = records.length;
  const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;
  const pointsSwipes = [];
  const pointsReloads = [];

  records.forEach((r, idx) => {
    const x = n > 1 ? padding.left + stepX * idx : padding.left + chartW / 2;
    const ySwipes = padding.top + chartH - (r.totalSwipes / maxVal) * chartH;
    const yReloads = padding.top + chartH - (r.totalReloads / maxVal) * chartH;
    pointsSwipes.push({ x, y: ySwipes, val: r.totalSwipes, date: r.date });
    pointsReloads.push({ x, y: yReloads, val: r.totalReloads, date: r.date });

    // Trục X
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "center";
    ctx.fillText(r.date.slice(5), x, height - 12);
  });

  // Đường 1: Swipes (Tím sáng #A78BFA) kèm Area gradient
  if (pointsSwipes.length > 0) {
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, "rgba(167, 139, 250, 0.25)");
    grad.addColorStop(1, "rgba(167, 139, 250, 0.0)");

    ctx.beginPath();
    ctx.moveTo(pointsSwipes[0].x, padding.top + chartH);
    pointsSwipes.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pointsSwipes[pointsSwipes.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Vẽ Line
    ctx.beginPath();
    pointsSwipes.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "#A78BFA";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Điểm nút
    pointsSwipes.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#A78BFA";
      ctx.fill();
      ctx.strokeStyle = "#080C14";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // Đường 2: Reloads (Cam #F59E0B)
  if (pointsReloads.length > 0) {
    ctx.beginPath();
    pointsReloads.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.stroke();

    pointsReloads.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#F59E0B";
      ctx.fill();
    });
  }

  // Hover Tooltip cho Multi-line
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closest = null;
    let minDist = 25;
    pointsSwipes.forEach((p, i) => {
      const dist = Math.abs(mouseX - p.x);
      if (dist < minDist) {
        minDist = dist;
        closest = { p, r: pointsReloads[i] };
      }
    });

    if (closest) {
      showChartTooltip(e.clientX, e.clientY, `
        <b>Ngày: ${closest.p.date}</b><br/>
        📱 Tổng Swipes: <b>${closest.p.val}</b><br/>
        🔄 F5 / Reload: <b>${closest.r.val}</b>
      `);
    } else {
      hideChartTooltip();
    }
  };

  canvas.onmouseleave = hideChartTooltip;
}

// ─── BIỂU ĐỒ 3: HOURLY ACTIVITY HEATMAP (7 NGÀY X 24 GIỜ) ────────────────────

function renderHourlyHeatmap(grid7x24, vulnerableLabel) {
  const container = document.getElementById("heatmap-grid");
  if (!container) return;
  container.innerHTML = "";

  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

  // 1. Hàng tiêu đề giờ (0h - 23h)
  const headerCorner = document.createElement("div");
  headerCorner.className = "heatmap-header-cell";
  headerCorner.innerText = "Thứ / Giờ";
  container.appendChild(headerCorner);

  for (let h = 0; h < 24; h++) {
    const hCell = document.createElement("div");
    hCell.className = "heatmap-header-cell";
    hCell.innerText = `${h}h`;
    container.appendChild(hCell);
  }

  // 2. 7 Hàng ngày
  for (let d = 0; d < 7; d++) {
    const rowLabel = document.createElement("div");
    rowLabel.className = "heatmap-row-label";
    rowLabel.innerText = dayNames[d];
    container.appendChild(rowLabel);

    for (let h = 0; h < 24; h++) {
      const val = grid7x24[d][h] || 0;
      const cell = document.createElement("div");

      let level = "level-0";
      if (val >= 36) level = "level-4";
      else if (val >= 16) level = "level-3";
      else if (val >= 6) level = "level-2";
      else if (val > 0) level = "level-1";

      cell.className = `heatmap-cell ${level}`;
      cell.title = `${dayNames[d]}, lúc ${h}:00 - ${h}:59: ${val} lượt lướt/F5`;

      container.appendChild(cell);
    }
  }

  // 3. Hiển thị banner cờ cảnh báo điểm mù
  const flagBox = document.getElementById("heatmap-vulnerable-flag");
  const flagText = document.getElementById("vulnerable-flag-text");
  if (flagBox && flagText) {
    if (vulnerableLabel && !vulnerableLabel.includes("Không phát hiện")) {
      flagBox.style.display = "flex";
      flagText.innerText = vulnerableLabel;
    } else {
      flagBox.style.display = "none";
    }
  }
}

// ─── BIỂU ĐỒ 4: DONUT CHART & PHÂN BỔ TỪ KHÓA ────────────────────────────────

function renderDonutChart(summary) {
  const setup = setupCanvas("chart-donut");
  if (!setup) return;
  const { ctx, width, height, canvas } = setup;

  ctx.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const outerR = Math.min(centerX, centerY) - 12;
  const innerR = outerR * 0.62;

  const data = [
    { label: "Mục tiêu", pct: summary.goalPct, color: "#10B981" },
    { label: "Giải trí", pct: summary.leisurePct, color: "#8B5CF6" },
    { label: "Lạc lối", pct: summary.distractPct, color: "#EF4444" },
    { label: "Chưa rõ", pct: summary.unclassPct, color: "#64748B" }
  ];

  let currentAngle = -0.5 * Math.PI;

  data.forEach(slice => {
    const sliceAngle = (slice.pct / 100) * 2 * Math.PI;
    if (sliceAngle > 0.001) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerR, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
    }
    currentAngle += sliceAngle;
  });

  // Vòng trung tâm rỗng
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerR - 2, 0, Math.PI * 2);
  ctx.fillStyle = "#0B111E";
  ctx.fill();

  // Chữ ở tâm Donut
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${summary.goalPct}%`, centerX, centerY - 6);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "10px sans-serif";
  ctx.fillText("Mục Tiêu", centerX, centerY + 12);

  // Cập nhật text % bên cạnh
  document.getElementById("cat-pct-goal").innerText = `${summary.goalPct}%`;
  document.getElementById("cat-pct-leisure").innerText = `${summary.leisurePct}%`;
  document.getElementById("cat-pct-distract").innerText = `${summary.distractPct}%`;
  document.getElementById("cat-pct-unclass").innerText = `${summary.unclassPct}%`;

  // Đám mây từ khóa
  renderKeywordsCloud(summary.watchedAll);
}

function renderKeywordsCloud(videos) {
  const container = document.getElementById("keywords-cloud-box");
  if (!container) return;
  container.innerHTML = "";

  const defaultKeywords = ["Lập trình", "Tiếng Anh", "Deep Work", "Tài chính", "Sách", "Giải trí", "Drama", "Review", "Công nghệ"];
  const wordCounts = {};

  defaultKeywords.forEach(k => { wordCounts[k] = 1; });

  if (Array.isArray(videos)) {
    videos.forEach(v => {
      const t = (v.title || "").toLowerCase();
      if (t.includes("lập trình") || t.includes("code") || t.includes("web")) wordCounts["Lập trình"] = (wordCounts["Lập trình"] || 0) + 2;
      if (t.includes("tiếng anh") || t.includes("ielts") || t.includes("english")) wordCounts["Tiếng Anh"] = (wordCounts["Tiếng Anh"] || 0) + 2;
      if (t.includes("tài chính") || t.includes("tiền") || t.includes("đầu tư")) wordCounts["Tài chính"] = (wordCounts["Tài chính"] || 0) + 1;
      if (t.includes("drama") || t.includes("bóc phốt") || t.includes("hóng")) wordCounts["Drama"] = (wordCounts["Drama"] || 0) + 2;
      if (t.includes("sách") || t.includes("deep work") || t.includes("thói quen")) wordCounts["Deep Work"] = (wordCounts["Deep Work"] || 0) + 2;
    });
  }

  const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  for (const [kw, count] of sorted) {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";
    tag.innerText = `#${kw} (${count})`;
    container.appendChild(tag);
  }
}

// ─── BIỂU ĐỒ 5: ATTENTION SPAN GAUGE (XEM SÂU VS BỎ DỞ) ───────────────────────

function renderAttentionGauge(summary) {
  const deepPct = summary.deepWatchPct;
  const skipPct = summary.impulsiveSkipPct;

  document.getElementById("gauge-deep-pct").innerText = `${deepPct}%`;
  document.getElementById("gauge-skip-pct").innerText = `${skipPct}%`;

  const total = Math.max(1, deepPct + skipPct);
  const fillWidth = Math.round((deepPct / total) * 100);

  const fillEl = document.getElementById("ratio-bar-deep-fill");
  if (fillEl) fillEl.style.width = `${fillWidth}%`;

  document.getElementById("gauge-total-deep-count").innerText = summary.totalUseful;
  document.getElementById("gauge-total-skip-count").innerText = summary.totalSkips;

  const verdictEl = document.getElementById("gauge-verdict-text");
  if (verdictEl) {
    if (deepPct >= 65 && skipPct <= 25) {
      verdictEl.innerText = "🌟 Khả năng duy trì chú ý sâu đang hồi phục xuất sắc! Bạn đã kiểm soát tốt phản xạ bấm tắt vội vã.";
      verdictEl.style.color = "#34D399";
    } else if (deepPct >= 40) {
      verdictEl.innerText = "⚖️ Cán cân chú ý đang dần cân bằng. Cố gắng kiên nhẫn xem trọn vẹn các bài giảng kiến thức.";
      verdictEl.style.color = "#FBBF24";
    } else {
      verdictEl.innerText = "⚠️ Dấu hiệu mất kiên nhẫn: Tỷ lệ lướt tắt ngang còn cao. Khuyên dùng Pomodoro 25p để rèn luyện.";
      verdictEl.style.color = "#F87171";
    }
  }
}

// ─── BẢNG LỊCH SỬ CHI TIẾT THEO NGÀY ─────────────────────────────────────────

function renderHistoryTable(records) {
  const tbody = document.getElementById("history-table-body");
  const countBadge = document.getElementById("table-row-count");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (countBadge) countBadge.innerText = `${records.length} ngày ghi nhận`;

  const reversed = [...records].reverse();

  reversed.forEach(r => {
    const tr = document.createElement("tr");

    let badgeDiscipline = '<span class="badge badge-good">Tốt ✓</span>';
    if (r.totalSwipes >= 45 || r.totalReloads >= 25) {
      badgeDiscipline = '<span class="badge badge-danger">Chạm Mốc 3 ⚠️</span>';
    } else if (r.totalSwipes >= 25) {
      badgeDiscipline = '<span class="badge badge-warn">Cảnh báo M2</span>';
    }

    const goalRatio = r.categories ? Math.round((r.categories.goalSec / Math.max(1, r.totalSec)) * 100) : 0;

    tr.innerHTML = `
      <td style="font-weight:700; color:#F8FAFC;">${r.date}</td>
      <td>${formatDuration(r.activeSec)}</td>
      <td style="color:#A78BFA; font-weight:600;">${r.totalSwipes}</td>
      <td style="color:#F59E0B; font-weight:600;">${r.totalReloads}</td>
      <td style="color:#10B981; font-weight:700;">${goalRatio}%</td>
      <td>
        <span style="color:#34D399;">${r.totalUseful} sâu</span> / 
        <span style="color:#F87171;">${r.totalSkips} bỏ</span>
      </td>
      <td>${badgeDiscipline}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── AI REFLECTION COACH: PHÂN TÍCH HEURISTIC & GEMINI FLASH ─────────────────

function renderAiCoachInsight(currentSummary, prevSummary) {
  const feedbackEl = document.getElementById("coach-feedback-text");
  const strengthsEl = document.getElementById("coach-pillar-strengths");
  const vulnerableEl = document.getElementById("coach-pillar-vulnerable");
  const actionEl = document.getElementById("coach-pillar-action");

  let swipeDelta = prevSummary ? calcPctChange(currentSummary.totalSwipes, prevSummary.totalSwipes) : 0;
  let reloadDelta = prevSummary ? calcPctChange(currentSummary.totalReloads, prevSummary.totalReloads) : 0;

  let feedback = "";
  if (prevSummary && swipeDelta <= -15) {
    feedback = `Kỳ này bạn đã giảm được <b>${Math.abs(swipeDelta)}%</b> số lượt vuốt vô thức so với kỳ trước! Tần suất F5 tìm dopamine cũng giảm <b>${Math.abs(reloadDelta)}%</b>. Đây là bằng chứng trực quan cho thấy não bộ đã bớt đòi hỏi dopamine ngắn và chuyển dần sang trạng thái chủ động kiểm soát.`;
  } else if (currentSummary.goalPct >= 50) {
    feedback = `Cán cân năng lượng trong kỳ đang nghiêng hẳn về nội dung Mục tiêu (chiếm <b>${currentSummary.goalPct}%</b>). Bạn đã hoàn thành trọn vẹn nhiều nội dung học tập chất lượng thay vì bị cuốn vào vòng lặp lướt vô thức.`;
  } else {
    feedback = `Kỳ này ghi nhận tổng cộng <b>${currentSummary.totalSwipes}</b> lượt vuốt và <b>${currentSummary.totalReloads}</b> lần tải lại trang. Tỷ lệ bỏ dở giữa chừng đang ở mức <b>${currentSummary.impulsiveSkipPct}%</b>. Hãy cùng thiết lập lại nhịp điệu sinh hoạt để phục hồi khả năng tập trung sâu.`;
  }

  feedbackEl.innerHTML = feedback;

  // Strengths
  strengthsEl.innerText = currentSummary.totalUseful > 0
    ? `Xem trọn vẹn ${currentSummary.totalUseful} video học tập dài và giữ chuỗi Focus ${currentSummary.focusStreak} ngày.`
    : `Duy trì ghi nhận nhật ký đều đặn và kiên trì rèn luyện chánh niệm.`;

  // Vulnerable window
  vulnerableEl.innerText = currentSummary.vulnerableLabel;

  // Action recommendation
  if (currentSummary.vulnerableHour >= 22) {
    actionEl.innerText = `Chủ động kích hoạt chế độ Màn hình Đen Trắng sớm lúc 21h30 và hoàn thành bài thở Box Breathing trước khi mở mạng xã hội.`;
  } else {
    actionEl.innerText = `Đặt giới hạn 25 phút Pomodoro cho mỗi phiên lướt để bảo toàn 100⚡ năng lượng cho Linh vật.`;
  }
}

// Gọi Gemini Flash qua Background Service Worker
async function callGeminiCoach() {
  const btn = document.getElementById("btn-ask-gemini");
  const statusMsg = document.getElementById("coach-status-msg");
  const feedbackEl = document.getElementById("coach-feedback-text");
  const strengthsEl = document.getElementById("coach-pillar-strengths");
  const vulnerableEl = document.getElementById("coach-pillar-vulnerable");
  const actionEl = document.getElementById("coach-pillar-action");

  if (!appConfig.geminiApiKey) {
    showToast("⚠️ Vui lòng nhập Gemini API Key trong Popup để mở khóa AI Coach!");
    statusMsg.innerText = "⚠️ Chưa có Gemini API Key. Hãy cấu hình trong Cài Đặt của Extension.";
    return;
  }

  btn.disabled = true;
  btn.innerText = "⏳ Đang đúc kết...";
  statusMsg.innerText = "🤖 Đang gửi dữ liệu hành vi tới Google Gemini Flash...";

  const currentCycle = availableCycles[cycleIndex];
  const prevCycle = cycleIndex > 0 ? availableCycles[cycleIndex - 1] : null;
  const currentSummary = summarizeRecords(getCycleRecords(currentCycle));
  const prevSummary = prevCycle ? summarizeRecords(getCycleRecords(prevCycle)) : null;

  try {
    chrome.runtime.sendMessage({
      type: "GEMINI_LONGTERM_COACH",
      periodType: cycleMode === "month" ? "tháng" : "tuần",
      periodLabel: currentCycle.label,
      currentSummary: {
        totalSwipes: currentSummary.totalSwipes,
        totalReloads: currentSummary.totalReloads,
        impulsiveSkipPct: currentSummary.impulsiveSkipPct,
        goalPct: currentSummary.goalPct,
        distractionPct: currentSummary.distractPct,
        deepWatchPct: currentSummary.deepWatchPct,
        focusStreak: currentSummary.focusStreak,
        temptationResistPct: currentSummary.temptationResistPct,
        avgPetEnergy: currentSummary.avgPetEnergy,
        deltaSwipes: prevSummary ? calcPctChange(currentSummary.totalSwipes, prevSummary.totalSwipes) : 0,
        deltaReloads: prevSummary ? calcPctChange(currentSummary.totalReloads, prevSummary.totalReloads) : 0
      },
      prevSummary: prevSummary ? {
        totalSwipes: prevSummary.totalSwipes,
        totalReloads: prevSummary.totalReloads,
        goalPct: prevSummary.goalPct,
        deepWatchPct: prevSummary.deepWatchPct,
        impulsiveSkipPct: prevSummary.impulsiveSkipPct
      } : null,
      masterGoal: appConfig.masterGoal,
      vulnerableHours: currentSummary.vulnerableLabel,
      topStrengths: `Xem ${currentSummary.totalUseful} video mục tiêu, ${currentSummary.totalResisted} lần thở Box Breathing`
    }, (response) => {
      btn.disabled = false;
      btn.innerText = "✨ Nhờ AI Coach Đào Sâu (Gemini)";

      if (response && response.ok) {
        feedbackEl.innerText = response.coachFeedback;
        if (response.strengths) strengthsEl.innerText = response.strengths;
        if (response.vulnerableWindow) vulnerableEl.innerText = response.vulnerableWindow;
        if (response.actionAdvice) actionEl.innerText = response.actionAdvice;
        statusMsg.innerText = "✨ Đã nhận phản hồi khai vấn cá nhân hóa từ Google Gemini Flash!";
        showToast("✨ AI Coach đã phân tích xong kỳ này!");
      } else {
        statusMsg.innerText = `⚡ ${response?.error || "Không thể gọi Gemini API"}. Đã dùng mô hình tâm lý Offline.`;
      }
    });
  } catch (err) {
    btn.disabled = false;
    btn.innerText = "✨ Nhờ AI Coach Đào Sâu (Gemini)";
    statusMsg.innerText = "Lỗi kết nối. Đã hiển thị phân tích hành vi nội bộ.";
  }
}

// ─── SAO LƯU & KHÔI PHỤC JSON ────────────────────────────────────────────────

function setupExportImport() {
  const btnExport = document.getElementById("btn-export-json");
  const btnImportTrigger = document.getElementById("btn-import-json-trigger");
  const inputFile = document.getElementById("import-json-file");

  if (btnExport) {
    btnExport.addEventListener("click", () => {
      chrome.storage.local.get(null, (items) => {
        const jsonStr = JSON.stringify(items, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mindful_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("📥 Đã xuất toàn bộ lịch sử dữ liệu JSON thành công!");
      });
    });
  }

  if (btnImportTrigger && inputFile) {
    btnImportTrigger.addEventListener("click", () => inputFile.click());
    inputFile.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (typeof parsed !== "object" || parsed === null) throw new Error("JSON không hợp lệ");

          chrome.storage.local.set(parsed, () => {
            showToast("📤 Khôi phục dữ liệu JSON thành công! Đang tải lại...");
            setTimeout(() => {
              loadData().then(() => renderCycleUI());
            }, 800);
          });
        } catch (err) {
          showToast(`❌ Lỗi đọc file: ${err.message}`);
        }
      };
      reader.readAsText(file);
      inputFile.value = "";
    });
  }
}

// ─── SỰ KIỆN ĐIỀU HƯỚNG & KHỞI CHẠY ──────────────────────────────────────────

function setupEventListeners() {
  // 1. Chuyển đổi tab chu kỳ: Tuần / Tháng / 30 Ngày
  document.querySelectorAll(".cycle-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cycle-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      cycleMode = btn.dataset.mode;
      buildAvailableCycles();
      renderCycleUI();
    });
  });

  // 2. Nút mũi tên chuyển kỳ
  document.getElementById("btn-cycle-prev")?.addEventListener("click", () => {
    if (cycleIndex > 0) {
      cycleIndex--;
      renderCycleUI();
    }
  });

  document.getElementById("btn-cycle-next")?.addEventListener("click", () => {
    if (cycleIndex < availableCycles.length - 1) {
      cycleIndex++;
      renderCycleUI();
    }
  });

  // 3. Nút Demo Mode
  document.getElementById("btn-toggle-demo")?.addEventListener("click", () => {
    isDemoMode = !isDemoMode;
    const btn = document.getElementById("btn-toggle-demo");
    if (btn) btn.classList.toggle("active", isDemoMode);
    buildAvailableCycles();
    renderCycleUI();
    showToast(isDemoMode ? "🧪 Đã bật Chế độ Dữ Liệu Mẫu (4 tuần tiến bộ rõ nét)" : "✓ Đã trở về Dữ liệu thật");
  });

  // 4. Nút gọi Gemini Coach
  document.getElementById("btn-ask-gemini")?.addEventListener("click", callGeminiCoach);

  // 5. Resize window tự vẽ lại canvas sắc nét
  window.addEventListener("resize", () => {
    if (availableCycles.length > 0) {
      const currentRecords = getCycleRecords(availableCycles[cycleIndex]);
      const currentSummary = summarizeRecords(currentRecords);
      renderStackedBarChart(currentRecords);
      renderMultiLineChart(currentRecords);
      renderDonutChart(currentSummary);
    }
  });
}

// ─── KHỞI TẠO DASHBOARD ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  setupExportImport();
  setupEventListeners();
  await loadData();
  renderCycleUI();
});
