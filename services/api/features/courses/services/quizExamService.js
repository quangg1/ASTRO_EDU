const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');
const Cohort = require('../models/Cohort');
const Course = require('../models/Course');
const CohortEnrollment = require('../models/CohortEnrollment');
const { canEditCourse } = require('../../../shared/jwtAuth');
const {
  assertCatalogAccess,
  assertQuizDeliveryAccess,
} = require('./courseContentSecurity');

function mcqAnswerIndex(q) {
  const a = q?.answer;
  return typeof a === 'number' && Number.isFinite(a) ? Math.max(0, Math.floor(a)) : 0;
}

function defaultQuizSettings(raw) {
  return {
    revealMode: ['after_submit', 'after_each_question', 'never'].includes(raw?.revealMode)
      ? raw.revealMode
      : 'after_submit',
    timeLimitMinutes:
      raw?.timeLimitMinutes != null && Number.isFinite(Number(raw.timeLimitMinutes))
        ? Number(raw.timeLimitMinutes)
        : null,
    maxAttempts:
      raw?.maxAttempts != null && Number.isFinite(Number(raw.maxAttempts))
        ? Math.max(1, Number(raw.maxAttempts))
        : null,
    shuffleOptions: Boolean(raw?.shuffleOptions),
    passingScorePct:
      raw?.passingScorePct != null && Number.isFinite(Number(raw.passingScorePct))
        ? Number(raw.passingScorePct)
        : null,
  };
}

function shuffleWithSeed(items, seed) {
  const arr = [...items];
  let h = 0;
  const s = String(seed || 'shuffle');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sanitizeQuestionForClient(q, idx, opts = {}) {
  let options = (q.options || []).map((o) => ({ text: String(o?.text ?? '') }));
  if (opts.shuffleOptions) {
    options = shuffleWithSeed(options, `${opts.seed || ''}:${q.id || idx}`);
  }
  return {
    id: q.id || `q-${idx}`,
    type: q.type || 'mcq',
    question: q.question,
    options,
  };
}

function findLesson(course, lessonSlug) {
  return (course.lessons || []).find((l) => l.slug === lessonSlug);
}

function assertAttemptMatchesRoute(attempt, { courseId, cohortIdFromRoute }) {
  if (!attempt) {
    const err = new Error('Không tìm thấy lượt làm bài');
    err.status = 404;
    throw err;
  }
  if (String(attempt.courseId) !== String(courseId)) {
    const err = new Error('Lượt làm bài không thuộc khóa học này');
    err.status = 403;
    err.code = 'attempt_mismatch';
    throw err;
  }
  const routeCohort = cohortIdFromRoute || null;
  const attemptCohort = attempt.cohortId ? String(attempt.cohortId) : null;
  if (routeCohort !== attemptCohort) {
    const err = new Error('Lượt làm bài không thuộc lớp này');
    err.status = 403;
    err.code = 'cohort_mismatch';
    throw err;
  }
}

async function assertCohortAccess({ cohortId, userId, roles }) {
  if (roles?.includes('admin')) {
    return { role: 'admin' };
  }
  if (roles?.includes('teacher')) {
    const cohort = await Cohort.findById(cohortId).lean();
    if (cohort) {
      const course = await Course.findById(cohort.courseId).lean();
      if (course && canEditCourse(course, { id: userId, role: 'teacher' })) {
        return { role: 'teacher_editor' };
      }
    }
  }
  const en = await CohortEnrollment.findOne({ cohortId, userId }).lean();
  if (!en) {
    const err = new Error('Bạn chưa tham gia lớp học này');
    err.status = 403;
    err.code = 'not_in_cohort';
    throw err;
  }
  return en;
}

/** @deprecated Prefer assertQuizDeliveryAccess — kept for callers passing cohortId only */
async function assertQuizWindow({
  course,
  lesson,
  cohortId,
  CohortActivitySchedule,
  userId,
  userRole,
}) {
  return assertQuizDeliveryAccess({
    course,
    lesson,
    cohortId,
    userId,
    userRole,
    CohortActivitySchedule,
  });
}

function countFinishedAttempts(attempts) {
  return attempts.filter((a) => a.status === 'submitted' || a.status === 'timed_out').length;
}

function gradeAnswers(questions, answers) {
  let correct = 0;
  const perQuestion = [];
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const qid = q.id || `q-${i}`;
    const selected = answers[qid];
    const correctIdx = mcqAnswerIndex(q);
    const ok = selected === correctIdx;
    if (ok) correct += 1;
    perQuestion.push({
      questionId: qid,
      correct: ok,
      correctIndex: correctIdx,
      explanation: q.explanation || (q.optionExplanations && q.optionExplanations[correctIdx]) || null,
    });
  }
  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, score, perQuestion };
}

async function getActiveAttempt({ userId, courseId, lessonSlug, cohortId }) {
  return QuizAttempt.findOne({
    userId,
    courseId,
    lessonSlug,
    cohortId: cohortId || null,
    status: 'in_progress',
  }).sort({ startedAt: -1 });
}

async function expireIfNeeded(attempt, questions) {
  if (!attempt?.expiresAt || attempt.status !== 'in_progress') return attempt;
  if (new Date() < new Date(attempt.expiresAt)) return attempt;
  attempt.status = 'timed_out';
  attempt.submittedAt = new Date();
  if (Array.isArray(questions) && questions.length > 0) {
    const graded = gradeAnswers(questions, attempt.answers || {});
    attempt.score = graded.score;
    attempt.correctCount = graded.correct;
    attempt.questionCount = graded.total;
  }
  await attempt.save();
  return attempt;
}

module.exports = {
  mcqAnswerIndex,
  defaultQuizSettings,
  sanitizeQuestionForClient,
  shuffleWithSeed,
  findLesson,
  assertCatalogAccess,
  assertCohortAccess,
  assertAttemptMatchesRoute,
  assertQuizWindow,
  assertQuizDeliveryAccess,
  countFinishedAttempts,
  gradeAnswers,
  getActiveAttempt,
  expireIfNeeded,
};
