const { AppError } = require('../../../shared/errors');
const { cohortRepository, quizAttemptRepository } = require('../repositories');
const {
  defaultQuizSettings,
  sanitizeQuestionForClient,
  findLesson,
  assertAttemptMatchesRoute,
  countFinishedAttempts,
  gradeAnswers,
  getActiveAttempt,
  expireIfNeeded,
  clientAnswersToOriginal,
  clientAnswersFromOriginal,
  originalAnswerToClient,
} = require('./quizExamService');
const { assertQuizDeliveryAccess } = require('./courseContentSecurity');
const { findCourseForLearnerOrEditor } = require('./courseAccess');

/**
 * Mọi endpoint làm bài đều bắt đầu bằng cùng một việc: xác định khóa học, bài
 * quiz, lớp học và quyền truy cập. Gom vào một chỗ để controller chỉ còn phần
 * riêng của từng thao tác.
 */
async function loadQuizContext({ slug, lessonSlug, cohortId, req }) {
  const course = await findCourseForLearnerOrEditor(slug, req);
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');

  const lesson = findLesson(course, lessonSlug);
  if (!lesson || lesson.type !== 'quiz') throw AppError.notFound('Không tìm thấy bài kiểm tra');

  const questions = Array.isArray(lesson.quizQuestions) ? lesson.quizQuestions : [];
  if (questions.length === 0) throw AppError.badRequest('Bài kiểm tra chưa có câu hỏi');

  const cohort = cohortId ? await resolveOpenCohort(cohortId, course) : null;
  await assertQuizDeliveryAccess({
    course,
    lesson,
    cohortId: cohort?._id || null,
    userId: req.userId,
    userRole: req.userRole,
  });

  return { course, lesson, questions, cohort, cohortId, userId: req.userId };
}

async function resolveOpenCohort(cohortId, course) {
  const cohort = await cohortRepository.findOne({
    _id: cohortId,
    courseId: course._id,
    status: 'open',
  });
  if (!cohort) throw AppError.notFound('Không tìm thấy lớp học');
  return cohort;
}

const attemptKey = (ctx) => ({
  userId: ctx.userId,
  courseId: ctx.course._id,
  lessonSlug: ctx.lesson.slug,
  cohortId: ctx.cohort?._id || null,
});

async function buildSession(ctx) {
  const { course, lesson, questions, cohort, userId } = ctx;
  const settings = defaultQuizSettings(lesson.quizSettings);

  // Trộn đáp án theo seed cố định để người học tải lại trang vẫn thấy thứ tự cũ.
  const seed = `${userId}:${lesson.slug}:${cohort?._id || 'catalog'}`;
  const sanitized = questions.map((question, index) =>
    sanitizeQuestionForClient(question, index, {
      shuffleOptions: settings.shuffleOptions,
      seed,
    }),
  );

  const [finishedAttempts, activeAttempt] = await Promise.all([
    quizAttemptRepository.listFinishedForLesson(attemptKey(ctx)),
    getActiveAttempt(attemptKey(ctx)),
  ]);

  const attemptsUsed = countFinishedAttempts(finishedAttempts);
  const maxAttempts = settings.maxAttempts ?? 1;
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

  return {
    courseSlug: course.slug,
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    cohortId: cohort ? String(cohort._id) : null,
    settings,
    questions: sanitized,
    questionCount: sanitized.length,
    attemptStats: {
      maxAttempts,
      attemptsUsed,
      attemptsRemaining,
      canStartNew:
        attemptsRemaining > 0 || (activeAttempt && activeAttempt.status === 'in_progress'),
      bestScore: finishedAttempts.length
        ? Math.max(...finishedAttempts.map((a) => (typeof a.score === 'number' ? a.score : 0)))
        : null,
    },
  };
}

async function getActiveAttemptView(ctx) {
  let attempt = await getActiveAttempt(attemptKey(ctx));
  if (attempt) attempt = await expireIfNeeded(attempt, ctx.questions);
  if (!attempt) return null;

  return {
    id: attempt._id,
    answers: clientAnswersFromOriginal(ctx.questions, attempt.answers || {}),
    revision: attempt.revision,
    lockedQuestionIds: attempt.lockedQuestionIds || [],
    expiresAt: attempt.expiresAt,
    startedAt: attempt.startedAt,
    status: attempt.status,
  };
}

/**
 * @returns {{ resumed: boolean, attempt: object }} `resumed` để controller biết
 * trả 200 (tiếp tục lượt cũ) hay 201 (tạo lượt mới).
 */
