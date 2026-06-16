const express = require('express');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const Cohort = require('../models/Cohort');
const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const { authMiddleware } = require('../../../shared/jwtAuth');
const {
  defaultQuizSettings,
  sanitizeQuestionForClient,
  findLesson,
  assertAttemptMatchesRoute,
  assertQuizDeliveryAccess,
  countFinishedAttempts,
  gradeAnswers,
  getActiveAttempt,
  expireIfNeeded,
  clientAnswersToOriginal,
  clientAnswersFromOriginal,
  originalAnswerToClient,
} = require('../services/quizExamService');
const { findCourseForLearnerOrEditor } = require('../services/courseAccess');

const router = express.Router({ mergeParams: true });
const examRouter = express.Router({ mergeParams: true });

function parseCohortId(req) {
  const raw = req.params.cohortId;
  if (!raw || raw === 'catalog') return null;
  return raw;
}

async function loadCourseAndLesson(slug, lessonSlug, req) {
  const course = req
    ? await findCourseForLearnerOrEditor(slug, req)
    : await Course.findOne({ slug, published: true });
  if (!course) {
    const err = new Error('Không tìm thấy khóa học');
    err.status = 404;
    throw err;
  }
  const lesson = findLesson(course, lessonSlug);
  if (!lesson || lesson.type !== 'quiz') {
    const err = new Error('Không tìm thấy bài kiểm tra');
    err.status = 404;
    throw err;
  }
  const questions = Array.isArray(lesson.quizQuestions) ? lesson.quizQuestions : [];
  if (questions.length === 0) {
    const err = new Error('Bài kiểm tra chưa có câu hỏi');
    err.status = 400;
    throw err;
  }
  return { course, lesson, questions };
}

async function resolveCohort(cohortId, course) {
  if (!cohortId) return null;
  const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id, status: 'open' });
  if (!cohort) {
    const err = new Error('Không tìm thấy lớp học');
    err.status = 404;
    throw err;
  }
  return cohort;
}

async function ensureQuizDeliveryAccess(req, course, lesson) {
  const cohortId = parseCohortId(req);
  const cohort = cohortId ? await resolveCohort(cohortId, course) : null;
  await assertQuizDeliveryAccess({
    course,
    lesson,
    cohortId: cohort?._id || null,
    userId: req.userId,
    userRole: req.userRole,
    CohortActivitySchedule,
  });
  return cohort;
}

/** GET session — questions without answers */
examRouter.get('/session', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson, questions } = await loadCourseAndLesson(req.params.slug, req.params.lessonSlug, req);
    const cohort = await ensureQuizDeliveryAccess(req, course, lesson);

    const settings = defaultQuizSettings(lesson.quizSettings);
    const shuffleSeed = `${req.userId}:${lesson.slug}:${cohort?._id || 'catalog'}`;
    const sanitized = questions.map((q, i) =>
      sanitizeQuestionForClient(q, i, {
        shuffleOptions: settings.shuffleOptions,
        seed: shuffleSeed,
      }),
    );

    const finishedAttempts = await QuizAttempt.find({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId: cohort?._id || null,
      status: { $in: ['submitted', 'timed_out'] },
    }).lean();
    const attemptsUsed = countFinishedAttempts(finishedAttempts);
    const maxAttempts = settings.maxAttempts ?? 1;
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);
    const activeAttempt = await getActiveAttempt({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId: cohort?._id || null,
    });

    res.json({
      success: true,
      data: {
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
          canStartNew: attemptsRemaining > 0 || (activeAttempt && activeAttempt.status === 'in_progress'),
          bestScore:
            finishedAttempts.length > 0
              ? Math.max(...finishedAttempts.map((a) => (typeof a.score === 'number' ? a.score : 0)))
              : null,
        },
      },
    });
  } catch (err) {
    console.error('[exam] session error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code,
      error: err.message || 'Lỗi server',
    });
  }
});

