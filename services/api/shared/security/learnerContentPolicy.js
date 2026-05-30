/**
 * Shared learner-facing content policy — redact quiz secrets on any public/learner surface.
 */
const { redactQuizQuestions } = require('../../features/courses/services/courseContentRedact');

function redactRecallQuizOnLesson(lesson) {
  if (!lesson || typeof lesson !== 'object') return lesson;
  if (!Array.isArray(lesson.recallQuiz) || lesson.recallQuiz.length === 0) return lesson;
  return { ...lesson, recallQuiz: redactQuizQuestions(lesson.recallQuiz) };
}

function redactLessonsInDepthArray(lessons) {
  return (lessons || []).map(redactRecallQuizOnLesson);
}

function redactNodeDepths(depths) {
  if (!depths || typeof depths !== 'object') return depths;
  return {
    beginner: redactLessonsInDepthArray(depths.beginner),
    explorer: redactLessonsInDepthArray(depths.explorer),
    researcher: redactLessonsInDepthArray(depths.researcher),
  };
}

function redactLearningPathModules(modules) {
  return (modules || []).map((mod) => ({
    ...mod,
    nodes: (mod.nodes || []).map((node) => ({
      ...node,
      depths: redactNodeDepths(node.depths),
    })),
  }));
}

/**
 * @param {{ modules?: unknown[], concepts?: unknown[] }} data
 * @param {{ includeQuizSecrets?: boolean }} opts
 */
function applyLearningPathLearnerPolicy(data, opts = {}) {
  if (opts.includeQuizSecrets || !data) return data;
  return {
    ...data,
    modules: redactLearningPathModules(data.modules),
  };
}

module.exports = {
  redactRecallQuizOnLesson,
  redactLearningPathModules,
  applyLearningPathLearnerPolicy,
};