async function startAttempt(ctx) {
  const settings = defaultQuizSettings(ctx.lesson.quizSettings);

  const existing = await getActiveAttempt(attemptKey(ctx));
  if (existing) {
    const fresh = await expireIfNeeded(existing, ctx.questions);
    if (fresh.status === 'in_progress') {
      return {
        resumed: true,
        attempt: { id: fresh._id, revision: fresh.revision, expiresAt: fresh.expiresAt },
      };
    }
  }

  if (settings.maxAttempts != null) {
    const finished = await quizAttemptRepository.listFinishedForLesson(attemptKey(ctx));
    if (countFinishedAttempts(finished) >= settings.maxAttempts) {
      throw new AppError(403, 'max_attempts', 'Bạn đã hết lượt làm bài');
    }
  }

  const startedAt = new Date();
  const attempt = await quizAttemptRepository.create({
    ...attemptKey(ctx),
    answers: {},
    lockedQuestionIds: [],
    status: 'in_progress',
    revision: 0,
    startedAt,
    lastSavedAt: startedAt,
    expiresAt: settings.timeLimitMinutes
      ? new Date(startedAt.getTime() + settings.timeLimitMinutes * 60 * 1000)
      : null,
    questionCount: ctx.questions.length,
  });

  return {
    resumed: false,
    attempt: { id: attempt._id, revision: 0, expiresAt: attempt.expiresAt },
  };
}

async function loadOwnAttempt(ctx, attemptId, { requireInProgress = false } = {}) {
  const attempt = await quizAttemptRepository.findDocById(attemptId);
  if (!attempt || attempt.userId !== ctx.userId) {
    throw AppError.notFound('Không tìm thấy lượt làm bài');
  }
  assertAttemptMatchesRoute(attempt, {
    courseId: ctx.course._id,
    cohortIdFromRoute: ctx.cohortId,
  });
  if (requireInProgress && attempt.status !== 'in_progress') {
    throw AppError.notFound('Không tìm thấy lượt làm bài');
  }
  return attempt;
}

async function saveCheckpoint(ctx, { attemptId, answers, revision }) {
  const attempt = await loadOwnAttempt(ctx, attemptId);
  if (attempt.status !== 'in_progress') {
    throw AppError.badRequest('Lượt làm bài đã kết thúc');
  }

  // Client gửi song song nhiều checkpoint; chỉ bản mới hơn được ghi đè.
  const rev = Number(revision);
  if (!Number.isFinite(rev) || rev <= attempt.revision) {
    throw new AppError(409, 'stale_revision', 'Dữ liệu cũ, bỏ qua');
  }

  if (answers && typeof answers === 'object') {
    attempt.answers = clientAnswersToOriginal(ctx.questions, answers);
  }
  attempt.revision = rev;
  attempt.lastSavedAt = new Date();
  await attempt.save();

  return attempt.revision;
}

async function submitAttempt(ctx, { attemptId, answers }) {
  const attempt = await loadOwnAttempt(ctx, attemptId);
  if (attempt.status !== 'in_progress') throw AppError.badRequest('Lượt làm bài đã nộp');

  const merged = clientAnswersToOriginal(ctx.questions, {
    ...(attempt.answers || {}),
    ...(answers && typeof answers === 'object' ? answers : {}),
  });
  const graded = gradeAnswers(ctx.questions, merged);
  const settings = defaultQuizSettings(ctx.lesson.quizSettings);

  attempt.answers = merged;
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.score = graded.score;
  attempt.correctCount = graded.correct;
  attempt.questionCount = graded.total;
  await attempt.save();

  const summary = { score: graded.score, correctCount: graded.correct, total: graded.total };
  return {
    attemptId: attempt._id,
    passed: settings.passingScorePct != null ? graded.score >= settings.passingScorePct : true,
    reveal:
      settings.revealMode === 'never'
        ? summary
        : { ...summary, perQuestion: graded.perQuestion },
  };
}

async function confirmQuestion(ctx, { attemptId, questionId, answer }) {
  const settings = defaultQuizSettings(ctx.lesson.quizSettings);
  if (settings.revealMode !== 'after_each_question') {
    throw AppError.badRequest('Chế độ không hỗ trợ xác nhận từng câu');
  }

  const attempt = await loadOwnAttempt(ctx, attemptId, { requireInProgress: true });
  const locked = new Set(attempt.lockedQuestionIds || []);
  if (locked.has(questionId)) throw AppError.badRequest('Câu hỏi đã khóa');

  const question = ctx.questions.find((q, i) => (q.id || `q-${i}`) === questionId);
  if (!question) throw AppError.notFound('Không tìm thấy câu hỏi');

  const mapped = clientAnswersToOriginal([question], { [questionId]: answer })[questionId];
  const row = gradeAnswers([question], { [questionId]: mapped }).perQuestion[0];

  attempt.answers = { ...(attempt.answers || {}), [questionId]: mapped };
  attempt.lockedQuestionIds = [...locked, questionId];
  attempt.lastSavedAt = new Date();
  await attempt.save();

  return {
    questionId,
    correct: row.correct,
    correctIndex: originalAnswerToClient(question, row.correctIndex),
    explanation: row.explanation,
  };
}

module.exports = {
  loadQuizContext,
  buildSession,
  getActiveAttemptView,
  startAttempt,
  saveCheckpoint,
  submitAttempt,
  confirmQuestion,
};
