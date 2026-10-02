/**
 * Mindful Social Media Tracker - Pomodoro Module
 * Quản lý chu kỳ Focus / Break đa hiệp (Multi-cycle), đếm ngược từng giây,
 * vinh danh năng lượng Pet và chuyển hiệp tự động.
 */

import { savePomodoroState } from "../../utils/storage.js";

export class PomodoroManager {
  /**
   * @param {object} opts
   * @param {object} opts.config
   * @param {object} opts.state
   * @param {Function} opts.onUpdate
   * @param {object} opts.petEngine
   * @param {Function} opts.onAllCompleted
   */
  constructor({ config, state, onUpdate, petEngine, onAllCompleted }) {
    this.config = config.pomodoro || { enabled: false, focusMinutes: 25, breakMinutes: 5 };
    this.onUpdate = onUpdate || (() => {});
    this.petEngine = petEngine || null;
    this.onAllCompleted = onAllCompleted || (() => {});

    // Phục hồi trạng thái từ storage
    this.state = Object.assign({
      enabled: false,
      totalCycles: 2,
      currentCycle: 1,
      sessionType: "focus",         // "focus" | "break"
      sessionStartTime: Date.now(),
      durationMinutes: 25,
      focusMinutes: 25,
      breakMinutes: 5,
      focusMode: "music"
    }, state || {});

    this._intervalTimer = null;
  }

  setPetEngine(engine) {
    this.petEngine = engine;
  }

  get isEnabled() {
    return !!this.state.enabled;
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
    const elapsed = Date.now() - (this.state.sessionStartTime || Date.now());
    const totalMs = (this.state.durationMinutes || 25) * 60 * 1000;
    return Math.max(0, totalMs - elapsed);
  }

  // Khởi động/tiếp tục vòng đếm
  start() {
    if (!this.state.enabled) return;
    if (this._intervalTimer) clearInterval(this._intervalTimer);

    this._intervalTimer = setInterval(() => {
      if (this.remainingMs <= 0) {
        this._handleTransition();
      } else {
        this.onUpdate();
      }
    }, 1000);
  }

  // Kích hoạt một chu kỳ Pomodoro mới với thiết lập từ người dùng
  startNewSession({ totalCycles = 2, focusMinutes = 25, breakMinutes = 5, focusMode = "music" } = {}) {
    this.state = {
      enabled: true,
      totalCycles: Math.max(1, parseInt(totalCycles) || 2),
      currentCycle: 1,
      sessionType: "focus",
      sessionStartTime: Date.now(),
      durationMinutes: Math.max(1, parseInt(focusMinutes) || 25),
      focusMinutes: Math.max(1, parseInt(focusMinutes) || 25),
      breakMinutes: Math.max(1, parseInt(breakMinutes) || 5),
      focusMode: focusMode || "music"
    };

    savePomodoroState(this.state);
    this.start();
    this.onUpdate();

    if (this.petEngine) {
      this.petEngine.showPetToast(
        `🎯 Bắt đầu Chu kỳ Pomodoro (${this.state.totalCycles} hiệp). Hãy tập trung tối đa trong ${this.state.focusMinutes} phút!`,
        { title: "🍅 Pomodoro Khởi Động" }
      );
    }
  }

