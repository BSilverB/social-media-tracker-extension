/**
 * Ghi chú kiến trúc:
 * File này trước đây dùng dynamic `import(chrome.runtime.getURL('src/content/content-core.js'))`.
 * Tuy nhiên trên YouTube và các trang có CSP / Frame security nghiêm ngặt, Chromium sẽ chặn và báo lỗi:
 * "Unsafe attempt to load URL chrome-extension://... from frame with URL https://www.youtube.com/. Domains, protocols and ports must match."
 *
 * Giải pháp chuẩn MV3:
 * Tất cả các module trong `src/content/content-core.js` và thư mục `modules/` được đóng gói trực tiếp vào
 * `src/content/content-bundle.js` thông qua lệnh:
 *   node build.js (hoặc npm run build)
 * và được Chrome nạp tự động, độc lập trong Isolated World thông qua manifest.json.
 */
