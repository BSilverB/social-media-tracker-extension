# Kế hoạch Triển khai Giai đoạn 2: Thắt nút Nhận thức & Ngắt nhịp Hành vi Cá nhân hóa

Kế hoạch nâng cấp Chrome Extension tích hợp các nguyên lý tâm lý học hành vi (Mô hình Fogg B=MAP, Mỏ neo Cảm xúc & Thắt nút Nhận thức). Giai đoạn 2 bổ sung cơ chế Kéo thả HUD, Tùy chỉnh Mốc giới hạn, Hộp thoại Định hướng Mục tiêu, Overlay Mỏ neo Cảm xúc với Ảnh Cá nhân (Giữ phím Space 3 giây để mở khóa), và Cảnh báo Lặp lại F5/Reload.

## User Review Required

> [!IMPORTANT]
> - **Ảnh Cá Nhân (Base64 / URL)**: Được lưu 100% Offline trong `chrome.storage.local`. Khi chuyển ảnh sang Base64 trong `popup.js`, ảnh sẽ được tự động resize/nén nhẹ để tránh làm phình dung lượng storage.
> - **Khóa Tương tác Overlay**: Khi Mốc 3 (Trần đỏ) bị vượt qua, Overlay phủ toàn màn hình (`z-index: 2147483647`) sẽ chặn hoàn toàn các sự kiện cuộn chuột (`wheel`), chạm (`touchstart`/`touchmove`) và các phím cuộn trang (`PageDown`, `PageUp`, `ArrowDown`, `ArrowUp`, `Space`).
> - **Giải phóng Chốt chặn**: Người dùng phải giữ phím `Space` liên tục trong 3 giây (hiển thị thanh tiến trình đếm ngược) để mở thêm 5 lượt lướt trước khi Overlay ẩn đi.

---

## Cấu trúc Cấu hình Bổ sung (`chrome.storage.local`)

Key `app_config`:
```json
{
  "thresholds": {
    "m1": 15,
    "m2": 30,
    "m3": 45
  },
  "masterGoal": "Muốn trở thành phiên bản tốt hơn",
  "emotionalAnchorImage": "data:image/jpeg;base64,...",
  "hudPosition": {
    "top": "auto",
    "left": "auto",
    "right": "20px",
    "bottom": "20px"
  }
}
```

---

## Proposed Changes

### 1. Nâng cấp Extension Configuration
#### [MODIFY] [manifest.json](file:///f:/A-PROJECTS/social-media-tracker/manifest.json)
- Giữ nguyên cấu hình permissions `storage`, `host_permissions` cho YouTube & Facebook.

---

### 2. Logic Can thiệp Hành vi trong Content Script (`content.js`)

#### [MODIFY] [content.js](file:///f:/A-PROJECTS/social-media-tracker/content.js)

1. **Hệ thống HUD Kéo thả (Draggable HUD) & Đổi màu theo Mốc**:
   - Thêm sự kiện `pointerdown`, `pointermove`, `pointerup` cho phần tử `#mindful-tracker-hud` để hỗ trợ kéo thả tự do.
   - Lưu vị trí `top`, `left` vào `chrome.storage.local` khi người dùng thả chuột. Khi nạp trang mới, tự động đọc và đặt lại tọa độ `top`/`left`.
   - Lấy giá trị Mốc 1 (`m1`), Mốc 2 (`m2`), Mốc 3 (`m3`) từ cấu hình.
   - Cập nhật màu nền HUD:
     - Số lượt lướt/cuộn < Mốc 1: Viền Xanh (`#10B981`).
     - Mốc 1 <= Số lượt lướt < Mốc 3: Viền Vàng (`#F59E0B`).
     - Số lượt lướt >= Mốc 3: Viền Đỏ (`#EF4444`) & nhấp nháy cảnh báo.

2. **Hộp thoại Mục tiêu Ngắn hạn & Động lực (Intentional Entry)**:
   - Kiểm tra `sessionStorage` xem phiên làm việc hiện tại trên Shorts/Reels/Feed đã khai báo mục tiêu chưa.
   - Nếu chưa: Hiển thị Modal hỏi "Mục tiêu ngắn hạn 15 phút tới của bạn là gì?".
   - Sau khi nhập mục tiêu ngắn hạn và bấm "Bắt đầu": Ghi nhớ vào `sessionStorage`, hiển thị Toast chứa thông điệp nhắc lại Master Goal ("Hãy nhớ mục tiêu lớn của bạn: [Master Goal]. Tôi tin bạn làm được!") trong 3 giây rồi ẩn Modal.