  _handleTransition() {
    const wasFocus = this.state.sessionType === "focus";

    if (wasFocus) {
      // 1. Vừa hoàn thành hiệp Focus -> Thưởng Pet +15⚡
      if (this.petEngine) {
        this.petEngine.reward(15, "pomodoro_complete");
      }

      if (this.state.currentCycle < this.state.totalCycles) {
        // Còn hiệp tiếp theo -> Chuyển sang Break
        this.state.sessionType = "break";
        this.state.sessionStartTime = Date.now();
        this.state.durationMinutes = this.state.breakMinutes;
        savePomodoroState(this.state);
        this.onUpdate();

        if (this.petEngine) {
          this.petEngine.showPetCenterModal({
            title: "🎉 Tuyệt Vời! Hoàn Thành Hiệp Focus!",
            message: `Bạn đã tập trung trọn vẹn <b>Hiệp ${this.state.currentCycle}/${this.state.totalCycles}</b>! Linh vật đã được nạp <b style="color:#FEF08A;">+15⚡</b>.<br/><br/>Bây giờ hãy đứng dậy vươn vai, uống nước và nghỉ ngơi <b>${this.state.breakMinutes} phút</b> nhé! ☕`,
            actions: [
              {
                label: "☕ Bắt đầu Nghỉ ngơi",
                primary: true,
                onClick: (e, modal) => modal.remove()
              }
            ]
          });
        }
      } else {
        // Đã hoàn thành toàn bộ tất cả các hiệp!
        if (this.petEngine) {
          this.petEngine.reward(10, "pomodoro_all_cycles_complete");
        }

        const totalDone = this.state.totalCycles;
        this.stop();
        this.state.enabled = false;
        savePomodoroState(this.state);
        this.onAllCompleted();
        this.onUpdate();

        if (this.petEngine) {
          this.petEngine.showPetCenterModal({
            title: "🏆 Xuất Sắc! Hoàn Thành Chu Kỳ Pomodoro!",
            message: `Chúc mừng bạn đã hoàn thành trọn vẹn cả <b>${totalDone}/${totalDone} hiệp Pomodoro</b> hôm nay! Bạn thật kiên định và kỷ luật.<br/><br/>Linh vật đã được thưởng thêm <b style="color:#FEF08A;">+10⚡</b> vinh danh! 🌟`,
            actions: [
              {
                label: "🌟 Tuyệt vời!",
                primary: true,
                onClick: (e, modal) => modal.remove()
              }
            ]
          });
        }
      }
    } else {
      // 2. Vừa hết giờ nghỉ giải lao (Break) -> Bắt đầu hiệp Focus tiếp theo
      this.state.currentCycle++;
      this.state.sessionType = "focus";
      this.state.sessionStartTime = Date.now();
      this.state.durationMinutes = this.state.focusMinutes;
      savePomodoroState(this.state);
      this.onUpdate();

      if (this.petEngine) {
        this.petEngine.showPetCenterModal({
          title: "🎯 Giờ Nghỉ Đã Hết - Bắt Đầu Hiệp Mới!",
          message: `Đã đến lúc bước vào <b>Hiệp ${this.state.currentCycle}/${this.state.totalCycles} Focus</b> (${this.state.focusMinutes} phút). Hãy giữ vững sự tập trung cao độ nhé! 🚀`,
          actions: [
            {
              label: "🚀 Tập trung ngay!",
              primary: true,
              onClick: (e, modal) => modal.remove()
            }
          ]
        });
      }
    }
  }

  // Dừng sớm theo yêu cầu người dùng
  stop() {
    if (this._intervalTimer) {
      clearInterval(this._intervalTimer);
      this._intervalTimer = null;
    }
    this.state.enabled = false;
    savePomodoroState(this.state);
    this.onUpdate();
  }

  // Cập nhật cấu hình từ popup
  updateConfig(newPomodoroConfig) {
    this.config = newPomodoroConfig;
    if (!newPomodoroConfig.enabled && this.state.enabled) {
      this.stop();
    }
  }

  // Format nhãn đếm ngược chi tiết cho HUD
  getStatusLabel() {
    if (!this.state.enabled) return null;
    const totalSec = Math.max(0, Math.ceil(this.remainingMs / 1000));
    const m = Math.floor(totalSec / 60);
    const s = String(totalSec % 60).padStart(2, "0");
    const icon = this.state.sessionType === "focus" ? "🍅" : "☕";
    const stage = this.state.sessionType === "focus" ? "Focus" : "Nghỉ";
    return `${icon} Hiệp ${this.state.currentCycle}/${this.state.totalCycles} ${stage} ${m}:${s}`;
  }
}

