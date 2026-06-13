const { normalizeAgentQuery } = require('../lib/textNormalize');

/** FAQ tĩnh — exact match sau chuẩn hóa (P1). */
const FAQ_ENTRIES = [
  {
    keys: [
      'cosmo la gi',
      'cosmo learn la gi',
      'app nay la gi',
      'nay la gi',
      'tro ly nay la gi',
    ],
    answer:
      'CosmoLearn là nền tảng học thiên văn tại Việt Nam: lộ trình có cấu trúc, khóa học, mô phỏng Khám phá 3D và cộng đồng. Mình là trợ lý AI giúp bạn hiểu bài đang học và gợi ý nội dung trong app.',
  },
  {
    keys: ['lo trinh o dau', 'hoc o dau', 'bat dau hoc o dau', 'vao lo trinh'],
    answer:
      'Vào **Lộ trình học** từ menu hoặc `/tutorial` — chọn module (Lịch sử Trái Đất, Hệ Mặt Trời, Ngân hà…) rồi mở bài theo mức Cơ bản / Cơ chế / Chuyên sâu.',
  },
  {
    keys: ['khoa hoc o dau', 'xem khoa hoc', 'catalog khoa hoc'],
    answer:
      'Xem khóa học tại `/courses` hoặc mục **Khóa học** trên menu. Bạn có thể tìm nhanh qua `/search`.',
  },
  {
    keys: ['kham pha 3d', 'explore o dau', 'mo kham pha', '3d o dau'],
    answer:
      'Mở **Khám phá 3D** tại `/explore` — xoay Trái Đất, timeline Ma, hệ Mặt Trời và showcase thiên văn tương tác.',
  },
  {
    keys: ['cong dong o dau', 'dien dan o dau', 'forum o dau'],
    answer:
      'Cộng đồng nằm ở `/community`: tin thiên văn, thảo luận và diễn đàn. Tìm bài viết tại `/community/search`.',
  },
  {
    keys: ['gem la gi', 'ngoc gem', 'diem gem'],
    answer:
      'Gem là điểm thưởng khi học (lộ trình, quiz, mốc). Xem số dư và cửa hàng tại `/gem` và `/gem-shop`.',
  },
  {
    keys: ['quiz la gi', 'kiem tra la gi', 'on tap la gi'],
    answer:
      'Quiz ôn giúp củng cố sau bài học. Sau một số bài, app có thể hỏi nhanh — bạn cũng có thể nhờ mình giải thích trước khi làm lại.',
  },
  {
    keys: ['depth la gi', 'muc do hoc', 'beginner explorer researcher'],
    answer:
      'Lộ trình có 3 mức: **Cơ bản**, **Cơ chế**, **Chuyên sâu**. Mình có thể gợi chuyển mức nếu thấy bạn cần.',
  },
  {
    keys: ['ban co the lam gi', 'ban giup gi duoc', 'tro ly giup gi'],
    answer:
      'Mình giải thích bài đang học, gợi ý bài liên quan, tìm nội dung trong app, hướng dẫn Khám phá 3D và trả lời câu hỏi thiên văn/địa chất trong phạm vi giáo dục.',
  },
  {
    keys: ['dang nhap', 'can dang nhap khong', 'tai khoan'],
    answer:
      'Đăng nhập để lưu tiến độ, dùng trợ lý đầy đủ và tham gia cộng đồng. Khách vẫn thử được một vài lượt chat demo.',
  },
  {
    keys: ['het quota', 'het luot', 'qua gioi han'],
    answer:
      'Trợ lý có giới hạn lượt theo giờ tùy gói học. Hãy thử lại sau hoặc gửi câu hỏi ngắn hơn; câu chào đơn giản không tốn quota LLM.',
  },
  {
    keys: ['rag la gi', 'ban lay thong tin tu dau'],
    answer:
      'Mình ưu tiên nội dung bài học, lộ trình và tài liệu trong CosmoLearn (RAG), không bịa tên bài hay slug — nếu thiếu nguồn mình sẽ nói rõ.',
  },
  {
    keys: ['tieng viet', 'noi tieng viet duoc khong'],
    answer: 'Có — mình hỗ trợ tiếng Việt và có thể trộn thuật ngữ tiếng Anh khi cần (tên hành tinh, khái niệm khoa học).',
  },
  {
    keys: ['mat troi', 'he mat troi co may hanh tinh'],
    answer:
      'Hệ Mặt Trời có 8 hành tinh chính (sau khi Pluto được xếp lại loại hành tinh lùn). Trong app, mở module Hệ Mặt Trời hoặc Khám phá 3D để xem chi tiết tương tác.',
  },
  {
    keys: ['trai dat bao nhieu tuoi', 'tuoi trai dat'],
    answer:
      'Trái Đất khoảng **4,54 tỷ năm** (ước lượng từ định tuổi hóa thạch và đá cổ nhất). Module Lịch sử Trái Đất trong lộ trình đi sâu hơn.',
  },
];

const FAQ_MAP = new Map();
for (const entry of FAQ_ENTRIES) {
  for (const key of entry.keys) {
    FAQ_MAP.set(key, entry.answer);
  }
}

/**
 * @returns {{ source: 'faq', content: string, faqKey: string } | null}
 */
function resolveFaqFastPath(userMessage) {
  const normalized = normalizeAgentQuery(userMessage);
  if (!normalized || normalized.length < 4) return null;

  const direct = FAQ_MAP.get(normalized);
  if (direct) {
    return { source: 'faq', content: direct, faqKey: normalized };
  }

  for (const [key, answer] of FAQ_MAP.entries()) {
    if (normalized === key) continue;
    if (normalized.includes(key) && key.length >= 8 && normalized.length <= key.length + 16) {
      return { source: 'faq', content: answer, faqKey: key };
    }
  }

  return null;
}

module.exports = { resolveFaqFastPath, FAQ_ENTRIES };
