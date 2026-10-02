# TASKS

## 1. Bảo mật API Key & Tích hợp Gemini Client trong Service Worker:
- Trong `popup.html`, thêm ô nhập "Google Gemini API Key", lưu vào `chrome.storage.local`.
- Xây dựng module gọi API trong `src/background/service-worker.js` (hoặc module background). `content.js` tuyệt đối KHÔNG gọi fetch trực tiếp mà gửi message sang background để tránh rủi ro XSS.
- Tuyệt đối không dùng `innerHTML` không an toàn khi hiển thị dữ liệu phản hồi từ AI.

## 2. Bộ Lọc Phân Loại 2 Lớp (Two-tier Classifier) & Cache:
- Lớp 1 (Tĩnh): Giữ nguyên Regex/Keyword Matcher. Nếu video khớp từ khóa rõ ràng -> Gán nhãn ngay (Miễn phí token).
- Lớp 2 (Gemini API): Với video dài hoặc video xem >= 80% mà Lớp 1 không nhận diện được (unmatched), gom Video ID và tiêu đề. Kiểm tra Cache trong storage; nếu chưa có mới gửi sang background gọi Gemini API để phân loại ngắn gọn (trả về JSON: category, relevanceScore).

## 3. Cơ Chế "Tự Tiến Hóa" Cho Bộ Lọc Tĩnh (Self-evolving Static Filter):
- Gom các video "lọt lưới" (unmatched) trong ngày vào một hàng đợi tạm `unmatched_queue`.
- Lúc 22h00, gửi danh sách tiêu đề này lên Gemini để trích xuất quy luật chung: AI tìm 2-3 từ khóa/pattern đại diện xuất hiện nhiều nhất.
- Trên giao diện `reflection.html`, hiển thị gợi ý: "AI đề xuất thêm các từ khóa [X, Y, Z] vào Bộ lọc Tĩnh". Khi tôi bấm [Xác nhận], tự động cập nhật mảng từ khóa tĩnh trong `chrome.storage.local`.

## 4. AI Reflection Coach & Nén Ngữ Cảnh Đường Dài (Context Digest):
- Lúc 22h00, hàm offline tự động tổng hợp lịch sử ngày thành bản tóm tắt ngắn (Digest ~150 tokens): Tổng video, % xao nhãng, danh sách video học tập đã xem trọn vẹn >= 80%.
- Khi tôi viết câu trả lời trong `reflection.html`, gửi Digest + câu trả lời lên Gemini.
- AI đóng vai trò người đồng hành: Đưa ra nhận xét thấu cảm, nhắc lại các video bổ ích mà tôi đã xem nhưng lỡ quên trong ngày, gợi nhắc về "Master Goal".
- Cập nhật bản ghi "Hồ sơ người dùng đường dài" (Long-term Persona JSON) lưu trữ các chỉ số tổng hợp tuần/tháng.

## 5. Hệ Thống Gamification (Linh vật Pet ảo & Focus Streak):
- Tạo module `src/content/modules/pet-engine.js` và hiển thị Pet SVG/Canvas hoạt họa nhẹ nhàng trên HUD và Popup.
- Pet có thanh Năng Lượng / Cảm Xúc: Giảm khi F5 dồn dập, lướt chạm Mốc 3; Tăng khi hoàn thành Pomodoro hoặc tỷ lệ nội dung hữu ích >= 70%.
- Cơ chế Streak: Tự động cộng 1 ngày vào chuỗi nếu cuối ngày không vi phạm trần Mốc 3.

KẾT QUẢ

3. Cấu Trúc JSON Lưu Trữ Mới Trong chrome.storage.local:
json
{
  "gemini_api_key": "AIzaSy...",
  
  "ai_classification_cache": {
    "videoId_123": {
      "category": "Giáo dục & Công nghệ",
      "relevanceScore": 85,
      "timestamp": 1727509800000
    }
  },
  "unmatched_queue": [
    {
      "id": "videoId_456",
      "title": "Học cách thiết kế hệ thống phân tán",
      "watchedSeconds": 420,
      "timestamp": 1727509900000
    }
  ],
  "suggested_keywords": [
    {
      "word": "hệ thống phân tán",
      "confidence": 90,
      "reason": "Xuất hiện trong các video học tập chuyên sâu bạn đã xem"
    }
  ],
  "pet_state": {
    "energy": 85,
    "mood": "happy",
    "streakDays": 3,
    "lastStreakDate": "2026-09-28",
    "level": 1
  },
  "user_persona": {
    "totalTrackedDays": 5,
    "streakRecord": 7,
    "totalUsefulVideos": 18,
    "avgUsefulPct": 78,
    "history": [
      {
        "date": "2026-09-28",
        "usefulPct": 82,
        "activeMinutes": 45,
        "tomorrowMission": "Tập trung hoàn thành 2 phiên Pomodoro trước khi xem giải trí"
      }
    ]
  }
}
4. Bảng Prompt Chuẩn Hóa Gửi Gemini (Tiết Kiệm Token Tối Đa):
Phân loại video Lớp 2 (Classify Video):

