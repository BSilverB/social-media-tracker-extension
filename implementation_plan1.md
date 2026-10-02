# Kế hoạch Triển khai: Nâng cấp Hệ thống Thống kê & Đo lường Hành vi Vô thức (Giai đoạn 1)

Kế hoạch nâng cấp Chrome Extension (Manifest V3) theo các nguyên lý tâm lý học hành vi (Mô hình Fogg B=MAP, Thắt nút nhận thức). Hệ thống sẽ theo dõi chi tiết trên YouTube và Facebook, phân loại video dài/ngắn, phát hiện lướt vô thức (impulsive skip), đếm số lần xem lặp lại (loop), đếm cuộn bài viết Facebook Feed, đo lường thời gian sử dụng thực tế (Active vs Passive), đếm reload/logo click, và phân loại nội dung bằng Regex.

## User Review Required

> [!IMPORTANT]
> - Quyền hạn mở rộng trong `manifest.json`: Bổ sung `https://*.facebook.com/*` vào `host_permissions` và `content_scripts.matches` để theo dõi Facebook song song với YouTube.
> - Lưu trữ dữ liệu: 100% Offline cục bộ thông qua `chrome.storage.local` với khóa theo ngày `YYYY-MM-DD`. Dữ liệu tự động lưu định kỳ (mỗi 5 giây hoặc khi chuyển trang/chuyển video) để đảm bảo không bị mất khi đóng tab bất ngờ và không gây nghẽn I/O.
> - Floating HUD: Hiển thị góc màn hình (cho phép thu nhỏ hoặc ẩn) hỗ trợ nhận thức thời gian thực (Cognitive Nudge).

## Cấu trúc Dữ liệu Đề xuất (`YYYY-MM-DD`)

```json
{
  "2026-09-13": {
    "youtube": {
      "summary": {
        "activeTimeSeconds": 0,
        "passiveTimeSeconds": 0,
        "reloadCount": 0
      },
      "longVideos": {
        "totalWatched": 0,
        "impulsiveCount": 0,
        "details": [
          {
            "title": "Tên video",
            "watchedSeconds": 120,
            "durationSeconds": 600,
            "category": "Giáo dục",
            "isImpulsive": false,
            "timestamp": 1773460000000
          }
        ]
      },
      "shortVideos": {
        "totalSwipes": 0,
        "validViews": 0,
        "loopViews": 0
      }
    },
    "facebook": {
      "summary": {
        "activeTimeSeconds": 0,
        "passiveTimeSeconds": 0,
        "reloadCount": 0,
        "feedPostsScrolled": 0
      },
      "longVideos": {
        "totalWatched": 0,
        "impulsiveCount": 0,
        "details": []
      },
      "reels": {
        "totalSwipes": 0,
        "validViews": 0,
        "loopViews": 0
      }
    }
  }
}
```

---

## Proposed Changes

### 1. Cấu hình Extension
#### [MODIFY] [manifest.json](file:///f:/A-PROJECTS/social-media-tracker/manifest.json)
- Bổ sung `https://*.facebook.com/*` vào `host_permissions` và `content_scripts.matches`.
- Cập nhật tên và mô tả dự án phản ánh đúng tính năng đa nền tảng: "Mindful Social Tracker (YT & FB)".
- Thiết lập `"run_at": "document_idle"` để tải mượt mà không chặn render trang.

---

### 2. Logic Content Script (`content.js`)
#### [MODIFY] [content.js](file:///f:/A-PROJECTS/social-media-tracker/content.js)
Tái cấu trúc thành các module xử lý rõ ràng, có chú thích đầy đủ:

1. **Khởi tạo & Quản lý Trạng thái Lưu trữ (Storage Manager)**:
   - Hàm `getTodayKey()` lấy ngày theo múi giờ địa phương.
   - Đảm bảo khởi tạo cấu trúc dữ liệu mặc định an toàn cho ngày mới.
   - Bộ đệm lưu trữ (Storage buffer & debounced save) lưu dữ liệu mỗi 5s hoặc khi xảy ra sự kiện quan trọng (rời trang, lướt video mới).

