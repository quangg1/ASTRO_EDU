const { assignmentSubmissionRepository, quizAttemptRepository } = require('../repositories');
const { getDisplayNameMap } = require('../../auth/services/userDirectoryService');
const { notifyAssignmentGraded } = require('./deliveryNotifications');
const { defaultQuizSettings } = require('./quizExamService');
const { AppError } = require('../../../shared/errors');
const presenter = require('../presenters/cohortPresenter');

const GRADE_MIN = 0;
const GRADE_MAX = 100;
const ANONYMOUS_NAME_LENGTH = 8;

function lessonTitleMap(course) {
  return new Map((course.lessons || []).map((lesson) => [lesson.slug, lesson.title]));
}

function fallbackName(userId) {
  return String(userId).slice(0, ANONYMOUS_NAME_LENGTH);
}

/** Teacher inbox of assignment submissions for one cohort. */
async function listSubmissions({ course, cohort, status }) {
  const rows = await assignmentSubmissionRepository.listInbox({
    cohortId: cohort._id,
    courseId: course._id,
    status,
  });
  if (!rows.length) return [];

  const [names, titles] = [await getDisplayNameMap(rows.map((r) => r.userId)), lessonTitleMap(course)];
  return rows.map((row) =>
    presenter.submissionRow(row, {
      studentName: names[String(row.userId)] || fallbackName(row.userId),
      lessonTitle: titles.get(row.lessonSlug) || row.lessonSlug,
    }),
  );
}

/**
 * Records a grade. Setting a numeric grade implicitly marks the submission
 * graded, matching how the teacher UI submits the form.
 */
async function gradeSubmission({ course, submissionId, graderId, input }) {
  const submission = await assignmentSubmissionRepository.findDocById(submissionId);
  if (!submission) throw AppError.notFound('Không tìm thấy bài nộp');

  if (input.grade != null) {
    submission.grade = Math.min(GRADE_MAX, Math.max(GRADE_MIN, input.grade));
  }
  if (input.feedback !== undefined) submission.feedback = input.feedback;

  if (input.status === 'graded' || input.grade != null) {
    submission.status = 'graded';
    submission.gradedBy = graderId;
    submission.gradedAt = new Date();
  }
  await submission.save();

  const lesson = (course.lessons || []).find((l) => l.slug === submission.lessonSlug);
  void notifyAssignmentGraded({
    userId: submission.userId,
    courseTitle: course.title,
    courseSlug: course.slug,
    cohortId: submission.cohortId ? String(submission.cohortId) : null,
    lessonSlug: submission.lessonSlug,
    lessonTitle: lesson?.title || submission.lessonSlug,
    grade: submission.grade,
  });

  return submission;
}

/**
 * Quiz attempts collapsed into one row per (student, lesson), newest activity
 * first, with the best score and per-attempt history.
 */
async function summarizeQuizAttempts({ course, cohort }) {
  const attempts = await quizAttemptRepository.listGradedForCohort({
    courseId: course._id,
    cohortId: cohort._id,
  });
  if (!attempts.length) return [];

  const names = await getDisplayNameMap(attempts.map((a) => a.userId));
  const lessonsBySlug = new Map((course.lessons || []).map((lesson) => [lesson.slug, lesson]));
  const groups = new Map();

  // `attempts` arrives sorted by submittedAt ascending, so attempt numbers and
  // "latest attempt" follow insertion order.
  for (const attempt of attempts) {
    const key = `${attempt.userId}::${attempt.lessonSlug}`;
    if (!groups.has(key)) {
      const lesson = lessonsBySlug.get(attempt.lessonSlug);
      groups.set(key, {
        userId: attempt.userId,
        studentName: names[String(attempt.userId)] || fallbackName(attempt.userId),
        lessonSlug: attempt.lessonSlug,
        lessonTitle: lesson?.title || attempt.lessonSlug,
        maxAttempts: defaultQuizSettings(lesson?.quizSettings).maxAttempts ?? 1,
        bestScore: null,
        attemptCount: 0,
        attempts: [],
      });
    }

    const group = groups.get(key);
    const score = typeof attempt.score === 'number' ? attempt.score : null;
    group.attemptCount += 1;
    if (score != null) {
      group.bestScore = group.bestScore == null ? score : Math.max(group.bestScore, score);
    }
    group.attempts.push({
      id: attempt._id,
      attemptNumber: group.attemptCount,
      score,
      correctCount: attempt.correctCount,
      questionCount: attempt.questionCount,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
    });
  }

  const submittedTime = (row) =>
    row.latestAttempt?.submittedAt ? new Date(row.latestAttempt.submittedAt).getTime() : 0;

  return [...groups.values()]
    .map((group) => ({
      ...group,
      attempts: [...group.attempts].reverse(),
      latestAttempt: group.attempts[group.attempts.length - 1] || null,
    }))
    .sort((a, b) => submittedTime(b) - submittedTime(a));
}

module.exports = { listSubmissions, gradeSubmission, summarizeQuizAttempts };
