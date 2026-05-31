const Enrollment = require('../../../courses/models/Enrollment');
const Course = require('../../../courses/models/Course');
const { isToolAllowedForTier, resolveToolName } = require('../../lib/toolSchema');
const { getLearningPathLessonIndex } = require('./lpCurriculum');
const { assertShowcaseEntityAccess } = require('./showcaseAccess');
const { resolveShowcaseTarget, loadShowcaseCatalog, inferPlanetFocusFromMessage } = require('../showcaseNavigationService');
const { searchCommunityThreadsForAgent } = require('../agentContextEnrichment');

const STAGE_MIN = -2000;
const STAGE_MAX = 4600;
const DEPTH_ENUM = new Set(['beginner', 'explorer', 'researcher']);

function clampMa(v) {
  let ma = Number(v);
  if (Number.isNaN(ma)) ma = 540;
  return Math.max(STAGE_MIN, Math.min(STAGE_MAX, ma));
}

/**
 * @returns {Promise<{ ok: boolean, code?: string, suggestion?: string, clientAction?: object }>}
 */
async function executeAuthorizedTool({
  tier,
  toolName,
  args,
  userId,
  courseId,
  courseSlug,
  courseLessons,
  userMessage,
}) {
  const name = resolveToolName(toolName);

  if (!isToolAllowedForTier(name, tier)) {
    return {
      ok: false,
      code: 'tool_denied',
      suggestion: 'Tính năng này không khả dụng với gói hiện tại.',
    };
  }

  if (name === 'open_lesson') {
    const slug = typeof args?.lesson_slug === 'string' ? args.lesson_slug.trim() : '';
    if (!slug) return { ok: false, code: 'invalid_args', suggestion: 'Thiếu lesson_slug.' };
    if (!userId || !courseId) {
      return { ok: false, code: 'not_enrolled', suggestion: 'Đăng ký khóa học để mở bài.' };
    }
    const enrollment = await Enrollment.findOne({ userId, courseId }).lean();
    if (!enrollment) {
      return { ok: false, code: 'not_enrolled', suggestion: 'Bạn chưa ghi danh khóa học này.' };
    }
    const allowed = new Set((courseLessons || []).map((l) => l.slug).filter(Boolean));
    if (allowed.size && !allowed.has(slug)) {
      return { ok: false, code: 'lesson_not_in_course', suggestion: 'Bài không thuộc khóa học.' };
    }
    return {
      ok: true,
      clientAction: { type: 'open_lesson', courseSlug, lessonSlug: slug },
    };
  }

  if (name === 'open_learning_path_lesson') {
    const lessonId = typeof args?.lesson_id === 'string' ? args.lesson_id.trim() : '';
    if (!lessonId) return { ok: false, code: 'invalid_args', suggestion: 'Thiếu lesson_id.' };
    if (!userId) {
      return { ok: false, code: 'auth_required', suggestion: 'Đăng nhập để mở bài lộ trình.' };
    }
    const { byId } = await getLearningPathLessonIndex();
    const hit = byId.get(lessonId);
    if (!hit) {
      return { ok: false, code: 'lesson_not_found', suggestion: 'Bài không có trong lộ trình.' };
    }
    return {
      ok: true,
      clientAction: {
        type: 'open_learning_path_lesson',
        lessonId,
        moduleId: hit.moduleId,
        nodeId: hit.nodeId,
      },
    };
  }

  if (name === 'focus_showcase_entity') {
    const catalog = await loadShowcaseCatalog();
    const resolved = resolveShowcaseTarget(args || {}, catalog);
    if (!resolved?.entityId) {
      return {
        ok: false,
        code: 'invalid_args',
        suggestion:
          'Cần planet_name (vd. Venus), entity_name (vd. Europa) hoặc entity_id (vd. planet-venus).',
      };
    }
    const openHistory = args?.open_history === true || args?.openHistory === true;
    const access = await assertShowcaseEntityAccess(userId, resolved.entityId, { openHistory });
    if (!access.ok) {
      return {
        ok: false,
        code: access.code || 'no_access',
        suggestion: access.suggestion || 'Không thể điều hướng tới thiên thể này.',
      };
    }
    return {
      ok: true,
      clientAction: {
        type: 'focus_showcase_entity',
        entityId: resolved.entityId,
        entityName: resolved.name,
        planet: resolved.planet || null,
        syncPlanet: true,
        openHistory,
      },
    };
  }

  if (name === 'go_to_explore' || name === 'navigate_to_narrative') {
    const catalog = await loadShowcaseCatalog();
    const openHistory = args?.open_history === true || args?.openHistory === true;
    const planetRaw = args?.planet_name ?? args?.planetName ?? args?.planet;
    const entityIdRaw = args?.entity_id ?? args?.entityId;

    let focusTarget = null;
    if (planetRaw && String(planetRaw).toLowerCase() !== 'earth') {
      focusTarget = resolveShowcaseTarget({ planet_name: planetRaw, entity_id: entityIdRaw }, catalog);
    } else if (entityIdRaw && !openHistory) {
      focusTarget = resolveShowcaseTarget({ entity_id: entityIdRaw }, catalog);
    } else if (name === 'go_to_explore' && userMessage) {
      const inferred = inferPlanetFocusFromMessage(userMessage);
      if (inferred) {
        focusTarget = resolveShowcaseTarget({ planet_name: inferred }, catalog);
      }
    }

    if (focusTarget?.entityId && !openHistory) {
      const access = await assertShowcaseEntityAccess(userId, focusTarget.entityId);
      if (!access.ok) {
        return {
          ok: false,
          code: access.code || 'no_access',
          suggestion: access.suggestion || 'Không thể điều hướng tới thiên thể này.',
        };
      }
      return {
        ok: true,
        clientAction: {
          type: 'focus_showcase_entity',
          entityId: focusTarget.entityId,
          entityName: focusTarget.name,
          planet: focusTarget.planet || null,
          syncPlanet: true,
          openHistory: false,
        },
      };
    }

    const ma = clampMa(args?.stage_time_ma ?? args?.stageTime);
    const planet = String(planetRaw || 'earth').toLowerCase();
    const entityId = typeof entityIdRaw === 'string' ? entityIdRaw.trim() : '';
    const pinId = typeof args?.pin_id === 'string' ? args.pin_id.trim() : '';

    if (entityId && openHistory) {
      const access = await assertShowcaseEntityAccess(userId, entityId, { openHistory: true });
      if (!access.ok) {
        return {
          ok: false,
          code: access.code || 'no_access',
          suggestion: access.suggestion || 'Không thể mở Lịch sử sâu cho thiên thể này.',
        };
      }
    }

    return {
      ok: true,
      clientAction: {
        type: 'navigate_to_narrative',
        planet,
        stageTimeMa: ma,
        pinId: pinId || null,
        entityId: entityId || null,
      },
    };
  }

  if (name === 'suggest_depth_switch') {
    const depth = String(args?.suggested_depth || args?.suggestedDepth || '').toLowerCase();
    const reason = String(args?.reason || '').trim();
    if (!DEPTH_ENUM.has(depth)) {
      return { ok: false, code: 'invalid_depth', suggestion: 'depth phải là beginner | explorer | researcher.' };
    }
    if (reason.length < 4) {
      return { ok: false, code: 'invalid_args', suggestion: 'Cần lý do gợi ý đổi depth.' };
    }
    return {
      ok: true,
      clientAction: { type: 'suggest_depth_switch', suggestedDepth: depth, reason },
    };
  }

  if (name === 'open_courses') {
    return { ok: true, clientAction: { type: 'open_courses' } };
  }
  if (name === 'open_dashboard') {
    return { ok: true, clientAction: { type: 'open_dashboard' } };
  }
  if (name === 'open_my_courses') {
    return { ok: true, clientAction: { type: 'open_my_courses' } };
  }

  if (name === 'highlight_concept_in_map') {
    const conceptId = typeof args?.concept_id === 'string' ? args.concept_id.trim() : '';
    if (!conceptId) return { ok: false, code: 'invalid_args', suggestion: 'Thiếu concept_id.' };
    const { concepts } = await getLearningPathLessonIndex();
    if (!concepts.has(conceptId)) {
      return { ok: false, code: 'concept_not_found', suggestion: 'Concept không có trong lộ trình.' };
    }
    return {
      ok: true,
      clientAction: { type: 'highlight_concept_in_map', conceptId },
    };
  }

  if (name === 'show_related_lessons') {
    const conceptId = typeof args?.concept_id === 'string' ? args.concept_id.trim() : '';
    const lessonId = typeof args?.lesson_id === 'string' ? args.lesson_id.trim() : '';
    const { byId, byConceptId } = await getLearningPathLessonIndex();
    let related = [];
    if (conceptId) {
      related = (byConceptId.get(conceptId) || []).filter((id) => id !== lessonId);
    } else if (lessonId) {
      const hit = byId.get(lessonId);
      const ids = new Set();
      for (const cid of hit?.conceptIds || []) {
        for (const lid of byConceptId.get(cid) || []) {
          if (lid !== lessonId) ids.add(lid);
        }
      }
      related = [...ids];
    }
    const lessons = related
      .slice(0, 3)
      .map((id) => {
        const m = byId.get(id);
        return m
          ? { lessonId: id, title: m.titleVi, moduleId: m.moduleId, nodeId: m.nodeId }
          : null;
      })
      .filter(Boolean);
    return {
      ok: true,
      clientAction: { type: 'show_related_lessons', lessons },
    };
  }

  if (name === 'start_recall_quiz') {
    const lid = typeof args?.lesson_id === 'string' ? args.lesson_id.trim() : '';
    if (!lid) return { ok: false, code: 'invalid_args', suggestion: 'Thiếu lesson_id.' };
    const { byId } = await getLearningPathLessonIndex();
    if (!byId.has(lid)) {
      return { ok: false, code: 'lesson_not_found', suggestion: 'Bài không có trong lộ trình.' };
    }
    const hit = byId.get(lid);
    return {
      ok: true,
      clientAction: {
        type: 'start_recall_quiz',
        lessonId: lid,
        moduleId: hit.moduleId,
        nodeId: hit.nodeId,
      },
    };
  }

  if (name === 'suggest_community_thread') {
    const lessonId = typeof args?.lesson_id === 'string' ? args.lesson_id.trim() : '';
    const lessonSlug = typeof args?.lesson_slug === 'string' ? args.lesson_slug.trim() : '';
    const slug =
      typeof args?.course_slug === 'string'
        ? args.course_slug.trim()
        : courseSlug || '';
    if (!lessonId && !lessonSlug && !slug) {
      return {
        ok: false,
        code: 'invalid_args',
        suggestion: 'Cần lesson_id, lesson_slug hoặc course_slug để tìm thảo luận.',
      };
    }
    const threads = await searchCommunityThreadsForAgent({
      lessonId: lessonId || undefined,
      lessonSlug: lessonSlug || undefined,
      courseSlug: slug || undefined,
      limit: 3,
    });
    if (!threads.length) {
      return {
        ok: false,
        code: 'no_threads',
        suggestion: 'Chưa có thảo luận phù hợp — gợi ý học viên đặt câu hỏi trên diễn đàn.',
      };
    }
    return {
      ok: true,
      clientAction: { type: 'suggest_community_thread', threads },
    };
  }

  return { ok: false, code: 'unknown_tool', suggestion: 'Tool không được hỗ trợ.' };
}

async function loadCourseForTools(courseSlug) {
  if (!courseSlug) return null;
  const course = await Course.findOne({ slug: courseSlug })
    .select('slug title lessons.slug lessons.title')
    .lean();
  if (!course) return null;
  return {
    courseSlug: course.slug,
    courseId: course._id,
    title: course.title,
    lessons: (course.lessons || []).map((l) => ({ slug: l.slug, title: l.title })),
  };
}

module.exports = { executeAuthorizedTool, loadCourseForTools };
