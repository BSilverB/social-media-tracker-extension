# Walkthrough: Hoàn Tất Giai Đoạn 4 & Triển Khai Toàn Diện Giai Đoạn 5

Toàn bộ 4 tính năng trọng tâm của Giai đoạn 5 đã được triển khai hoàn chỉnh, tối ưu hiệu năng và kiểm tra cú pháp nghiêm ngặt.

---

## 1. Tóm Tắt Các Thay Đổi (Changes Made)

### 🐾 1. Nâng Cấp Pet Engine & Tủ Đồ Phụ Kiện (Modular Wardrobe)
- [pet-engine.js](file:///f:/A-PROJECTS/social-media-tracker/src/content/modules/pet-engine.js):
  - **Sự kiện Poke / Click:** Người dùng nhấp vào Pet trên HUD sẽ kích hoạt bóng thoại (Speech Bubble) thủy tinh mờ nổi lên trên Pet chứa các lời nhắc thể chất ngẫu nhiên (*uống nước ấm, hít thở 3 nhịp, nhìn xa 20s, ngồi thẳng lưng, nhớ mục tiêu lớn*).
  - **Auto-hide 4 Giây (Rule 2):** Sử dụng bộ đếm thời gian tự động gỡ bóng thoại sau đúng 4.0 giây kèm hiệu ứng thu mờ mượt mà.
  - **Cooldown Năng Lượng 30 Phút:** Chỉ cộng `+3⚡` năng lượng tối đa 1 lần mỗi 30 phút (`lastPokeEnergyTime`) để phòng ngừa hành vi click spam.
  - **Hệ Thống Phụ Kiện Theo Streak:**
    - Tự động mở khóa **Kính râm sành điệu** khi Streak $\ge$ 3 ngày (`sunglasses`).
    - Tự động mở khóa **Vòng nguyệt quế vinh quang** khi Streak $\ge$ 7 ngày (`laurel`).
    - Render layer phụ kiện dạng SVG bo khớp chính xác trên cả 3 chế độ Pet: Sprout (Mầm cây), Puppet (Khung ghép mặt offline) và AI Chibi Avatar.
- [popup.html](file:///f:/A-PROJECTS/social-media-tracker/popup.html) & [popup.js](file:///f:/A-PROJECTS/social-media-tracker/popup.js):
  - Bổ sung khu vực **"👑 Tủ Đồ Phụ Kiện"** trong Card Linh vật: Hiển thị Streak hiện tại, trạng thái khóa/mở và nút [Đeo Ngay] / [Tháo].
  - Avatar xem trước trong Popup hiển thị đồng bộ phụ kiện đang đeo ngay tức thì.

---

### 🌑 2. Chế Độ Đen Trắng (Grayscale Demotivation Mode)
- [content-core.js](file:///f:/A-PROJECTS/social-media-tracker/src/content/content-core.js):
  - Tự động inject CSS và áp dụng class `mindful-grayscale-active` lên thẻ `<html>`:
    ```css
    html.mindful-grayscale-active {
      filter: grayscale(100%) !important;
      transition: filter 0.5s ease-in-out !important;
    }
    ```
  - **3 Điều Kiện Kích Hoạt Đồng Thời:**
    1. Đang trong phiên Pomodoro Tập trung (`pomodoroManager.isFocusSession`).
    2. Vượt ngưỡng Mốc cảnh báo 2 (`currentCount >= m2Limit`).
    3. Giờ giới nghiêm ban đêm: từ **22h30** tối đến **05h00** sáng hôm sau.
  - Hàm `evaluateGrayscaleMode()` được gọi liên tục khi đổi route SPA, khi lướt video (`onAction`), khi Pomodoro tick và có bộ đếm tự động `setInterval(..., 30000)` để bắt kịp khung giờ 22h30.

---

### 🧘 3. Bài Tập Thở Box Breathing trên Màn Hình Ngắt Nhịp
- [friction.js](file:///f:/A-PROJECTS/social-media-tracker/src/content/modules/friction.js):
  - Thay thế cơ chế giữ phím Space 3s cũ bằng **Bài tập thở Box Breathing 1 chu kỳ chuẩn (12 giây)**:
    - **Pha 1 (0s - 4s): Hít vào (Inhale)** $\rightarrow$ Quả cầu nở to (scale 1.22x), vòng sáng Cyan (`#06B6D4`), nhãn: *"🌬️ Hít vào thật sâu bằng mũi..."*.
    - **Pha 2 (4s - 8s): Giữ hơi (Hold)** $\rightarrow$ Quả cầu rung nhẹ thư thái, vòng sáng Tím (`#8B5CF6`), nhãn: *"🧘 Nín thở & thả lỏng toàn thân..."*.
    - **Pha 3 (8s - 12s): Thở ra (Exhale)** $\rightarrow$ Quả cầu từ từ thu nhỏ (scale 0.75x), vòng sáng Xanh ngọc (`#10B981`), nhãn: *"💨 Thở ra từ từ bằng miệng..."*.
  - **Mỏ neo cảm xúc:** Tấm ảnh người thương được đặt ở trung tâm trang trọng với viền phát sáng nhịp thở và câu châm ngôn cổ vũ cá nhân hóa.
  - **Nút "🛑 Đóng Tab Ngay":** Người dùng có thể thoát khỏi mạng xã hội tức thì.
  - **Nút "Tiếp tục (5 lượt hoãn)":** Bị khóa (`disabled`) và chỉ mở khóa sáng rực sau khi người dùng hoàn thành trọn vẹn 12 giây hít thở.

---

### 📊 4. Trang Báo Cáo Phân Tích Dài Hạn & Sao Lưu JSON
- [dashboard.html](file:///f:/A-PROJECTS/social-media-tracker/src/dashboard/dashboard.html) & [dashboard.js](file:///f:/A-PROJECTS/social-media-tracker/src/dashboard/dashboard.js):
  - Trang độc lập với phong cách Glassmorphism sang trọng đồng bộ `reflection.html`.
  - Bộ chọn khoảng thời gian: 7 Ngày / 30 Ngày / 90 Ngày / Toàn bộ lịch sử.
  - 4 Card chỉ số: Tổng thời gian, Shorts/Reels, Tần suất F5 Reload (đo lường bồn chồn) và % Nội dung mục tiêu.
  - **3 Biểu Đồ Canvas Sắc Nét (HiDPI Scaling chống mờ):**
    1. Biểu đồ Thời gian Chủ động (Active) vs Treo (Passive) theo ngày.
    2. Biểu đồ Phân bổ Shorts YouTube vs Reels/Feed Facebook.
    3. Biểu đồ Đường Xu Hướng % Hoàn thành mục tiêu với vạch chuẩn 70%.
  - Bảng chi tiết từng ngày kèm huy hiệu đánh giá kỷ luật (*Xuất sắc / Bình thường / Xao nhãng*).
  - **Tính Năng Sao Lưu Toàn Diện:**
    - `📥 Xuất Dữ Liệu (JSON)`: Tải xuống file `mindful-tracker-backup-YYYY-MM-DD.json` lưu giữ đầy đủ Persona, Pet State và lịch sử.
    - `📤 Khôi Phục (JSON)`: Đọc file JSON, kiểm tra cấu trúc an toàn, xác nhận trước khi khôi phục vào Storage và reload biểu đồ.
- [manifest.json](file:///f:/A-PROJECTS/social-media-tracker/manifest.json) & [service-worker.js](file:///f:/A-PROJECTS/social-media-tracker/src/background/service-worker.js):
  - Khai báo tài nguyên web và handler `OPEN_DASHBOARD`.

---

## 2. Kết Quả Kiểm Thử (Verification Results)

### Kiểm thử cú pháp tự động (Node.js syntax check)
```powershell
node --check src/content/modules/pet-engine.js src/content/modules/friction.js src/content/content-core.js src/dashboard/dashboard.js src/background/service-worker.js popup.js
# Exited with code 0 - All files passed with zero errors.
```

---

## 3. Hướng Dẫn Kiểm Thử Thủ Công (Manual Testing Steps)

1. **Kiểm thử Pet Poke & Cooldown:**
   - Mở tab YouTube hoặc Facebook, tìm Pet widget trên thanh HUD.
   - Nhấp chuột vào Pet: quan sát bóng thoại xuất hiện lời nhắc chăm sóc bản thân, kiểm tra xem bóng thoại có tự biến mất sau đúng 4 giây hay không.
   - Kiểm tra thanh năng lượng: lần poke đầu tiên trong 30 phút sẽ cộng `+3⚡`, nhấp các lần tiếp theo sẽ chỉ hiển thị lời nhắc mà không cộng dồn năng lượng.
2. **Kiểm thử Tủ đồ phụ kiện:**
   - Mở Popup tiện ích $\rightarrow$ Tab Cài đặt $\rightarrow$ Cuộn đến mục **👑 Tủ Đồ Phụ Kiện**.
   - Khi Streak $\ge$ 3 ngày (hoặc kiểm tra khi đạt mốc), bấm **Đeo Ngay** Kính Râm $\rightarrow$ Xem ngay Avatar trên Popup và HUD hiển thị kính râm đen bóng.
   - Bấm **Tháo** $\rightarrow$ Phụ kiện biến mất mượt mà.
3. **Kiểm thử Chế độ Đen Trắng (Grayscale):**
   - Bật một phiên Pomodoro Focus trên Popup hoặc lướt quá Mốc cảnh báo 2 $\rightarrow$ Trang YouTube/Facebook sẽ chuyển sang đen trắng hoàn toàn trong 0.5s.
   - Khi kết thúc phiên hoặc tắt Focus, màu sắc của trang sẽ tự động khôi phục bình thường.
4. **Kiểm thử Box Breathing trên Màn hình Ngắt nhịp:**
   - Lướt vượt Mốc 3 (Trần đỏ) $\rightarrow$ Màn hình ngắt nhịp kích hoạt.
   - Quan sát vòng tròn nhịp thở: Hít vào (4s - Cyan) $\rightarrow$ Giữ hơi (4s - Tím) $\rightarrow$ Thở ra (4s - Xanh lá).
   - Nút "Tiếp tục" bị khóa cho đến khi đủ 12 giây mới sáng rực.
   - Thử bấm nút "🛑 Đóng Tab Ngay" để kiểm tra tính năng thoát nhanh.
5. **Kiểm thử Dashboard & Sao lưu JSON:**
   - Mở Popup $\rightarrow$ Bấm nút `📊 Dashboard` ở thanh chân trang (Footer).
   - Trang báo cáo mở ra trong tab mới hiển thị các biểu đồ xu hướng.
   - Bấm `📥 Xuất Dữ Liệu (JSON)` $\rightarrow$ File sao lưu `.json` được tải về máy tính.
   - Thử bấm `📤 Khôi Phục (JSON)` và chọn file vừa tải để kiểm tra quá trình phục hồi dữ liệu.
