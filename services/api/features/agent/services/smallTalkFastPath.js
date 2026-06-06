const { normalizeAgentQuery } = require('../lib/textNormalize');

const SUBSTANTIVE_RE =
  /\b(giai thich|tai sao|la gi|bai hoc|lo trinh|khoa hoc|he mat troi|trai dat|hoa thach|quiz|kiem tra|mo bai|tim kiem|khac pha|explore|lesson|module|concept|nasa|mat troi|nganh ha|thien van)\b/i;

const GREETING_RE =
  /^(chao|xin chao|hello|hi|hey|yo|good morning|good evening)([\s,!?.]|$)/;
const THANKS_RE = /^(cam on|thank you|thanks|thank|cam on ban)([\s,!?.]|$)/;
const BYE_RE = /^(tam biet|bye|goodbye|see you|hen gap lai)([\s,!?.]|$)/;
const ACK_RE = /^(ok|oke|okay|duoc|hieu roi|ro roi|vang)([\s,!?.]|$)$/;

function hasSubstantiveIntent(normalized, raw) {
  if (!normalized) return false;
  if (raw.length > 100) return true;
  if (SUBSTANTIVE_RE.test(normalized)) return true;
  if (normalized.includes('?') && normalized.split(/\s+/).length > 4) return true;
  const afterGreeting = normalized.replace(GREETING_RE, '').trim();
  if (afterGreeting.length >= 18 && SUBSTANTIVE_RE.test(afterGreeting)) return true;
  if (afterGreeting.length >= 24) return true;
  return false;
}

const REPLIES = {
  greeting: [
    'Chào bạn! Mình là CosmoLearn AI — hỏi về bài đang học, lộ trình, Khám phá 3D, hoặc thiên văn nhé.',
    'Xin chào! Bạn muốn ôn bài, tìm khóa học, hay khám phá vũ trụ trong app?',
  ],
  thanks: [
    'Không có gì! Cần thêm gì cứ hỏi mình nhé.',
    'Rất vui được giúp bạn học thiên văn. Hỏi tiếp bất cứ lúc nào!',
  ],
  bye: [
    'Tạm biệt! Chúc bạn học vui — quay lại khi cần Cosmo nhé.',
    'Hẹn gặp lại! Tiếp tục hành trình khám phá vũ trụ nhé.',
  ],
  ack: ['Ok! Hỏi thêm nếu bạn cần nhé.', 'Hiểu rồi — mình sẵn sàng khi bạn cần.'],
};

function pickReply(kind) {
  const list = REPLIES[kind] || REPLIES.greeting;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * @returns {{ source: 'small_talk', kind: string, content: string } | null}
 */
function resolveSmallTalkFastPath(userMessage) {
  const raw = String(userMessage || '').trim();
  if (!raw || raw.length > 120) return null;

  const normalized = normalizeAgentQuery(raw);
  if (!normalized || hasSubstantiveIntent(normalized, raw)) return null;

  if (THANKS_RE.test(normalized)) {
    return { source: 'small_talk', kind: 'thanks', content: pickReply('thanks') };
  }
  if (BYE_RE.test(normalized)) {
    return { source: 'small_talk', kind: 'bye', content: pickReply('bye') };
  }
  if (ACK_RE.test(normalized)) {
    return { source: 'small_talk', kind: 'ack', content: pickReply('ack') };
  }
  if (GREETING_RE.test(normalized) || normalized === 'chao ban' || normalized === 'chao') {
    return { source: 'small_talk', kind: 'greeting', content: pickReply('greeting') };
  }

  return null;
}

module.exports = { resolveSmallTalkFastPath, hasSubstantiveIntent };
