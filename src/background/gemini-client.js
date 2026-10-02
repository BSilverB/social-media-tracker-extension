/**
 * Mindful Social Media Tracker - Gemini API Client
 * Chỉ chạy trong Background Service Worker (Bảo vệ API Key chống XSS)
 * Tận dụng Gemini 1.5 Flash Free Tier với Prompt nén & JSON Mode
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

/**
 * Trợ giúp trích xuất chuỗi JSON sạch từ phản hồi của Gemini
 */
function parseJsonFromText(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();

  // Bóc tách nếu model bọc trong ```json ... ``` hoặc ``` ... ```
  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    const lastBackticks = text.lastIndexOf("```");
    if (firstNewline !== -1 && lastBackticks > firstNewline) {
      text = text.substring(firstNewline + 1, lastBackticks).trim();
    }
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // Thử regex tìm khối JSON object hoặc array
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("[GeminiClient] Lỗi parse JSON trích xuất:", e);
      }
    }
    console.error("[GeminiClient] Không thể parse JSON từ phản hồi:", rawText);
    return null;
  }
}

/**
 * Gọi Gemini REST API với timeout và kiểm soát lỗi
 */
async function callGeminiApi(promptOrParts, apiKey, systemInstruction = null) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("Chưa cấu hình Google Gemini API Key.");
  }

  const endpoint = `${GEMINI_API_BASE}?key=${apiKey.trim()}`;

  const parts = typeof promptOrParts === "string"
    ? [{ text: promptOrParts }]
    : promptOrParts;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let errorMsg = `Gemini API lỗi (${res.status})`;
      if (res.status === 400) errorMsg = "API Key không hợp lệ hoặc Request sai định dạng.";
      else if (res.status === 404) errorMsg = "Model không tồn tại hoặc endpoint không hỗ trợ.";
      else if (res.status === 429) errorMsg = "Vượt hạn mức Gemini Free Tier (Rate limit). Vui lòng thử lại sau.";
      throw new Error(`${errorMsg}: ${errorText.substring(0, 150)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error("Gemini không trả về nội dung.");
    }

    return textOutput;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Yêu cầu tới Gemini API bị quá thời gian (timeout 20s).");
    }
    throw err;
  }
}

/**
 * 1. Kiểm tra tính hợp lệ của API Key
 */
export async function testGeminiApiKey(apiKey) {
  try {
    const raw = await callGeminiApi(
      "Ping! Respond with JSON: {\"status\": \"ok\"}",
      apiKey
    );
    const parsed = parseJsonFromText(raw);
    return { ok: true, status: parsed?.status || "ok" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 2. Phân loại Lớp 2 cho Video chưa khớp bộ lọc tĩnh
 * Nhận diện category và relevanceScore (0-100)
 */
export async function classifyVideoTitle(title, apiKey) {
  const prompt = `Phân loại tiêu đề video sau vào ĐÚNG 1 trong các danh mục:
- "Giáo dục & Công nghệ"
- "Phát triển bản thân"
- "Tài chính & Đầu tư"
- "Giải trí & Đời sống"
- "Khác"
Đồng thời chấm relevanceScore (0-100, mức độ hữu ích cho sự phát triển bản thân, học tập, năng suất).
Trả về JSON đúng cấu trúc: {"category": "...", "relevanceScore": 0-100}

Tiêu đề: "${title.replace(/"/g, '\\"')}"`;

  try {
    const raw = await callGeminiApi(prompt, apiKey);
    const parsed = parseJsonFromText(raw);
    if (parsed && parsed.category) {
      return {
        category: parsed.category,
        relevanceScore: Number(parsed.relevanceScore) || 50
      };
    }
    return { category: "Khác", relevanceScore: 30 };
  } catch (err) {
    console.warn("[GeminiClient] Lỗi phân loại video:", err.message);
    return { category: "Khác", relevanceScore: 30, error: err.message };
  }
}

/**
 * 3. Tự tiến hóa bộ lọc tĩnh: Phân tích danh sách tiêu đề video unmatched
 * Rút trích 2-3 từ khóa/pattern đại diện xuất hiện nhiều nhất
 */
