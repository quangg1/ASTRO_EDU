const { AppError } = require('../../../shared/errors');
const { showcaseCatalogRepository } = require('../repositories/showcaseCatalogRepository');
const {
  MAX_CATALOG,
  MAX_ORBITS,
  MAX_STORIES,
  normalizeCatalogEntry,
  normalizeStory,
  normalizeOrbit,
} = require('../lib/showcaseCatalogNormalize');

/**
 * Bundle rỗng nghĩa là cảnh 3D chưa được seed — client tự dựng cảnh mặc định
 * khi nhận `null`, nên đây không phải lỗi.
 */
async function getBundle() {
  const { catalog, orbits, stories, updatedAt } =
    await showcaseCatalogRepository.loadBundleParts();
  if (catalog.length === 0 || orbits.length === 0) return null;
  return { stories, catalog, orbits, updatedAt };
}

/**
 * panelConfig (tab nội dung + concept/bài học gắn với entity) do Studio entity
 * biên soạn. Bản import catalog thường không mang theo nó, nên giữ lại bản đang
 * lưu thay vì xóa mất liên kết Edu ↔ 3D.
 */
function keepStudioPanelConfig(nextCatalog, prevCatalog) {
  const prevById = new Map(
    (prevCatalog || []).map((entry) => [String(entry?.id || '').trim(), entry?.panelConfig]),
  );
  return nextCatalog.map((entry) => {
    if (entry.panelConfig) return entry;
    const kept = prevById.get(entry.id);
    return kept ? { ...entry, panelConfig: kept } : entry;
  });
}

async function replaceBundle({ catalog: rawCatalog, orbits: rawOrbits, stories: rawStories }) {
  if (
    rawCatalog.length > MAX_CATALOG ||
    rawOrbits.length > MAX_ORBITS ||
    rawStories.length > MAX_STORIES
  ) {
    throw AppError.badRequest('Payload quá lớn');
  }

  const existing = await showcaseCatalogRepository.loadBundleParts();
  const catalog = keepStudioPanelConfig(
    rawCatalog.map(normalizeCatalogEntry).filter(Boolean),
    existing.catalog,
  );
  const orbits = rawOrbits.map(normalizeOrbit).filter(Boolean);
  const stories = rawStories.map(normalizeStory).filter(Boolean);

  // Ghi đè bằng bundle rỗng sẽ xóa trắng cảnh 3D đang chạy.
  if (catalog.length === 0 || orbits.length === 0) {
    throw AppError.badRequest('catalog/orbits sau chuẩn hóa rỗng');
  }

  await showcaseCatalogRepository.saveBundleParts({ stories, catalog, orbits });

  const saved = await showcaseCatalogRepository.loadBundleParts();
  return {
    stories: saved.stories,
    catalog: saved.catalog,
    orbits: saved.orbits,
    updatedAt: saved.updatedAt,
  };
}

module.exports = { getBundle, replaceBundle };
