const Enrollment = require('../../../courses/models/Enrollment');
const Course = require('../../../courses/models/Course');
const { isToolAllowedForTier, resolveToolName } = require('../../lib/toolSchema');
const { getLearningPathLessonIndex } = require('./lpCurriculum');
const { hasShowcaseUnlock } = require('./showcaseAccess');

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

  if (name === 'go_to_explore' || name === 'navigate_to_narrative') {
    const ma = clampMa(args?.stage_time_ma ?? args?.stageTime);
    const planet = String(args?.planet || 'earth').toLowerCase();
    const entityId = typeof args?.entity_id === 'string' ? args.entity_id.trim() : '';
    const pinId = typeof args?.pin_id === 'string' ? args.pin_id.trim() : '';

    if (entityId && userId) {
      const unlocked = await hasShowcaseUnlock(userId, entityId);
      if (!unlocked) {
        return {
          ok: false,
          code: 'no_access',
          suggestion: 'Đăng ký khóa hoặc mở khóa showcase trong cửa hàng gem.',
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