3. **Overlay Fullscreen Mỏ Neo Cảm Xúc kèm Ảnh Cá Nhân**:
   - Tạo DOM Overlay full màn hình (`z-index: 2147483647`, background tối làm mờ mượt mà).
   - Khi `totalSwipes` (hoặc `feedPostsScrolled`) >= Mốc 3, nếu người dùng lướt tiếp hoặc F5: Kích hoạt Overlay.
   - Giao diện Overlay bao gồm:
     - Tấm ảnh cá nhân bo góc đẹp mắt (`max-width: 320px`, `max-height: 320px`, `border-radius: 16px`, viền phát sáng).
     - Thông điệp thức tỉnh: "Dừng lại một chút! Bạn đã vượt mốc giới hạn [Mốc 3] lượt lướt vô thức hôm nay."
     - Thanh tiến trình đếm ngược 3 giây & Lời nhắc: "Nhấn và giữ phím SPACE trong 3 giây để tiếp tục (thêm 5 lượt)".
   - Lắng nghe `keydown` và `keyup` phím `Space`: Tích lũy thời gian giữ phím. Nếu nhả phím giữa chừng -> Reset thanh đếm ngược. Nếu giữ đủ 3 giây -> Ẩn Overlay, cộng 5 lượt tạm hoãn.
   - Vô hiệu hóa `wheel`, `touchmove`, `keydown` (ArrowUp, ArrowDown, PageUp, PageDown) khi Overlay đang bật.

4. **Cảnh báo Nghiện Reload (Refresh Dopamine Warning)**:
   - Lưu mảng các timestamp của những lần F5 / Reload / Click Logo Home trong 2 phút gần nhất.
   - Nếu phát hiện >= 3 lần trong 2 phút -> Hiển thị Toast thông báo dịu nhẹ trong 4 giây: *"Bảng tin chưa có gì mới đâu, hãy hít thở sâu nào! 🧘‍♂️"*.

---

### 3. Giao diện Cấu hình Cài đặt (`popup.html` & `popup.js`)

#### [MODIFY] [popup.html](file:///f:/A-PROJECTS/social-media-tracker/popup.html)
- Bổ sung Tab thứ 4: **⚙️ Cài đặt & Cảnh báo**.
- Thêm Form cấu hình:
  - Các ô nhập Mốc 1, Mốc 2, Mốc 3 (default: 15, 30, 45).
  - Ô nhập **Mục tiêu Lớn (Master Goal)**.
  - Bộ tải ảnh cá nhân: Cho phép Chọn tệp ảnh từ máy (chuyển sang Base64) hoặc nhập URL ảnh trực tiếp. Khung xem trước (Preview) ảnh cá nhân.
- Nút "Lưu Cài đặt" hiển thị Toast báo lưu thành công.

#### [MODIFY] [popup.js](file:///f:/A-PROJECTS/social-media-tracker/popup.js)
- Xử lý nạp và lưu các thông số cấu hình (`thresholds`, `masterGoal`, `emotionalAnchorImage`).
- Đọc file ảnh từ tệp tin (`FileReader.readAsDataURL`) và resize nén thành dạng Base64 tối ưu dung lượng.
- Xử lý sự kiện lưu cấu hình vào `chrome.storage.local`.

---

## Verification Plan

### Automated / Code Quality Verification
- Kiểm tra cú pháp JavaScript không có lỗi syntax bằng `node -c content.js` và `node -c popup.js`.
- Kiểm tra tính hợp lệ của `manifest.json`.

### Manual Testing Walkthrough
1. **Kiểm tra Cấu hình Popup**:
   - Mở Popup -> Chuyển sang tab **Cài đặt**.
   - Cài đặt Mốc 1 (5), Mốc 2 (10), Mốc 3 (15).
   - Nhập Master Goal: *"Muốn trở thành phiên bản tốt hơn để gặp người ấy"*.
   - Chọn một tấm ảnh từ máy tính -> Kiểm tra khung Preview ảnh hiển thị tốt -> Nhấn Lưu Cài đặt.
2. **Kiểm tra Kéo thả HUD**:
   - Truy cập YouTube / Facebook. Kéo thả HUD sang góc trên hoặc vị trí bất kỳ -> F5 làm mới trang -> Kiểm tra HUD giữ nguyên vị trí mới.