2. **Theo dõi Thời gian Thực tế (Active vs Passive Time Tracker)**:
   - Sử dụng `document.hidden` (Page Visibility API) kết hợp theo dõi Idle (người dùng không thao tác qua `mousemove`, `keydown`, `scroll`, `click` trong vòng 30 giây).
   - Nếu tab visible và tương tác gần nhất < 30s: Tăng `activeTimeSeconds`.
   - Nếu tab visible nhưng không tương tác > 30s: Tăng `passiveTimeSeconds`.
   - Khi tab ẩn (`document.hidden`): Dừng tính active time.

3. **Bắt Hành vi F5 / Reload & Click Logo Home**:
   - Kiểm tra `performance.getEntriesByType('navigation')[0]?.type === 'reload'` khi vừa tải trang để ghi nhận lượt F5.
   - Bắt sự kiện `click` ở phase capture trên `a#logo`, `ytd-topbar-logo-renderer` (YouTube) và `a[aria-label="Facebook"]`, `a[href="/"]` (Facebook) để đếm lượt tải lại trang chủ vô thức.

4. **Bộ phân loại Nội dung (Keyword / Regex Categorizer)**:
   - Hàm `categorizeContent(text)` phân loại văn bản theo 4 nhóm chính:
     - **Phát triển bản thân**: kỷ luật, thói quen, tư duy, động lực, sách, self-help, năng suất, học tập...
     - **Giáo dục & Công nghệ**: lập trình, coding, hướng dẫn, bài giảng, khoa học, lịch sử, tiếng anh, kiến thức...
     - **Tài chính & Đầu tư**: tài chính, đầu tư, chứng khoán, crypto, bitcoin, tiết kiệm, kinh doanh, ngân hàng...
     - **Giải trí**: hài, troll, game, gaming, review phim, ca nhạc, mv, showbiz, drama, anime, bóng đá, vlog, meme...
     - Mặc định: "Khác / Khám phá".

5. **Theo dõi YouTube**:
   - Nhận diện URL: `/watch` (Long video) vs `/shorts/` (Shorts).
   - Hỗ trợ sự kiện SPA của YouTube (`yt-navigate-finish`, `popstate`, `MutationObserver`).
   - Với **YouTube Shorts**:
     - Đếm `totalSwipes` khi chuyển video mới.
     - Đếm `validViews` khi xem > 2s.
     - Phát hiện lặp (`loopViews`): Lắng nghe `timeupdate` trên `<video>` khi `currentTime` quay trở về đầu sau khi đã chạy tới gần cuối hoặc video lặp lại.
   - Với **YouTube Long Video**:
     - Đo thời gian thực tế đã xem (`watchedSeconds`) và tổng thời lượng video (`durationSeconds`).
     - Khi chuyển video hoặc đóng tab: nếu `watchedSeconds < durationSeconds * 0.15` -> Đánh dấu `isImpulsive: true` (lướt vô thức) và tăng `impulsiveCount`.

6. **Theo dõi Facebook**:
   - Nhận diện URL: `/reel/` hoặc `/reels/` vs Feed trang chủ vs Long Video (`/watch`).
   - Với **Facebook Feed**:
     - Theo dõi số bài viết cuộn qua viewport (`[role="feed"] > div` hoặc các container bài viết `div[data-pagelet^="FeedUnit"]`) sử dụng `IntersectionObserver` / `Set` lưu các ID bài viết đã xem để không đếm trùng, kết hợp throttling.
   - Với **Facebook Reels**:
     - Đếm `totalSwipes`, `validViews`, và `loopViews`.
   - Với **Facebook Watch**:
     - Đo thời gian xem, kiểm tra `isImpulsive`.

7. **Giao diện HUD góc màn hình (Floating HUD)**:
   - Thiết kế tinh gọn, glassmorphism, hiển thị Active Time, số lượt lướt/cuộn và Category nội dung hiện tại.
   - Hỗ trợ nút thu nhỏ (minimize) để không làm phiền người dùng.