text
Phân loại tiêu đề video sau vào ĐÚNG 1 trong các danh mục:
- "Giáo dục & Công nghệ"
- "Phát triển bản thân"
- "Tài chính & Đầu tư"
- "Giải trí & Đời sống"
- "Khác"
Đồng thời chấm relevanceScore (0-100, mức độ hữu ích cho sự phát triển bản thân, học tập, năng suất).
Trả về JSON: {"category": "...", "relevanceScore": 0-100}
Tiêu đề: "<Video Title>"
Tự tiến hóa từ khóa (Extract Keywords):

text
Phân tích danh sách các tiêu đề video sau đây (video lọt lưới bộ lọc hiện tại).
Tìm 2 đến 3 từ khóa đại diện (tiếng Việt/Anh) có tính khái quát cao về nội dung học tập/kỹ năng/năng suất.
Trả về JSON: {"keywords": [{"word": "...", "confidence": 85, "reason": "..."}]}
AI Reflection Coach 22h00:

text
Bạn là Trợ lý AI Phản tư (Mindful Coach) thấu cảm, tinh tế, đồng hành cai nghiện mạng xã hội.
Context Digest: { activeMinutes, usefulPct, distractPct, totalVideos, usefulVideos: [...] }
Master Goal: "<Master Goal>"
User Lessons: { lesson1: "...", lesson2: "..." }
Yêu cầu: Lời nhận xét thấu cảm, nhắc lại 1-2 video bổ ích đã xem trọn vẹn, gợi ý 1 sứ mệnh vi mô (dưới 150 từ).
Trả về JSON: {"coachFeedback": "...", "remindedVideos": [...], "tomorrowMission": "..."}
5. Hướng Dẫn Kiểm Thử (Verification Steps)
Tải lại Extension vào Chrome:

Mở chrome://extensions/ -> Bấm nút Reload (icon vòng tròn xoay) tại Extension Mindful Social Tracker.
Kiểm tra nhập & Test Gemini API Key:

Mở Popup Extension -> Chọn tab ⚙️ Cài đặt.
Nhập Gemini API Key của bạn vào ô 🤖 Trợ lý AI Google Gemini.
Bấm icon 👁️ để kiểm tra tính năng ẩn/hiện mật khẩu.
Bấm ⚡ Test Key -> Xác nhận thông báo màu xanh: "Kết nối thành công! API Key hoạt động hoàn hảo."
Bấm 💾 Lưu Cài đặt & Cấu hình.
Kiểm tra Linh vật Pet & Focus Streak:

Xem banner Linh vật ở ngay đầu Popup: Biểu tượng Pet SVG cử động, % Năng lượng và Chuỗi Focus Streak 🔥.
Mở một tab YouTube (https://www.youtube.com/): Quan sát Linh vật mini xuất hiện trên thanh Floating HUD nổi bên góc dưới màn hình.
Bấm F5 liên tục 3 lần: Quan sát thông báo Toast nhắc nhở và Pet bị trừ năng lượng, biểu cảm chuyển sang mệt mỏi (sad/sleepy).
Kiểm tra Phân loại 2 Lớp (Two-tier Classifier) & Token Cache:

Mở xem một video YouTube dài học tập có tiêu đề chưa nằm trong Regex cứng (hoặc mở Inspect tab YouTube để xem console log).
Video xem ≥ 15s hoặc xem ≥ 80% sẽ tự động được gửi qua Service Worker để phân loại Lớp 2 với Gemini và lưu vào ai_classification_cache.
Xem Shorts lướt nhanh (< 15s) sẽ tuyệt đối không bị gọi API (đúng theo Rule 1).
Kiểm tra Tự Tiến Hóa Bộ Lọc & AI Reflection Coach:

Bấm nút 📝 Phản Tư ở chân trang Popup để mở tab reflection.html.
Xem khối 🧬 AI Đề xuất Từ khóa cho Bộ Lọc Tĩnh: Bấm nút ⚡ Quét Video Chưa Khớp để AI phân tích hàng đợi và đưa ra các từ khóa đề xuất. Bấm ✓ Thêm vào Bộ lọc -> Kiểm tra từ khóa tự động được nạp vào cấu hình.
Nhập nội dung vào Bài học #1 và Bài học #2, chấm sao rồi bấm 💾 Lưu Nhật Ký Phản Tư & Nhận Phản Hồi AI.
Quan sát khối 🤖 Trợ lý AI Phản Tư: Lời nhận xét thấu cảm, danh sách video bổ ích được nhắc lại và Sứ mệnh vi mô ngày mai hiển thị an toàn (không dùng innerHTML).