3. **Kiểm tra Hộp thoại Mục tiêu Ngắn hạn**:
   - Vào `/shorts/` hoặc Facebook Feed ở phiên làm việc mới.
   - Kiểm tra Modal hỏi mục tiêu xuất hiện -> Nhập "Xem tin tức 15p" -> Bấm Bắt đầu.
   - Kiểm tra Toast gợi nhớ Master Goal xuất hiện 3s rồi ẩn Modal.
4. **Kiểm tra Overlay Mỏ neo Cảm xúc & Giữ phím Space**:
   - Lướt quá 15 lượt (vượt Mốc 3).
   - Kiểm tra màn hình Overlay full màn hình bật lên, hiển thị tấm ảnh cá nhân bo góc đẹp mắt.
   - Thử cuộn chuột hay bấm phím mũi tên -> Kiểm tra bị chặn hoàn toàn.
   - Nhấn giữ phím `Space`: Thanh đếm ngược chạy từ 0% lên 100% trong 3 giây. Nhả phím giữa chừng -> Thanh quay về 0%. Giữ đủ 3s -> Overlay đóng và được lướt thêm 5 lượt.
5. **Kiểm tra Cảnh báo Reload**:
   - Nhấn F5 liên tục 3 lần trong vòng 1 phút -> Kiểm tra Toast *"Bảng tin chưa có gì mới đâu, hãy hít thở sâu nào!"* hiển thị.


!!! Vấn đề phát hiện:
1. Sửa lỗi Kéo thả HUD (Drag & Drop):

Nguyên nhân cũ: Sự kiện pointermove bị đứt gãy do hàm updateHUD() chạy định kỳ mỗi 1 giây vẽ lại hud.innerHTML đè lên thẻ đang được chuột tóm lấy, đồng thời pointercapture bị mất khi rê chuột nhanh.
Khắc phục:
Lắng nghe mousemove/touchmove trên toàn bộ cửa sổ window.
Tạm dừng vẽ lại updateHUD() trong suốt thời gian người dùng đang giữ chuột kéo thả (isDraggingHUD = true).
Gán cursor: grab / grabbing, z-index: 2147483640 và lưu tọa độ top, left vào chrome.storage.local khi thả chuột.
2. ửa lỗi Hộp thoại Mục tiêu Ngắn hạn không hiện:

Nguyên nhân cũ: Trong cùng một tab kiểm thử, sessionStorage đã lưu giá trị từ lần chạy trước; ngoài ra khi chuyển trang Single Page App (SPA) thì YouTube/FB dùng history.replaceState/pushState không kích hoạt lại hàm kiểm tra.
Khắc phục:
Hook trực tiếp history.pushState và history.replaceState để phát hiện chuyển trang tức thì trên SPA.
Đặt z-index: 2147483647 gắn vào document.documentElement và tự động focus vào ô nhập liệu khi mở tab mới.
3. Sửa lỗi không hiện Overlay Mỏ neo khi vượt Mốc 3:

Nguyên nhân cũ: Giá trị Mốc 3 lấy từ input form là kiểu chuỗi (String) gây so sánh sai logic ("10" < "8") và biến lượt hoãn graceSwipes bị timer 1 giây trừ hao liên tục.
Khắc phục:
Ép kiểu Number(appConfig.thresholds.m3) chuẩn xác.
Tách hàm checkTriggerFrictionOnAction() chỉ kiểm tra và tiêu thụ lượt hoãn đúng lúc người dùng có hành động lướt video / cuộn bài viết mới.
4. Sửa lỗi F5 liên tục không hiện Cảnh báo Reload:

Nguyên nhân cũ: Mảng recentReloadTimestamps được khai báo trong RAM của content.js, mỗi lần bấm F5 thì toàn bộ JavaScript bị hủy và chạy lại từ đầu nên mảng luôn bị reset về rỗng (độ dài luôn là 1).
Khắc phục:
Chuyển sang lưu mảng lịch sử reload vào sessionStorage.getItem("mindful_recent_reloads") (bộ nhớ tồn tại xuyên suốt qua các lần F5 của tab). Khi phát hiện >= 3 lần F5 trong 2 phút, Toast cảnh báo sẽ hiển thị ngay lập tức.


Có cơ chế lượt hoãn mỗi khi đạt giới hạn, hiện tại đang hardcode là 5, có thể phát triển lên thành làm các nhiệm vụ để kiếm thêm lượt hoãn chẳng hạn.