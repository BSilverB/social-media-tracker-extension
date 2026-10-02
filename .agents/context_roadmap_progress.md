# TIẾN ĐỘ THỰC HIỆN CÁC GIAI ĐOẠN

## ✅ GIAI ĐOẠN 1: Hạ tầng Thống kê & Bắt hành vi (HOÀN THÀNH)
- **Đã làm được:**
  - Bắt sự kiện đếm Lượt lướt (Swipes) & Lượt xem thực sự (>2s) trên YouTube Shorts / FB Reels[cite: 1, 2, 3].
  - Bắt sự kiện F5 / Reload trang / Click nút Home để đếm tần suất "xóc đĩa" lọc bài mới[cite: 1, 2, 3].
  - Theo dõi Active Time (dùng Tab Visibility API) & Đếm số bài viết cuộn qua trên Facebook Feed[cite: 1, 2, 3].
  - Hiển thị Floating HUD thời gian thực và lưu bền vững vào `chrome.storage.local` theo ngày (`YYYY-MM-DD`)[cite: 1, 2, 3].

## ✅ GIAI ĐOẠN 2: Ngắt nhịp Cá nhân hóa & Cảnh báo (HOÀN THÀNH)
- **Đã làm được:**
  - HUD kéo thả (Drag & Drop) tự do, tự lưu tọa độ vị trí[cite: 1].
  - Cài đặt 3 Mốc cảnh báo linh hoạt (Tự đặt số, đổi màu HUD: Xanh -> Vàng -> Đỏ)[cite: 1, 2].
  - Dialog "Nhập lý do trước khi lướt" kèm hiển thị Lời nhắc Động lực (Master Goal)[cite: 1].
  - Hard Friction Overlay khi chạm Mốc 3: Chèn ảnh cá nhân động lực, bắt giữ phím Space 3s để khóa cuộn trang[cite: 1].
  - Cảnh báo Toast khi F5 quá 3 lần / 2 phút[cite: 1].

## ✅ GIAI ĐOẠN 3: Refactor Code, Pomodoro & Phản tư Cuối ngày (HOÀN THÀNH)
- **Task 1 — Refactor ES6 Modules:**
  - `src/utils/storage.js`: Helpers đọc/ghi storage, `loadAppData()`, `saveDayData()`, `formatTimeShort()`.
  - `src/content/modules/tracker.js`: Class `Tracker` — đếm Swipes/Views/Loops, Completion Rate, Feed Observer.
  - `src/content/modules/hud.js`: Class `HUDManager` — Drag-Drop, đổi màu mốc, Pomodoro label, Break badge.
  - `src/content/modules/friction.js`: Class `FrictionManager` — Intent Modal, Hard Overlay, Space 3s, Grace Swipes.
  - `src/content/modules/pomodoro.js`: Class `PomodoroManager` — Focus/Break cycle, tự chuyển session, thông báo.
  - `src/content/modules/keyword-filter.js`: `categorizeText()`, `matchKeywords()`, `evaluateVideoContent()`.
  - `src/content/content-main.js`: Entry point — orchestrate tất cả modules, SPA routing, storage sync.
  - `src/background/service-worker.js`: Alarm 22h00 → mở `reflection.html`, badge icon, message handler.
  - `src/reflection/reflection.html` + `reflection.js`: Dashboard phản tư cuối ngày, form 2 bài học, rating stars.
- **Task 2 — Nâng cấp tính năng:**
  - **Completion Rate:** Video dài ghi `isUseful` (≥80% hoặc ≥3p), `isImpulsiveSkip` (<15%).
  - **Pomodoro:** Bật/tắt trong popup, Break Session vô hiệu hóa Overlay, label hiển thị trên HUD (🎯/☕).
  - **Keywords:** Nhập danh sách từ khóa mục tiêu trong popup, lưu vào `app_config.targetKeywords`.
  - **Tab Phản Tư 22h00:** Alarm tự mở tab, thống kê % hữu ích/xao nhãng, form bài học, rating sao.
- **manifest.json:** Cập nhật version 2.0, permissions `alarms/tabs/windows`, service worker module, content_scripts type module, `web_accessible_resources`.

## ✅ GIAI ĐOẠN 4: Trợ lý AI Gemini Thông minh, Tự Tiến Hóa Bộ Lọc & Gamification (HOÀN THÀNH)
- **1. Bảo mật API Key & Tích hợp Gemini Client trong Service Worker:**
  - `popup.html` + `popup.js`: Ô nhập Google Gemini API Key (type password + nút toggle mắt + nút test kết nối trực tiếp với Gemini 1.5 Flash), lưu trong `chrome.storage.local`.
  - `src/background/gemini-client.js`: Module chuyên biệt gọi Gemini 1.5 Flash REST API (timeout 15s, JSON mode, temperature 0.2, tối ưu token).
  - `manifest.json`: Bổ sung `https://generativelanguage.googleapis.com/*` vào `host_permissions`.
  - Content scripts tuyệt đối không fetch trực tiếp -> gửi message sang Service Worker bảo vệ API Key chống XSS.
