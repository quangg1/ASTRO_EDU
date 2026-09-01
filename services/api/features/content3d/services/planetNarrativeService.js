const { planetNarrativeRepository } = require('../repositories/planetNarrativeRepository');

/**
 * `stages` là tên cũ của `beats`; cả hai vẫn được trả về để client cũ không vỡ.
 * Khi thiếu bản ghi, client tự dựng nội dung từ preset phía frontend.
 */
const KINDS = new Set(['earth', 'generic']);

function normalizeKind(entityId, raw) {
  const kind = String(raw || '').trim();
  // 'mars' từng là một kind riêng, nay gộp vào 'generic'.
  if (kind === 'mars') return 'generic';
  if (KINDS.has(kind)) return kind;
  return entityId === 'planet-earth' ? 'earth' : 'generic';
}

const uniqueIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];

const plainObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null;

const beatsOf = (source) => {
  if (Array.isArray(source?.beats) && source.beats.length > 0) return source.beats;
  return Array.isArray(source?.stages) ? source.stages : [];
};

function normalizeDoc(doc) {
  if (!doc) return null;
  const entityId = String(doc.entityId || '').trim();
  if (!entityId) return null;

  const beats = beatsOf(doc);
  return {
    entityId,
    kind: normalizeKind(entityId, doc.kind),
    beats,
    stages: beats,
    sites: Array.isArray(doc.sites) ? doc.sites : [],
    stageVisuals: plainObject(doc.stageVisuals) || {},
    panelSchema: doc.panelSchema ?? undefined,
    published: doc.published !== false,
    linkedLessonIds: uniqueIds(doc.linkedLessonIds),
    linkedConceptIds: uniqueIds(doc.linkedConceptIds),
    updatedAt: doc.updatedAt,
  };
}

/** Editor thấy cả bản nháp chưa xuất bản. */
async function getForEditor(entityId) {
  const doc = await planetNarrativeRepository.findByEntityId(entityId);
  return { data: normalizeDoc(doc), source: doc ? 'db' : 'preset' };
}

async function getPublished(entityId) {
  const doc = await planetNarrativeRepository.findPublished(entityId);
  return { data: normalizeDoc(doc), source: doc ? 'db' : 'preset' };
}

async function save(input) {
  const entityId = input.entityId;
  const beats = beatsOf(input);
  const panelSchema = plainObject(input.panelSchema);

  const doc = await planetNarrativeRepository.upsert(
    { entityId },
    {
      $set: {
        entityId,
        kind: normalizeKind(entityId, input.kind),
        beats,
        stages: beats,
        sites: Array.isArray(input.sites) ? input.sites : [],
        stageVisuals: plainObject(input.stageVisuals) || {},
        published: input.published !== false,
        linkedLessonIds: uniqueIds(input.linkedLessonIds),
        linkedConceptIds: uniqueIds(input.linkedConceptIds),
        ...(panelSchema ? { panelSchema } : {}),
      },
    },
  );

  return { data: normalizeDoc(doc), source: 'db' };
}

module.exports = { getForEditor, getPublished, save, normalizeDoc };
