/**
 * Mindful Social Media Tracker - Long-term Analytics Dashboard Controller
 * Quản lý: Biểu đồ xu hướng Canvas thuần (7/30/90 ngày), Thống kê tổng hợp,
 * Sao lưu Export JSON và Khôi phục Import JSON an toàn.
 */

let allStorageData = {};
let dailyRecords = [];
let selectedDays = 7;

// ─── Tiện Ích Định Dạng ───────────────────────────────────────────────────────

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
  setTimeout(() => {
    toast.classList.remove("visible");
  }, 4000);
}

// ─── Tải & Chuẩn Hóa Dữ Liệu Từ Storage ──────────────────────────────────────

async function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      allStorageData = items || {};
      const dateKeyRegex = /^stats_\d{4}-\d{2}-\d{2}$/;
      const records = [];

      for (const [key, val] of Object.entries(allStorageData)) {
        if (!dateKeyRegex.test(key) || !val || typeof val !== "object") continue;

        const yt = val.youtube || {};
        const fb = val.facebook || {};
        const dateStr = key.replace("stats_", "");

        const ytActive = yt.summary?.activeSeconds ?? yt.summary?.activeTimeSeconds ?? 0;
        const ytPassive = yt.summary?.passiveSeconds ?? yt.summary?.passiveTimeSeconds ?? 0;
        const ytReloads = yt.summary?.reloadCount || 0;
        const ytShorts = yt.shorts?.totalSwipes ?? yt.shortVideos?.totalSwipes ?? 0;
        const ytLongWatched = yt.longVideos?.totalWatched || 0;
        const ytUseful = yt.longVideos?.usefulCount ?? 0;

        const fbActive = fb.summary?.activeSeconds ?? fb.summary?.activeTimeSeconds ?? 0;
        const fbPassive = fb.summary?.passiveSeconds ?? fb.summary?.passiveTimeSeconds ?? 0;
        const fbReloads = fb.summary?.reloadCount || 0;
        const fbFeedScrolled = fb.feed?.feedPostsScrolled ?? fb.summary?.feedPostsScrolled ?? 0;
        const fbReels = fb.reels?.totalSwipes || 0;
        const fbLongWatched = fb.longVideos?.totalWatched || 0;
        const fbUseful = fb.longVideos?.usefulCount ?? 0;

        const activeSec = ytActive + fbActive;
        const passiveSec = ytPassive + fbPassive;
        const totalSwipes = ytShorts + fbReels + fbFeedScrolled;
        const totalReloads = ytReloads + fbReloads;
        const totalLong = ytLongWatched + fbLongWatched;
        const totalUseful = ytUseful + fbUseful;
        const usefulPct = totalLong > 0 ? Math.round((totalUseful / totalLong) * 100) : 0;

        records.push({
          date: dateStr,
          activeSec,
          passiveSec,
          totalSec: activeSec + passiveSec,
          ytShorts,
          fbSwipes: fbReels + fbFeedScrolled,
          totalSwipes,
          totalReloads,
          totalLong,
          totalUseful,
          usefulPct
        });
      }

      // Sắp xếp ngày tăng dần (cũ -> mới cho biểu đồ)
      records.sort((a, b) => a.date.localeCompare(b.date));
      dailyRecords = records;
      resolve();
    });
  });
}

// ─── Lọc Theo Khoảng Thời Gian ───────────────────────────────────────────────

function getFilteredRecords() {
  if (selectedDays === 0 || dailyRecords.length <= selectedDays) {
    return dailyRecords;
  }
  return dailyRecords.slice(-selectedDays);
}

// ─── Cập Nhật Thống Kê Tổng Hợp (Metric Cards) ───────────────────────────────