- **2. Bộ Lọc Phân Loại 2 Lớp (Two-tier Classifier) & Token Cache:**
  - Lớp 1 (Tĩnh): Regex/Keywords matcher cục bộ (`categorizeText`). Video khớp từ khóa rõ ràng -> gán nhãn tức thì (0 token).
  - Lớp 2 (Gemini API): Video dài xem ≥ 15s hoặc xem ≥ 80% mà Lớp 1 trả về "Khác" -> gửi video ID & tiêu đề sang background phân loại qua Gemini (`ai_classification_cache` trong storage kiểm tra trước, không gọi lại nếu đã có trong cache).
  - Rule 1: Tuyệt đối bỏ qua Shorts lướt nhanh (< 15s) để giữ trọn vẹn trong Free Tier.
- **3. Cơ Chế "Tự Tiến Hóa" Cho Bộ Lọc Tĩnh (Self-evolving Static Filter):**
  - Gom các video "lọt lưới" (unmatched) vào hàng đợi `unmatched_queue`.
  - Lúc 22h00 hoặc khi người dùng bấm "Quét Video Chưa Khớp", AI trích xuất 2-3 từ khóa/pattern đại diện xuất hiện nhiều nhất.
  - Trên `reflection.html`, hiển thị danh sách từ khóa kèm nút [✓ Thêm vào Bộ lọc Tĩnh] và [✕ Bỏ qua]. Bấm xác nhận tự động cập nhật mảng `app_config.targetKeywords`.
- **4. AI Reflection Coach & Nén Ngữ Cảnh Đường Dài (Context Digest):**
  - Hàm offline nén dữ liệu ngày thành Digest ngắn gọn (~150 tokens): Thời gian active, % hữu ích, % xao nhãng, danh sách video bổ ích xem trọn vẹn.
  - Khi người dùng lưu bài học trong `reflection.html`, gửi Digest + bài học + Master Goal lên Gemini.
  - AI đóng vai trò người đồng hành: Đưa ra nhận xét thấu cảm, nhắc lại các video bổ ích đã xem trọn vẹn, gợi mở sứ mệnh vi mô ngày mai.
  - Hiển thị văn bản an toàn 100% bằng DOM (`textContent`), tuyệt đối không dùng `innerHTML` không an toàn.
  - Cập nhật bản ghi `user_persona` (Long-term Persona JSON) lưu trữ số ngày theo dõi, % hữu ích trung bình, lịch sử kiên trì.
- **5. Hệ Thống Gamification (Linh vật Pet ảo 3 Chế Độ & Focus Streak):**
  - `src/content/modules/pet-engine.js`: Class `PetEngine` hoàn thiện chuyên sâu 3 chế độ:
    - **`default` (Mầm cây Sprout SVG):** Hoạt họa mầm cây sinh động (Happy: nở hoa rực rỡ, Neutral: 2 lá xanh tươi, Sad: héo rũ ngả xám).
    - **`puppet` (Khung Puppet Ghép Mặt Cắt Dán Offline 100%):** Tự động crop tròn bằng HTML5 Canvas cục bộ, gắn vào khung cơ thể chibi hoạt họa với CSS animation (Happy: nhún nhảy bắn tim, Sad: rung lắc, grayscale, mồ hôi rơi).
    - **`ai_generated` (AI Chibi Avatar 1 lần duy nhất):** Dùng Gemini 3.6 Flash phân tích ảnh người dùng sinh 3 sprite vector SVG biểu cảm lưu trữ vào `petConfig.aiSprites`.
  - Tích hợp linh vật kích thước nhỏ gọn 44x44px lên thanh HUD nổi (có thanh năng lượng & mood icon).
  - Tích hợp banner Linh vật Pet & Chuỗi Focus Streak 🔥 trên Popup và trang Phản tư.
  - Pet State Machine: Energy (0-100), Mood (`happy` ≥70, `neutral` 40-69, `sad` <40). Phạt: -5 (F5 spam), -15 (Mốc 3 / bỏ dở video). Hồi phục: +10 (hoàn thành Pomodoro), +5 (video hữu ích ≥80%). Tự động cộng Streak cuối ngày nếu không vi phạm Mốc 3.

## ✅ GIAI ĐOẠN 6: Giới Hạn Đa Nền Tảng, Session Limiter Người Thương, Puppet 3 Cảm Xúc & Kỷ Luật Năng Lượng (HOÀN THÀNH)
- **1. Giới hạn riêng cho từng nền tảng:**
  - YouTube: Shorts (lượt lướt), Video dài (số video).
  - Facebook: Reels (lượt lướt), Feeds (số bài viết), Video dài (số video).
  - Tự động tương thích ngược cấu hình cũ trong `storage.js`.
