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

# Nhật ký Sửa lỗi Chrome Extension (Manifest V3)

## 1. Chi tiết lỗi (The Error)
Khi chạy Content Script trong Chrome Extension để triển khai các module (`Tracker`, `HUD`, `Friction`, `Pomodoro`), bảng điều khiển (Console) hiển thị lỗi nghiêm trọng:
```text
Uncaught SyntaxError: Cannot use import statement outside a module (at content-main.js:7:1)
```
Đồng thời, khi kiểm tra trong tab **Sources -> Content scripts** của DevTools, trình duyệt không hiển thị các file script phụ thuộc khác nằm trong thư mục `modules/` hay `utils/`.

---

## 2. Nguyên nhân cốt lõi (The Reason)
* **Cơ chế Isolated World (Thế giới cô lập):** Chrome chạy Content Script trong một môi trường bảo mật đặc biệt biệt lập với trang web gốc. Ở môi trường này, ngay cả khi khai báo `"type": "module"` trong file `manifest.json`, trình duyệt thường bỏ qua hoặc không kích hoạt bộ biên dịch **ES Module** cho các file script nạp trực tiếp.
* **Xung đột cú pháp tĩnh (Static Import):** Khi trình duyệt quét qua dòng lệnh `import { ... } from "..."` ở đầu file, nó mặc định hiểu đây là một Classic Script (Script truyền thống) và lập tức chặn đứng quá trình thực thi vì cho rằng cú pháp không hợp lệ. Do file chính bị lỗi và dừng ngay lập tức, Chrome không bao giờ chạy đến các dòng tiếp theo để nạp các file module con, khiến chúng "biến mất" khỏi DevTools.

---

## 3. Cách khắc phục triệt để (The Solution)
Giải pháp tiêu chuẩn được Google khuyến nghị là sử dụng **Dynamic Import (Nạp động)** kết hợp với một "File mồi" (Loader Script) để ép trình duyệt phải xử lý mã nguồn dưới dạng Module thực thụ.

### Bước 1: Tách cấu trúc file
1. Vào thư mục `src/content/`.
2. Đổi tên file gốc (file chứa các lệnh import bị lỗi) từ `content-main.js` thành **`content-core.js`**.
3. Tạo một file mới hoàn toàn và đặt tên đúng bằng tên file cũ: **`content-main.js`**.

### Bước 2: Viết mã nguồn cho File mồi (`src/content/content-main.js`)
Dán đoạn mã nạp động dưới đây vào file mới tạo. Đoạn mã này sẽ chuyển đổi đường dẫn nội bộ thành URL chính thức của extension và ép trình duyệt biên dịch dưới dạng Module:
```javascript
(async () => {
  // Biến file nhân thành một URL extension hợp lệ và nạp động
  const src = chrome.runtime.getURL('src/content/content-core.js');
  await import(src);
})();
```

### Bước 3: Cấu hình lại file `manifest.json`
Bỏ thuộc tính `"type": "module"` ở phần `content_scripts`, đồng thời cấp quyền truy cập tài nguyên thông qua `web_accessible_resources` để YouTube/Facebook có thể đọc được các file module con:
```json
{
  "manifest_version": 3,
  "name": "Mindful Social Tracker (YT & FB)",
  "version": "2.0",
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.youtube.com/*",
        "https://*.facebook.com/*"
      ],
      "js": ["src/content/content-main.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "src/reflection/reflection.html", 
        "src/reflection/reflection.js",
        "src/content/content-core.js",
        "src/content/modules/*.js",
        "src/utils/storage.js"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 4. Quy trình nạp lại chuẩn (Tránh Cache)
Để đảm bảo Chrome nhận cấu hình mới hoàn toàn:
1. Truy cập `chrome://extensions/`, tìm extension và nhấn **Gỡ bỏ (Remove)**.
2. Nhấn **Tải tiện ích đã giải nén (Load unpacked)** và chọn lại thư mục dự án.
3. Vào lại YouTube/Facebook, nhấn **`Ctrl + F5`** để xóa cache script cũ của trang web.


# Báo Cáo Rủi Ro Bảo Mật & Cách Khắc Phục (Chrome Extension Manifest V3)