function renderSummaryCards(records) {
  const daysCount = Math.max(1, records.length);

  let totalActive = 0;
  let totalPassive = 0;
  let totalSwipes = 0;
  let totalReloads = 0;
  let totalLong = 0;
  let totalUseful = 0;

  for (const r of records) {
    totalActive += r.activeSec;
    totalPassive += r.passiveSec;
    totalSwipes += r.totalSwipes;
    totalReloads += r.totalReloads;
    totalLong += r.totalLong;
    totalUseful += r.totalUseful;
  }

  const avgActiveDaily = Math.round(totalActive / daysCount);
  const avgSwipesDaily = Math.round(totalSwipes / daysCount);
  const avgReloadDaily = (totalReloads / daysCount).toFixed(1);
  const overallUsefulPct = totalLong > 0 ? Math.round((totalUseful / totalLong) * 100) : 0;

  document.getElementById("stat-total-time").innerText = formatDuration(totalActive);
  document.getElementById("stat-avg-time").innerText = `Trung bình: ${formatDuration(avgActiveDaily)}/ngày`;

  document.getElementById("stat-total-swipes").innerText = totalSwipes.toLocaleString();
  document.getElementById("stat-avg-swipes").innerText = `Trung bình: ${avgSwipesDaily} lượt/ngày`;

  document.getElementById("stat-total-reloads").innerText = totalReloads.toLocaleString();
  const reloadText =
    avgReloadDaily <= 5 ? "Mức độ bồn chồn: Rất Thấp ✓" : avgReloadDaily <= 15 ? "Mức độ bồn chồn: Vừa phải" : "Cảnh báo: F5 liên tục!";
  document.getElementById("stat-reload-assessment").innerText = reloadText;

  document.getElementById("stat-useful-pct").innerText = `${overallUsefulPct}%`;
  document.getElementById("stat-useful-count").innerText = `${totalUseful}/${totalLong} video mục tiêu`;
}

// ─── Vẽ Biểu Đồ Canvas Sắc Nét (HiDPI Scaling) ───────────────────────────────

function setupCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const container = canvas.parentElement;
  const rect = container ? container.getBoundingClientRect() : { width: 440, height: 220 };
  const dpr = window.devicePixelRatio || 1;

  const width = Math.max(300, Math.floor(rect.width || (container ? container.clientWidth : 0) || 440));
  const height = Math.max(180, Math.floor(rect.height || (container ? container.clientHeight : 0) || 220));

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}

