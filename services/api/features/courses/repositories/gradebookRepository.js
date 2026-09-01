const { BaseRepository } = require('../../../shared/db/BaseRepository');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizAttempt = require('../models/QuizAttempt');

const SUBMISSION_INBOX_LIMIT = 200;
const QUIZ_ATTEMPT_LIMIT = 500;
const GRADED_ATTEMPT_STATUSES = ['submitted', 'timed_out'];

/** Bài nộp là duy nhất theo (học viên, bài học, lớp) — lớp `null` là học lẻ. */
const submissionKey = ({ userId, courseId, lessonSlug, cohortId }) => ({
  userId,
  courseId,
  lessonSlug,
  cohortId: cohortId || null,
});

class AssignmentSubmissionRepository extends BaseRepository {
  constructor() {
    super(AssignmentSubmission);
  }

  listInbox({ cohortId, courseId, status }) {
    const filter = { cohortId, courseId };
    if (status && status !== 'all') filter.status = status;
    return this.findMany(filter, { sort: { submittedAt: -1 }, limit: SUBMISSION_INBOX_LIMIT });
  }

  /** Bản nháp được sửa rồi `save()` nên phải là document sống. */
  findDraftDoc(key) {
    return this.findDocOne(submissionKey(key));
  }

  createDraft(key) {
    return this.create({ ...submissionKey(key), status: 'draft', stagingFiles: [], files: [] });
  }
}

class QuizAttemptRepository extends BaseRepository {
  constructor() {
    super(QuizAttempt);
  }

  listGradedForCohort({ courseId, cohortId }) {
    return this.findMany(
      { courseId, cohortId, status: { $in: GRADED_ATTEMPT_STATUSES } },
      { sort: { submittedAt: 1 }, limit: QUIZ_ATTEMPT_LIMIT },
    );
  }

  listFinishedForLesson({ userId, courseId, lessonSlug, cohortId }) {
    return this.findMany({
      userId,
      courseId,
      lessonSlug,
      cohortId: cohortId || null,
      status: { $in: GRADED_ATTEMPT_STATUSES },
    });
  }

  /** Lượt đang làm dở — trả document sống vì flow chấm/nộp sẽ `save()`. */
  findActiveAttemptDoc({ userId, courseId, lessonSlug, cohortId }) {
    return this.findDocOne(
      { userId, courseId, lessonSlug, cohortId: cohortId || null, status: 'in_progress' },
      { sort: { startedAt: -1 } },
    );
  }
}

module.exports = {
  assignmentSubmissionRepository: new AssignmentSubmissionRepository(),
  quizAttemptRepository: new QuizAttemptRepository(),
  AssignmentSubmissionRepository,
  QuizAttemptRepository,
};