export async function extractSuggestedKeywords(titles, apiKey) {
  if (!Array.isArray(titles) || titles.length === 0) {
    return [];
  }

  // Tối ưu token: lấy tối đa 20 tiêu đề gần nhất
  const sampleTitles = titles.slice(0, 20);

  const prompt = `Phân tích danh sách các tiêu đề video sau đây (những video người dùng đã xem mà bộ lọc hiện tại chưa bắt được).
Tìm 2 đến 3 từ khóa đại diện (tiếng Việt hoặc tiếng Anh) có tính khái quát cao về nội dung học tập, công việc, kỹ năng hoặc giải trí hữu ích.
Trả về định dạng JSON:
{
  "keywords": [
    {
      "word": "từ khóa ngắn gọn (1-3 từ)",
      "confidence": 85,
      "reason": "Lý do ngắn gọn bằng tiếng Việt dưới 12 từ"
    }
  ]
}

Danh sách tiêu đề:
${JSON.stringify(sampleTitles, null, 2)}`;

  try {
    const raw = await callGeminiApi(prompt, apiKey);
    const parsed = parseJsonFromText(raw);
    if (parsed && Array.isArray(parsed.keywords)) {
      return parsed.keywords.map(k => ({
        word: String(k.word || "").trim().toLowerCase(),
        confidence: Math.min(100, Math.max(0, Number(k.confidence) || 70)),
        reason: String(k.reason || "Từ khóa tiềm năng")
      })).filter(k => k.word.length >= 2);
    }
    return [];
  } catch (err) {
    console.warn("[GeminiClient] Lỗi trích xuất từ khóa đề xuất:", err.message);
    return [];
  }
}

/**
 * 4. AI Reflection Coach: Phân tích thấu cảm và gợi nhắc đường dài
 */
export async function generateReflectionCoach({ digest, userLessons, masterGoal }, apiKey) {
  const prompt = `Bạn là Trợ lý AI Phản tư (Mindful Coach) thấu cảm, tinh tế, đồng hành cai nghiện mạng xã hội.
Hãy phân tích dữ liệu tổng hợp trong ngày và câu trả lời phản tư của người dùng:

Bản tóm tắt ngày (Digest):
- Tổng thời gian lướt: ${digest.activeMinutes || 0} phút
- Tỷ lệ nội dung hữu ích: ${digest.usefulPct || 0}%
- Tỷ lệ xao nhãng bốc đồng: ${digest.distractPct || 0}%
- Tổng số video đã xem: ${digest.totalVideos || 0}
- Video bổ ích đã xem trọn vẹn (>=80%): ${JSON.stringify(digest.usefulVideos || [])}

Mục tiêu lớn (Master Goal): "${masterGoal || "Trở thành phiên bản tốt hơn"}"

Người dùng tự phản tư hôm nay:
- Điều đã làm tốt: "${userLessons?.lesson1 || "Chưa ghi"}"
- Điều muốn cải thiện: "${userLessons?.lesson2 || "Chưa ghi"}"

Yêu cầu phản hồi:
- Lời nhận xét thấu cảm, động viên chân thành dựa trên số liệu thực tế.
- Nhắc lại 1-2 video bổ ích mà người dùng đã xem trọn vẹn trong ngày để họ ghi nhớ kiến thức.
- Liên kết với Master Goal để củng cố động lực nội tại.
- Ngắn gọn, súc tích (dưới 150 từ), tuyệt đối thân thiện.

Trả về JSON đúng cấu trúc:
{
  "coachFeedback": "Lời nhận xét và phân tích...",
  "remindedVideos": ["Tiêu đề video 1..."],
  "tomorrowMission": "1 hành động nhỏ cụ thể cho ngày mai..."
}`;

  try {
    const raw = await callGeminiApi(prompt, apiKey);
    const parsed = parseJsonFromText(raw);
    if (parsed && parsed.coachFeedback) {
      return {
        ok: true,
        coachFeedback: parsed.coachFeedback,
        remindedVideos: Array.isArray(parsed.remindedVideos) ? parsed.remindedVideos : [],
        tomorrowMission: parsed.tomorrowMission || "Duy trì chánh niệm khi mở mạng xã hội."
      };
    }
    return {
      ok: false,
      coachFeedback: "Hôm nay bạn đã rất nỗ lực theo dõi thói quen của mình. Hãy tiếp tục giữ vững chánh niệm vào ngày mai!",
      remindedVideos: [],
      tomorrowMission: "Nghỉ ngơi sớm trước 23h00."
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      coachFeedback: `Không thể kết nối Gemini API (${err.message}). Nhưng số liệu ngày hôm nay cho thấy bạn đang chủ động kiểm soát cuộc sống rất tốt!`,
      remindedVideos: [],
      tomorrowMission: "Tiếp tục duy trì thói quen ghi nhật ký phản tư."
    };
  }
}

/**
 * Chuyển đổi chuỗi SVG thành Base64 Data URI
 */
