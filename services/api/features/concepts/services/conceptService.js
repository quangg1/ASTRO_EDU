const {
  conceptRepository,
  taxonomyRegistryRepository,
} = require('../repositories/conceptRepository');
const {
  DEFAULT_TAXONOMY,
  normalizeConcepts,
  normalizeTaxonomyRegistry,
} = require('../lib/conceptNormalize');
const { loadConceptSeed } = require('../lib/conceptSeed');

/**
 * Cài đặt mới có bảng concept rỗng nên trang tri thức sẽ trắng; nạp seed một
 * lần khi thật sự chưa có dữ liệu. Ghi trùng do hai request song song bị bỏ qua
 * nhờ unique index trên `id`.
 */
async function ensureConceptSeed() {
  if ((await conceptRepository.count()) > 0) return;
  const seed = normalizeConcepts(loadConceptSeed());
  if (!seed.length) return;
  await conceptRepository.insertMany(seed, { ordered: false }).catch(() => {});
}

async function ensureTaxonomySeed() {
  const existing = await taxonomyRegistryRepository.findDefault();
  if (existing?.taxonomy && Object.keys(existing.taxonomy).length > 0) return;
  await taxonomyRegistryRepository.saveDefault(DEFAULT_TAXONOMY);
}

async function listPublishedConcepts() {
  await ensureConceptSeed();
  return conceptRepository.listPublished();
}

async function listAllConcepts() {
  await ensureConceptSeed();
  return conceptRepository.listAll();
}

function replaceConcepts(rawConcepts) {
  return conceptRepository.replaceAll(normalizeConcepts(rawConcepts));
}

async function getTaxonomy() {
  await ensureTaxonomySeed();
  const doc = await taxonomyRegistryRepository.findDefault();
  return normalizeTaxonomyRegistry(doc?.taxonomy);
}

async function replaceTaxonomy(rawTaxonomy) {
  const taxonomy = normalizeTaxonomyRegistry(rawTaxonomy);
  await taxonomyRegistryRepository.saveDefault(taxonomy);
  return taxonomy;
}

/** API công khai cho feature khác tra cứu concept theo id. */
function listConceptsByIds(ids) {
  return ids.length ? conceptRepository.listByIds(ids) : Promise.resolve([]);
}

/** Gợi ý concept theo chuỗi khớp thô (Explore quiz / agent). */
async function findConceptsMatchingHints(conceptHints, { limit = 12 } = {}) {
  const hints = (conceptHints || [])
    .map((h) => String(h || '').trim().toLowerCase())
    .filter(Boolean);
  if (!hints.length) return [];
  const rows = await listPublishedConcepts();
  return rows
    .filter((c) => {
      const hay = [
        c.id,
        c.title,
        c.short_description,
        c.explanation,
        ...(Array.isArray(c.aliases) ? c.aliases : []),
      ]
        .join(' ')
        .toLowerCase();
      return hints.some((h) => hay.includes(h));
    })
    .slice(0, limit)
    .map((c) => ({ id: c.id, title: String(c.title || '').trim() }));
}

/** Dùng để kiểm tra liên kết concept trong lộ trình học. */
async function listConceptIds() {
  const ids = await conceptRepository.listIds();
  return ids.map((id) => String(id || '').trim()).filter(Boolean);
}

module.exports = {
  listPublishedConcepts,
  listAllConcepts,
  replaceConcepts,
  getTaxonomy,
  replaceTaxonomy,
  listConceptsByIds,
  findConceptsMatchingHints,
  listConceptIds,
};