/** GET active attempt */
examRouter.get('/attempts/active', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson, questions } = await loadCourseAndLesson(req.params.slug, req.params.lessonSlug, req);
    const cohort = await ensureQuizDeliveryAccess(req, course, lesson);

    let attempt = await getActiveAttempt({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId: cohort?._id || null,
    });
    if (attempt) attempt = await expireIfNeeded(attempt, questions);

    res.json({
      success: true,
      data: attempt
        ? {
            id: attempt._id,
            answers: clientAnswersFromOriginal(questions, attempt.answers || {}),
            revision: attempt.revision,
            lockedQuestionIds: attempt.lockedQuestionIds || [],
            expiresAt: attempt.expiresAt,
            startedAt: attempt.startedAt,
            status: attempt.status,
          }
        : null,
    });
  } catch (err) {
    console.error('[exam] active error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

/** POST start attempt */
examRouter.post('/attempts', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson, questions } = await loadCourseAndLesson(req.params.slug, req.params.lessonSlug, req);
    const cohort = await ensureQuizDeliveryAccess(req, course, lesson);

    const settings = defaultQuizSettings(lesson.quizSettings);
    const existing = await getActiveAttempt({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId: cohort?._id || null,
    });
    if (existing) {
      const fresh = await expireIfNeeded(existing, questions);
      if (fresh.status === 'in_progress') {
        return res.json({
          success: true,
          data: { id: fresh._id, revision: fresh.revision, expiresAt: fresh.expiresAt },
        });
      }
    }

    if (settings.maxAttempts != null) {
      const finished = await QuizAttempt.find({
        userId: req.userId,
        courseId: course._id,
        lessonSlug: lesson.slug,
        cohortId: cohort?._id || null,
        status: { $in: ['submitted', 'timed_out'] },
      }).lean();
      if (countFinishedAttempts(finished) >= settings.maxAttempts) {
        return res.status(403).json({
          success: false,
          code: 'max_attempts',
          error: 'Bạn đã hết lượt làm bài',
        });
      }
    }

    const startedAt = new Date();
    let expiresAt = null;
    if (settings.timeLimitMinutes) {
      expiresAt = new Date(startedAt.getTime() + settings.timeLimitMinutes * 60 * 1000);
    }

    const attempt = await QuizAttempt.create({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId: cohort?._id || null,
      answers: {},
      lockedQuestionIds: [],
      status: 'in_progress',
      revision: 0,
      startedAt,
      lastSavedAt: startedAt,
      expiresAt,
      questionCount: questions.length,
    });

    res.status(201).json({
      success: true,
      data: { id: attempt._id, revision: 0, expiresAt: attempt.expiresAt },
    });
  } catch (err) {
    console.error('[exam] start error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

/** PATCH checkpoint */
examRouter.patch('/attempts/:attemptId/checkpoint', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson, questions } = await loadCourseAndLesson(req.params.slug, req.params.lessonSlug, req);
    await ensureQuizDeliveryAccess(req, course, lesson);
    const { answers, revision } = req.body || {};
    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt || attempt.userId !== req.userId) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy lượt làm bài' });
    }
    assertAttemptMatchesRoute(attempt, { courseId: course._id, cohortIdFromRoute: cohortId });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, error: 'Lượt làm bài đã kết thúc' });
    }
    const rev = Number(revision);
    if (!Number.isFinite(rev) || rev <= attempt.revision) {
      return res.status(409).json({ success: false, code: 'stale_revision', error: 'Dữ liệu cũ, bỏ qua' });
    }
    if (answers && typeof answers === 'object') {
      attempt.answers = clientAnswersToOriginal(questions, answers);
    }
    attempt.revision = rev;
    attempt.lastSavedAt = new Date();
    await attempt.save();
    res.json({ success: true, revision: attempt.revision });
  } catch (err) {
    console.error('[exam] checkpoint error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** POST submit */
examRouter.post('/attempts/:attemptId/submit', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { answers } = req.body || {};
    const { course, lesson, questions } = await loadCourseAndLesson(req.params.slug, req.params.lessonSlug, req);
    await ensureQuizDeliveryAccess(req, course, lesson);
    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt || attempt.userId !== req.userId) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy lượt làm bài' });
    }
    assertAttemptMatchesRoute(attempt, { courseId: course._id, cohortIdFromRoute: cohortId });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, error: 'Lượt làm bài đã nộp' });
    }

    const mergedRaw = { ...(attempt.answers || {}), ...(answers && typeof answers === 'object' ? answers : {}) };
    const merged = clientAnswersToOriginal(questions, mergedRaw);
    const graded = gradeAnswers(questions, merged);
    const settings = defaultQuizSettings(lesson.quizSettings);

    attempt.answers = merged;
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.score = graded.score;
    attempt.correctCount = graded.correct;
    attempt.questionCount = graded.total;
    await attempt.save();

    const reveal =
      settings.revealMode === 'never'
        ? { score: graded.score, correctCount: graded.correct, total: graded.total }
        : {
            score: graded.score,
            correctCount: graded.correct,
            total: graded.total,
            perQuestion: graded.perQuestion,
          };

    res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        passed: settings.passingScorePct != null ? graded.score >= settings.passingScorePct : true,
        reveal,
      },
    });
  } catch (err) {
    console.error('[exam] submit error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

/** POST confirm single question (after_each_question) */
examRouter.post('/attempts/:attemptId/confirm-question', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { questionId, answer } = req.body || {};
    if (!questionId) {
      return res.status(400).json({ success: false, error: 'Thiếu questionId' });
    }
    const { course, lesson, questions } = await loadCourseAndLesson(req.params.slug, req.params.lessonSlug, req);
    await ensureQuizDeliveryAccess(req, course, lesson);
    const settings = defaultQuizSettings(lesson.quizSettings);
    if (settings.revealMode !== 'after_each_question') {
      return res.status(400).json({ success: false, error: 'Chế độ không hỗ trợ xác nhận từng câu' });
    }

    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt || attempt.userId !== req.userId || attempt.status !== 'in_progress') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy lượt làm bài' });
    }
    assertAttemptMatchesRoute(attempt, { courseId: course._id, cohortIdFromRoute: cohortId });
    const locked = new Set(attempt.lockedQuestionIds || []);
    if (locked.has(questionId)) {
      return res.status(400).json({ success: false, error: 'Câu hỏi đã khóa' });
    }

    const q = questions.find((x, i) => (x.id || `q-${i}`) === questionId);
    if (!q) return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi' });

    const mappedAnswer = clientAnswersToOriginal([q], { [questionId]: answer })[questionId];
    const graded = gradeAnswers([q], { [questionId]: mappedAnswer });
    const row = graded.perQuestion[0];
    attempt.answers = { ...(attempt.answers || {}), [questionId]: mappedAnswer };
    attempt.lockedQuestionIds = [...locked, questionId];
    attempt.lastSavedAt = new Date();
    await attempt.save();

    res.json({
      success: true,
      data: {
        questionId,
        correct: row.correct,
        correctIndex: originalAnswerToClient(q, row.correctIndex),
        explanation: row.explanation,
      },
    });
  } catch (err) {
    console.error('[exam] confirm error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.use('/:slug/exam/:lessonSlug', examRouter);
router.use('/:slug/cohort/:cohortId/exam/:lessonSlug', examRouter);

module.exports = router;
