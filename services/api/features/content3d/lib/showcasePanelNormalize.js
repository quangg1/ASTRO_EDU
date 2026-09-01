const {
  normalizeColorHex,
  normalizeMediaUrlField,
  trimTo,
} = require('./showcaseFieldNormalize');

/**
 * Panel cấu hình bởi biên tập viên và render trực tiếp trong Explore 3D.
 * Mọi field đều bị chặn độ dài/kiểu ở đây để client không phải phòng thủ.
 */

const BLOCK_TYPES = ['text', 'image', 'chart'];
const TABS = ['overview', 'physical', 'sky'];
const VARIANTS = ['glass', 'solid', 'minimal'];
const ALIGNMENTS = ['left', 'center', 'right'];

const MAX_BLOCKS_PER_TAB = 16;
const MAX_CHART_POINTS = 24;
const MAX_CONCEPT_TAGS = 32;
const MAX_LESSON_IDS = 64;

const pickFrom = (allowed, raw, fallback) => {
  const value = String(raw || '').trim().toLowerCase();
  return allowed.includes(value) ? value : fallback;
};

function normalizeChartPoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((point) => {
      const label = trimTo(point?.label, 80);
      const value = Number(point?.value);
      return label && Number.isFinite(value) ? { label, value } : null;
    })
    .filter(Boolean)
    .slice(0, MAX_CHART_POINTS);
}

function normalizeBlockStyle(raw) {
  const style = raw && typeof raw === 'object' ? raw : {};
  return {
    variant: pickFrom(VARIANTS, style.variant, 'glass'),
    align: pickFrom(ALIGNMENTS, style.align, 'left'),
    bgColor: normalizeColorHex(style.bgColor),
    borderColor: normalizeColorHex(style.borderColor),
    textColor: normalizeColorHex(style.textColor),
    accentColor: normalizeColorHex(style.accentColor),
  };
}

function normalizePanelBlock(raw, index) {
  const type = pickFrom(BLOCK_TYPES, raw?.type, null);
  if (!type) return null;
  return {
    id: trimTo(raw?.id || `${type}-${index + 1}`, 80),
    type,
    title: trimTo(raw?.title, 160),
    body: String(raw?.body || '').trim(),
    imageUrl: normalizeMediaUrlField(raw?.imageUrl),
    chartKind: trimTo(raw?.chartKind, 40),
    points: normalizeChartPoints(raw?.points),
    style: normalizeBlockStyle(raw?.style),
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

/** @returns panel đã chuẩn hóa, hoặc null nếu không còn nội dung nào đáng lưu. */
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
