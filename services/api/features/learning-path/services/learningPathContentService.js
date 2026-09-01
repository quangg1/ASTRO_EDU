const { AppError } = require('../../../shared/errors');
const {
  applyLearningPathLearnerPolicy,
} = require('../../../shared/security/learnerContentPolicy');
const { listConceptIds } = require('../../concepts/services/conceptService');
const { learningPathRepository } = require('../repositories/learningPathRepository');
const {
  normalizeModules,
  validateModulesByConceptIds,
  normalizeEmbeddedConcepts,
} = require('../lib/learningPathNormalize');

const MISSING = () =>
  new AppError(404, 'LEARNING_PATH_MISSING', 'Chưa có dữ liệu lộ trình');

/** Chỉ admin được xem đáp án; người học nhận bản đã lược bỏ. */
async function getPublishedPath({ userRole }) {
  const doc = await learningPathRepository.findMain();
  if (!doc) throw MISSING();
  if (!doc.published) {
    throw new AppError(404, 'LEARNING_PATH_UNAVAILABLE', 'Lộ trình chưa khả dụng');
  }

  return applyLearningPathLearnerPolicy(
    { modules: doc.modules || [], concepts: doc.concepts || [] },
    { includeQuizSecrets: userRole === 'admin' },
  );
}

async function getPathForEditor() {
  const doc = await learningPathRepository.findMain();
  if (!doc) throw MISSING();
  return {
    modules: doc.modules || [],
    concepts: doc.concepts || [],
    published: doc.published,
  };
}

/** Nội dung bài đổi thì chỉ mục RAG của trợ giảng cũng phải dựng lại. */
function scheduleRagReindex() {
  try {
    // Nạp muộn: agent là feature tùy chọn, thiếu nó cũng không được chặn lưu bài.
    const { scheduleReindexAllLessons } = require('../../agent/services/ragIndexService');
    scheduleReindexAllLessons();
  } catch (err) {
    console.warn('LP save: RAG reindex schedule skipped:', err.message);
  }
}

async function savePath({ modules, concepts, published }) {
  const { modules: normalized, invalidSectionCount } = normalizeModules(modules);
  const embeddedConcepts = Array.isArray(concepts) ? normalizeEmbeddedConcepts(concepts) : null;

  const conceptIdSet = new Set(await listConceptIds());
  const { modules: validatedModules, invalidConceptIds } = validateModulesByConceptIds(
    normalized,
    conceptIdSet,
  );
  const nextPublished = typeof published === 'boolean' ? published : true;

  let doc = await learningPathRepository.findMainDoc();
  if (!doc) {
    doc = learningPathRepository.createMain({
      modules: validatedModules,
      concepts: embeddedConcepts ?? [],
      published: nextPublished,
    });
  } else {
    doc.modules = validatedModules;
    doc.markModified('modules');
    if (embeddedConcepts !== null) {
      doc.concepts = embeddedConcepts;
      doc.markModified('concepts');
    }
    doc.published = nextPublished;
  }
  await doc.save();

  scheduleRagReindex();

  const fresh = await learningPathRepository.findMain();
  return {
    modules: fresh?.modules || [],
    concepts: fresh?.concepts || [],
    published: fresh?.published ?? true,
    invalidConceptIds,
    invalidSectionCount,
  };
}

module.exports = { getPublishedPath, getPathForEditor, savePath };
