const AI_SERVICE_URL = (
  process.env.AI_SERVICE_URL || 'http://127.0.0.1:5005'
)
  .trim()
  .replace(/\/$/, '');
const RAG_TIMEOUT_MS = 3000;
const CHAT_TIMEOUT_MS = 70000;

/**
 * @param {object} body
 * @returns {Promise<{ message?: { role: string, content: string }, tool_calls?: unknown[], error?: string, rag_ms?: number }>}
 */
async function callAiChat(body) {
  if (!AI_SERVICE_URL) {
    return { error: 'AI_SERVICE_URL not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err =
        typeof data.error === 'string' ? data.error : data.detail || 'AI service error';
      return { error: err };
    }
    return data;
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'AI request timeout' : e?.message || 'AI unavailable';
    return { error: msg };
  } finally {
    clearTimeout(timer);
  }
}

function mapContextForAi(tier, agentContext, sessionContext, coursePayload) {
  const surface = sessionContext?.surface;
  const isCourse =
    tier === 'course_enrolled' ||
    tier === 'course_trial' ||
    (surface === 'course' && coursePayload);

  let contextLabel = 'general';
  if (isCourse) contextLabel = 'course';
  else if (surface === 'learning_path' || agentContext?.currentLesson) {
    contextLabel = 'learning_path';
  } else if (surface === 'explore') {
    contextLabel = 'explore';
  }

  const agentState = {
    pathname: sessionContext?.pathname ?? '/',
    route_label: sessionContext?.routeLabel ?? null,
    agent_tier: tier,
    lesson_id: sessionContext?.lessonId ?? null,
    lesson_title: sessionContext?.lessonTitle ?? null,
    module_id: sessionContext?.moduleId ?? null,
    node_id: sessionContext?.nodeId ?? null,
    depth: sessionContext?.depth ?? null,
    planet: sessionContext?.planet ?? null,
    stage_time_ma: sessionContext?.stageTimeMa ?? null,
    progress: agentContext?.progress ?? null,
    current_lesson: agentContext?.currentLesson ?? null,
    weak_lessons: agentContext?.weakLessons ?? null,
    misconceptions: agentContext?.misconceptions ?? null,
    coach_trigger: sessionContext?.coachTrigger ?? null,
    recall_quiz_available: Boolean(sessionContext?.recallQuizAvailable),
    active_section: agentContext?.activeSection ?? null,
    narrative_context: agentContext?.narrativeContext ?? null,
    spaced_review_due: agentContext?.spacedReviewDue?.dueLessons?.slice(0, 3) ?? null,
    depth_suggestion: agentContext?.depthSuggestion ?? null,
    entity_id: sessionContext?.entityId ?? null,
  };

  let learning_path = null;
  if (contextLabel === 'learning_path' && agentContext?.currentLesson) {
    learning_path = {
      currentLessonId: agentContext.currentLesson.lessonId,
      currentLessonTitle: agentContext.currentLesson.title,
      sectionTitles: agentContext.currentLesson.sectionTitles || [],
      moduleId: agentContext.currentLesson.moduleId,
      nodeId: agentContext.currentLesson.nodeId,
      depth: sessionContext?.depth ?? null,
    };
  }

  let course = isCourse ? coursePayload : null;
  if (isCourse && coursePayload) {
    course = {
      ...coursePayload,
      currentLessonSlug: sessionContext?.lessonSlug || coursePayload.currentLessonSlug,
    };
  }

  return { context: contextLabel, course, learning_path, agent_state: agentState };
}

module.exports = { callAiChat, mapContextForAi, RAG_TIMEOUT_MS, AI_SERVICE_URL };