- **2. Intent Check-in & Session Limiter với Ảnh Người Thương:**
  - Avatar người thương đối thoại đặt câu hỏi: "Mục tiêu hôm nay bạn vào đây là gì?".
  - Bộ chọn thời lượng phiên lướt nhanh: 5p / 10p / 15p / 20p / 30p.
  - Modal Hết giờ phiên lướt: Nút Đóng tab (+5⚡) & Gia hạn (+5p: -10⚡, +10p: -20⚡, +15p: -35⚡, tối đa 2 lần/phiên).
  - Đếm ngược thời gian phiên lướt ⏳ trực tiếp trên thanh HUD.
- **3. Pet Puppet Mode 3 Cảm Xúc:**
  - 3 ô tải ảnh riêng biệt cho 3 trạng thái: Happy (≥70⚡), Neutral (40-69⚡), Sad (<40⚡).
  - Tự động fallback dùng 1 ảnh kèm bộ lọc cảm xúc nếu người dùng chỉ tải 1 ảnh.
  - Đổi mặt mượt mà trong HUD, Center Modal và Popup Banner.
- **4. Pet trong Thông Báo & Nhắc Nhở:**
  - Cảnh báo nhẹ (F5 spam, Mốc 1) -> Pet Toast góc màn hình với bóng thoại tương tác.
  - Cảnh báo lớn (Hết phiên, Mốc 2, Mốc 3) -> Pet Center Modal Glassmorphism với biểu cảm phóng to.
- **5. Hệ Thống Kỷ Luật Năng Lượng Đa Tầng:**
  - Khóa hoàn toàn tính năng gia hạn khi Pet cạn năng lượng (<10⚡).
  - Cưỡng chế kích hoạt chế độ Đen Trắng (Grayscale) toàn trang khi Pet kiệt sức (<15⚡).
  - Reset toàn bộ chuỗi Focus Streak 🔥 về 0 nếu Pet ở mức 0⚡ lúc 22h00.
  - Cơ chế hồi phục: Pomodoro Focus (+15⚡), Video học tập hữu ích (+10⚡), Đóng tab đúng giờ (+5⚡).

## ✅ CHẾ ĐỘ TEST CHO DEV (DEVELOPER TEST MODE) (HOÀN THÀNH)
- **1. Công tắc bật/tắt Dev Mode:**
  - Nút checkbox `🛠️ Dev` đặt trên Header của popup, trạng thái lưu bền vững trong `chrome.storage.local` (`dev_mode_enabled`).
  - Khi bật: Tab điều khiển `🛠️ Dev` xuất hiện trong Popup & biểu tượng `🛠️` xuất hiện ngay trên Floating HUD (YouTube & Facebook).
- **2. Bảng điều khiển kiểm thử trong Popup (Tab Dev):**
  - **⚡ Năng lượng Pet:** Phím tắt (0⚡ Kiệt sức, 10⚡ Nguy cấp, 50⚡ Trung bình, 100⚡ Tối đa) và thanh Slider trực quan thay đổi realtime.
  - **🎯 Phiên lướt & Mục tiêu:** Nút [⏱️ Hết giờ phiên ngay] và [🎯 Hiện khung Mục tiêu].
  - **🔔 Mốc Cảnh báo & Ma sát:** Nút kích hoạt tức thì [🔔 M1 Toast Pet], [⚠️ M2 Modal 10s], [🚫 M3 Modal Chặn] và [⚡ F5 Spam].
  - **🔥 Chuỗi Focus Streak:** Phím tắt đặt chuỗi [0 ngày], [🎓 3 ngày - Kính râm], [👑 7 ngày - Vương miện] tự động cập nhật kho phụ kiện.
  - **⚙️ Hệ thống & Reset:** Kích hoạt Phản tư 22h00, Đổi trạng thái Pomodoro Break, Nút [🔄 Khôi phục dữ liệu gốc].
- **3. Quick Dev Toolbox trên Floating HUD:**
  - Bảng nổi mini Glassmorphic gắn trực tiếp cạnh HUD trên trang YouTube/Facebook, giúp dev bấm test các hiệu ứng (Grayscale, Modal, Toast, Năng lượng) mà không cần mở lại popup.

## 🔮 GIAI ĐOẠN 7: Voice Interface & Smart Notifications (TƯƠNG LAI)
- **Dự định:** Thêm giao diện điều khiển bằng giọng nói, nhận diện ngữ cảnh thời gian thực để đưa ra lời nhắc thông minh, và tích hợp với trợ lý giọng nói cá nhân (Google Assistant / Siri).