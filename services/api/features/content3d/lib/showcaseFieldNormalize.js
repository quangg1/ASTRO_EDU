/**
 * Chuẩn hóa field dùng chung cho dữ liệu showcase.
 *
 * Nội dung do biên tập viên nhập rồi phát cho client 3D, nên mọi URL đều phải
 * qua đây: chỉ chấp nhận http(s) hoặc đường dẫn nội bộ trong danh sách cho phép.
 */

const INTERNAL_MEDIA_PREFIXES = ['/files/', '/textures/', '/models/', '/images/', '/course-media/'];
const MAX_URL_LENGTH = 500;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function isSafeHttpUrl(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeUrlField(raw) {
  const text = String(raw || '').trim();
  if (!text || !isSafeHttpUrl(text)) return '';
  return text;
}

/** Ảnh/model có thể là URL ngoài hoặc đường dẫn nội bộ; `..` luôn bị loại. */
function normalizeMediaUrlField(raw) {
  const text = String(raw || '').trim();
  if (!text || text.includes('..')) return '';
  if (text.length < MAX_URL_LENGTH && INTERNAL_MEDIA_PREFIXES.some((p) => text.startsWith(p))) {
    return text;
  }
  return normalizeUrlField(text);
}

function normalizeColorHex(raw, fallback = '') {
  const text = String(raw || '').trim();
  return HEX_COLOR.test(text) ? text.toLowerCase() : fallback;
}

function normalizeEntityId(raw) {
  const text = String(raw || '').trim();
  return !text || text.length > 80 ? '' : text;
}

const trimTo = (raw, max) => String(raw || '').trim().slice(0, max);

const finitePositive = (raw, fallback = 0) => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const finiteOr = (raw, fallback = 0) => {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

module.exports = {
  isSafeHttpUrl,
  normalizeUrlField,
  normalizeMediaUrlField,
  normalizeColorHex,
  normalizeEntityId,
  trimTo,
  finitePositive,
  finiteOr,
};
