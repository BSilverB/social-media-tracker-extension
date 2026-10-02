# CẤU TRÚC KĨ THUẬT & MÔ HÌNH DỰ ÁN

## 1. Công nghệ Sử dụng
- **Platform:** Chrome Extension (Manifest V3)[cite: 1, 2].
- **Lưu trữ:** `chrome.storage.local` (Key theo ngày `YYYY-MM-DD` để quản lý độc lập)[cite: 1, 2].
- **Đồng hồ hẹn giờ:** `chrome.alarms` API cho thông báo/tab phản tư[cite: 1, 2].

## 2. Cấu trúc Thư mục ES6 Modules (Dự kiến Giai đoạn 3)
```text
src/
├── background/
│   └── service-worker.js       # Xử lý Alarms (22h00), Sync & Badge Icon[cite: 1, 2]
├── content/
│   ├── modules/
│   │   ├── tracker.js          # Theo dõi DOM, đếm Swipes, Reloads, % Completion Rate[cite: 1]
│   │   ├── hud.js              # Giao diện HUD kéo thả, đổi màu theo mốc[cite: 1]
│   │   ├── friction.js         # Modal ngắt nhịp (Hiện ảnh cá nhân, đếm ngược Space 3s)[cite: 1]
│   │   ├── pomodoro.js         # Quản lý chu kỳ Focus (25m) / Break (5m)[cite: 1]
│   │   └── keyword-filter.js   # Quét tiêu đề so khớp từ khóa mục tiêu[cite: 1, 2]
│   ├── utils/
│   │   └── storage.js          # Helper đọc/ghi chrome.storage.local[cite: 1]
│   └── content-main.js         # Entry point chính[cite: 1]
├── popup/
│   ├── popup.html
│   └── popup.js                # Dashboard cài đặt Mốc, Ảnh, Master Goal, Pomodoro[cite: 1]
└── reflection/
    ├── reflection.html
    └── reflection.js           # Báo cáo & Tab viết Nhật ký lúc 22h00[cite: 1, 2]