/**
 * Pure redaction helpers (no DB) — safe for unit tests and reuse in API payloads.
 */

const SENSITIVE_QUIZ_FIELDS = ['answer', 'correctIndex', 'explanation', 'optionExplanations'];

function sanitizeQuizQuestionForDelivery(q, idx) {
  const base = q && typeof q === 'object' ? q : {};
  const options = (base.options || []).map((o) => ({ text: String(o?.text ?? '') }));
  return {
    id: base.id || `q-${idx}`,
    type: base.type || 'mcq',
    question: base.question,
    options,
  };
}

function redactQuizQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q, i) => sanitizeQuizQuestionForDelivery(q, i));
}

function redactLessonForLearnerDelivery(lesson) {
  if (!lesson || typeof lesson !== 'object') return lesson;
  const out = { ...lesson };
  if (out.type === 'quiz' && Array.isArray(out.quizQuestions)) {
    out.quizQuestions = redactQuizQuestions(out.quizQuestions);
  }
  for (const key of SENSITIVE_QUIZ_FIELDS) {
    if (key in out) delete out[key];
  }
  return out;
}

function redactLessonsForLearnerDelivery(lessons) {
  return (lessons || []).map(redactLessonForLearnerDelivery);
}

module.exports = {
  SENSITIVE_QUIZ_FIELDS,
  sanitizeQuizQuestionForDelivery,
  redactQuizQuestions,
  redactLessonForLearnerDelivery,
  redactLessonsForLearnerDelivery,
};
