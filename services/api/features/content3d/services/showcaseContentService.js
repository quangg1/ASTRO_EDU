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

async function getEntityPanelConfig(entityId) {
  const content = await showcaseEntityContentRepository.findByEntityId(entityId, {
    projection: 'panelConfig',
  });
  return content?.panelConfig ?? null;
}

function getCatalogBundle() {
  return catalogService.getBundle();
}

module.exports = { getEntityContent, getEntityPanelConfig, getCatalogBundle };