function svgToDataUri(svgStr) {
  if (!svgStr || typeof svgStr !== "string") return "";
  let clean = svgStr.trim();
  if (clean.startsWith("```")) {
    const firstNewline = clean.indexOf("\n");
    const lastBackticks = clean.lastIndexOf("```");
    if (firstNewline !== -1 && lastBackticks > firstNewline) {
      clean = clean.substring(firstNewline + 1, lastBackticks).trim();
    }
  }
  if (!clean.includes("xmlns=")) {
    clean = clean.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  try {
    const b64 = btoa(unescape(encodeURIComponent(clean)));
    return `data:image/svg+xml;base64,${b64}`;
  } catch (e) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(clean)}`;
  }
}

/**
 * 5. Tạo bộ 3 Avatar Chibi biểu cảm (Happy, Neutral, Sad) bằng Gemini Vision
 */
export async function generateChibiPetSprites(imageBase64, apiKey) {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new Error("Không có ảnh hợp lệ để tạo Avatar.");
  }

  // Tách MimeType và Base64 raw
  let mimeType = "image/jpeg";
  let rawData = imageBase64;
  if (imageBase64.includes(";base64,")) {
    const parts = imageBase64.split(";base64,");
    mimeType = parts[0].replace("data:", "");
    rawData = parts[1];
  }

  const promptText = `Analyze the given avatar/photo (identify if human/character/pet/object, main colors, hairstyle, facial vibe, accessories).
Create 3 cute, minimalist vector Chibi avatar illustrations in standard SVG format representing 3 moods:
1. "happy": joyful smiling face, sparkling eyes, energetic vibe.
2. "neutral": calm, focused, serene look.
3. "sad": droopy eyes, subtle sweat drop or small tear, tired look.

Output Requirements:
- Each SVG must be a valid, standalone <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">...</svg>.
- Clean shapes, vibrant pastel colors matching the user's photo.
- Return ONLY a valid JSON object strictly matching this schema:
{
  "happy": "<svg viewBox='0 0 100 100' ...>...</svg>",
  "neutral": "<svg viewBox='0 0 100 100' ...>...</svg>",
  "sad": "<svg viewBox='0 0 100 100' ...>...</svg>"
}`;

  const multimodalParts = [
    { text: promptText },
    {
      inlineData: {
        mimeType,
        data: rawData
      }
    }
  ];

  try {
    const raw = await callGeminiApi(multimodalParts, apiKey);
    const parsed = parseJsonFromText(raw);

    if (parsed && (parsed.happy || parsed.neutral || parsed.sad)) {
      const sprites = {
        happy: svgToDataUri(parsed.happy || parsed.neutral),
        neutral: svgToDataUri(parsed.neutral || parsed.happy),
        sad: svgToDataUri(parsed.sad || parsed.neutral)
      };
      return { ok: true, sprites };
    }

    throw new Error("Không trích xuất được định dạng SVG từ AI.");
  } catch (err) {
    console.warn("[GeminiClient] Lỗi sinh Avatar AI:", err.message);
    // Tạo bộ fallback chibi SVG dễ thương nếu API có sự cố
    const fallbackHappy = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#8B5CF6"/><circle cx="50" cy="50" r="38" fill="#F8FAFC"/><path d="M 32 44 Q 38 36 44 44" stroke="#1E293B" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M 56 44 Q 62 36 68 44" stroke="#1E293B" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M 40 58 Q 50 72 60 58 Z" fill="#F43F5E"/><circle cx="28" cy="52" r="5" fill="#FDA4AF" opacity="0.7"/><circle cx="72" cy="52" r="5" fill="#FDA4AF" opacity="0.7"/><polygon points="80,20 83,28 91,30 85,36 86,44 80,40 74,44 75,36 69,30 77,28" fill="#F59E0B"/></svg>`;
    const fallbackNeutral = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#06B6D4"/><circle cx="50" cy="50" r="38" fill="#F8FAFC"/><circle cx="38" cy="45" r="4" fill="#1E293B"/><circle cx="62" cy="45" r="4" fill="#1E293B"/><line x1="42" y1="60" x2="58" y2="60" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/><circle cx="28" cy="52" r="4" fill="#BAE6FD" opacity="0.7"/><circle cx="72" cy="52" r="4" fill="#BAE6FD" opacity="0.7"/></svg>`;
    const fallbackSad = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#64748B"/><circle cx="50" cy="50" r="38" fill="#F1F5F9"/><line x1="32" y1="46" x2="44" y2="44" stroke="#475569" stroke-width="4" stroke-linecap="round"/><line x1="56" y1="44" x2="68" y2="46" stroke="#475569" stroke-width="4" stroke-linecap="round"/><path d="M 40 64 Q 50 54 60 64" stroke="#475569" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M 68 50 C 68 46, 74 46, 74 50 C 74 54, 68 57, 68 50 Z" fill="#38BDF8"/></svg>`;

    return {
      ok: true,
      fallback: true,
      sprites: {
        happy: svgToDataUri(fallbackHappy),
        neutral: svgToDataUri(fallbackNeutral),
        sad: svgToDataUri(fallbackSad)
      }
    };
  }
}