---

### 3. Giao diện Popup Thống kê (`popup.html` & `popup.js`)
#### [MODIFY] [popup.html](file:///f:/A-PROJECTS/social-media-tracker/popup.html)
- Thiết kế giao diện hiện đại phong cách Dark Theme cao cấp, font Inter/Roboto.
- Thanh chuyển Tab mượt mà: **YouTube** | **Facebook** | **Tổng quan**.
- Thẻ đo lường Thời gian (Active Time vs Passive Time, Tỷ lệ tập trung).
- Thẻ cảnh báo Hành vi Vô thức:
  - Tỷ lệ bỏ ngang video dài (<15% độ dài) `isImpulsive`.
  - Số lần bấm F5 / Click Logo tìm kiếm dopamin.
  - Số lượt xem lặp lại Shorts/Reels (Loop views).
  - Số bài viết Facebook Feed đã cuộn qua.
- Biểu đồ phân bổ Nội dung (Category distribution: Giáo dục, Tài chính, Giải trí, Phát triển bản thân).
- Nút Reset dữ liệu ngày hiện tại để tiện kiểm thử.

#### [MODIFY] [popup.js](file:///f:/A-PROJECTS/social-media-tracker/popup.js)
- Đọc dữ liệu `chrome.storage.local` theo `getTodayKey()`.
- Xử lý tính toán tỷ lệ %, định dạng thời gian đẹp mắt (`1h 25m`, `45s`).
- Render số liệu động theo từng tab (YouTube / Facebook).
- Lắng nghe `chrome.storage.onChanged` để cập nhật dữ liệu theo thời gian thực (real-time).

---

## Verification Plan

### Automated / Code Quality Verification
- Kiểm tra cú pháp JavaScript không có lỗi syntax bằng `node -c content.js`, `node -c popup.js`.
- Kiểm tra tính hợp lệ của tệp `manifest.json`.

### Manual Testing Walkthrough
1. Tải unpacked extension vào trình duyệt Chrome (`chrome://extensions`).
2. **Kiểm tra YouTube**:
   - Truy cập `youtube.com/shorts/...`: Kiểm tra HUD hiển thị số lượt lướt, đợi >2s xem `validViews` tăng, để video lặp lại kiểm tra `loopViews` tăng.
   - Mở 1 video dài `youtube.com/watch?v=...`: Xem trong 5 giây rồi tắt hoặc chuyển tab/video khác, kiểm tra ghi nhận `isImpulsive: true` do <15% thời lượng. Kiểm tra gán nhãn Category dựa trên tiêu đề.
   - Bấm F5 hoặc bấm Logo YouTube: Kiểm tra `reloadCount` tăng.
3. **Kiểm tra Facebook**:
   - Truy cập `facebook.com`: Cuộn Feed xem số lượng bài viết `feedPostsScrolled` tăng đều theo từng bài viết.
   - Truy cập `facebook.com/reel/...`: Kiểm tra đếm swipes & loops.
   - Click Logo Facebook: Kiểm tra `reloadCount` tăng.
4. **Kiểm tra Thời gian Active vs Passive**:
   - Khi đang tương tác: Thời gian Active tăng mỗi giây.
   - Khi dừng chuột và không gõ phím > 30s: Chuyển sang cộng dồn Passive.
5. **Kiểm tra Popup**:
   - Mở Popup extension, kiểm tra giao diện hiển thị đầy đủ các chỉ số của YouTube và Facebook, phân loại danh mục và tỷ lệ lướt vô thức.





!!! Vấn đề phát hiện:
Ở chỗ xử lý các bài Feeds trên facebook phát hiện
Vấn đề 1: Sai lệch Selector hoàn toàn (Lỗi nặng nhất)
const postElements = document.querySelectorAll(
  "[role='feed'] > div, div[data-pagelet^='FeedUnit_'], div[role='article']"
);

