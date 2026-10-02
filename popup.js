/**
 * Mindful Social Media Tracker - Popup Dashboard Controller
 */

// Lấy ngày hiện tại theo giờ địa phương dạng YYYY-MM-DD
function getTodayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

// Cập nhật toàn bộ giao diện từ Storage
function updateDashboard() {
  const todayKey = getTodayKey();
  const todayBadge = document.getElementById("today-badge");
  if (todayBadge) todayBadge.innerText = todayKey;

  chrome.storage.local.get([todayKey], (result) => {
    const data = result[todayKey] || {};

    const ytSummary = data.youtube?.summary || { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0 };
    const ytShorts = data.youtube?.shortVideos || { totalSwipes: 0, validViews: 0, loopViews: 0 };
    const ytLong = data.youtube?.longVideos || { totalWatched: 0, impulsiveCount: 0, details: [] };

    const fbSummary = data.facebook?.summary || { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0, feedPostsScrolled: 0 };
    const fbReels = data.facebook?.reels || { totalSwipes: 0, validViews: 0, loopViews: 0 };

    // --- 1. RENDER YOUTUBE PANEL ---
    const ytActive = ytSummary.activeTimeSeconds || 0;
    const ytPassive = ytSummary.passiveTimeSeconds || 0;
    const ytTotalTime = ytActive + ytPassive;
    const ytActiveRatio = ytTotalTime > 0 ? Math.round((ytActive / ytTotalTime) * 100) : 0;

    document.getElementById("yt-active-time").innerText = formatDuration(ytActive);
    document.getElementById("yt-passive-time").innerText = formatDuration(ytPassive);
    document.getElementById("yt-ratio-bar").style.width = `${ytActiveRatio}%`;
    document.getElementById("yt-reload-badge").innerText = `F5/Home: ${ytSummary.reloadCount || 0}`;

    // Shorts
    document.getElementById("yt-shorts-swipes").innerText = ytShorts.totalSwipes || 0;
    document.getElementById("yt-shorts-valid").innerText = ytShorts.validViews || 0;
    document.getElementById("yt-shorts-loops").innerText = ytShorts.loopViews || 0;

    // Long Videos
    const ytLongTotal = ytLong.totalWatched || 0;
    const ytImpulsive = ytLong.impulsiveCount || 0;
    const ytImpulsiveRate = ytLongTotal > 0 ? Math.round((ytImpulsive / ytLongTotal) * 100) : 0;

    document.getElementById("yt-long-total").innerText = ytLongTotal;
    document.getElementById("yt-long-impulsive").innerText = ytImpulsive;
    document.getElementById("yt-impulsive-rate-badge").innerText = `Lướt vội: ${ytImpulsiveRate}%`;

    // Danh sách Video dài gần đây
    renderRecentVideos(ytLong.details || []);

    // Phân loại danh mục
    renderCategories(ytLong.details || []);

    // --- 2. RENDER FACEBOOK PANEL ---
    const fbActive = fbSummary.activeTimeSeconds || 0;
    const fbPassive = fbSummary.passiveTimeSeconds || 0;
    const fbTotalTime = fbActive + fbPassive;
    const fbActiveRatio = fbTotalTime > 0 ? Math.round((fbActive / fbTotalTime) * 100) : 0;

    document.getElementById("fb-active-time").innerText = formatDuration(fbActive);
    document.getElementById("fb-passive-time").innerText = formatDuration(fbPassive);
    document.getElementById("fb-ratio-bar").style.width = `${fbActiveRatio}%`;
    document.getElementById("fb-reload-badge").innerText = `F5/Home: ${fbSummary.reloadCount || 0}`;

    document.getElementById("fb-feed-scrolled").innerText = fbSummary.feedPostsScrolled || 0;
    document.getElementById("fb-reloads").innerText = fbSummary.reloadCount || 0;

    document.getElementById("fb-reels-swipes").innerText = fbReels.totalSwipes || 0;
    document.getElementById("fb-reels-valid").innerText = fbReels.validViews || 0;
    document.getElementById("fb-reels-loops").innerText = fbReels.loopViews || 0;

    // --- 3. RENDER TỔNG QUAN PANEL ---
    const totalActive = ytActive + fbActive;
    const totalReloads = (ytSummary.reloadCount || 0) + (fbSummary.reloadCount || 0);
    const totalSwipes = (ytShorts.totalSwipes || 0) + (fbReels.totalSwipes || 0);
    const totalLoops = (ytShorts.loopViews || 0) + (fbReels.loopViews || 0);

    document.getElementById("total-active-time").innerText = formatDuration(totalActive);
    document.getElementById("total-reloads").innerText = totalReloads;
    document.getElementById("total-swipes-all").innerText = totalSwipes;
    document.getElementById("total-loops-all").innerText = totalLoops;
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

// Render phân bổ danh mục nội dung
function renderCategories(details) {
  const container = document.getElementById("yt-categories-list");
  if (!container) return;

  if (!details || details.length === 0) {
    container.innerHTML = `<div style="font-size:11px; color:#64748B; text-align:center; padding:6px 0;">Chưa có dữ liệu phân loại.</div>`;
    return;
  }

  const counts = {};
  details.forEach((item) => {
    const cat = item.category || "Khác";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

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

// Thiết lập nút Reset dữ liệu ngày hiện tại
function setupResetButton() {
  const btn = document.getElementById("btn-reset-day");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn đặt lại (xóa) toàn bộ số liệu thống kê của ngày hôm nay?")) {
      const todayKey = getTodayKey();
      const emptyPayload = {};
      emptyPayload[todayKey] = {
        youtube: {
          summary: { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0 },
          longVideos: { totalWatched: 0, impulsiveCount: 0, details: [] },
          shortVideos: { totalSwipes: 0, validViews: 0, loopViews: 0 }
        },
        facebook: {
          summary: { activeTimeSeconds: 0, passiveTimeSeconds: 0, reloadCount: 0, feedPostsScrolled: 0 },
          longVideos: { totalWatched: 0, impulsiveCount: 0, details: [] },
          reels: { totalSwipes: 0, validViews: 0, loopViews: 0 }
        }
      };

      chrome.storage.local.set(emptyPayload, () => {
        updateDashboard();
      });
    }
  });
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

  // Nạp cấu hình & API Key đã lưu
  chrome.storage.local.get(["app_config", "gemini_api_key"], (result) => {
    const config = result.app_config || {};
    const thresholds = config.thresholds || {};
    const ytThresh = thresholds.youtube || {};
    const fbThresh = thresholds.facebook || {};
    const oldShorts = thresholds.shorts || {};
    const oldLong = thresholds.long || {};

    if (geminiKeyInput && result.gemini_api_key) {
      geminiKeyInput.value = result.gemini_api_key;
    }

    // Điền YouTube
    if (ytShortsM1) ytShortsM1.value = ytThresh.shorts?.m1 ?? oldShorts.m1 ?? 15;
    if (ytShortsM2) ytShortsM2.value = ytThresh.shorts?.m2 ?? oldShorts.m2 ?? 30;
    if (ytShortsM3) ytShortsM3.value = ytThresh.shorts?.m3 ?? oldShorts.m3 ?? 45;
    if (ytLongM1) ytLongM1.value = ytThresh.long?.m1 ?? oldLong.m1 ?? 3;
    if (ytLongM2) ytLongM2.value = ytThresh.long?.m2 ?? oldLong.m2 ?? 5;
    if (ytLongM3) ytLongM3.value = ytThresh.long?.m3 ?? oldLong.m3 ?? 8;

    // Điền Facebook
    if (fbReelsM1) fbReelsM1.value = fbThresh.reels?.m1 ?? oldShorts.m1 ?? 15;
    if (fbReelsM2) fbReelsM2.value = fbThresh.reels?.m2 ?? oldShorts.m2 ?? 30;
    if (fbReelsM3) fbReelsM3.value = fbThresh.reels?.m3 ?? oldShorts.m3 ?? 45;
    if (fbFeedsM1) fbFeedsM1.value = fbThresh.feeds?.m1 ?? 20;
    if (fbFeedsM2) fbFeedsM2.value = fbThresh.feeds?.m2 ?? 40;
    if (fbFeedsM3) fbFeedsM3.value = fbThresh.feeds?.m3 ?? 60;
    if (fbLongM1) fbLongM1.value = fbThresh.long?.m1 ?? oldLong.m1 ?? 2;
    if (fbLongM2) fbLongM2.value = fbThresh.long?.m2 ?? oldLong.m2 ?? 4;
    if (fbLongM3) fbLongM3.value = fbThresh.long?.m3 ?? oldLong.m3 ?? 6;

    if (goalInput) goalInput.value = config.masterGoal || "";

    // Pomodoro
    if (pomodoroEnabled) pomodoroEnabled.checked = config.pomodoro?.enabled || false;
    if (pomodoroFocus) pomodoroFocus.value = config.pomodoro?.focusMinutes ?? 25;
    if (pomodoroBreak) pomodoroBreak.value = config.pomodoro?.breakMinutes ?? 5;

    // Keywords - mỗi từ 1 dòng
    if (keywordsInput && Array.isArray(config.targetKeywords)) {
      keywordsInput.value = config.targetKeywords.join("\n");
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

    const app_config = {
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
        // Fallback backward compatibility
        shorts: { m1: ytShortsM1Val, m2: ytShortsM2Val, m3: ytShortsM3Val },
        long: { m1: ytLongM1Val, m2: ytLongM2Val, m3: ytLongM3Val }
      },
      masterGoal,
      emotionalAnchorImage,
      targetKeywords,
      pomodoro: {
        enabled: pomodoroEnabled?.checked || false,
        focusMinutes: parseInt(pomodoroFocus?.value) || 25,
        breakMinutes: parseInt(pomodoroBreak?.value) || 5
      }
    };

    chrome.storage.local.set({ app_config, gemini_api_key: geminiKey }, () => {
      const toast = document.getElementById("cfg-save-toast");
      if (toast) {
        toast.style.display = "block";
        setTimeout(() => { toast.style.display = "none"; }, 2500);
      }
    });
  });
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

  // Nạp cấu hình Pet hiện tại
  chrome.storage.local.get(["petConfig"], (res) => {
    const config = res.petConfig || { mode: "default", uploadedImageBase64: "", uploadedPuppetImages: {}, aiSprites: {} };
    const currentMode = config.mode || "default";

    // Chọn đúng radio
    radioModes.forEach(r => {
      r.checked = (r.value === currentMode);
    });

    togglePetModeUI(currentMode);

    // Hiển thị 3 ảnh Puppet theo từng cảm xúc
    const puppetImgs = config.uploadedPuppetImages || {};
    renderPuppetSlotPreview("happy", puppetImgs.happy || config.uploadedImageBase64);
    renderPuppetSlotPreview("neutral", puppetImgs.neutral);
    renderPuppetSlotPreview("sad", puppetImgs.sad);

    // Hiển thị 3 sprite AI nếu đã có
    if (config.aiSprites) {
      renderSpritePreviews(config.aiSprites);
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

      chrome.storage.local.get(["petConfig"], (res) => {
        const petConfig = res.petConfig || {};
        petConfig.mode = selectedMode;
        chrome.storage.local.set({ petConfig }, () => {
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

          chrome.storage.local.get(["petConfig"], (res) => {
            const petConfig = res.petConfig || { mode: "puppet" };
            if (!petConfig.uploadedPuppetImages) petConfig.uploadedPuppetImages = {};
            petConfig.uploadedPuppetImages[mood] = croppedBase64;

            // Nếu là Happy hoặc chưa có ảnh chính thì cập nhật uploadedImageBase64 làm fallback
            if (mood === "happy" || !petConfig.uploadedImageBase64) {
              petConfig.uploadedImageBase64 = croppedBase64;
            }

            chrome.storage.local.set({ petConfig }, () => {
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

      chrome.storage.local.get(["petConfig"], (res) => {
        const petConfig = res.petConfig || {};
        if (petConfig.uploadedPuppetImages && petConfig.uploadedPuppetImages[slot]) {
          delete petConfig.uploadedPuppetImages[slot];
        }
        if (slot === "happy") {
          petConfig.uploadedImageBase64 = petConfig.uploadedPuppetImages?.neutral || petConfig.uploadedPuppetImages?.sad || "";
        }
        chrome.storage.local.set({ petConfig }, () => {
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
        chrome.storage.local.get(["petConfig"], (res) => {
          const petConfig = res.petConfig || { mode: "puppet" };
          petConfig.uploadedImageBase64 = croppedBase64;
          if (!petConfig.uploadedPuppetImages) petConfig.uploadedPuppetImages = {};
          petConfig.uploadedPuppetImages.happy = croppedBase64;
          renderPuppetSlotPreview("happy", croppedBase64);

          chrome.storage.local.set({ petConfig }, () => {
            updatePetBanner();
          });
        });
      });
    });
  }

  // Nút Tạo Avatar AI Chibi
  if (btnGenerateAiPet) {
    btnGenerateAiPet.addEventListener("click", () => {
      chrome.storage.local.get(["petConfig", "gemini_api_key"], (res) => {
        const petConfig = res.petConfig || {};
        if (!petConfig.uploadedImageBase64) {
          showPetAiStatus("⚠️ Vui lòng chọn ảnh trước khi tạo Avatar AI.", "#EF4444");
          return;
        }
        if (!res.gemini_api_key) {
          showPetAiStatus("⚠️ Vui lòng nhập Gemini API Key ở ô phía trên trước.", "#EF4444");
          return;
        }

        showPetAiStatus("⏳ Đang gọi Gemini AI phân tích ảnh và sinh 3 sprite Chibi...", "#38BDF8");
        btnGenerateAiPet.disabled = true;

        chrome.runtime.sendMessage({
          type: "GENERATE_AI_PET_SPRITES",
          imageBase64: petConfig.uploadedImageBase64
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
  chrome.storage.local.get(["petState", "pet_state", "petConfig", "petAccessories"], (res) => {
    const pet = res.petState || res.pet_state || { energy: 100, mood: "happy", currentStreak: 0, streakDays: 0 };
    const config = res.petConfig || { mode: "default" };
    const accessories = res.petAccessories || { unlockedItems: [], equipped: { head: null, body: null } };
    const equippedHead = accessories.equipped?.head || null;

    const avatarEl = document.getElementById("popup-pet-avatar");
    const moodEl = document.getElementById("popup-pet-mood-badge");
    const barEl = document.getElementById("popup-pet-energy-bar");
    const textEl = document.getElementById("popup-pet-energy-text");
    const streakEl = document.getElementById("popup-streak-days");

    const energy = pet.energy ?? 100;
    const mood = energy >= 70 ? "happy" : energy >= 40 ? "neutral" : "sad";
    const streak = pet.currentStreak ?? pet.streakDays ?? 0;

    if (streakEl) streakEl.textContent = streak;
    if (textEl) textEl.textContent = `${energy}%`;
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
    if (config.mode === "puppet") {
      const puppetImgs = config.uploadedPuppetImages || {};
      const faceImg = puppetImgs[mood] || config.uploadedImageBase64;
      const bodyColor = mood === "happy" ? "#8B5CF6" : mood === "sad" ? "#475569" : "#06B6D4";
      const filterStyle = (mood === "sad" && !puppetImgs.sad) ? "filter: grayscale(0.55);" : "";

      const faceHtml = faceImg
        ? `<img src="${faceImg}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;${filterStyle}" alt="Pet">`
        : `<div style="width:24px;height:24px;border-radius:50%;background:#8B5CF6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div>`;

      avatarEl.innerHTML = `
        <div style="position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; width:34px; height:34px;">
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
    if (config.mode === "ai_generated" && config.aiSprites && (config.aiSprites[mood] || config.aiSprites.happy)) {
      const spriteUri = config.aiSprites[mood] || config.aiSprites.happy;
      avatarEl.innerHTML = `
        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:6px; overflow:visible;">
          <img src="${spriteUri}" style="width:100%; height:100%; object-fit:contain; border-radius:6px;" alt="AI Pet ${mood}">
          ${puppetAccessory}
        </div>
      `;
      return;
    }

    // 3. CHẾ ĐỘ DEFAULT: Mầm cây Sprout SVG
    const potColor = mood === "happy" ? "#8B5CF6" : mood === "sad" ? "#475569" : "#06B6D4";
    const leafColor = mood === "happy" ? "#10B981" : mood === "sad" ? "#94A3B8" : "#34D399";
    const flower = mood === "happy" ? `<circle cx="17" cy="4" r="3.5" fill="#F43F5E" /><circle cx="17" cy="4" r="1.5" fill="#FBBF24" />` : "";
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

// Điều khiển Tủ Đồ Phụ Kiện (Wardrobe)
function setupWardrobeControls() {
  const badgeStreak = document.getElementById("pet-wardrobe-streak-badge");
  const btnSunglasses = document.getElementById("btn-toggle-sunglasses");
  const btnLaurel = document.getElementById("btn-toggle-laurel");

  chrome.storage.local.get(["petState", "pet_state", "petAccessories"], (res) => {
    const pet = res.petState || res.pet_state || {};
    const streak = pet.streakDays ?? pet.currentStreak ?? 0;
    if (badgeStreak) badgeStreak.textContent = `🔥 ${streak} ngày`;

    const accessories = res.petAccessories || { unlockedItems: [], equipped: { head: null, body: null } };
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
          chrome.storage.local.set({ petAccessories: accessories }, () => {
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
          chrome.storage.local.set({ petAccessories: accessories }, () => {
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
}

// Khởi chạy khi popup load
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupResetButton();
  setupSettings();
  setupPetControls();
  setupWardrobeControls();
  setupReflectionButton();
  setupDashboardButton();
  updateDashboard();
  updatePetBanner();
});

// Lắng nghe thay đổi real-time từ storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    updateDashboard();
    if (changes.petState || changes.pet_state || changes.petConfig || changes.petAccessories) {
      updatePetBanner();
      setupWardrobeControls();
    }
  }
});
