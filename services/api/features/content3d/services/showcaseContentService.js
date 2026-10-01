const {
  showcaseEntityContentRepository,
} = require('../repositories/showcaseEntityContentRepository');
const catalogService = require('./showcaseCatalogService');

/**
 * API công khai của content3d cho các feature khác (mở khóa bằng gem, agent):
 * đọc nội dung 3D mà không cần chạm vào model của feature này.
 */
function getEntityContent(entityId) {
  return showcaseEntityContentRepository.findByEntityId(entityId);
}

/** panelConfig do Studio entity lưu trong catalog bundle (không nằm ở ShowcaseEntityContent). */
async function getEntityPanelConfig(entityId) {
  const bundle = await catalogService.getBundle();
  const id = String(entityId || '').trim();
  const row = (bundle?.catalog || []).find((entry) => String(entry?.id || '').trim() === id);
  return row?.panelConfig ?? null;
}

function getCatalogBundle() {
  return catalogService.getBundle();
}

module.exports = { getEntityContent, getEntityPanelConfig, getCatalogBundle };