Thực tế: Đã tự kiểm tra bằng công cụ Inspect ở bước trước, Facebook không còn dùng thuộc tính role='feed' hay role='article' ở cấu trúc bài viết của bạn nữa. Còn thuộc tính data-pagelet hiện tại đã đổi tên hoặc cấu trúc lồng thẻ khác đi (không còn là FeedUnit_ dạng số đơn giản nữa).

Hậu quả: Hàm document.querySelectorAll() này trả về kết quả là một danh sách rỗng ([]). Vòng lặp forEach không có phần tử nào để chạy, dẫn đến hàm observe() phía dưới chưa từng được gọi.

Vấn đề 2: Lỗi logic "Rác bộ nhớ" (Memory Leak) do lưu trực tiếp thẻ HTML vào Set
if (!seenFBPosts.has(post) ...) { ... }

Thực tế: Bạn đang dùng seenFBPosts.has(post) để kiểm tra đối tượng là thẻ HTML vật lý (DOM Node). Tuy nhiên, Facebook là một ứng dụng Single Page App (SPA) được tối ưu cực kỳ ngặt nghèo. Khi bạn cuộn xuống khoảng 5 - 10 bài viết, Facebook sẽ xóa sạch (destroy) các thẻ HTML của các bài viết cũ ở phía trên đỉnh để giải phóng RAM cho trình duyệt. Khi bạn cuộn ngược lên lại, Facebook sẽ tạo mới lại một thẻ HTML hoàn toàn khác để nhét nội dung bài cũ đó vào.

Hậu quả: Thẻ HTML mới sinh lại có một tham chiếu bộ nhớ mới, khiến seenFBPosts.has(post) tưởng đây là bài viết mới hoàn toàn dù nội dung chữ của nó y hệt bài bạn đã đọc. Hệ thống của bạn sẽ bị đếm trùng lặp liên tục khi cuộn lên xuống.

Vấn đề 3: Thời gian delay của Throttle quá dài (800ms)

Thực tế: Một người dùng lướt Facebook bình thường (với thói quen lướt nhanh bằng ngón tay hoặc con lăn chuột) có thể đi qua từ 2 đến 3 bài viết chỉ trong vòng 1 giây.

Hậu quả: Việc khóa thời gian chờ lên tới 800ms mới cho phép quét bài viết mới một lần là quá chậm. Có rất nhiều bài viết đã xuất hiện rồi biến mất khỏi màn hình trước khi hàm setTimeout kịp nhả khóa để quét, khiến thuật toán của bạn bị bỏ sót (miss) rất nhiều bài Feed khi lướt tốc độ trung bình trở lên.

Giải pháp chỉnh sửa

Vấn đề cũ
Sai Selector ([role='feed'],...) làm kết quả quét bài viết luôn bằng rỗng [].
Lưu thẻ HTML vào WeakSet gây lỗi đếm trùng bài viết cũ khi cuộn trang lên/xuống.
Thời gian khóa Throttle quá dài (800ms) làm sót bài khi người dùng lướt nhanh.
Theo dõi vô hạn làm nặng trình duyệt sau thời gian dài lướt.

Giải pháp cải tiến
Thay bằng div.html-div kết hợp lọc độ dài chữ (innerText.length > 150)
Chuyển sang dùng Set thông thường để lưu chuỗi chữ định danh (60 ký tự đầu) của bài viết.
Giảm thời gian chờ xuống 300ms.
Bổ sung hàm unobserve(el) ngay sau khi bài viết được đếm thành công.


Kết quả đạt được 
Bắt trúng chính xác các khối bài viết thực tế trên giao diện Facebook mới.
Bài viết chỉ bị đếm một lần duy nhất, không lo Facebook hủy hay nạp lại thẻ HTML.
Tốc độ quét nhạy hơn, bắt kịp tiến trình cuộn trang thực tế của người dùng.
Giải phóng bộ nhớ cho trình duyệt, giúp Facebook luôn mượt mà khi cuộn sâu.