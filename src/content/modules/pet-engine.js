/**
 * Mindful Social Media Tracker - Pet Engine Module (Chuyên Sâu 3 Chế Độ)
 * Hỗ trợ 3 chế độ: default (Mầm cây Sprout), puppet (Khung Chibi Ghép Mặt Cắt Dán), ai_generated (Sprite AI 3 biểu cảm)
 * Tích hợp Pet State Machine (Energy 0-100, Mood: happy/neutral/sad), CSS Animations
 */

export class PetEngine {
  constructor({ onStateChange } = {}) {
    this.energy = 100;
    this.mood = "happy"; // "happy" (>=70) | "neutral" (40-69) | "sad" (<40)
    this.currentStreak = 0;
    this.streakDays = 0;

    this.config = {
      mode: "default", // "default" | "puppet" | "ai_generated"
      uploadedImageBase64: "",
      uploadedPuppetImages: { happy: "", neutral: "", sad: "" },
      aiSprites: { happy: "", neutral: "", sad: "" }
    };

    // Hệ thống phụ kiện mở rộng
    this.accessories = {
      unlockedItems: [], // ["sunglasses", "laurel"]
      equipped: { head: null, body: null }
    };

    this.lastPokeEnergyTime = 0;
    this._bubbleTimer = null;
    this._speechBubbleEl = null;

    this.onStateChange = onStateChange || (() => {});
    this.containerEl = null;

    this._injectStyles();
    this._initFromStorage();
  }

  // ─── Khởi Tạo & Đồng Bộ Storage ─────────────────────────────────────────────

  _initFromStorage() {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get([
        "petState",
        "pet_state",
        "petConfig",
        "petAccessories",
        "lastPokeEnergyTime"
      ], (res) => {
        const state = res.petState || res.pet_state || {};
        this.energy = state.energy ?? 100;
        this.currentStreak = state.currentStreak ?? state.streakDays ?? 0;
        this.streakDays = this.currentStreak;
        this._updateMoodFromEnergy();

        if (res.petConfig) {
          this.config = Object.assign({}, this.config, res.petConfig);
        }

        if (res.lastPokeEnergyTime) {
          this.lastPokeEnergyTime = res.lastPokeEnergyTime;
        }

        this._syncAccessories(res.petAccessories);
        this.render();
      });

      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== "local") return;

        let needsRender = false;
        if (changes.petState || changes.pet_state) {
          const newState = (changes.petState || changes.pet_state).newValue || {};
          this.energy = newState.energy ?? this.energy;
          this.currentStreak = newState.currentStreak ?? newState.streakDays ?? this.currentStreak;
          this.streakDays = this.currentStreak;
          this._updateMoodFromEnergy();
          this._checkStreakUnlocks();
          needsRender = true;
        }

        if (changes.petConfig) {
          this.config = Object.assign({}, this.config, changes.petConfig.newValue || {});
          needsRender = true;
        }

        if (changes.petAccessories) {
          this._syncAccessories(changes.petAccessories.newValue);
          needsRender = true;
        }

        if (changes.lastPokeEnergyTime) {
          this.lastPokeEnergyTime = changes.lastPokeEnergyTime.newValue || 0;
        }