Khi sử dụng giải pháp **Dynamic Import** kết hợp với **`web_accessible_resources`** để sửa lỗi `import` trong Content Script, hệ thống của bạn sẽ xuất hiện một số lỗ hổng bảo mật và rủi ro vận hành cần lưu ý.

---

## 1. Các Rủi Ro Lớn Nhất

### 🚨 Rủi ro 1: Phơi bày mã nguồn (Extension Fingerprinting)
* **Bản chất:** Khi khai báo file script trong `web_accessible_resources`, bạn đang mở một "cổng công khai" cho phép thế giới bên ngoài truy cập vào file của Extension qua giao thức `chrome-extension://<ID_EXTENSION>/src/...`.
* **Hậu quả:** 
  * Bất kỳ đoạn mã độc nào hoặc chính các đoạn script theo dõi của YouTube/Facebook đều có thể chạy lệnh `fetch()` để đọc toàn bộ mã nguồn của bạn.
  * Các mạng xã hội có thể dựa vào các file này để phát hiện bạn đang dùng Extension theo dõi họ, từ đó tìm cách **chặn (block)** không cho Extension của bạn chạy.

### 🚨 Rủi ro 2: Tấn công chèn mã độc (XSS - Cross-Site Scripting)
* **Bản chất:** File core và các module xử lý dữ liệu bị phơi bày ra môi trường web. 
* **Hậu quả:** Nếu các module (`tracker.js`, `storage.js`) có đoạn code nào vô tình đọc dữ liệu từ trang web (như lấy tên user, tin nhắn) mà không kiểm tra kỹ, hacker có thể lợi dụng để chèn mã độc nhằm chiếm quyền điều khiển hoặc đánh cắp dữ liệu lưu trong `chrome.storage`.

### 🚨 Rủi ro 3: Trễ hiệu năng (Performance Lag)
* **Bản chất:** Nạp động (Dynamic Import) bắt buộc phải chạy bất đồng bộ (Asynchronous). 
* **Hậu quả:** Trình duyệt phải mất thêm thời gian gửi một yêu cầu mạng nội bộ để tải file `content-core.js`. Nếu máy người dùng bị lag, Extension sẽ bị kích hoạt chậm vài giây sau khi trang web đã tải xong, làm sót một khoảng thời gian không track được.

---

## 2. Cách Khắc Phục Triệt Để

### 🛠️ Giải pháp 1: Thu hẹp tối đa phạm vi cho phép (Ngắn hạn / Thủ công)
Tuyệt đối **không** dùng `"<all_urls>"` trong mục `web_accessible_resources`. Chỉ cấp quyền cho đúng những trang web mà Extension cần hoạt động.

* **Cấu hình chuẩn trong `manifest.json`:**
```json
"web_accessible_resources": [
  {
    "resources": [
      "src/content/content-core.js",
      "src/content/modules/*.js",
      "src/utils/storage.js"
    ],
    "matches": [
      "https://*://*", 
      "https://*://*"
    ]
  }
]
```

### 🛠️ Giải pháp 2: Sử dụng Bundler (Vite / Webpack) để gộp file (Dài hạn - Khuyên dùng)
Đây là cách xử lý tối ưu nhất để vừa code được theo dạng Module (`import/export`), vừa bảo mật 100% và đủ điều kiện đưa lên **Chrome Web Store**.

* **Cách hoạt động:** Bạn dùng công cụ như **Vite** hoặc **Webpack** để biên dịch code. Công cụ này sẽ tự động quét qua tất cả các file `tracker.js`, `storage.js`, `content-main.js` của bạn, sau đó **gộp và nén tất cả lại thành 1 file duy nhất** (ví dụ: `dist/content.bundle.js`).
* **Kết quả:** 
  * File `content.bundle.js` cuối cùng hoàn toàn không còn từ khóa `import` nào nữa (nó đã được gộp code lại bên trong).
  * Bạn có thể chạy trực tiếp file bundle này trong `content_scripts` như một Classic Script truyền thống.
  * **Xóa bỏ hoàn toàn** mục `web_accessible_resources` cho các file script trong `manifest.json`, bít hoàn toàn lỗ hổng rò rỉ mã nguồn.
