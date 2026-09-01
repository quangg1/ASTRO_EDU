const { collectLpLessons } = require('../../../learning-path/lib/collectLpLessons');
const {
  getMainCurriculum,
  getLearnerProgress,
} = require('../../../learning-path/services/learningPathQueryService');
const {
  hasUnlockForEntity,
} = require('../../../rewards/services/showcaseUnlockService');
const showcaseContent = require('../../../content3d/services/showcaseContentService');
const planetNarrativeService = require('../../../content3d/services/planetNarrativeService');

/**
 * @param {string} userId
 * @param {string} entityId
 */
async function hasShowcaseUnlock(userId, entityId) {
  return hasUnlockForEntity(userId, entityId);
}

function lessonClaimsEntity(lesson, entityId) {
  const e = String(entityId || '').trim();
  if (!e || !lesson) return false;
  const sc = lesson.sceneContext;
  if (!sc) return false;
  if (String(sc.primaryEntityId || '').trim() === e) return true;
  return (sc.entityIds || []).some((id) => String(id || '').trim() === e);
}

async function loadEntityLessonLinks(entityId) {
  const id = String(entityId || '').trim();
  const lessonIds = new Set();

  const { modules } = await getMainCurriculum();
  for (const { lesson } of collectLpLessons({ modules })) {
    if (lessonClaimsEntity(lesson, id) && lesson.id) {
      lessonIds.add(String(lesson.id).trim());
    }
  }

  const content = await showcaseContent.getEntityContent(id);
  for (const lid of content?.panelConfig?.lessonIds || []) {
    const x = String(lid || '').trim();
    if (x) lessonIds.add(x);
  }

  const { data: narrative } = await planetNarrativeService.getPublished(id);
  for (const lid of narrative?.linkedLessonIds || []) {
    const x = String(lid || '').trim();
    if (x) lessonIds.add(x);
  }

  return lessonIds;
}

/**
 * Entity có ít nhất một liên kết LP (sceneContext / panel / narrative).
 */
async function entityHasLpLinks(entityId) {
  const links = await loadEntityLessonLinks(entityId);
  return links.size > 0;
}

/**
 * User đã hoàn thành ≥1 bài LP gắn với entity.
 */
async function hasLearningPathAccessToEntity(userId, entityId) {
  if (!userId) return false;
  const links = await loadEntityLessonLinks(entityId);
  if (links.size === 0) return false;

  const up = await getLearnerProgress(userId);
  const completed = new Set(
    (up?.learningPathCompletedLessonIds || []).map((x) => String(x || '').trim()),
  );
  for (const lid of links) {
    if (completed.has(lid)) return true;
  }
  return false;
}

async function entityHasDeepHistory(entityId) {
  const id = String(entityId || '').trim();
  if (!id) return false;
  const { data: doc } = await planetNarrativeService.getPublished(id);
  const beats = Array.isArray(doc?.beats) ? doc.beats : Array.isArray(doc?.stages) ? doc.stages : [];
  return beats.length > 0;
}

/**
 * @param {string|null|undefined} userId
 * @param {string} entityId
 * @param {{ openHistory?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, code?: string, suggestion?: string }>}
 */
async function assertShowcaseEntityAccess(userId, entityId, opts = {}) {
  const id = String(entityId || '').trim();
  if (!id) {
    return { ok: false, code: 'invalid_args', suggestion: 'Thiếu entity hợp lệ.' };
  }

  if (opts.openHistory) {
    const hasHistory = await entityHasDeepHistory(id);
    if (!hasHistory) {
      return {
        ok: false,
        code: 'no_history',
        suggestion: 'Thiên thể này chưa có Lịch sử sâu trên Explore.',
      };
    }
    return { ok: true };
  }

  if (await hasShowcaseUnlock(userId, id)) return { ok: true };
  if (await hasLearningPathAccessToEntity(userId, id)) return { ok: true };

  const gated = await entityHasLpLinks(id);
  if (!gated) return { ok: true };

  if (!userId) {
    return {
      ok: false,
      code: 'auth_required',
      suggestion: 'Đăng nhập và hoàn thành bài lộ trình liên quan để Cosmo dẫn bạn tới thiên thể này.',
    };
  }

  return {
    ok: false,
    code: 'no_access',
    suggestion:
      'Hoàn thành bài lộ trình liên quan hoặc mở khóa showcase bằng Gem — sau đó Cosmo có thể điều hướng tới thiên thể này.',
  };
}

module.exports = {
  hasShowcaseUnlock,
  hasLearningPathAccessToEntity,
  entityHasLpLinks,
  entityHasDeepHistory,
  assertShowcaseEntityAccess,
};