        if (needsRender) this.render();
      });
    }
  }

  _syncAccessories(stored) {
    if (stored) {
      this.accessories = {
        unlockedItems: Array.isArray(stored.unlockedItems) ? [...stored.unlockedItems] : [],
        equipped: Object.assign({ head: null, body: null }, stored.equipped || {})
      };
    }
    this._checkStreakUnlocks();
  }

  _checkStreakUnlocks() {
    let changed = false;
    const currentUnlocked = new Set(this.accessories.unlockedItems || []);

    if (this.streakDays >= 3 && !currentUnlocked.has("sunglasses")) {
      currentUnlocked.add("sunglasses");
      changed = true;
    }
    if (this.streakDays >= 7 && !currentUnlocked.has("laurel")) {
      currentUnlocked.add("laurel");
      changed = true;
    }

    if (changed) {
      this.accessories.unlockedItems = Array.from(currentUnlocked);
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ petAccessories: this.accessories });
      }
    }
  }

  _updateMoodFromEnergy() {
    if (this.energy >= 70) this.mood = "happy";
    else if (this.energy >= 40) this.mood = "neutral";
    else this.mood = "sad";
  }

  // ─── CSS Keyframes Hoạt Họa Độc Lập ──────────────────────────────────────────

  _injectStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("mindful-pet-keyframes")) return;

    const style = document.createElement("style");
    style.id = "mindful-pet-keyframes";
    style.textContent = `
      @keyframes mindfulPetBounce {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-4px) scale(1.05); }
      }
      @keyframes mindfulPetBreathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.03); }
      }
      @keyframes mindfulPetShiver {
        0%, 100% { transform: translate(0, 0); }
        20% { transform: translate(-1.5px, 1px) rotate(-1deg); }
        40% { transform: translate(1.5px, -1px) rotate(1deg); }
        60% { transform: translate(-1px, -1px); }
        80% { transform: translate(1px, 1px); }
      }
      @keyframes mindfulHeartFloat {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(-12px) scale(1); opacity: 0; }
      }
      @keyframes mindfulSweatDrop {
        0% { transform: translateY(0); opacity: 0; }
        30% { opacity: 1; }
        100% { transform: translateY(8px); opacity: 0; }
      }
      @keyframes mindfulBubblePop {
        0% { transform: translateX(-50%) translateY(6px) scale(0.85); opacity: 0; }
        100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
      }
      @keyframes mindfulEnergyFloat {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-24px); opacity: 0; }
      }

      .mindful-pet-anim-happy {
        animation: mindfulPetBounce 1.2s ease-in-out infinite !important;
      }
      .mindful-pet-anim-neutral {
        animation: mindfulPetBreathe 2.4s ease-in-out infinite !important;
      }
      .mindful-pet-anim-sad {
        animation: mindfulPetShiver 0.6s linear infinite !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // ─── 1. Chế Độ "default": Mầm Cây Sprout SVG ─────────────────────────────────

  // ─── Render Phụ Kiện (Head / Body) ──────────────────────────────────────────

  _renderAccessoryHead(mode = "default") {
    const equippedHead = this.accessories?.equipped?.head;
    if (!equippedHead) return "";

    if (equippedHead === "sunglasses") {
      if (mode === "default") {
        return `
          <!-- Kính râm cực ngầu (Sprout) -->
          <g transform="translate(0, 0)">
            <path d="M 10 20 L 17 20 Q 18 20.5 19 20 L 26 20 Q 27 24 23 24 L 20 24 Q 18 24 17 21 Q 16 24 13 24 L 10 24 Q 7 24 10 20 Z" fill="#0F172A" />
            <rect x="9.5" y="19.5" width="7" height="4.5" rx="1.5" fill="#1E293B" stroke="#38BDF8" stroke-width="0.6"/>
            <rect x="19.5" y="19.5" width="7" height="4.5" rx="1.5" fill="#1E293B" stroke="#38BDF8" stroke-width="0.6"/>
            <line x1="16.5" y1="21.5" x2="19.5" y2="21.5" stroke="#38BDF8" stroke-width="0.8"/>
            <line x1="11" y1="20.5" x2="13" y2="22.5" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
            <line x1="21" y1="20.5" x2="23" y2="22.5" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
          </g>
        `;
      } else if (mode === "puppet") {
        return `
          <div style="position:absolute; top:7px; left:50%; transform:translateX(-50%); width:24px; height:10px; z-index:4; pointer-events:none;">
            <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
              <rect x="2" y="2" width="9" height="5.5" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <rect x="13" y="2" width="9" height="5.5" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <line x1="11" y1="4.5" x2="13" y2="4.5" stroke="#38BDF8" stroke-width="0.8"/>
              <line x1="4" y1="3" x2="7" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.7" stroke-linecap="round"/>
              <line x1="15" y1="3" x2="18" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.7" stroke-linecap="round"/>
            </svg>
          </div>
        `;
      } else {
        // AI Sprite
        return `
          <div style="position:absolute; top:8px; left:50%; transform:translateX(-50%); width:26px; height:10px; z-index:4; pointer-events:none;">
            <svg width="26" height="10" viewBox="0 0 26 10" fill="none">
              <rect x="2" y="2" width="10" height="6" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <rect x="14" y="2" width="10" height="6" rx="1.5" fill="#0F172A" stroke="#38BDF8" stroke-width="0.6"/>
              <line x1="12" y1="4.5" x2="14" y2="4.5" stroke="#38BDF8" stroke-width="0.8"/>
              <line x1="4" y1="3" x2="8" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.8" stroke-linecap="round"/>
              <line x1="16" y1="3" x2="20" y2="6" stroke="rgba(255,255,255,0.6)" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
          </div>
        `;
      }
    }

    if (equippedHead === "laurel") {
      if (mode === "default") {
        return `
          <!-- Vòng nguyệt quế vinh quang (Sprout) -->
          <g transform="translate(0, 0)">
            <path d="M 8 18 C 7 13, 11 11, 18 11 C 25 11, 29 13, 28 18" stroke="#F59E0B" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <ellipse cx="10" cy="15" rx="2.4" ry="1.2" transform="rotate(-30 10 15)" fill="#FBBF24" />
            <ellipse cx="13" cy="12" rx="2.4" ry="1.2" transform="rotate(-15 13 12)" fill="#FCD34D" />
            <ellipse cx="23" cy="12" rx="2.4" ry="1.2" transform="rotate(15 23 12)" fill="#FCD34D" />
            <ellipse cx="26" cy="15" rx="2.4" ry="1.2" transform="rotate(30 26 15)" fill="#FBBF24" />
            <circle cx="18" cy="11" r="1.5" fill="#EF4444" />
          </g>
        `;
      } else if (mode === "puppet") {
        return `
          <div style="position:absolute; top:-7px; left:50%; transform:translateX(-50%); width:30px; height:14px; z-index:4; pointer-events:none;">
            <svg width="30" height="14" viewBox="0 0 30 14" fill="none">
              <path d="M 4 12 C 4 6, 9 4, 15 4 C 21 4, 26 6, 26 12" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <ellipse cx="7" cy="8" rx="2.8" ry="1.4" transform="rotate(-30 7 8)" fill="#FBBF24" />
              <ellipse cx="11" cy="5" rx="2.8" ry="1.4" transform="rotate(-10 11 5)" fill="#FCD34D" />
              <ellipse cx="19" cy="5" rx="2.8" ry="1.4" transform="rotate(10 19 5)" fill="#FCD34D" />
              <ellipse cx="23" cy="8" rx="2.8" ry="1.4" transform="rotate(30 23 8)" fill="#FBBF24" />
              <circle cx="15" cy="4" r="1.8" fill="#EF4444" />
            </svg>
          </div>
        `;
      } else {
        return `
          <div style="position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:32px; height:14px; z-index:4; pointer-events:none;">
            <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
              <path d="M 4 12 C 4 6, 10 4, 16 4 C 22 4, 28 6, 28 12" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <ellipse cx="7" cy="8" rx="2.8" ry="1.4" transform="rotate(-30 7 8)" fill="#FBBF24" />
              <ellipse cx="11" cy="5" rx="2.8" ry="1.4" transform="rotate(-10 11 5)" fill="#FCD34D" />
              <ellipse cx="21" cy="5" rx="2.8" ry="1.4" transform="rotate(10 21 5)" fill="#FCD34D" />
              <ellipse cx="25" cy="8" rx="2.8" ry="1.4" transform="rotate(30 25 8)" fill="#FBBF24" />
              <circle cx="16" cy="4" r="1.8" fill="#EF4444" />
            </svg>
          </div>
        `;
      }
    }

    return "";
  }

  // ─── 1. Chế Độ "default": Mầm Cây Sprout SVG ─────────────────────────────────

  _renderDefaultSprout(size = 36) {
    const isHappy = this.mood === "happy";
    const isNeutral = this.mood === "neutral";
    const isSad = this.mood === "sad";

    const animClass = isHappy ? "mindful-pet-anim-happy" : isNeutral ? "mindful-pet-anim-neutral" : "mindful-pet-anim-sad";
    const potColor = isHappy ? "#8B5CF6" : isSad ? "#475569" : "#06B6D4";
    const leafColor = isHappy ? "#10B981" : isSad ? "#94A3B8" : "#34D399";
    const eyeColor = isSad ? "#64748B" : "#0F172A";

    // Nở hoa khi Happy
    const flower = isHappy ? `
      <g transform="translate(18, 5)">
        <circle cx="0" cy="0" r="4.5" fill="#F43F5E" />
        <circle cx="-3" cy="-3" r="3" fill="#FDA4AF" />
        <circle cx="3" cy="-3" r="3" fill="#FDA4AF" />
        <circle cx="-3" cy="3" r="3" fill="#FDA4AF" />
        <circle cx="3" cy="3" r="3" fill="#FDA4AF" />
        <circle cx="0" cy="0" r="2.2" fill="#FBBF24" />
      </g>
    ` : "";

    // Mắt biểu cảm
    let eyes = "";
    if (isHappy) {
      eyes = `
        <path d="M 12 21 Q 14 18 16 21" stroke="${eyeColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M 20 21 Q 22 18 24 21" stroke="${eyeColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M 15 24 Q 18 27 21 24" stroke="#F43F5E" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      `;
    } else if (isSad) {
      eyes = `
        <line x1="12" y1="21" x2="16" y2="23" stroke="${eyeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="20" y1="23" x2="24" y2="21" stroke="${eyeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M 15 26 Q 18 23 21 26" stroke="${eyeColor}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <!-- Giọt mồ hôi rơi -->
        <circle cx="27" cy="18" r="1.8" fill="#38BDF8" style="animation: mindfulSweatDrop 1.2s infinite;" />
      `;
    } else {
      eyes = `
        <circle cx="14" cy="21" r="1.8" fill="${eyeColor}"/>
        <circle cx="22" cy="21" r="1.8" fill="${eyeColor}"/>
        <line x1="16" y1="25" x2="20" y2="25" stroke="${eyeColor}" stroke-width="1.5" stroke-linecap="round"/>
      `;
    }

    // Lá cây: vươn lên khi Happy/Neutral, héo rũ khi Sad
    const leaves = isSad ? `
      <!-- Thân rũ -->
      <path d="M 18 18 C 18 13, 13 12, 12 11" stroke="#64748B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="10" cy="12" rx="4.5" ry="2.5" transform="rotate(-30 10 12)" fill="${leafColor}" />
    ` : `
      <!-- Thân thẳng -->
      <path d="M 18 18 C 18 11, 18 9, 18 8" stroke="#059669" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- 2 Lá non -->
      <ellipse cx="13" cy="9" rx="5" ry="3" transform="rotate(-25 13 9)" fill="${leafColor}" />
      <ellipse cx="23" cy="9" rx="5" ry="3" transform="rotate(25 23 9)" fill="${leafColor}" />
    `;

    const accessorySvg = this._renderAccessoryHead("default");

    return `
      <div class="${animClass}" style="position:relative; display:inline-flex; align-items:center; justify-content:center;">
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${leaves}
          ${flower}
          <!-- Chậu cây tròn cute -->
          <rect x="8" y="16" width="20" height="15" rx="5" fill="${potColor}" />
          <ellipse cx="18" cy="16.5" rx="10" ry="2.5" fill="rgba(255,255,255,0.25)" />
          <rect x="9.5" y="18" width="17" height="11.5" rx="3.5" fill="#F8FAFC" />
          ${eyes}
          ${accessorySvg}
        </svg>
      </div>
    `;
  }

  // ─── 2. Chế Độ "puppet": Khung Chibi Ghép Mặt Cắt Dán Offline ───────────────

  _renderPuppet(size = 40) {
    const isHappy = this.mood === "happy";
    const isSad = this.mood === "sad";
    const isNeutral = this.mood === "neutral";

    const animClass = isHappy ? "mindful-pet-anim-happy" : isNeutral ? "mindful-pet-anim-neutral" : "mindful-pet-anim-sad";
    const bodyColor = isHappy ? "#8B5CF6" : isSad ? "#475569" : "#06B6D4";

    // Hỗ trợ 3 ảnh cảm xúc riêng biệt (Happy, Neutral, Sad), fallback sang uploadedImageBase64
    const puppetImgs = this.config.uploadedPuppetImages || {};
    const dedicatedFaceImg = puppetImgs[this.mood];
    const faceImg = dedicatedFaceImg || this.config.uploadedImageBase64;

    // Hiệu ứng biểu cảm thêm
    const overlayHeart = isHappy ? `
      <span style="position:absolute; top:-3px; right:-3px; font-size:${Math.max(10, Math.round(size * 0.25))}px; animation:mindfulHeartFloat 1.2s infinite; z-index:5;">❤️</span>
    ` : "";

    const overlaySweat = isSad ? `
      <span style="position:absolute; top:2px; right:1px; font-size:${Math.max(9, Math.round(size * 0.22))}px; animation:mindfulSweatDrop 1s infinite; z-index:5;">💧</span>
    ` : "";

    // Nếu là trạng thái buồn mà không có ảnh buồn riêng thì áp bộ lọc grayscale
    const filterStyle = (isSad && !dedicatedFaceImg) ? "filter: grayscale(0.6) contrast(0.85);" : "";
    const faceSize = Math.max(24, Math.round(size * 0.65));
    const svgW = Math.max(30, Math.round(size * 0.85));
    const svgH = Math.max(18, Math.round(size * 0.5));

    // Gương mặt tròn (Face Cutout)
    const faceElement = faceImg ? `
      <img src="${faceImg}" style="width:${faceSize}px; height:${faceSize}px; border-radius:50%; object-fit:cover; border:1.5px solid #F8FAFC; box-shadow:0 2px 6px rgba(0,0,0,0.3); ${filterStyle}" alt="Pet Face" />
    ` : `
      <div style="width:${faceSize}px; height:${faceSize}px; border-radius:50%; background:linear-gradient(135deg, #6366F1, #8B5CF6); display:flex; align-items:center; justify-content:center; color:#fff; font-size:${Math.round(faceSize * 0.45)}px; font-weight:700;">
        👤
      </div>
    `;

    const accessoryHtml = this._renderAccessoryHead("puppet");

    return `
      <div class="${animClass}" style="position:relative; width:${size}px; height:${size}px; display:inline-flex; flex-direction:column; align-items:center; justify-content:center; user-select:none;">
        ${overlayHeart}
        ${overlaySweat}
        <div style="position:relative; z-index:2; margin-bottom:-${Math.round(size * 0.15)}px;">
          ${faceElement}
          ${accessoryHtml}
        </div>
        <!-- Khung cơ thể Chibi nhỏ nhắn dạng SVG -->
        <svg width="${svgW}" height="${svgH}" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="z-index:1; overflow:visible;">
          <!-- Thân áo chibi -->
          <rect x="7" y="4" width="20" height="12" rx="5" fill="${bodyColor}" />
          <!-- Tay trái & tay phải -->
          <circle cx="5" cy="9" r="3.2" fill="${bodyColor}" />
          <circle cx="29" cy="9" r="3.2" fill="${bodyColor}" />
          <!-- Hai chân nhỏ cute -->
          <ellipse cx="12" cy="17" rx="2.5" ry="2" fill="#1E293B" />
          <ellipse cx="22" cy="17" rx="2.5" ry="2" fill="#1E293B" />
          <!-- Chi tiết áo / nơ -->
          ${isHappy ? `<polygon points="17,6 14,9 20,9" fill="#FBBF24" />` : `<circle cx="17" cy="8" r="1.5" fill="#F8FAFC" />`}
        </svg>
      </div>
    `;
  }

  // ─── 3. Chế Độ "ai_generated": Tráo Đổi 3 Sprite AI Biểu Cảm ────────────────

  _renderAiSprite(size = 38) {
    const sprites = this.config.aiSprites || {};
    const spriteDataUri = sprites[this.mood] || sprites.happy || sprites.neutral || sprites.sad;

    // Nếu chưa có sprite AI nào -> fallback về Puppet hoặc Default
    if (!spriteDataUri) {
      if (this.config.uploadedImageBase64) {
        return this._renderPuppet(size);
      }
      return this._renderDefaultSprout(size);
    }

    const isHappy = this.mood === "happy";
    const isSad = this.mood === "sad";
    const isNeutral = this.mood === "neutral";
    const animClass = isHappy ? "mindful-pet-anim-happy" : isNeutral ? "mindful-pet-anim-neutral" : "mindful-pet-anim-sad";
    const accessoryHtml = this._renderAccessoryHead("ai_generated");

    return `
      <div class="${animClass}" style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; border-radius:8px; overflow:visible;">
        <img src="${spriteDataUri}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;" alt="AI Pet ${this.mood}" />
        ${accessoryHtml}
      </div>
    `;
  }

  /**
   * Tạo HTML hiển thị Pet tương ứng theo chế độ đang kích hoạt
   */
  getPetAvatarHtml(size = 36) {
    const mode = this.config.mode || "default";

    if (mode === "puppet") {
      return this._renderPuppet(size);
    }
    if (mode === "ai_generated") {
      return this._renderAiSprite(size);
    }
    return this._renderDefaultSprout(size);
  }

  // ─── Gắn Vào HUD & Vẽ Giao Diện ─────────────────────────────────────────────

  mount(parentEl) {
    if (!parentEl) return;
    this.containerEl = document.createElement("div");
    this.containerEl.id = "mindful-pet-widget";
    this.containerEl.style.cssText = `
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
      user-select: none;
      transition: all 0.25s ease;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;

    this.containerEl.title = "Nhấp vào Pet để trò chuyện & nạp năng lượng!";
    this.containerEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handlePoke();
    });

    parentEl.insertBefore(this.containerEl, parentEl.firstChild);
    this.render();
  }

  render() {
    if (!this.containerEl) return;

    const moodIcons = {
      happy: "✨",
      neutral: "⚡",
      sad: "🌧️"
    };

    const energyColor = this.energy >= 70 ? "#10B981" : this.energy >= 40 ? "#F59E0B" : "#EF4444";

    this.containerEl.innerHTML = `
      <div style="line-height:0; display:flex; align-items:center;">
        ${this.getPetAvatarHtml(34)}
      </div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        <div style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#F1F5F9;">
          <span>${this.energy}%</span>
          <span>${moodIcons[this.mood] || "⚡"}</span>
          ${this.currentStreak > 0 ? `<span style="color:#F59E0B;">🔥${this.currentStreak}</span>` : ""}
        </div>
        <div style="width:36px; height:4px; background:rgba(255,255,255,0.15); border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${this.energy}%; background:${energyColor}; transition:width 0.4s ease;"></div>
        </div>
      </div>
    `;
  }

  // ─── Tương Tác Poke & Speech Bubble 4s (Cooldown 30 Phút) ───────────────────

  handlePoke() {
    this.cheerUp();

    // 1. Kiểm tra Cooldown năng lượng: 30 phút tối đa +3 năng lượng 1 lần
    const now = Date.now();
    const cooldownMs = 30 * 60 * 1000;
    const canGainEnergy = (now - this.lastPokeEnergyTime) >= cooldownMs;

    let energyBonusText = "";
    if (canGainEnergy) {
      this.lastPokeEnergyTime = now;
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ lastPokeEnergyTime: now });
      }
      this.reward(3, "pet_poke");
      energyBonusText = `<div style="font-size:10px; color:#10B981; font-weight:700; margin-top:2px;">+3⚡ Năng lượng phục hồi!</div>`;
    }

    // 2. Danh sách lời nhắc thức tỉnh & thể chất ngẫu nhiên
    const reminders = [
      "💧 Hãy uống một ngụm nước ấm nhé!",
      "🌬️ Thả lỏng vai và hít thở sâu 3 nhịp nào!",
      "🎯 Đừng quên mục tiêu lớn của bạn hôm nay!",
      "👀 Nhìn ra xa 6 mét trong 20 giây để thư giãn mắt!",
      "🧘 Ngồi thẳng lưng lên một chút bạn ơi!",
      "✨ Bạn đang làm chủ thời gian rất tốt!"
    ];
    const quote = reminders[Math.floor(Math.random() * reminders.length)];

    // 3. Hiển thị Speech Bubble
    this._showSpeechBubble(quote, energyBonusText);
  }

  _showSpeechBubble(text, bonusHtml = "") {
    if (!this.containerEl) return;

    if (this._speechBubbleEl) {
      this._speechBubbleEl.remove();
      this._speechBubbleEl = null;
    }
    if (this._bubbleTimer) {
      clearTimeout(this._bubbleTimer);
      this._bubbleTimer = null;
    }

    const bubble = document.createElement("div");
    this._speechBubbleEl = bubble;
    bubble.style.cssText = `
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(12px);
      border: 1.5px solid rgba(139, 92, 246, 0.45);
      border-radius: 12px;
      padding: 7px 12px;
      color: #F8FAFC;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      text-align: center;
      white-space: nowrap;
      z-index: 2147483647;
      box-shadow: 0 8px 24px rgba(0,0,0,0.55), 0 0 12px rgba(139,92,246,0.3);
      animation: mindfulBubblePop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;

    bubble.innerHTML = `
      <div>${text}</div>
      ${bonusHtml}
      <!-- Mũi tên bóng thoại nhỏ chỉ xuống -->
      <div style="position:absolute; top:100%; left:50%; transform:translateX(-50%); width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid rgba(15, 23, 42, 0.94);"></div>
    `;

    this.containerEl.appendChild(bubble);

    // Rule 2: Tự ẩn sau 4 giây
    this._bubbleTimer = setTimeout(() => {
      if (this._speechBubbleEl) {
        this._speechBubbleEl.style.transition = "opacity 0.25s ease, transform 0.25s ease";
        this._speechBubbleEl.style.opacity = "0";
        this._speechBubbleEl.style.transform = "translateX(-50%) translateY(4px)";
        setTimeout(() => {
          if (this._speechBubbleEl) {
            this._speechBubbleEl.remove();
            this._speechBubbleEl = null;
          }
        }, 250);
      }
    }, 4000);
  }

  // ─── Điều Hòa Năng Lượng & Tâm Trạng (State Machine) ─────────────────────────

  _saveState() {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const state = {
        energy: this.energy,
        mood: this.mood,
        currentStreak: this.currentStreak,
        streakDays: this.streakDays
      };
      chrome.storage.local.set({ petState: state, pet_state: state });
    }
  }

  isCriticalEnergy() {
    return this.energy < 15;
  }

  isZeroEnergy() {
    return this.energy <= 0;
  }

  canExtendSession(cost = 10) {
    return this.energy >= cost && this.energy > 0;
  }

  /**
   * Trừ năng lượng: F5 dồn dập (-5), Mốc 2 (-10), Mốc 3 (-20), gia hạn (+5p: -10, +10p: -20, +15p: -35)
   */
  penalize(amount = 15, reason = "penalty") {
    let deduct = amount;
    if (reason === "reload_spam") deduct = 5;
    else if (reason === "milestone_2") deduct = 10;
    else if (reason === "milestone_3" || reason === "impulsive_video") deduct = 20;

    this.energy = Math.max(0, this.energy - deduct);
    this._updateMoodFromEnergy();
    this._saveState();
    this.render();

    // Hiệu ứng rung giật phản hồi
    if (this.containerEl) {
      this.containerEl.style.transform = "scale(0.92) rotate(-6deg)";
      setTimeout(() => {
        if (this.containerEl) this.containerEl.style.transform = "none";
      }, 350);
    }

    this.onStateChange({
      energy: this.energy,
      mood: this.mood,
      isCritical: this.isCriticalEnergy(),
      isZero: this.isZeroEnergy(),
      reason
    });

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: "UPDATE_PET_STATE",
        deltaEnergy: -deduct,
        newMood: this.mood
      }).catch(() => {});
    }
  }

  /**
   * Hồi phục năng lượng: hoàn thành Pomodoro (+15), xem video hữu ích >= 80% (+10), đóng tab đúng giờ (+5), poke (+3)
   */
  reward(amount = 10, reason = "reward") {
    let bonus = amount;
    if (reason === "pomodoro_complete") bonus = 15;
    else if (reason === "useful_video") bonus = 10;
    else if (reason === "session_closed_ontime") bonus = 5;
    else if (reason === "pet_poke") bonus = 3;

    this.energy = Math.min(100, this.energy + bonus);
    this._updateMoodFromEnergy();
    this._saveState();
    this.render();

    // Hiệu ứng nhảy lên ăn mừng
    if (this.containerEl) {
      this.containerEl.style.transform = "scale(1.15) translateY(-3px)";
      setTimeout(() => {
        if (this.containerEl) this.containerEl.style.transform = "none";
      }, 350);
    }

    this.onStateChange({
      energy: this.energy,
      mood: this.mood,
      isCritical: this.isCriticalEnergy(),
      isZero: this.isZeroEnergy(),
      reason
    });

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: "UPDATE_PET_STATE",
        deltaEnergy: bonus,
        newMood: this.mood
      }).catch(() => {});
    }
  }

  cheerUp() {
    if (this.containerEl) {
      this.containerEl.style.transform = "scale(1.18)";
      setTimeout(() => {
        if (this.containerEl) this.containerEl.style.transform = "none";
      }, 200);
    }
  }

  // ─── Tầng 1: Thông Báo Nhắc Nhở Trọng Tâm (Center Overlay với Backdrop Blur) ───

  showPetToast(message, { duration = 0, title = "Linh vật nhắc nhở" } = {}) {
    let overlay = document.getElementById("mindful-pet-notify-overlay");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "mindful-pet-notify-overlay";
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.76) !important;
      backdrop-filter: blur(10px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      opacity: 0;
      transition: opacity 0.25s ease !important;
    `;

    overlay.innerHTML = `
      <div id="mindful-pet-notify-card" style="
        background: #131B2E;
        border: 1.5px solid rgba(139, 92, 246, 0.55);
        border-radius: 20px;
        padding: 26px 22px;
        max-width: 380px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(139,92,246,0.25);
        color: #F8FAFC;
        position: relative;
        transform: scale(0.9);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <button id="mindful-pet-notify-close" style="position:absolute; top:12px; right:14px; background:none; border:none; color:#64748B; font-size:18px; cursor:pointer; line-height:1;" title="Đóng">✕</button>
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          ${this.getPetAvatarHtml(60)}
        </div>
        <div style="font-size:15px; font-weight:800; color:#A78BFA; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
          ${title}
        </div>
        <div style="font-size:13.5px; font-weight:500; line-height:1.55; color:#F1F5F9; margin-bottom:20px;">
          ${message}
        </div>
        <button id="mindful-pet-notify-ack" style="
          width: 100%;
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          border: none;
          color: #fff;
          font-weight: 700;
          padding: 11px 0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          box-shadow: 0 4px 15px rgba(139,92,246,0.4);
          transition: transform 0.15s ease;
        ">
          ✓ Tôi đã hiểu
        </button>
      </div>
    `;

    (document.body || document.documentElement).appendChild(overlay);

    // Fade-in animation
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      const card = overlay.querySelector("#mindful-pet-notify-card");
      if (card) card.style.transform = "scale(1)";
    });

    const closeOverlay = () => {
      overlay.style.opacity = "0";
      const card = overlay.querySelector("#mindful-pet-notify-card");
      if (card) card.style.transform = "scale(0.9)";
      setTimeout(() => { if (overlay) overlay.remove(); }, 250);
    };

    overlay.querySelector("#mindful-pet-notify-close")?.addEventListener("click", closeOverlay);
    overlay.querySelector("#mindful-pet-notify-ack")?.addEventListener("click", closeOverlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });

    if (duration > 0) {
      setTimeout(closeOverlay, duration);
    }
  }

  // ─── Tầng 2: Nhắc Nhở Lớn (Pet Center Modal Glassmorphism) ───────────────────

  showPetCenterModal({ title, message, actions = [], allowClose = true, onClose = null } = {}) {
    let modal = document.getElementById("mindful-pet-center-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "mindful-pet-center-modal";
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(8, 12, 20, 0.88) !important;
      backdrop-filter: blur(12px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    `;

    const buttonsHtml = actions.map((act, idx) => `
      <button data-action-idx="${idx}" style="
        flex: 1; min-width: 130px; padding: 11px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s;
        ${act.primary ? 'background: linear-gradient(135deg, #8B5CF6, #6366F1); color: #fff; box-shadow: 0 4px 15px rgba(139,92,246,0.4);' : (act.danger ? 'background: #EF4444; color: #fff;' : 'background: rgba(255,255,255,0.08); color: #E2E8F0; border: 1px solid rgba(255,255,255,0.15);')}
        ${act.disabled ? 'opacity: 0.45; cursor: not-allowed; pointer-events: none;' : ''}
      ">${act.label}</button>
    `).join("");

    modal.innerHTML = `
      <div style="
        background: #131B2E;
        border: 1.5px solid rgba(139, 92, 246, 0.5);
        border-radius: 20px;
        padding: 28px 24px;
        width: 100%;
        max-width: 440px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.25);
        color: #F8FAFC;
        position: relative;
        animation: mindfulBubblePop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        ${allowClose ? `<button id="mindful-center-modal-close" style="position:absolute; top:14px; right:14px; background:none; border:none; color:#64748B; font-size:18px; cursor:pointer;">✕</button>` : ""}
        <div style="display:flex; justify-content:center; margin-bottom:14px;">
          ${this.getPetAvatarHtml(64)}
        </div>
        <div style="font-size:18px; font-weight:800; color:#F8FAFC; margin-bottom:8px;">
          ${title}
        </div>
        <div style="font-size:13px; color:#94A3B8; line-height:1.55; margin-bottom:22px;">
          ${message}
        </div>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          ${buttonsHtml}
        </div>
      </div>
    `;

    (document.body || document.documentElement).appendChild(modal);

    const closeBtn = modal.querySelector("#mindful-center-modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.remove();
        if (onClose) onClose();
      };
    }

    actions.forEach((act, idx) => {
      const btn = modal.querySelector(`[data-action-idx="${idx}"]`);
      if (btn && !act.disabled) {
        btn.onclick = (e) => {
          if (act.onClick) act.onClick(e, modal);
          else modal.remove();
        };
      }
    });

    return modal;
  }
}
