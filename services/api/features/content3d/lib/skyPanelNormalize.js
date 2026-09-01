const { normalizeColorHex, isSafeHttpUrl, trimTo } = require('./showcaseFieldNormalize');

/**
 * Panel cho La bàn chòm sao.
 *
 * Khác bản dùng cho thực thể hệ Mặt Trời (`showcasePanelNormalize`): ở đây
 * block sai kiểu được coi là `text` thay vì bị loại, và ảnh chấp nhận mọi
 * đường dẫn nội bộ. Giữ nguyên để không xóa mất nội dung đã lưu; chỉ chặn
 * thêm các scheme nguy hiểm như `javascript:`.
 */

const BLOCK_TYPES = ['text', 'image', 'chart'];
const TABS = ['overview', 'physical', 'sky'];
const VARIANTS = ['glass', 'solid', 'minimal'];
const ALIGNMENTS = ['left', 'center', 'right'];

const MAX_BLOCKS_PER_TAB = 16;
const MAX_CHART_POINTS = 24;
const MAX_CONCEPT_TAGS = 32;
const MAX_LESSON_IDS = 64;

/** Đường dẫn nội bộ giữ nguyên; URL tuyệt đối phải là http(s). */
function normalizeImageUrl(raw) {
  const text = trimTo(raw, 500);
  if (!text || text.includes('..')) return '';
  if (text.startsWith('/')) return text;
  return isSafeHttpUrl(text) ? text : '';
}

const pickOrUndefined = (allowed, raw) => {
  const value = String(raw || '').trim();
  return allowed.includes(value) ? value : undefined;
};

function normalizePanelBlock(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const styleRaw = raw.style && typeof raw.style === 'object' ? raw.style : {};

  return {
    id: trimTo(raw.id || `block-${index}`, 80),
    type: BLOCK_TYPES.includes(String(raw.type || '').trim()) ? String(raw.type).trim() : 'text',
    title: trimTo(raw.title, 200),
    body: trimTo(raw.body, 8000),
    imageUrl: normalizeImageUrl(raw.imageUrl),
    chartKind: trimTo(raw.chartKind, 40),
    points: (Array.isArray(raw.points) ? raw.points : [])
      .map((point) => ({ label: trimTo(point?.label, 80), value: Number(point?.value) }))
      .filter((point) => point.label && Number.isFinite(point.value))
      .slice(0, MAX_CHART_POINTS),
    style: {
      variant: pickOrUndefined(VARIANTS, styleRaw.variant),
      align: pickOrUndefined(ALIGNMENTS, styleRaw.align),
      bgColor: normalizeColorHex(styleRaw.bgColor),
      borderColor: normalizeColorHex(styleRaw.borderColor),
      textColor: normalizeColorHex(styleRaw.textColor),
      accentColor: normalizeColorHex(styleRaw.accentColor),
    },
  };
}

const normalizeBlocks = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map(normalizePanelBlock)
    .filter(Boolean)
    .slice(0, MAX_BLOCKS_PER_TAB);

const normalizeIdList = (raw, max) =>
  (Array.isArray(raw) ? raw : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, max);

function normalizePanelConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const tabLabelsRaw = raw.tabLabels && typeof raw.tabLabels === 'object' ? raw.tabLabels : {};
  const panel = {
    stateBadge: trimTo(raw.stateBadge, 220),
    tabs: (Array.isArray(raw.tabs) ? raw.tabs : [])
      .map((tab) => String(tab || '').trim().toLowerCase())
      .filter((tab) => TABS.includes(tab))
      .slice(0, TABS.length),
    tabLabels: Object.fromEntries(TABS.map((tab) => [tab, trimTo(tabLabelsRaw[tab], 40)])),
    overviewBlocks: normalizeBlocks(raw.overviewBlocks),
    physicalBlocks: normalizeBlocks(raw.physicalBlocks),
    skyBlocks: normalizeBlocks(raw.skyBlocks),
    conceptTagIds: normalizeIdList(raw.conceptTagIds, MAX_CONCEPT_TAGS),
    lessonIds: normalizeIdList(raw.lessonIds, MAX_LESSON_IDS),
  };

  const isEmpty =
    !panel.stateBadge &&
    !panel.tabs.length &&
    !panel.overviewBlocks.length &&
    !panel.physicalBlocks.length &&
    !panel.skyBlocks.length &&
    !panel.conceptTagIds.length &&
    !panel.lessonIds.length;

  return isEmpty ? null : panel;
}

module.exports = { normalizePanelConfig };
