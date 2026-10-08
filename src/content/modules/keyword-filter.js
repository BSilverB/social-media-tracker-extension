/**
 * Mindful Social Media Tracker - Keyword Filter Module
 * Phân loại nội dung theo danh mục & so khớp từ khóa mục tiêu của người dùng
 */

export const CATEGORY_RULES = {
  "Phát triển bản thân": [
    /kỷ luật/i, /thói quen/i, /tư duy/i, /động lực/i, /phát triển bản thân/i,
    /self[- ]help/i, /đọc sách/i, /cuốn sách/i, /bài học cuộc sống/i,
    /quản lý thời gian/i, /năng suất/i, /mindset/i, /productivity/i,
    /habit/i, /discipline/i, /motivation/i, /thành công/i, /triết lý/i
  ],
  "Giáo dục & Công nghệ": [
    /học/i, /hướng dẫn/i, /tutorial/i, /bài giảng/i, /lập trình/i, /code/i,
    /coding/i, /khoa học/i, /lịch sử/i, /tiếng anh/i, /english/i, /kiến thức/i,
    /kỹ năng/i, /giáo dục/i, /education/i, /course/i, /khoá học/i, /toán/i,
    /vật lý/i, /trí tuệ nhân tạo/i, /ai\b/i, /công nghệ/i, /review công nghệ/i,
    /software/i, /developer/i, /frontend/i, /backend/i
  ],
  "Tài chính & Đầu tư": [
    /tiền/i, /tài chính/i, /đầu tư/i, /chứng khoán/i, /cổ phiếu/i, /crypto/i,
    /bitcoin/i, /bất động sản/i, /tiết kiệm/i, /kinh doanh/i, /làm giàu/i,
    /ngân hàng/i, /thu nhập/i, /finance/i, /investment/i, /stock/i,
    /business/i, /wealth/i, /lãi suất/i, /khởi nghiệp/i
  ],
  "Giải trí & Đời sống": [
    /hài/i, /troll/i, /game/i, /gaming/i, /streamer/i, /funny/i, /vlog/i,
    /review phim/i, /phim/i, /ca nhạc/i, /mv\b/i, /nhạc/i, /song/i,
    /showbiz/i, /drama/i, /anime/i, /manga/i, /bóng đá/i, /thể thao/i,
    /clip vui/i, /meme/i, /giải trí/i, /dance/i, /tiktok/i, /trend/i,
    /ẩm thực/i, /nấu ăn/i, /du lịch/i
  ]
};

// Phân loại danh mục văn bản qua RegEx
export function categorizeText(text) {
  if (!text || typeof text !== "string") return "Khác";
  for (const [catName, regexList] of Object.entries(CATEGORY_RULES)) {
    for (const regex of regexList) {
      if (regex.test(text)) return catName;
    }
  }
  return "Khác";
}

// So khớp danh sách từ khóa mục tiêu người dùng cấu hình
export function matchKeywords(text, targetKeywords = []) {
  if (!text || !Array.isArray(targetKeywords) || targetKeywords.length === 0) {
    return { isTargetContent: false, matchedKeywords: [] };
  }

  const normalizedText = text.toLowerCase();
  const matched = [];

  for (const rawKw of targetKeywords) {
    const kw = rawKw.trim().toLowerCase();
    if (kw && normalizedText.includes(kw)) {
      matched.push(rawKw.trim());
    }
  }

  return {
    isTargetContent: matched.length > 0,
    matchedKeywords: matched
  };
}

// Phân loại video theo cấu trúc 3 tầng từ khóa chuẩn: "goal" | "leisure" | "distraction" | "unclassified"
export function classifyByKeywords(title = "", keywordsConfig = {}) {
  if (!title || typeof title !== "string") return "unclassified";
  const lower = title.toLowerCase();

  const targetList = Array.isArray(keywordsConfig.target) ? keywordsConfig.target : [];
  for (const kw of targetList) {
    if (kw && lower.includes(kw.trim().toLowerCase())) return "goal";
  }

  const distractionList = Array.isArray(keywordsConfig.distraction) ? keywordsConfig.distraction : [];
  for (const kw of distractionList) {
    if (kw && lower.includes(kw.trim().toLowerCase())) return "distraction";
  }

  const leisureList = Array.isArray(keywordsConfig.leisure) ? keywordsConfig.leisure : [];
  for (const kw of leisureList) {
    if (kw && lower.includes(kw.trim().toLowerCase())) return "leisure";
  }

  // Fallback qua Category Rules nếu chưa có trong danh sách từ khóa tĩnh
  const cat = categorizeText(title);
  if (cat === "Giáo dục & Công nghệ" || cat === "Phát triển bản thân" || cat === "Tài chính & Đầu tư") {
    return "goal";
  }
  if (cat === "Giải trí & Đời sống") {
    return "leisure";
  }

  return "unclassified";
}

// Đánh giá toàn diện nội dung video (Danh mục + Từ khóa mục tiêu)
export function evaluateVideoContent(title, targetKeywords = []) {
  const category = categorizeText(title);
  const { isTargetContent, matchedKeywords } = matchKeywords(title, targetKeywords);

  // Nội dung hữu ích nếu thuộc danh mục học tập/phát triển hoặc khớp từ khóa mục tiêu
  const isEducationOrGrowth =
    category === "Giáo dục & Công nghệ" ||
    category === "Phát triển bản thân" ||
    category === "Tài chính & Đầu tư";

  return {
    category,
    isTargetContent,
    matchedKeywords,
    isEducationalContent: isEducationOrGrowth || isTargetContent
  };
}
