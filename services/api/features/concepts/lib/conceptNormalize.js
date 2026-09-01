/** Bậc khó chỉ có 3 mức: 0 dễ, 1 vừa, 2 khó. */
const MIN_DIFFICULTY = 0;
const MAX_DIFFICULTY = 2;
const DEFAULT_DIFFICULTY = 1;

/** Taxonomy mặc định khi CMS chưa có dữ liệu — cũng là danh sách domain gốc. */
const DEFAULT_TAXONOMY = {
  astronomy: [
    'fundamentals',
    'orbital-mechanics',
    'stellar-physics',
    'galactic-cosmology',
    'observational-astronomy',
    'positional-astronomy',
  ],
  geology: ['tectonics', 'volcanology', 'stratigraphy', 'planetary-geology'],
  biology: ['evolution', 'ecology', 'paleontology'],
  physics: ['mechanics', 'thermodynamics', 'electromagnetism'],
  chemistry: ['astrochemistry', 'geochemistry', 'atmospheric-chemistry'],
};

function slugToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const uniqueStrings = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];

function normalizeTaxonomyRegistry(input) {
  const source = input && typeof input === 'object' ? input : DEFAULT_TAXONOMY;
  const out = {};
  for (const [domainRaw, subdomainsRaw] of Object.entries(source)) {
    const domain = slugToken(domainRaw);
    if (!domain) continue;
    out[domain] = [
      ...new Set((Array.isArray(subdomainsRaw) ? subdomainsRaw : []).map(slugToken).filter(Boolean)),
    ];
  }
  return Object.keys(out).length === 0 ? DEFAULT_TAXONOMY : out;
}

function toConcept(raw) {
  const difficulty = Number(raw.difficulty_level);
  return {
    id: String(raw.id || '').trim(),
    // Seed cũ dùng label/labelVi và definition/definitionVi cho cùng ý nghĩa.
    title: String(raw.title || raw.label || raw.labelVi || '').trim(),
    short_description: String(raw.short_description || '').trim(),
    explanation: String(raw.explanation || raw.definition || raw.definitionVi || '').trim(),
    examples: uniqueStrings(raw.examples),
    related: uniqueStrings(raw.related),
    domain: String(raw.domain || '').trim(),
    subdomain: String(raw.subdomain || '').trim(),
    aliases: uniqueStrings(raw.aliases),
    prerequisites: uniqueStrings(raw.prerequisites),
    difficulty_level: Number.isFinite(difficulty)
      ? Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, difficulty))
      : DEFAULT_DIFFICULTY,
    published: raw.published !== false,
  };
}

/**
 * Liên kết trỏ ra ngoài tập concept hiện có sẽ tạo nút chết trên đồ thị tri thức,
 * nên chỉ giữ lại các id thật sự tồn tại và bỏ tự tham chiếu.
 */
function normalizeConcepts(concepts) {
  if (!Array.isArray(concepts)) return [];
  const base = concepts.map(toConcept).filter((concept) => concept.id);
  const ids = new Set(base.map((concept) => concept.id));

  return base.map((concept) => ({
    ...concept,
    title: concept.title || concept.id,
    related: concept.related.filter((id) => id !== concept.id && ids.has(id)),
    prerequisites: concept.prerequisites.filter((id) => id !== concept.id && ids.has(id)),
  }));
}

module.exports = { DEFAULT_TAXONOMY, slugToken, normalizeConcepts, normalizeTaxonomyRegistry };
