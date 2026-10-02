# Báo Cáo Triển Khai Chuyên Sâu: Hệ Thống Linh Vật Pet 3 Chế Độ & Gamification

## 1. Tổng Quan Công Việc Đã Hoàn Thành
Đã hoàn thiện nâng cấp toàn diện hệ thống Linh vật Pet (Gamification) trên nền tảng **Gemini 3.6 Flash**, bổ sung đầy đủ **3 Chế độ Linh vật** linh hoạt, xử lý ảnh offline bằng **HTML5 Canvas**, và cơ chế **Pet State Machine** chính xác theo đặc tả.

---

## 2. Chi Tiết Các Chế Độ Pet

### 1. Chế độ `default` (Mầm cây Sprout SVG thuần túy)
- **Happy (≥ 70%):** Mầm cây nở hoa đỏ nhụy vàng rực rỡ, 2 lá xanh tươi xòe rộng, mắt cười híp và nụ cười tươi vui (`mindfulPetBounce`).
- **Neutral (40 - 69%):** Mầm cây 2 lá xanh mướt, nhịp thở êm đềm (`mindfulPetBreathe`).
- **Sad (< 40%):** Mầm cây héo rũ, lá cụp xuống màu xám úa, giọt nước nhỏ giọt và rung rẩy (`mindfulPetShiver`).

### 2. Chế độ `puppet` (Khung Puppet Ghép Mặt Cắt Dán Cục Bộ - 100% Offline)
- **Xử lý ảnh bằng HTML5 Canvas cục bộ:** Tự động cắt tròn (Circular Center Crop) ảnh người dùng tải lên, nén thành Base64 JPEG và lưu vào `petConfig.uploadedImageBase64` mà **không gửi ra ngoài mạng**.
- **Khung cơ thể Chibi Vector:** Ghép gương mặt tròn của người dùng lên cơ thể chibi hoạt họa đáng yêu (áo chibi, hai tay tròn, hai chân xinh).
- **CSS Animations theo cảm xúc:**
  - **Happy:** Nhún nhảy vui nhộn (`mindfulPetBounce`) kèm biểu tượng trái tim đỏ bay bổng (`mindfulHeartFloat`).
  - **Neutral:** Thở nhẹ (`mindfulPetBreathe`).
  - **Sad:** Rung rẩy (`mindfulPetShiver`), màng lọc xám `filter: grayscale(0.55)`, và giọt mồ hôi rơi trên góc đầu (`mindfulSweatDrop`).

### 3. Chế độ `ai_generated` (Tạo Avatar AI Chibi 1 Lần Duy Nhất)
- **Gemini 3.6 Flash Multimodal Analysis:** Phân tích các đặc trưng trong ảnh Base64 (nhân vật, màu sắc chủ đạo, kiểu tóc, phụ kiện) và sinh ra **3 Vector SVG Sprites biểu cảm** (Happy, Neutral, Sad).
- **Lưu trữ & Tráo đổi:** Mã hóa thành Base64 Data URI (`data:image/svg+xml;base64,...`) lưu vào `petConfig.aiSprites`. Các lần hiển thị tiếp theo tráo đổi sprite tương ứng tức thì với 0 token tiêu tốn.

---

## 3. Quy Luật Điều Hòa Trạng Thái (Pet State Machine)

| Sự kiện | Thay đổi Năng lượng | Cảm xúc tương ứng |
|---|---|---|
| F5 / Reload trang dồn dập (≥ 3 lần) | **-5 điểm** | Tự động tính lại theo ngưỡng |
| Chạm trần Mốc 3 hoặc lướt vội bỏ dở | **-15 điểm** | Chuyển `sad` nếu < 40% |
| Hoàn thành 1 phiên Pomodoro Focus | **+10 điểm** | Chuyển `happy` nếu ≥ 70% |
| Xem video học tập/hữu ích (≥ 80%) | **+5 điểm** | Chuyển `happy` nếu ≥ 70% |

- **Quy tắc phân loại Mood:**
  - `happy`: `energy >= 70`
  - `neutral`: `40 <= energy <= 69`
  - `sad`: `energy < 40`

---

## 4. Hướng Dẫn Kiểm Thử Thực Tế (Verification Steps)

### Bước 1: Nạp lại Extension vào Chrome
1. Mở `chrome://extensions/`.
2. Bấm nút **Reload** (icon vòng tròn) tại extension **Mindful Social Tracker**.

### Bước 2: Thử nghiệm Chế độ Mầm cây Mặc định (`default`)
1. Mở Popup -> Chọn tab **⚙️ Cài đặt**.
2. Tại card **🐾 Linh Vật Đồng Hành**, chọn **🌱 Mặc định**.
3. Quan sát Banner ở đầu Popup: Mầm cây Sprout SVG tươi tắn nở hoa nếu năng lượng ≥ 70%.

### Bước 3: Thử nghiệm Chế độ Khung Puppet Ghép Mặt (`puppet`)
1. Tại card **🐾 Linh Vật Đồng Hành**, chọn **🎭 Khung Puppet**.
2. Khung upload ảnh xuất hiện. Bấm chọn hoặc kéo thả 1 ảnh chân dung/thú cưng bất kỳ.
3. Quan sát ngay: Ảnh được Canvas tự động cắt tròn hoàn hảo hiển thị ở khung xem trước hình tròn.
4. Mở tab YouTube (`https://www.youtube.com/`):
   - Quan sát Floating HUD: Xuất hiện Chibi mang khuôn mặt của bạn đang nhún nhảy vui vẻ.
   - Bấm F5 liên tục 3 lần: Quan sát năng lượng tụt 5 điểm, Chibi có biểu cảm rung rẩy và rơi giọt mồ hôi.

### Bước 4: Thử nghiệm Chế độ AI Chibi Avatar (`ai_generated`)
1. Trong tab Cài đặt, chọn **✨ AI Chibi**.
2. Đảm bảo đã nhập Gemini API Key ở ô phía trên.
3. Bấm **⚡ Tạo Avatar AI**:
   - Chờ vài giây để Gemini 3.6 Flash phân tích ảnh và sinh 3 sprite SVG biểu cảm.
   - 3 ô xem trước Happy, Neutral, Sad sẽ hiển thị kết quả vector Chibi tương ứng.
4. Chế độ này tráo đổi mượt mà giữa 3 sprite theo năng lượng mà không tốn thêm bất kỳ lượt gọi API nào.
