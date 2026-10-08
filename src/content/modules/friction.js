/**
 * Mindful Social Media Tracker - Friction Module
 * Quản lý: Intentional Entry Modal, Hard Friction Overlay với ảnh cá nhân & giữ Space 3s
 */

import { saveDayData } from "../../utils/storage.js";

export class FrictionManager {
  /**
   * @param {object} opts
   * @param {Function} opts.getConfig       - () => { masterGoal, emotionalAnchorImage }
   * @param {Function} opts.onToast         - (msg, ms) => void
   * @param {object} opts.dayData
   * @param {string} opts.platformKey
   */
  constructor({ getConfig, onToast, dayData, platformKey }) {
    this.getConfig = getConfig;
    this.onToast = onToast || (() => {});
    this.dayData = dayData || null;
    this.platformKey = platformKey || "youtube";

    this._isOverlayActive = false;
    this._spaceHoldStart = null;
    this._spaceRAF = null;
    this._graceSwipes = 0;

    this.petEngine = null;

    // Ngăn scroll khi overlay hiển thị
    this._preventScroll = (e) => {
      if (this._isOverlayActive) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  }

  setPetEngine(pe) {
    this.petEngine = pe;
  }

  // ─── Grace swipes (sau khi hold Space 3s) ────────────────────────────────

  get graceSwipes() { return this._graceSwipes; }

  consumeGrace() {
    if (this._graceSwipes > 0) {
      this._graceSwipes--;
      return true; // còn lượt hoãn
    }
    return false;
  }

  // ─── Intentional Entry Modal & Session Limiter ──────────────────────────

  showIntentModal(pe = null) {
    const petEngine = pe || this.petEngine;
    const path = location.pathname;
    const isTarget =
      path.startsWith("/shorts") ||
      path.includes("/reel") ||
      (location.hostname.includes("facebook.com") && (path === "/" || path === "")) ||
      (location.hostname.includes("youtube.com") && (path === "/" || path === ""));

    if (!isTarget) return;
    if (sessionStorage.getItem("mindful_session")) return;
    if (document.getElementById("mindful-intent-modal")) return;

    const config = this.getConfig();
    const partnerImg = config.emotionalAnchorImage || "";
    let selectedMins = 15;

    const modal = document.createElement("div");
    modal.id = "mindful-intent-modal";
    modal.style.cssText = `
      position:fixed!important; top:0!important; left:0!important;
      width:100vw!important; height:100vh!important; z-index:2147483647!important;
      background:rgba(8,12,20,0.92)!important; backdrop-filter:blur(14px)!important;
      display:flex!important; align-items:center!important; justify-content:center!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
    `;

    const avatarHtml = partnerImg ? `
      <div style="position:relative; width:72px; height:72px; margin:0 auto 12px; border-radius:50%; padding:3px; background:linear-gradient(135deg, #EC4899, #8B5CF6); box-shadow:0 0 20px rgba(236,72,153,0.4);">
        <img src="${partnerImg}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="Người đồng hành" />
        <span style="position:absolute; bottom:0; right:0; background:#10B981; border:2px solid #161E31; width:16px; height:16px; border-radius:50%; box-shadow:0 0 8px #10B981;" title="Người thương đang đồng hành cùng bạn"></span>
      </div>
    ` : `
      <div style="width:64px; height:64px; margin:0 auto 12px; border-radius:50%; background:linear-gradient(135deg,#8B5CF6,#6366F1); display:flex; align-items:center; justify-content:center; font-size:32px; box-shadow:0 0 20px rgba(139,92,246,0.45);">
        🎯
      </div>
    `;

    modal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:22px;
        padding:26px 24px; width:360px; text-align:center; box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.25); color:#fff; position:relative; animation:mindfulBubblePop 0.3s cubic-bezier(0.16,1,0.3,1);">
        ${avatarHtml}
        <div style="font-size:16px; font-weight:800; margin-bottom:4px; color:#F8FAFC;">
          ${partnerImg ? "Người thương muốn hỏi bạn:" : "Xác định Mục tiêu Phiên Lướt"}
        </div>
        <div style="font-size:12.5px; color:#94A3B8; margin-bottom:14px; line-height:1.45;">
          "Chào bạn! Mục tiêu hôm nay bạn vào lướt là gì nè?"
        </div>
        <input type="text" id="mindful-intent-input" placeholder="VD: Tìm tài liệu học, xem tin tức 15p..."
          style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.4);
          border:1px solid rgba(255,255,255,0.18); color:#fff; border-radius:10px;
          padding:10px 14px; font-size:13px; margin-bottom:14px; outline:none; transition:border 0.2s;">
        
