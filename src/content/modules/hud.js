/**
 * Mindful Social Media Tracker - HUD Module
 * Floating HUD: kéo thả, đổi màu theo mốc, hiển thị stats, ẩn/thu nhỏ, Pomodoro label
 */

import { saveHUDPosition, formatTimeShort } from "../../utils/storage.js";

export class HUDManager {
  /**
   * @param {object} opts
   * @param {object} opts.dayData
   * @param {string} opts.platformKey  - "youtube" | "facebook"
   * @param {boolean} opts.isYT
   * @param {boolean} opts.isFB
   * @param {Function} opts.getThresholds  - () => { shorts, long }
   * @param {Function} opts.getPomodoroLabel - () => string | null
   * @param {Function} opts.getPomodoroActive - () => boolean
   * @param {Function} opts.onStartPomodoroRequest - () => void
   * @param {Function} opts.onStopPomodoro - () => void
   * @param {boolean} opts.isBreakSession
   */
  constructor({ dayData, platformKey, isYT, isFB, getThresholds, getPomodoroLabel, getPomodoroActive, onStartPomodoroRequest, onStopPomodoro, petEngine, onFocusModeToggle }) {
    this.dayData = dayData;
    this.platformKey = platformKey;
    this.isYT = isYT;
    this.isFB = isFB;
    this.getThresholds = getThresholds;
    this.getPomodoroLabel = getPomodoroLabel || (() => null);
    this.getPomodoroActive = getPomodoroActive || (() => false);
    this.onStartPomodoroRequest = onStartPomodoroRequest || null;
    this.onStopPomodoro = onStopPomodoro || null;
    this.petEngine = petEngine || null;
    this.focusMode = "music";
    this.onFocusModeToggle = onFocusModeToggle || null;

    this._isMinimized = false;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._initialLeft = 0;
    this._initialTop = 0;

    this.hud = this._createHUD();
  }

  setFocusMode(mode) {
    this.focusMode = mode;
    this.update();
  }

  _createHUD() {
    const el = document.createElement("div");
    el.id = "mindful-tracker-hud";
    el.style.cssText = `
      position:fixed!important; bottom:20px; right:20px; z-index:2147483640!important;
      background:rgba(15,23,32,0.94)!important; color:#F1F5F9!important;
      padding:8px 12px!important; border-radius:10px!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
      font-size:12px!important; box-shadow:0 8px 24px rgba(0,0,0,0.4)!important;
      backdrop-filter:blur(8px)!important; border:1.5px solid #10B981;
      user-select:none!important; transition:border-color 0.3s ease,box-shadow 0.3s ease;
      display:flex!important; align-items:center!important; gap:8px!important;
      cursor:grab!important; pointer-events:auto!important; touch-action:none!important;
    `;

    (document.body || document.documentElement).appendChild(el);

    // Drag events
    el.addEventListener("mousedown", (e) => this._onDragStart(e));
    el.addEventListener("touchstart", (e) => this._onDragStart(e), { passive: true });

    return el;
  }

  // ─── Position ─────────────────────────────────────────────────────────────