// Chart 1: Biểu đồ cột Thời gian lướt (Active vs Passive)
function renderTimeChart(records) {
  const setup = setupCanvas("chart-time");
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);
  if (records.length === 0) {
    renderEmptyChart(ctx, width, height);
    return;
  }

  const padding = { top: 20, right: 15, bottom: 35, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max minutes
  let maxMin = 60;
  for (const r of records) {
    const mins = Math.ceil(r.totalSec / 60);
    if (mins > maxMin) maxMin = mins;
  }
  maxMin = Math.ceil(maxMin / 30) * 30; // Làm tròn lên bội số 30p

  // Trục & Lưới ngang
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillStyle = "#64748B";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (chartH / gridSteps) * i;
    const val = Math.round(maxMin - (maxMin / gridSteps) * i);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val}m`, padding.left - 6, y + 3);
  }

  // Vẽ các cột ngày
  const n = records.length;
  const colWidth = Math.min(32, Math.max(12, (chartW / n) * 0.65));
  const stepX = chartW / n;

  records.forEach((r, idx) => {
    const x = padding.left + stepX * idx + (stepX - colWidth) / 2;
    const activeMin = r.activeSec / 60;
    const passiveMin = r.passiveSec / 60;

    const activeH = (activeMin / maxMin) * chartH;
    const passiveH = (passiveMin / maxMin) * chartH;

    const yActive = padding.top + chartH - activeH;
    const yPassive = yActive - passiveH;

    // Passive bar (Cyan)
    if (passiveH > 0) {
      ctx.fillStyle = "#06B6D4";
      ctx.fillRect(x, yPassive, colWidth, passiveH);
    }

    // Active bar (Purple)
    if (activeH > 0) {
      ctx.fillStyle = "#8B5CF6";
      ctx.fillRect(x, yActive, colWidth, activeH);
    }

    // Nhãn ngày ngắn (MM-DD)
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "center";
    const dateLabel = r.date.slice(5);
    ctx.fillText(dateLabel, x + colWidth / 2, height - 12);
  });
}

// Chart 2: Biểu đồ Shorts & Reels
function renderSwipesChart(records) {
  const setup = setupCanvas("chart-swipes");
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);
  if (records.length === 0) {
    renderEmptyChart(ctx, width, height);
    return;
  }

  const padding = { top: 20, right: 15, bottom: 35, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  let maxSwipes = 40;
  for (const r of records) {
    if (r.totalSwipes > maxSwipes) maxSwipes = r.totalSwipes;
  }
  maxSwipes = Math.ceil(maxSwipes / 20) * 20;

  // Trục & Lưới ngang
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillStyle = "#64748B";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padding.top + (chartH / gridSteps) * i;
    const val = Math.round(maxSwipes - (maxSwipes / gridSteps) * i);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val}`, padding.left - 6, y + 3);
  }

  const n = records.length;
  const barW = Math.min(14, Math.max(6, (chartW / n) * 0.35));
  const stepX = chartW / n;

  records.forEach((r, idx) => {
    const groupCenterX = padding.left + stepX * idx + stepX / 2;
    const xYt = groupCenterX - barW - 1;
    const xFb = groupCenterX + 1;

    const ytH = (r.ytShorts / maxSwipes) * chartH;
    const fbH = (r.fbSwipes / maxSwipes) * chartH;

    // YT Shorts (Rose)
    ctx.fillStyle = "#F43F5E";
    ctx.fillRect(xYt, padding.top + chartH - ytH, barW, ytH);

    // FB Swipes (Blue)
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(xFb, padding.top + chartH - fbH, barW, fbH);

    // Label
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "center";
    ctx.fillText(r.date.slice(5), groupCenterX, height - 12);
  });
}

