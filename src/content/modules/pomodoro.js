/**
 * Mindful Social Media Tracker - Pomodoro Module
 * Quản lý chu kỳ Focus (25m) / Break (5m), lưu trạng thái bền vững
 */

import { savePomodoroState } from "../../utils/storage.js";

export class PomodoroManager {
  /**
   * @param {object} opts
   * @param {object} opts.config       - Cấu hình pomodoro { enabled, focusMinutes, breakMinutes }
   * @param {object} opts.state        - Trạng thái ban đầu
   * @param {Function} opts.onUpdate   - Callback khi trạng thái đổi
   */
  constructor({ config, state, onUpdate }) {
    this.config = config.pomodoro || { enabled: false, focusMinutes: 25, breakMinutes: 5 };
    this.onUpdate = onUpdate || (() => {});

    // Phục hồi trạng thái từ storage
    this.state = state || {
      enabled: this.config.enabled || false,
      sessionType: "focus",         // "focus" | "break"
      sessionStartTime: Date.now(),
      durationMinutes: this.config.focusMinutes || 25
    };

    this._timer = null;
  }

  // Kiểm tra đang trong Break Session không
  get isBreakSession() {
    return this.state.enabled && this.state.sessionType === "break";
  }

  // Kiểm tra đang trong Focus Session không
  get isFocusSession() {
    return this.state.enabled && this.state.sessionType === "focus";
  }

  // Tổng ms còn lại trong session hiện tại
  get remainingMs() {
    const elapsed = Date.now() - this.state.sessionStartTime;
    const totalMs = (this.state.durationMinutes || 25) * 60 * 1000;
    return Math.max(0, totalMs - elapsed);
  }

  // Khởi động/tiếp tục vòng đếm
  start() {
    if (!this.state.enabled) return;
    this._scheduleNextCheck();
  }

  _scheduleNextCheck() {
    if (this._timer) clearTimeout(this._timer);

    const remaining = this.remainingMs;
    if (remaining <= 0) {
      this._switchSession();
      return;
    }

    // Kiểm tra lại mỗi 10 giây để không miss transition
    this._timer = setTimeout(() => {
      if (this.remainingMs <= 0) {
        this._switchSession();
      } else {
        this.onUpdate();
        this._scheduleNextCheck();
      }
    }, Math.min(remaining, 10000));
  }

  _switchSession() {
    const wasFocus = this.state.sessionType === "focus";

    this.state.sessionType = wasFocus ? "break" : "focus";
    this.state.sessionStartTime = Date.now();
    this.state.durationMinutes = wasFocus
      ? (this.config.breakMinutes || 5)
      : (this.config.focusMinutes || 25);

    savePomodoroState(this.state);
    this.onUpdate();
    this._showSessionNotification(wasFocus);
    this._scheduleNextCheck();
  }

  _showSessionNotification(wasFocus) {
    const msg = wasFocus
      ? `☕ Nghỉ ngơi ${this.config.breakMinutes || 5} phút! Bạn xứng đáng được giải lao.`
      : `🎯 Bắt đầu Focus ${this.config.focusMinutes || 25} phút! Hãy tập trung nào.`;

    let toast = document.getElementById("mindful-toast-notify");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "mindful-toast-notify";
      toast.style.cssText = `
        position:fixed!important; top:24px!important; left:50%!important;
        transform:translateX(-50%)!important; z-index:2147483647!important;
        background:rgba(15,23,32,0.96)!important; color:#F8FAFC!important;
        padding:12px 22px!important; border-radius:30px!important;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
        font-size:13px!important; font-weight:600!important;
        box-shadow:0 10px 35px rgba(0,0,0,0.6)!important;
        backdrop-filter:blur(12px)!important; border:1.5px solid #8B5CF6!important;
        transition:all 0.3s ease!important; opacity:0; pointer-events:none!important;
      `;
      (document.body || document.documentElement).appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.style.opacity = "1";
    setTimeout(() => { if (toast) toast.style.opacity = "0"; }, 6000);
  }

  // Bật/tắt Pomodoro từ config thay đổi
  updateConfig(newPomodoroConfig) {
    this.config = newPomodoroConfig;
    if (!newPomodoroConfig.enabled) {
      this.state.enabled = false;
      if (this._timer) clearTimeout(this._timer);
    } else {
      this.state.enabled = true;
      this.start();
    }
    savePomodoroState(this.state);
    this.onUpdate();
  }

  // Format thời gian còn lại cho HUD
  getStatusLabel() {
    if (!this.state.enabled) return null;
    const totalSec = Math.ceil(this.remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const icon = this.state.sessionType === "focus" ? "🎯" : "☕";
    return `${icon} ${m}m${s}s`;
  }

  stop() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  }
}