  applyPosition(top, left) {
    this.hud.style.bottom = "auto";
    this.hud.style.right = "auto";
    this.hud.style.top = top;
    this.hud.style.left = left;
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  _onDragStart(e) {
    if (e.target && e.target.closest("#mindful-hud-minimize, #mindful-hud-toggle")) return;

    this._isDragging = true;
    this.hud.style.cursor = "grabbing";

    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    this._dragStartX = clientX;
    this._dragStartY = clientY;

    const rect = this.hud.getBoundingClientRect();
    this._initialLeft = rect.left;
    this._initialTop = rect.top;

    window.addEventListener("mousemove", this._onDragMove, { passive: false });
    window.addEventListener("mouseup", this._onDragEnd);
    window.addEventListener("touchmove", this._onDragMove, { passive: false });
    window.addEventListener("touchend", this._onDragEnd);
  }

  _onDragMove = (e) => {
    if (!this._isDragging) return;
    e.preventDefault();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    const maxLeft = window.innerWidth - this.hud.offsetWidth - 10;
    const maxTop = window.innerHeight - this.hud.offsetHeight - 10;

    const newLeft = Math.max(10, Math.min(maxLeft, this._initialLeft + clientX - this._dragStartX));
    const newTop = Math.max(10, Math.min(maxTop, this._initialTop + clientY - this._dragStartY));

    this.applyPosition(`${newTop}px`, `${newLeft}px`);
  };

  _onDragEnd = () => {
    if (!this._isDragging) return;
    this._isDragging = false;
    this.hud.style.cursor = "grab";

    window.removeEventListener("mousemove", this._onDragMove);
    window.removeEventListener("mouseup", this._onDragEnd);
    window.removeEventListener("touchmove", this._onDragMove);
    window.removeEventListener("touchend", this._onDragEnd);

    saveHUDPosition({ top: this.hud.style.top, left: this.hud.style.left });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  update(isBreakSession = false) {
    if (!this.hud || this._isDragging) return;

    const threshData = this.getThresholds();
    const ytThresh = threshData.youtube || threshData;
    const fbThresh = threshData.facebook || threshData;
    const summary = this.dayData[this.platformKey].summary;

    let currentCount = 0;
    let targetThresh = { m1: 15, m2: 30, m3: 45 };

    if (this.isYT) {
      if (location.pathname.startsWith("/shorts")) {
        currentCount = this.dayData.youtube.shortVideos.totalSwipes || 0;
        targetThresh = ytThresh.shorts || { m1: 15, m2: 30, m3: 45 };
      } else {
        currentCount = this.dayData.youtube.longVideos.totalWatched || 0;
        targetThresh = ytThresh.long || { m1: 3, m2: 5, m3: 8 };
      }
    } else if (this.isFB) {
      if (location.pathname.includes("/reel")) {
        currentCount = this.dayData.facebook.reels.totalSwipes || 0;
        targetThresh = fbThresh.reels || { m1: 15, m2: 30, m3: 45 };
      } else if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
        currentCount = this.dayData.facebook.longVideos?.totalWatched || 0;
        targetThresh = fbThresh.long || { m1: 2, m2: 4, m3: 6 };
      } else {
        currentCount = this.dayData.facebook.summary.feedPostsScrolled || 0;
        targetThresh = fbThresh.feeds || { m1: 20, m2: 40, m3: 60 };
      }
    }

    // Màu viền theo mốc (màu xanh dương khi Break Session)
    if (isBreakSession) {
      this.hud.style.borderColor = "#06B6D4";
      this.hud.style.boxShadow = "0 0 12px rgba(6, 182, 212, 0.4)";
    } else if (currentCount < targetThresh.m1) {
      this.hud.style.borderColor = "#10B981";
      this.hud.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    } else if (currentCount < targetThresh.m3) {
      this.hud.style.borderColor = "#F59E0B";
      this.hud.style.boxShadow = "0 0 12px rgba(245,158,11,0.4)";
    } else {
      this.hud.style.borderColor = "#EF4444";
      this.hud.style.boxShadow = "0 0 18px rgba(239,68,68,0.7)";
    }

    const isPomActive = this.getPomodoroActive ? this.getPomodoroActive() : false;
    const pomLabel = this.getPomodoroLabel();

    // Huy hiệu đếm ngược phiên lướt nếu có session đang chạy
    let sessionBadge = "";
    try {
      const rawSession = sessionStorage.getItem("mindful_session");
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        const remMs = (sess.durationMinutes * 60 * 1000) - (Date.now() - sess.startTime);
        const remSec = Math.max(0, Math.floor(remMs / 1000));
        const remM = Math.floor(remSec / 60);
        const remS = remSec % 60;
        const timeStr = `${remM}:${String(remS).padStart(2, "0")}`;
        const color = remSec < 120 ? "#EF4444" : "#A78BFA";
        sessionBadge = `<span style="background:rgba(139,92,246,0.22); color:${color}; font-size:10px; padding:2px 6px; border-radius:5px; font-weight:700; border:1px solid rgba(139,92,246,0.35);" title="Thời gian phiên lướt còn lại">⏳ ${timeStr}</span>`;
      }
    } catch (_) {}

    if (this._isMinimized) {
      this.hud.innerHTML = `
        <span style="cursor:pointer; font-weight:bold; color:#A78BFA;" id="mindful-hud-toggle" title="Mở rộng HUD">📊 ${formatTimeShort(summary.activeTimeSeconds)}</span>
        ${sessionBadge}
        ${isPomActive && pomLabel ? `<span style="color:#06B6D4; font-size:10px; font-weight:700;">${pomLabel}</span>` : ""}
      `;
      this.hud.querySelector("#mindful-hud-toggle")?.addEventListener("click", () => {
        this._isMinimized = false;
        this.update(isBreakSession);
      });
      return;
    }

    // Stats theo nền tảng và trang hiện tại
    let extraStats = "";
    if (this.isYT) {
      if (location.pathname.startsWith("/shorts")) {
        const s = this.dayData.youtube.shortVideos;
        extraStats = `| Lướt: <b>${s.totalSwipes}</b> | Xem: <b style="color:#10B981">${s.validViews}</b> | Loop: <b style="color:#F59E0B">${s.loopViews}</b>`;
      } else {
        const l = this.dayData.youtube.longVideos;
        const usefulCount = l.usefulCount || 0;
        extraStats = `| Đã xem: <b>${l.totalWatched}</b> | Hữu ích: <b style="color:#10B981">${usefulCount}</b> | Bốc đồng: <b style="color:#EF4444">${l.impulsiveCount}</b>`;
      }
    } else if (this.isFB) {
      if (location.pathname.includes("/reel")) {
        const r = this.dayData.facebook.reels;
        extraStats = `| Reels: <b>${r.totalSwipes}</b> | Xem: <b style="color:#10B981">${r.validViews}</b> | Loop: <b style="color:#F59E0B">${r.loopViews}</b>`;
      } else if (location.pathname.includes("/watch") || location.pathname.includes("/videos/")) {
        const l = this.dayData.facebook.longVideos || { totalWatched: 0, usefulCount: 0, impulsiveCount: 0 };
        extraStats = `| Đã xem: <b>${l.totalWatched}</b> | Hữu ích: <b style="color:#10B981">${l.usefulCount || 0}</b>`;
      } else {
        extraStats = `| Feed: <b style="color:#60A5FA">${summary.feedPostsScrolled}</b>`;
      }
    }

    const devBtn = this.isDevMode
      ? `<span style="cursor:pointer; margin-left:4px; font-size:12px; filter:drop-shadow(0 0 4px rgba(245,158,11,0.6));" id="mindful-hud-dev-btn" title="Quick Dev Toolbox">🛠️</span>`
      : "";

    let musicStats = "";
    if (this.isYT) {
      const musicCount = this.dayData.youtube.musicVideos?.totalWatched || 0;
      if (musicCount > 0) {
        musicStats = `<span style="background:rgba(139,92,246,0.2); color:#C4B5FD; font-size:10px; padding:1px 5px; border-radius:4px; font-weight:700;" title="Nhạc tập trung đã nghe">🎵 ${musicCount} bài</span>`;
      }
    }

    let pomodoroSection = "";
    let focusToggleBtn = "";
    let stopPomBtn = "";

    if (isPomActive && pomLabel) {
      pomodoroSection = `<span style="background:${isBreakSession ? 'rgba(6,182,212,0.2)' : 'rgba(139,92,246,0.25)'}; color:${isBreakSession ? '#67E8F9' : '#C4B5FD'}; font-size:11px; padding:2px 7px; border-radius:6px; font-weight:800; border:1px solid ${isBreakSession ? 'rgba(6,182,212,0.45)' : 'rgba(139,92,246,0.45)'}; display:inline-flex; align-items:center; gap:4px;">${pomLabel}</span>`;
      stopPomBtn = `<span id="mindful-hud-stop-pomodoro" style="cursor:pointer; background:rgba(239,68,68,0.2); color:#FCA5A5; border:1px solid rgba(239,68,68,0.5); font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:3px;" title="Dừng phiên Pomodoro">⏹ Dừng</span>`;

      // CHỈ KHI ĐANG CHẠY POMODORO THÌ MỚI HIỆN NÚT CHỌN ĐỔI MODE
      if (this.isYT) {
        focusToggleBtn = `
          <span id="mindful-hud-focus-mode-btn" style="cursor:pointer; background:${this.focusMode === 'music' ? 'rgba(139,92,246,0.22)' : 'rgba(16,185,129,0.22)'}; color:${this.focusMode === 'music' ? '#C4B5FD' : '#6EE7B7'}; border:1px solid ${this.focusMode === 'music' ? 'rgba(139,92,246,0.5)' : 'rgba(16,185,129,0.5)'}; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:3px;" title="Chuyển đổi Chế độ Làm việc với Âm nhạc / Học tập">${this.focusMode === 'music' ? '🎵 Mode Nhạc' : '📚 Mode Học'}</span>
        `;
      }
    } else {
      // Khi chưa bật Pomodoro: Nút Bắt đầu Pomodoro, KHÔNG HIỆN nút đổi mode
      pomodoroSection = `<span id="mindful-hud-start-pomodoro" style="cursor:pointer; background:linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3)); color:#C4B5FD; border:1px solid rgba(139,92,246,0.5); font-size:10.5px; padding:2px 7px; border-radius:6px; font-weight:700;" title="Bắt đầu phiên tập trung Pomodoro">🍅 Bắt đầu Pomodoro</span>`;
    }

    this.hud.innerHTML = `
      <span id="mindful-hud-pet-slot" style="display:inline-flex;align-items:center;"></span>
      <span style="font-weight:700; color:#A78BFA;">${this.isYT ? "YouTube" : "Facebook"}</span>
      <span>⏱ Active: <b style="color:#38BDF8">${formatTimeShort(summary.activeTimeSeconds)}</b></span>
      ${sessionBadge}
      ${extraStats}
      ${musicStats}
      ${pomodoroSection}
      ${focusToggleBtn}
      ${stopPomBtn}
      ${devBtn}
      <span style="cursor:pointer; margin-left:4px; opacity:0.6; font-size:14px; font-weight:bold;" id="mindful-hud-minimize" title="Thu nhỏ">−</span>
    `;

    if (this.petEngine) {
      const slot = this.hud.querySelector("#mindful-hud-pet-slot");
      if (slot) this.petEngine.mount(slot);
    }

    this.hud.querySelector("#mindful-hud-start-pomodoro")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onStartPomodoroRequest?.();
    });

    this.hud.querySelector("#mindful-hud-stop-pomodoro")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onStopPomodoro?.();
    });

    this.hud.querySelector("#mindful-hud-focus-mode-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const newMode = this.focusMode === "music" ? "study" : "music";
      this.focusMode = newMode;
      this.onFocusModeToggle?.(newMode);
      this.update(isBreakSession);
    });

    this.hud.querySelector("#mindful-hud-dev-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleQuickDevToolbox();
    });

    this.hud.querySelector("#mindful-hud-minimize")?.addEventListener("click", () => {
      this._isMinimized = true;
      this.update(isBreakSession);
    });

    if (this._toolboxEl) {
      this._updateToolboxPosition();
    }
  }

  // ─── Quick Dev Toolbox (Disabled in production) ───────────────────────────
  setDevMode() {
    this.isDevMode = false;
  }

  _toggleQuickDevToolbox() {
    if (this._toolboxEl) {
      this._toolboxEl.remove();
      this._toolboxEl = null;
      return;
    }
    this._renderQuickDevToolbox();
  }

  _updateToolboxPosition() {
    if (!this._toolboxEl || !this.hud) return;
    const rect = this.hud.getBoundingClientRect();
    const boxWidth = 260;
    let left = rect.left;
    if (left + boxWidth > window.innerWidth - 10) {
      left = window.innerWidth - boxWidth - 10;
    }
    let top = rect.top - 280;
    if (top < 10) {
      top = rect.bottom + 8;
    }
    this._toolboxEl.style.left = `${Math.max(10, left)}px`;
    this._toolboxEl.style.top = `${top}px`;
  }

  _renderQuickDevToolbox() {
    const el = document.createElement("div");
    el.id = "mindful-quick-dev-toolbox";
    el.style.cssText = `
      position:fixed!important; z-index:2147483646!important; width:260px!important;
      background:rgba(15,23,32,0.96)!important; color:#F8FAFC!important;
      border:1.5px solid #F59E0B!important; border-radius:10px!important;
      padding:10px 12px!important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
      font-size:11px!important; box-shadow:0 12px 30px rgba(0,0,0,0.7), 0 0 15px rgba(245,158,11,0.25)!important;
      backdrop-filter:blur(10px)!important; user-select:none!important;
    `;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:5px;">
        <span style="font-weight:700;color:#FBBF24;display:flex;align-items:center;gap:4px;">🛠️ Quick Dev Toolbox</span>
        <span id="dev-toolbox-close" style="cursor:pointer;color:#94A3B8;font-size:13px;font-weight:bold;">✕</span>
      </div>

      <!-- Energy -->
      <div style="font-size:10px;color:#FBBF24;font-weight:700;margin-bottom:3px;">⚡ Năng lượng Pet</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px;">
        <button id="qdev-energy-0" style="background:rgba(239,68,68,0.25);border:1px solid #EF4444;color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">0⚡</button>
        <button id="qdev-energy-10" style="background:rgba(245,158,11,0.25);border:1px solid #F59E0B;color:#FCD34D;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">10⚡</button>
        <button id="qdev-energy-50" style="background:rgba(59,130,246,0.25);border:1px solid #3B82F6;color:#93C5FD;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">50⚡</button>
        <button id="qdev-energy-100" style="background:rgba(16,185,129,0.25);border:1px solid #10B981;color:#6EE7B7;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">100⚡</button>
      </div>

      <!-- Session -->
      <div style="font-size:10px;color:#C4B5FD;font-weight:700;margin-bottom:3px;">🎯 Phiên Lướt & Mục Tiêu</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;">
        <button id="qdev-session-end" style="background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">⏱️ Hết giờ phiên</button>
        <button id="qdev-intent-open" style="background:rgba(139,92,246,0.25);border:1px solid rgba(139,92,246,0.5);color:#C4B5FD;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">🎯 Mở Intent</button>
      </div>

      <!-- Milestones -->
      <div style="font-size:10px;color:#67E8F9;font-weight:700;margin-bottom:3px;">🔔 Cảnh báo (M1, M2, M3, F5)</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px;">
        <button id="qdev-m1" style="background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);color:#FCD34D;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">M1</button>
        <button id="qdev-m2" style="background:rgba(249,115,22,0.25);border:1px solid rgba(249,115,22,0.5);color:#FDBA74;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">M2</button>
        <button id="qdev-m3" style="background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">M3</button>
        <button id="qdev-f5" style="background:rgba(168,85,247,0.25);border:1px solid rgba(168,85,247,0.5);color:#D8B4FE;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">F5</button>
      </div>

      <!-- System -->
      <div style="font-size:10px;color:#6EE7B7;font-weight:700;margin-bottom:3px;">⚙️ Streak & Hệ Thống</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">
        <button id="qdev-streak-3" style="background:rgba(16,185,129,0.25);border:1px solid rgba(16,185,129,0.5);color:#6EE7B7;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">🎓 3 Ngày</button>
        <button id="qdev-streak-7" style="background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);color:#FCD34D;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">👑 7 Ngày</button>
        <button id="qdev-reflection" style="background:rgba(139,92,246,0.25);border:1px solid rgba(139,92,246,0.5);color:#C4B5FD;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">🌙 22h00</button>
      </div>
      <button id="qdev-reset" style="width:100%;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);color:#FCA5A5;border-radius:4px;padding:3px;cursor:pointer;font-size:9px;font-weight:bold;">🔄 Khôi phục Dữ liệu Gốc</button>
    `;

    (document.body || document.documentElement).appendChild(el);
    this._toolboxEl = el;
    this._updateToolboxPosition();

    // Event handlers
    el.querySelector("#dev-toolbox-close")?.addEventListener("click", () => this._toggleQuickDevToolbox());
    el.querySelector("#qdev-energy-0")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(0));
    el.querySelector("#qdev-energy-10")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(10));
    el.querySelector("#qdev-energy-50")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(50));
    el.querySelector("#qdev-energy-100")?.addEventListener("click", () => this.devCallbacks?.setEnergy?.(100));

    el.querySelector("#qdev-session-end")?.addEventListener("click", () => this.devCallbacks?.expireSession?.());
    el.querySelector("#qdev-intent-open")?.addEventListener("click", () => this.devCallbacks?.openIntent?.());

    el.querySelector("#qdev-m1")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("m1"));
    el.querySelector("#qdev-m2")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("m2"));
    el.querySelector("#qdev-m3")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("m3"));
    el.querySelector("#qdev-f5")?.addEventListener("click", () => this.devCallbacks?.triggerMilestone?.("f5"));

    el.querySelector("#qdev-streak-3")?.addEventListener("click", () => this.devCallbacks?.setStreak?.(3));
    el.querySelector("#qdev-streak-7")?.addEventListener("click", () => this.devCallbacks?.setStreak?.(7));
    el.querySelector("#qdev-reflection")?.addEventListener("click", () => this.devCallbacks?.openReflection?.());
    el.querySelector("#qdev-reset")?.addEventListener("click", () => this.devCallbacks?.resetData?.());
  }
}

