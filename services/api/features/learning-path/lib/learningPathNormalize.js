const { coerceLessonSections } = require('../../../shared/schemas/lessonSectionSchema');
const { normalizeQuizList } = require('../../../shared/quizQuestion');

/** Recall quiz của một bài tối đa 5 câu; 0 câu nghĩa là bài chưa gắn quiz. */
const RECALL_QUIZ_LIMITS = { maxCount: 5, minCount: 0 };
const DEPTHS = ['beginner', 'explorer', 'researcher'];
/** Trọng số quá nhỏ chỉ là nhiễu làm loãng gợi ý chủ đề. */
const MIN_TOPIC_WEIGHT = 0.0001;

const uniqueIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];

function normalizeTopicWeights(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => ({
      topicId: String(entry.topicId || '').trim(),
      weight: Math.max(0, Math.min(1, Number(entry.weight) || 0)),
    }))
    .filter((entry) => entry.topicId && entry.weight > MIN_TOPIC_WEIGHT);
}

function normalizeConceptAnchors(lesson) {
  const rows = Array.isArray(lesson?.conceptAnchors) ? lesson.conceptAnchors : [];
  return rows
    .map((anchor) => ({
      conceptId: String(anchor?.conceptId || '').trim(),
      phrase: String(anchor?.phrase || '').trim(),
    }))
    .filter((anchor) => anchor.conceptId && anchor.phrase);
}

/** Bối cảnh cảnh 3D chỉ có nghĩa khi trỏ tới ít nhất một thực thể hoặc mốc lịch sử. */
function normalizeSceneContext(lesson) {
  const source = lesson?.sceneContext;
  if (!source || typeof source !== 'object') return undefined;

  const primaryEntityId = String(source.primaryEntityId || '').trim();
  const entityIds = uniqueIds(source.entityIds).filter((id) => id !== primaryEntityId);

  let historyFocus;
  const rawFocus = source.historyFocus;
  if (rawFocus && typeof rawFocus === 'object' && primaryEntityId) {
    const beatId = Number(rawFocus.beatId);
    if (Number.isFinite(beatId)) {
      historyFocus = { beatId };
      const pinId = String(rawFocus.pinId || '').trim();
      if (pinId) historyFocus.pinId = pinId;
      const labelVi = String(rawFocus.labelVi || '').trim();
      if (labelVi) historyFocus.labelVi = labelVi;
    }
  }

  if (!primaryEntityId && entityIds.length === 0 && !historyFocus) return undefined;

  return {
    ...(primaryEntityId ? { primaryEntityId } : {}),
    ...(entityIds.length ? { entityIds } : {}),
    ...(historyFocus ? { historyFocus } : {}),
  };
}

/**
 * Chuẩn hóa cây module -> node -> depth -> lesson từ editor.
 * `invalidSectionCount` được đếm dồn để editor báo cho tác giả biết có bao nhiêu
 * khối nội dung bị bỏ vì sai định dạng.
 */
function normalizeModules(modules) {
  let invalidSectionCount = 0;

  const normalizeLesson = (lesson) => {
    const { sections, dropped } = coerceLessonSections(lesson?.sections);
    invalidSectionCount += dropped;
    return {
      ...lesson,
      sections,
      conceptIds: uniqueIds(lesson?.conceptIds),
      conceptAnchors: normalizeConceptAnchors(lesson),
      recallQuiz: normalizeQuizList(
        lesson?.recallQuiz,
        String(lesson?.id || '').trim(),
        RECALL_QUIZ_LIMITS,
      ),
      sceneContext: normalizeSceneContext(lesson),
    };
  };

  const out = modules.map((mod) => ({
    ...mod,
    nodes: (mod.nodes || []).map((node) => ({
      ...node,
      topicWeights: normalizeTopicWeights(node.topicWeights),
      depths: Object.fromEntries(
        DEPTHS.map((depth) => [
          depth,
          Array.isArray(node.depths?.[depth]) ? node.depths[depth].map(normalizeLesson) : [],
        ]),
      ),
    })),
  }));

  return { modules: out, invalidSectionCount };
}

/**
 * Bài học chỉ được trỏ tới concept đang tồn tại; id lạ bị gỡ và trả về cho
 * editor thay vì lưu ngầm một liên kết chết.
 */
function validateModulesByConceptIds(modules, conceptIdSet) {
  const invalidConceptIds = new Set();

  const filterLesson = (lesson) => {
    const rawIds = Array.isArray(lesson?.conceptIds) ? lesson.conceptIds : [];
    const conceptIds = rawIds.filter((id) => {
      if (conceptIdSet.has(id)) return true;
      invalidConceptIds.add(id);
      return false;
    });

    const rawAnchors = Array.isArray(lesson?.conceptAnchors) ? lesson.conceptAnchors : [];
    const conceptAnchors = rawAnchors.filter((anchor) => {
      const id = String(anchor?.conceptId || '').trim();
      if (!id) return false;
      if (conceptIdSet.has(id)) return true;
      invalidConceptIds.add(id);
      return false;
    });

    return { ...lesson, conceptIds, conceptAnchors };
  };

  const nextModules = (modules || []).map((mod) => ({
    ...mod,
    nodes: (mod.nodes || []).map((node) => ({
      ...node,
      depths: Object.fromEntries(
        DEPTHS.map((depth) => [
          depth,
          Array.isArray(node?.depths?.[depth]) ? node.depths[depth].map(filterLesson) : [],
        ]),
      ),
    })),
  }));

  return { modules: nextModules, invalidConceptIds: [...invalidConceptIds] };
}

/** Concept nhúng trong lộ trình (khác bộ concept toàn cục) cần có định nghĩa. */
function normalizeEmbeddedConcepts(concepts) {
  if (!Array.isArray(concepts)) return [];
  return concepts
    .map((concept) => ({
      id: String(concept.id || '').trim(),
      label: String(concept.label || '').trim(),
      labelVi: String(concept.labelVi || '').trim(),
      definition: String(concept.definition || '').trim(),
      definitionVi: String(concept.definitionVi || '').trim(),
      aliases: uniqueIds(concept.aliases),
    }))
    .filter((concept) => concept.id && concept.definition);
}

module.exports = {
  DEPTHS,
  uniqueIds,
  normalizeModules,
  validateModulesByConceptIds,
  normalizeEmbeddedConcepts,
};