        <div style="font-size:11.5px; font-weight:600; color:#A78BFA; margin-bottom:8px; text-align:left;">
          ⏱️ Chọn thời lượng phiên lướt:
        </div>
        <div id="mindful-duration-chips" style="display:flex; gap:6px; margin-bottom:18px; justify-content:space-between;">
          <button type="button" class="duration-chip" data-mins="5" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">5p</button>
          <button type="button" class="duration-chip" data-mins="10" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">10p</button>
          <button type="button" class="duration-chip active" data-mins="15" style="flex:1; padding:7px 0; background:linear-gradient(135deg,#8B5CF6,#6366F1); border:1px solid #A78BFA; border-radius:8px; color:#fff; font-size:12px; font-weight:700; cursor:pointer;">15p</button>
          <button type="button" class="duration-chip" data-mins="20" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">20p</button>
          <button type="button" class="duration-chip" data-mins="30" style="flex:1; padding:7px 0; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#CBD5E1; font-size:12px; font-weight:700; cursor:pointer;">30p</button>
        </div>

        <button id="mindful-intent-submit"
          style="width:100%; background:linear-gradient(135deg,#8B5CF6,#6366F1); border:none;
          color:#fff; font-weight:800; padding:12px 0; border-radius:10px; cursor:pointer;
          font-size:13.5px; box-shadow:0 4px 18px rgba(139,92,246,0.45); transition:transform 0.15s;">
          🚀 Bắt đầu phiên (15 phút)
        </button>
      </div>
    `;

    (document.body || document.documentElement).appendChild(modal);

    const input = modal.querySelector("#mindful-intent-input");
    const submitBtn = modal.querySelector("#mindful-intent-submit");
    const chips = modal.querySelectorAll(".duration-chip");

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => {
          c.classList.remove("active");
          c.style.background = "rgba(255,255,255,0.08)";
          c.style.borderColor = "rgba(255,255,255,0.15)";
          c.style.color = "#CBD5E1";
        });
        chip.classList.add("active");
        chip.style.background = "linear-gradient(135deg,#8B5CF6,#6366F1)";
        chip.style.borderColor = "#A78BFA";
        chip.style.color = "#fff";
        selectedMins = parseInt(chip.getAttribute("data-mins")) || 15;
        if (submitBtn) submitBtn.textContent = `🚀 Bắt đầu phiên (${selectedMins} phút)`;
      });
    });

    setTimeout(() => input?.focus(), 150);

    const submit = () => {
      const val = input.value.trim() || "Giải trí có kiểm soát";
      const sessionData = {
        startTime: Date.now(),
        durationMinutes: selectedMins,
        goal: val,
        extensionsCount: 0,
        expiredNotified: false
      };
      sessionStorage.setItem("mindful_session", JSON.stringify(sessionData));
      sessionStorage.setItem("mindful_session_intent", val);
      modal.remove();

      const goalText = config.masterGoal || "Muốn trở thành phiên bản tốt hơn";
      if (petEngine && typeof petEngine.showPetToast === "function") {
        petEngine.showPetToast(
          `Phiên ${selectedMins}p bắt đầu! Mục tiêu: <b>${val}</b>. Nhớ mục tiêu lớn: <i>${goalText}</i>`,
          { title: "Bắt đầu phiên lướt" }
        );
      } else {
        this.onToast(`🌟 Bắt đầu phiên ${selectedMins}p! Mục tiêu lớn: <b>${goalText}</b>.`, 4500);
      }
    };

    submitBtn.onclick = submit;
    input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
  }

  // ─── Kiểm Tra Đếm Ngược Phiên Lướt ──────────────────────────────────────

  checkSessionTimer(pe = null) {
    const petEngine = pe || this.petEngine;
    const raw = sessionStorage.getItem("mindful_session");
    if (!raw) return;

    try {
      const session = JSON.parse(raw);
      if (!session || session.expiredNotified) return;

      const elapsedMs = Date.now() - session.startTime;
      const totalMs = (session.durationMinutes || 15) * 60 * 1000;

      if (elapsedMs >= totalMs) {
        session.expiredNotified = true;
        sessionStorage.setItem("mindful_session", JSON.stringify(session));
        this.showSessionExpiredModal(session, petEngine);
      }
    } catch (e) {
      console.warn("[Mindful] Error parsing session:", e);
    }
  }

  // ─── Modal Hết Giờ Phiên Lướt & Tùy Chọn Gia Hạn ────────────────────────

  showSessionExpiredModal(session, pe = null) {
    const petEngine = pe || this.petEngine;
    const config = this.getConfig();
    const partnerImg = config.emotionalAnchorImage || "";
    const extensionsCount = session.extensionsCount || 0;
    const canExtendTimes = extensionsCount < 2;
    const petEnergy = petEngine ? petEngine.energy : 100;
    const hasEnoughEnergy = petEnergy >= 10;
    const canExtend = canExtendTimes && hasEnoughEnergy;

    let subModal = document.getElementById("mindful-session-expired-modal");
    if (subModal) subModal.remove();

    subModal = document.createElement("div");
    subModal.id = "mindful-session-expired-modal";
    subModal.style.cssText = `
      position:fixed!important; top:0!important; left:0!important;
      width:100vw!important; height:100vh!important; z-index:2147483647!important;
      background:rgba(8,12,20,0.92)!important; backdrop-filter:blur(14px)!important;
      display:flex!important; align-items:center!important; justify-content:center!important;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
    `;

    const avatarHtml = partnerImg ? `
      <div style="position:relative; width:70px; height:70px; margin:0 auto 12px; border-radius:50%; padding:2.5px; background:linear-gradient(135deg, #EC4899, #8B5CF6); box-shadow:0 0 22px rgba(236,72,153,0.5);">
        <img src="${partnerImg}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="Người đồng hành" />
      </div>
    ` : (petEngine ? `<div style="display:flex; justify-content:center; margin-bottom:12px;">${petEngine.getPetAvatarHtml(60)}</div>` : `<div style="font-size:44px; margin-bottom:10px;">⏰</div>`);

    let extendButtonsHtml = "";
    if (canExtend) {
      extendButtonsHtml = `
        <div style="font-size:12px; font-weight:700; color:#A78BFA; margin-bottom:8px; text-align:left;">
          ⏱️ Hoặc gia hạn thêm (Trừ năng lượng Pet):
        </div>
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <button id="btn-extend-5" style="flex:1; padding:9px 4px; background:rgba(139,92,246,0.18); border:1px solid #8B5CF6; border-radius:8px; color:#F8FAFC; font-size:11.5px; font-weight:700; cursor:pointer;">
            +5p <span style="color:#EF4444; font-size:10px;">(-10⚡)</span>
          </button>
          <button id="btn-extend-10" ${petEnergy < 20 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="flex:1; padding:9px 4px; background:rgba(139,92,246,0.18); border:1px solid #8B5CF6; border-radius:8px; color:#F8FAFC; font-size:11.5px; font-weight:700;">
            +10p <span style="color:#EF4444; font-size:10px;">(-20⚡)</span>
          </button>
          <button id="btn-extend-15" ${petEnergy < 35 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : 'style="cursor:pointer;"'} style="flex:1; padding:9px 4px; background:rgba(139,92,246,0.18); border:1px solid #8B5CF6; border-radius:8px; color:#F8FAFC; font-size:11.5px; font-weight:700;">
            +15p <span style="color:#EF4444; font-size:10px;">(-35⚡)</span>
          </button>
        </div>
      `;
    } else {
      const reasonMsg = !canExtendTimes ? "Đã đạt giới hạn 2 lần gia hạn cho phiên này." : "Pet đã quá mệt (<10⚡), không thể gia hạn thêm.";
      extendButtonsHtml = `
        <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:10px; margin-bottom:16px; font-size:12px; color:#FCA5A5;">
          🚫 ${reasonMsg}
        </div>
      `;
    }

    subModal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:22px;
        padding:26px 24px; width:380px; text-align:center; box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25); color:#fff; position:relative; animation:mindfulBubblePop 0.3s cubic-bezier(0.16,1,0.3,1);">
        ${avatarHtml}
        <div style="font-size:18px; font-weight:800; margin-bottom:6px; color:#F8FAFC;">
          ⏰ Hết Giờ Phiên Lướt (${session.durationMinutes} phút)
        </div>
        <div style="font-size:13px; color:#94A3B8; margin-bottom:18px; line-height:1.5;">
          Mục tiêu ban đầu của bạn: <b style="color:#F1F5F9;">"${session.goal || 'Xem tin tức'}"</b>.<br/>
          Bạn đã hoàn thành việc mình cần làm chưa?
        </div>

        <button id="btn-close-session-tab"
          style="width:100%; background:linear-gradient(135deg,#10B981,#059669); border:none;
          color:#fff; font-weight:800; padding:12px 0; border-radius:10px; cursor:pointer;
          font-size:13.5px; box-shadow:0 4px 18px rgba(16,185,129,0.4); margin-bottom:14px;">
          🛑 Đóng Tab & Nghỉ Ngơi (+5⚡ Năng Lượng)
        </button>

        ${extendButtonsHtml}

        <div style="font-size:11px; color:#64748B;">
          Đã gia hạn: ${extensionsCount}/2 lần | Năng lượng Pet: ${petEnergy}⚡
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(subModal);

    // Xử lý đóng tab
    const closeTabBtn = subModal.querySelector("#btn-close-session-tab");
    if (closeTabBtn) {
      closeTabBtn.onclick = () => {
        sessionStorage.removeItem("mindful_session");
        sessionStorage.removeItem("mindful_session_intent");
        if (petEngine) petEngine.reward(5, "session_closed_ontime");
        subModal.remove();
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: "CLOSE_CURRENT_TAB" }, (res) => {
            if (!res || !res.ok) window.close();
          });
        } else {
          window.close();
        }
      };
    }

    // Xử lý gia hạn
    const handleExtend = (extraMins, cost) => {
      if (petEngine) petEngine.penalize(cost, "session_extension");
      session.durationMinutes += extraMins;
      session.extensionsCount = (session.extensionsCount || 0) + 1;
      session.expiredNotified = false;
      session.startTime = Date.now(); // Reset bộ đếm thời gian cho thời gian gia hạn
      sessionStorage.setItem("mindful_session", JSON.stringify(session));
      subModal.remove();

      if (petEngine && typeof petEngine.showPetToast === "function") {
        petEngine.showPetToast(
          `Đã gia hạn thêm <b>${extraMins} phút</b> (-${cost}⚡). Hãy tập trung hoàn tất nhé!`,
          { title: "Gia hạn phiên lướt" }
        );
      }
    };

    const btn5 = subModal.querySelector("#btn-extend-5");
    const btn10 = subModal.querySelector("#btn-extend-10");
    const btn15 = subModal.querySelector("#btn-extend-15");

    if (btn5) btn5.onclick = () => handleExtend(5, 10);
    if (btn10) btn10.onclick = () => handleExtend(10, 20);
    if (btn15) btn15.onclick = () => handleExtend(15, 35);
  }

  // ─── Modal Thẩm Định Mục Tiêu Học Tập (10s Study Focus Check-in) ───────────
  showStudyCheckInModal(videoTitle, onConfirmed, onRejected) {
    let modal = document.getElementById("mindful-study-checkin-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "mindful-study-checkin-modal";
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.78) !important;
      backdrop-filter: blur(10px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 16px !important;
      box-sizing: border-box !important;
    `;

    const petAvatar = this.petEngine ? `<div style="display:flex; justify-content:center; margin-bottom:12px;">${this.petEngine.getPetAvatarHtml(60)}</div>` : `<div style="font-size:44px; margin-bottom:10px;">📚</div>`;

    modal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:20px;
        padding:26px 24px; max-width:400px; width:100%; text-align:center;
        box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25); color:#fff; position:relative;
        animation:mindfulCardPop 0.3s cubic-bezier(0.16,1,0.3,1);">
        ${petAvatar}
        <div style="font-size:16px; font-weight:800; margin-bottom:6px; color:#F8FAFC;">
          📚 Thẩm Định Mục Tiêu Học Tập
        </div>
        <div style="font-size:12.5px; color:#94A3B8; margin-bottom:12px; line-height:1.45; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
          Bạn đang xem: <b style="color:#F1F5F9;">"${videoTitle}"</b>
        </div>
        <div style="font-size:12px; color:#CBD5E1; margin-bottom:10px;">
          Video này phục vụ mục tiêu học tập gì của bạn?
        </div>
        <input type="text" id="mindful-study-intent-input" placeholder="VD: Học lập trình Python, luyện nghe tiếng Anh..."
          style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.18);
          color:#fff; border-radius:10px; padding:10px 14px; font-size:12.5px; margin-bottom:16px; outline:none;">

        <div style="display:flex; gap:8px;">
          <button id="btn-study-confirm" style="flex:1; background:linear-gradient(135deg,#8B5CF6,#6366F1); border:none;
            color:#fff; font-weight:700; padding:10px 0; border-radius:8px; cursor:pointer; font-size:12px; box-shadow:0 4px 15px rgba(139,92,246,0.4);">
            ✓ Đúng mục tiêu học
          </button>
          <button id="btn-study-reject" style="flex:1; background:rgba(239,68,68,0.2); border:1px solid #EF4444;
            color:#FCA5A5; font-weight:700; padding:10px 0; border-radius:8px; cursor:pointer; font-size:12px;">
            🛑 Video giải trí (-10⚡)
          </button>
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(modal);

    const input = modal.querySelector("#mindful-study-intent-input");
    setTimeout(() => input?.focus(), 150);

    const confirmBtn = modal.querySelector("#btn-study-confirm");
    const rejectBtn = modal.querySelector("#btn-study-reject");

    confirmBtn.onclick = () => {
      const intent = input.value.trim() || "Nội dung học tập";
      modal.remove();
      if (onConfirmed) onConfirmed(intent);
    };

    rejectBtn.onclick = () => {
      modal.remove();
      if (onRejected) onRejected();
    };
  }

  // ─── Modal Thiết Lập Chu Kỳ Pomodoro (Cycles, Times & Mode) ───────────────
  showPomodoroSetupModal({ onStart, onCancel } = {}) {
    let modal = document.getElementById("mindful-pomodoro-setup-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "mindful-pomodoro-setup-modal";
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.82) !important;
      backdrop-filter: blur(12px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 16px !important;
      box-sizing: border-box !important;
    `;

    const petAvatar = this.petEngine ? `<div style="display:flex; justify-content:center; margin-bottom:10px;">${this.petEngine.getPetAvatarHtml(56)}</div>` : `<div style="font-size:42px; margin-bottom:8px;">🍅</div>`;

    let selectedCycles = 2;
    let selectedFocus = 25;
    let selectedBreak = 5;
    let selectedMode = "music";

    modal.innerHTML = `
      <div style="background:#131B2E; border:1.5px solid rgba(139,92,246,0.55); border-radius:22px;
        padding:26px 24px; max-width:420px; width:100%; text-align:center;
        box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25); color:#fff; position:relative;
        animation:mindfulCardPop 0.3s cubic-bezier(0.16,1,0.3,1);">

        <button id="btn-close-pom-setup" style="position:absolute; top:14px; right:16px; background:none; border:none; color:#64748B; font-size:18px; cursor:pointer;" title="Đóng">✕</button>

        ${petAvatar}
        <div style="font-size:17px; font-weight:800; color:#F8FAFC; margin-bottom:4px;">
          🍅 Thiết Lập Chu Kỳ Pomodoro
        </div>
        <div style="font-size:12px; color:#94A3B8; margin-bottom:16px; line-height:1.4;">
          Chọn số hiệp và phương thức tập trung phù hợp nhất với bạn
        </div>

        <!-- 1. Chọn số hiệp Pomodoro -->
        <div style="text-align:left; margin-bottom:12px;">
          <div style="font-size:11px; font-weight:700; color:#CBD5E1; margin-bottom:6px;">1. Số hiệp Pomodoro:</div>
          <div id="pom-cycles-group" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
            <button type="button" class="pom-pill pom-cycle-btn" data-val="1" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">1 Hiệp</button>
            <button type="button" class="pom-pill pom-cycle-btn active" data-val="2" style="background:rgba(139,92,246,0.3); border:1.5px solid #8B5CF6; color:#C4B5FD; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">2 Hiệp</button>
            <button type="button" class="pom-pill pom-cycle-btn" data-val="3" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">3 Hiệp</button>
            <button type="button" class="pom-pill pom-cycle-btn" data-val="4" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; padding:7px 0; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">4 Hiệp</button>
          </div>
        </div>

        <!-- 2. Thời lượng Focus & Break -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left; margin-bottom:14px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:#A78BFA; margin-bottom:5px;">Focus (Tập trung):</div>
            <select id="pom-focus-select" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(139,92,246,0.4); color:#fff; border-radius:8px; padding:7px 8px; font-size:12px; outline:none; cursor:pointer;">
              <option value="15">15 phút</option>
              <option value="25" selected>25 phút (Chuẩn)</option>
              <option value="45">45 phút</option>
              <option value="60">60 phút</option>
            </select>
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; color:#06B6D4; margin-bottom:5px;">Break (Nghỉ ngơi):</div>
            <select id="pom-break-select" style="width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(6,182,212,0.4); color:#fff; border-radius:8px; padding:7px 8px; font-size:12px; outline:none; cursor:pointer;">
              <option value="3">3 phút</option>
              <option value="5" selected>5 phút (Chuẩn)</option>
              <option value="10">10 phút</option>
              <option value="15">15 phút</option>
            </select>
          </div>
        </div>

        <!-- 3. Chọn Chế Độ Focus -->
        <div style="text-align:left; margin-bottom:18px;">
          <div style="font-size:11px; font-weight:700; color:#CBD5E1; margin-bottom:6px;">2. Chế độ làm việc:</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <label id="pom-mode-music-card" style="display:flex; flex-direction:column; gap:3px; padding:10px; background:rgba(139,92,246,0.18); border:1.5px solid #8B5CF6; border-radius:10px; cursor:pointer; transition:all 0.2s;">
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="radio" name="pom-focus-mode" value="music" checked style="accent-color:#8B5CF6;">
                <span style="font-size:12px; font-weight:700; color:#C4B5FD;">🎵 Mode Nhạc</span>
              </div>
              <span style="font-size:10px; color:#94A3B8; line-height:1.3; margin-top:2px;">Màn hình Đen Trắng, video nhạc tính riêng không tính xao nhãng.</span>
            </label>

            <label id="pom-mode-study-card" style="display:flex; flex-direction:column; gap:3px; padding:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:10px; cursor:pointer; transition:all 0.2s;">
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="radio" name="pom-focus-mode" value="study" style="accent-color:#10B981;">
                <span style="font-size:12px; font-weight:700; color:#6EE7B7;">📚 Mode Học</span>
              </div>
              <span style="font-size:10px; color:#94A3B8; line-height:1.3; margin-top:2px;">Màn hình giữ màu, sau 10s hỏi mục tiêu bài học xem có ích không.</span>
            </label>
          </div>
        </div>

        <!-- Nút Bắt đầu & Hủy -->
        <div style="display:flex; gap:8px;">
          <button id="btn-pom-start" style="flex:2; background:linear-gradient(135deg, #8B5CF6, #6366F1); border:none; color:#fff; font-weight:700; padding:11px 0; border-radius:10px; cursor:pointer; font-size:13px; box-shadow:0 4px 15px rgba(139,92,246,0.4);">
            🚀 Bắt Đầu Pomodoro
          </button>
          <button id="btn-pom-cancel" style="flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#94A3B8; font-weight:600; padding:11px 0; border-radius:10px; cursor:pointer; font-size:12px;">
            Hủy
          </button>
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(modal);

    // Event chọn số hiệp
    const cycleBtns = modal.querySelectorAll(".pom-cycle-btn");
    cycleBtns.forEach(btn => {
      btn.onclick = () => {
        cycleBtns.forEach(b => {
          b.style.background = "rgba(255,255,255,0.06)";
          b.style.borderColor = "rgba(255,255,255,0.12)";
          b.style.color = "#CBD5E1";
        });
        btn.style.background = "rgba(139,92,246,0.3)";
        btn.style.borderColor = "#8B5CF6";
        btn.style.color = "#C4B5FD";
        selectedCycles = parseInt(btn.getAttribute("data-val")) || 2;
      };
    });

    // Event chọn mode
    const modeRadios = modal.querySelectorAll("input[name='pom-focus-mode']");
    const musicCard = modal.querySelector("#pom-mode-music-card");
    const studyCard = modal.querySelector("#pom-mode-study-card");

    modeRadios.forEach(radio => {
      radio.onchange = () => {
        selectedMode = radio.value;
        if (selectedMode === "music") {
          musicCard.style.background = "rgba(139,92,246,0.18)";
          musicCard.style.borderColor = "#8B5CF6";
          studyCard.style.background = "rgba(255,255,255,0.05)";
          studyCard.style.borderColor = "rgba(255,255,255,0.12)";
        } else {
          studyCard.style.background = "rgba(16,185,129,0.18)";
          studyCard.style.borderColor = "#10B981";
          musicCard.style.background = "rgba(255,255,255,0.05)";
          musicCard.style.borderColor = "rgba(255,255,255,0.12)";
        }
      };
    });

    const closeBtn = modal.querySelector("#btn-close-pom-setup");
    const cancelBtn = modal.querySelector("#btn-pom-cancel");
    const startBtn = modal.querySelector("#btn-pom-start");

    const closeModal = () => {
      modal.remove();
      if (onCancel) onCancel();
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    startBtn.onclick = () => {
      const focusSelect = modal.querySelector("#pom-focus-select");
      const breakSelect = modal.querySelector("#pom-break-select");
      selectedFocus = parseInt(focusSelect?.value) || 25;
      selectedBreak = parseInt(breakSelect?.value) || 5;

      modal.remove();
      if (onStart) {
        onStart({
          totalCycles: selectedCycles,
          focusMinutes: selectedFocus,
          breakMinutes: selectedBreak,
          focusMode: selectedMode
        });
      }
    };
  }

  // ─── Hard Friction Overlay với Bài tập Thở Box Breathing (12s) ───────────

  _injectBreathingStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("mindful-breathing-styles")) return;

    const style = document.createElement("style");
    style.id = "mindful-breathing-styles";
    style.textContent = `
      @keyframes mindfulBoxBreathe {
        0% { transform: scale(0.75); box-shadow: 0 0 25px rgba(6, 182, 212, 0.4); background: radial-gradient(circle, #06B6D4 0%, rgba(6, 182, 212, 0.2) 70%); }
        33.33% { transform: scale(1.22); box-shadow: 0 0 45px rgba(6, 182, 212, 0.8); background: radial-gradient(circle, #06B6D4 0%, rgba(6, 182, 212, 0.3) 70%); }
        33.34% { transform: scale(1.22); box-shadow: 0 0 45px rgba(139, 92, 246, 0.8); background: radial-gradient(circle, #8B5CF6 0%, rgba(139, 92, 246, 0.3) 70%); }
        66.66% { transform: scale(1.22); box-shadow: 0 0 50px rgba(139, 92, 246, 0.9); background: radial-gradient(circle, #A78BFA 0%, rgba(139, 92, 246, 0.3) 70%); }
        66.67% { transform: scale(1.22); box-shadow: 0 0 45px rgba(16, 185, 129, 0.8); background: radial-gradient(circle, #10B981 0%, rgba(16, 185, 129, 0.3) 70%); }
        100% { transform: scale(0.75); box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); background: radial-gradient(circle, #10B981 0%, rgba(16, 185, 129, 0.2) 70%); }
      }
      @keyframes mindfulPulseGlow {
        0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4)); }
        50% { transform: scale(1.02); filter: drop-shadow(0 0 28px rgba(139, 92, 246, 0.7)); }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * @param {number} currentCount
   * @param {number} m3Limit
   * @param {string} unitLabel
   */
  showHardFriction(currentCount, m3Limit, unitLabel = "lượt") {
    if (this._isOverlayActive) return;
    this._isOverlayActive = true;
    this._injectBreathingStyles();

    const config = this.getConfig();
    let overlay = document.getElementById("mindful-friction-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mindful-friction-overlay";
      overlay.style.cssText = `
        position:fixed!important; top:0!important; left:0!important;
        width:100vw!important; height:100vh!important; z-index:2147483647!important;
        background:rgba(8,12,20,0.96)!important; backdrop-filter:blur(18px)!important;
        display:flex!important; flex-direction:column!important;
        align-items:center!important; justify-content:center!important;
        text-align:center!important; color:#F8FAFC!important;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
        padding:20px!important; box-sizing:border-box!important; user-select:none!important;
        overflow-y:auto!important;
      `;
      (document.body || document.documentElement).appendChild(overlay);
    }

    const anchorSrc = config.emotionalAnchorImage || "";
    const goalText = config.masterGoal || "Muốn trở thành phiên bản tốt hơn";

    const imageHtml = anchorSrc
      ? `<div style="position:relative; display:inline-block; margin-bottom:12px;">
           <img src="${anchorSrc}" style="width:110px; height:110px; border-radius:50%;
             border:3px solid #8B5CF6; box-shadow:0 0 30px rgba(139,92,246,0.6);
             object-fit:cover; animation:mindfulPulseGlow 3s ease-in-out infinite;">
           <div style="position:absolute; bottom:0; right:0; font-size:22px;">❤️</div>
         </div>`
      : `<div style="width:90px; height:90px; border-radius:50%;
           background:rgba(239,68,68,0.15); border:2.5px solid #EF4444;
           display:flex; align-items:center; justify-content:center;
           font-size:42px; margin-bottom:12px; box-shadow:0 0 25px rgba(239,68,68,0.4);">🛑</div>`;

    overlay.innerHTML = `
      <div style="max-width:440px; display:flex; flex-direction:column; align-items:center;">
        ${imageHtml}

        <div style="font-size:20px; font-weight:800; color:#EF4444; margin-bottom:6px; letter-spacing:-0.3px;">
          Dừng Lại Một Chút Nào!
        </div>

        <div style="font-size:13px; color:#CBD5E1; margin-bottom:10px; line-height:1.45;">
          Bạn đã lướt <b>${currentCount}</b> ${unitLabel} (Vượt trần đỏ <b>${m3Limit}</b> ${unitLabel} hôm nay).
        </div>

        <div style="background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.4);
          border-radius:12px; padding:10px 16px; margin-bottom:18px; width:100%; box-sizing:border-box;">
          <div style="font-size:11px; color:#C4B5FD; font-weight:700; text-transform:uppercase;">Lời nhắc từ mục tiêu lớn của bạn:</div>
          <div style="font-size:13px; font-weight:700; color:#fff; margin-top:2px;">"${goalText}"</div>
          <div style="font-size:11px; color:#94A3B8; margin-top:3px; font-style:italic;">Người thương luôn tin bạn sẽ làm chủ được bản thân!</div>
        </div>

        <!-- Box Breathing Widget 12s (4s Hít - 4s Giữ - 4s Thở) -->
        <div style="position:relative; width:160px; height:160px; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
          <!-- SVG Progress Ring 12s -->
          <svg width="160" height="160" style="position:absolute; top:0; left:0; transform:rotate(-90deg); overflow:visible;">
            <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.08)" stroke-width="6" fill="none" />
            <circle id="mindful-breathing-ring" cx="80" cy="80" r="70" stroke="#06B6D4" stroke-width="6" fill="none"
              stroke-linecap="round" stroke-dasharray="440" stroke-dashoffset="440" style="transition: stroke-dashoffset 0.1s linear, stroke 0.4s ease;" />
          </svg>

          <!-- Animated Breathing Orb -->
          <div id="mindful-breathing-orb" style="width:78px; height:78px; border-radius:50%;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            animation: mindfulBoxBreathe 12s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; will-change:transform;">
            <div id="mindful-breath-countdown" style="font-size:20px; font-weight:800; color:#fff; text-shadow:0 2px 6px rgba(0,0,0,0.6);">12s</div>
          </div>
        </div>

        <!-- Realtime Breathing Phase Instruction -->
        <div id="mindful-breath-instruction" style="font-size:14px; font-weight:700; color:#06B6D4; margin-bottom:20px; min-height:22px; transition:color 0.3s ease;">
          🌬️ Hít vào thật sâu bằng mũi (4s)...
        </div>

        <!-- Actions -->
        <div style="display:flex; gap:10px; width:100%; justify-content:center;">
          <button id="mindful-btn-close-tab" style="flex:1; background:rgba(239,68,68,0.2); border:1.5px solid #EF4444; color:#FCA5A5; font-weight:700; padding:10px 14px; border-radius:10px; cursor:pointer; font-size:12px; transition:all 0.2s;">
            🛑 Đóng Tab Ngay
          </button>
          <button id="mindful-btn-continue" disabled style="flex:1; background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.15); color:#64748B; font-weight:700; padding:10px 14px; border-radius:10px; cursor:not-allowed; font-size:12px; transition:all 0.3s;">
            ⏳ Thở hết 12s để mở
          </button>
        </div>
      </div>
    `;

    overlay.style.display = "flex";

    window.addEventListener("wheel", this._preventScroll, { passive: false });
    window.addEventListener("touchmove", this._preventScroll, { passive: false });

    const btnCloseTab = overlay.querySelector("#mindful-btn-close-tab");
    const btnContinue = overlay.querySelector("#mindful-btn-continue");
    const ring = overlay.querySelector("#mindful-breathing-ring");
    const countdownEl = overlay.querySelector("#mindful-breath-countdown");
    const instructEl = overlay.querySelector("#mindful-breath-instruction");

    // Xử lý đóng tab (Vượt qua cám dỗ)
    if (btnCloseTab) {
      btnCloseTab.onclick = () => {
        if (this.dayData?.temptation) {
          this.dayData.temptation.resistedCount = (this.dayData.temptation.resistedCount || 0) + 1;
          saveDayData(this.dayData, this.platformKey, true);
        }
        try {
          window.close();
        } catch (_) {}
        setTimeout(() => {
          window.location.href = "about:blank";
        }, 100);
      };
    }

    // Bộ đếm Box Breathing 12 giây
    const totalDuration = 12000;
    const startTime = Date.now();
    const circumference = 440; // 2 * PI * 70 approx 439.8

    const intervalTimer = setInterval(() => {
      if (!this._isOverlayActive) {
        clearInterval(intervalTimer);
        return;
      }

      const elapsed = Date.now() - startTime;
      const remainingSecs = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      const progress = Math.min(1, elapsed / totalDuration);

      if (countdownEl) countdownEl.innerText = `${remainingSecs}s`;
      if (ring) {
        const offset = circumference - (progress * circumference);
        ring.style.strokeDashoffset = `${offset}`;
      }

      // Pha 1: 0 - 4s (Hít vào)
      if (elapsed < 4000) {
        if (instructEl) {
          instructEl.innerText = "🌬️ Hít vào thật sâu bằng mũi...";
          instructEl.style.color = "#06B6D4";
        }
        if (ring) ring.style.stroke = "#06B6D4";
      }
      // Pha 2: 4 - 8s (Giữ hơi)
      else if (elapsed < 8000) {
        if (instructEl) {
          instructEl.innerText = "🧘 Nín thở & thả lỏng toàn thân...";
          instructEl.style.color = "#A78BFA";
        }
        if (ring) ring.style.stroke = "#8B5CF6";
      }
      // Pha 3: 8 - 12s (Thở ra)
      else if (elapsed < 12000) {
        if (instructEl) {
          instructEl.innerText = "💨 Thở ra từ từ bằng miệng...";
          instructEl.style.color = "#10B981";
        }
        if (ring) ring.style.stroke = "#10B981";
      }
      // Hoàn tất 1 chu kỳ 12s
      else {
        clearInterval(intervalTimer);
        if (countdownEl) countdownEl.innerText = "✓";
        if (instructEl) {
          instructEl.innerText = "✨ Tâm trí đã bình tĩnh lại. Bạn có thể tiếp tục!";
          instructEl.style.color = "#10B981";
        }
        if (btnContinue) {
          btnContinue.removeAttribute("disabled");
          btnContinue.style.cursor = "pointer";
          btnContinue.style.background = "linear-gradient(135deg, #8B5CF6, #6366F1)";
          btnContinue.style.borderColor = "#A78BFA";
          btnContinue.style.color = "#FFFFFF";
          btnContinue.style.boxShadow = "0 0 20px rgba(139,92,246,0.6)";
          btnContinue.innerText = "Tiếp tục (5 lượt hoãn)";

          btnContinue.onclick = () => {
            this._graceSwipes = 5;
            this._isOverlayActive = false;
            overlay.style.display = "none";
            window.removeEventListener("wheel", this._preventScroll);
            window.removeEventListener("touchmove", this._preventScroll);
            if (this.dayData?.temptation) {
              this.dayData.temptation.succumbedCount = (this.dayData.temptation.succumbedCount || 0) + 1;
              saveDayData(this.dayData, this.platformKey, false);
            }
            if (this.petEngine) this.petEngine.reward(5, "breathing_complete");
            this.onToast("🔑 Bạn đã hít thở sâu, hồi phục +5⚡ và nhận 5 lượt lướt hoãn!", 4000);
          };
        }
      }
    }, 100);

    this._cleanupFriction = () => {
      clearInterval(intervalTimer);
      window.removeEventListener("wheel", this._preventScroll);
      window.removeEventListener("touchmove", this._preventScroll);
    };
  }

  // Kiểm tra có cần trigger friction không (tính cả grace swipes)
  checkAndTrigger(currentCount, m3Limit, unitLabel) {
    if (currentCount >= m3Limit) {
      if (this.consumeGrace()) return; // tiêu grace swipe
      // Đã hết 5 lượt grace sau M3 mà vẫn lướt tiếp -> trừ 5⚡/lượt
      if (this.petEngine) {
        this.petEngine.penalize(5, "excess_swipes_post_m3");
      }
      this.showHardFriction(currentCount, m3Limit, unitLabel);
    }
  }
}