// Chart 3: Tỷ Lệ % Nội Dung Mục Tiêu
function renderUsefulChart(records) {
  const setup = setupCanvas("chart-useful");
  if (!setup) return;
  const { ctx, width, height } = setup;

  ctx.clearRect(0, 0, width, height);
  if (records.length === 0) {
    renderEmptyChart(ctx, width, height);
    return;
  }

  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Lưới 0% - 100%
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillStyle = "#64748B";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";

  for (let pct = 0; pct <= 100; pct += 25) {
    const y = padding.top + chartH - (pct / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${pct}%`, padding.left - 6, y + 3);
  }

  // Đường ngưỡng đỏ (70% Target)
  const targetY = padding.top + chartH - (70 / 100) * chartH;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(239, 68, 68, 0.65)";
  ctx.beginPath();
  ctx.moveTo(padding.left, targetY);
  ctx.lineTo(width - padding.right, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Điểm & Đường nối tiến trình
  const n = records.length;
  const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;

  const points = records.map((r, idx) => {
    const x = n > 1 ? padding.left + stepX * idx : padding.left + chartW / 2;
    const y = padding.top + chartH - (r.usefulPct / 100) * chartH;
    return { x, y, pct: r.usefulPct, date: r.date };
  });

  // Vẽ vùng gradient mờ bên dưới
  if (points.length > 1) {
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    grad.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fill();
  }

  // Đường line xanh ngọc
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.lineWidth = 1;

  // Chấm tròn điểm dữ liệu
  points.forEach((p) => {
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#F8FAFC";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Nhãn ngày
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "center";
    ctx.fillText(p.date.slice(5), p.x, height - 12);
  });
}

function renderEmptyChart(ctx, width, height) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Chưa có dữ liệu ghi nhận trong khoảng thời gian này", width / 2, height / 2);
}

// ─── Render Bảng Lịch Sử Chi Tiết ─────────────────────────────────────────────

function renderHistoryTable(records) {
  const tbody = document.getElementById("history-table-body");
  const countEl = document.getElementById("table-row-count");
  if (!tbody) return;

  if (countEl) countEl.innerText = `${records.length} ngày ghi nhận`;
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748B; padding:24px;">Chưa có dữ liệu lịch sử nào</td></tr>`;
    return;
  }

  // Hiển thị mới nhất lên đầu trong bảng
  const reversed = [...records].reverse();

  reversed.forEach((r) => {
    const tr = document.createElement("tr");

    let disciplineBadge = "";
    if (r.usefulPct >= 70 && r.totalSwipes <= 20) {
      disciplineBadge = `<span class="badge badge-good">Xuất sắc ✨</span>`;
    } else if (r.totalSwipes > 45 || r.totalReloads > 15) {
      disciplineBadge = `<span class="badge badge-danger">Xao nhãng 🛑</span>`;
    } else {
      disciplineBadge = `<span class="badge badge-warn">Bình thường ⚡</span>`;
    }

    tr.innerHTML = `
      <td style="font-weight:700; color:#F8FAFC;">${r.date}</td>
      <td>${formatDuration(r.activeSec)}</td>
      <td><span style="color:#A78BFA; font-weight:600;">${r.totalSwipes}</span> (${r.ytShorts} Shorts / ${r.fbSwipes} FB)</td>
      <td>${r.totalLong} video</td>
      <td><span style="color:#F59E0B;">${r.totalReloads}</span> lần</td>
      <td><span style="color:#10B981; font-weight:700;">${r.usefulPct}%</span> (${r.totalUseful} video)</td>
      <td>${disciplineBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── Vẽ Lại Toàn Bộ Dashboard ────────────────────────────────────────────────

function updateDashboardView() {
  const records = getFilteredRecords();
  renderSummaryCards(records);
  renderTimeChart(records);
  renderSwipesChart(records);
  renderUsefulChart(records);
  renderHistoryTable(records);
}

// ─── Xử Lý Sao Lưu (Export JSON) & Khôi Phục (Import JSON) ────────────────────

function setupBackupRestore() {
  const btnExport = document.getElementById("btn-export-json");
  const btnImportTrigger = document.getElementById("btn-import-json-trigger");
  const inputFile = document.getElementById("import-json-file");

  // 1. Export JSON
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      chrome.storage.local.get(null, (data) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const fileName = `mindful-tracker-backup-${dateStr}.json`;

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast("📥 Đã xuất dữ liệu sao lưu thành công!");
      });
    });
  }

  // 2. Import JSON
  if (btnImportTrigger && inputFile) {
    btnImportTrigger.addEventListener("click", () => {
      inputFile.value = "";
      inputFile.click();
    });

    inputFile.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result;
          const parsed = JSON.parse(content);

          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Cấu trúc file JSON không hợp lệ.");
          }

          const confirmMsg =
            "Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu này?\nDữ liệu hiện tại sẽ được cập nhật và đồng bộ lại.";
          if (!confirm(confirmMsg)) return;

          chrome.storage.local.set(parsed, async () => {
            await loadData();
            updateDashboardView();
            showToast("✓ Đã khôi phục dữ liệu sao lưu thành công!");
          });
        } catch (err) {
          alert(`Lỗi khi đọc file sao lưu: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });
  }
}

// ─── Khởi Tạo & Event Listeners ───────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Gắn event chuyển range ngày
  const rangeBtns = document.querySelectorAll(".range-btn");
  rangeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      rangeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = Number(btn.getAttribute("data-days") || 7);
      updateDashboardView();
    });
  });

  setupBackupRestore();

  await loadData();
  updateDashboardView();

  // Tự động vẽ lại biểu đồ khi resize cửa sổ
  window.addEventListener("resize", () => {
    updateDashboardView();
  });
});
