const { AppError } = require('../../../shared/errors');
const { cohortRepository, assignmentSubmissionRepository } = require('../repositories');
const { findLesson } = require('./quizExamService');
const { effectiveSchedule, loadScheduleMap } = require('./scheduleResolver');
const { detectAssignmentMime } = require('../lib/assignmentMime');
const { validateStagingFiles } = require('./assignmentStaging');
const { notifyAssignmentSubmitted } = require('./deliveryNotifications');
const { findCourseForLearnerOrEditor } = require('./courseAccess');
const { assertAssignmentDeliveryAccess } = require('./courseContentSecurity');

const MAX_NOTE_LENGTH = 4000;
const DEFAULT_MAX_FILES = 5;

/** Nạp khóa học + bài tập + bản nháp và kiểm tra quyền — chung cho mọi thao tác. */
async function loadAssignmentContext({ slug, lessonSlug, cohortId, req }) {
  const course = await findCourseForLearnerOrEditor(slug, req);
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');

  const lesson = findLesson(course, lessonSlug);
  if (!lesson || lesson.type !== 'assignment') throw AppError.notFound('Không tìm thấy bài tập');

  await assertAssignmentDeliveryAccess({
    course,
    cohortId,
    userId: req.userId,
    userRole: req.userRole,
  });

  const key = {
    userId: req.userId,
    courseId: course._id,
    lessonSlug: lesson.slug,
    cohortId,
  };
  const draft =
    (await assignmentSubmissionRepository.findDraftDoc(key)) ||
    (await assignmentSubmissionRepository.createDraft(key));

  return { course, lesson, cohortId, draft, userId: req.userId };
}

/** Ghi lại kết quả kiểm tra file nháp, chỉ chạm DB khi có gì đó thay đổi. */
async function refreshStagingFiles(draft, { force = false } = {}) {
  const validated = await validateStagingFiles(draft.stagingFiles);
  const changed =
    validated.some((file, i) => file.status !== (draft.stagingFiles[i]?.status || 'ok')) ||
    validated.some((file) => file.status === 'expired');

  if (force || changed) {
    draft.stagingFiles = validated;
    draft.stagingExpired = validated.some((file) => file.status === 'expired');
    await draft.save();
  }
  return validated;
}

async function getDraft(ctx) {
  const { draft, lesson } = ctx;
  const stagingFiles = await refreshStagingFiles(draft);

  return {
    id: draft._id,
    note: draft.note,
    stagingFiles,
    stagingExpired: draft.stagingExpired,
    status: draft.status,
    grade: draft.grade,
    feedback: draft.feedback,
    gradedAt: draft.gradedAt,
    lessonTitle: lesson.title,
    brief: lesson.content || lesson.description,
    submittedFiles: draft.files || [],
  };
}

async function attachStagingFile(ctx, { storageKey, url, name, mime, size }) {
  // Tin phần mở rộng/mime do client khai là không an toàn — dò lại.
  const safeMime = await detectAssignmentMime(null, name, mime);
  if (!safeMime) throw AppError.badRequest('Định dạng file không được phép');

  const { draft, lesson } = ctx;
  const maxFiles = lesson.assignmentSettings?.maxFiles ?? DEFAULT_MAX_FILES;
  if ((draft.stagingFiles || []).length >= maxFiles) {
    throw AppError.badRequest(`Tối đa ${maxFiles} file`);
  }

  draft.stagingFiles.push({
    storageKey,
    url,
    name: String(name || '').slice(0, 255),
    mime: safeMime,
    size: Number(size) || 0,
    uploadedAt: new Date(),
    status: 'ok',
  });
  draft.stagingExpired = false;
  await draft.save();

  return draft.stagingFiles;
}

async function validateDraftFiles(ctx) {
  const validated = await refreshStagingFiles(ctx.draft, { force: true });
  return {
    files: validated.map((file) => ({
      storageKey: file.storageKey,
      name: file.name,
      status: file.status,
    })),
    stagingExpired: ctx.draft.stagingExpired,
  };
}

async function submitAssignment(ctx, { note }) {
  const { draft, lesson, course, cohortId, userId } = ctx;

  const validated = await validateStagingFiles(draft.stagingFiles);
  const usableFiles = validated.filter((file) => file.status === 'ok');
  if (usableFiles.length === 0) {
    draft.stagingFiles = validated;
    draft.stagingExpired = true;
    await draft.save();
    throw new AppError(
      409,
      'STAGING_FILE_EXPIRED',
      'File nháp đã quá hạn hoặc chưa có file, vui lòng tải lên lại',
    );
  }

  draft.files = usableFiles;
  draft.stagingFiles = [];
  draft.note = String(note || draft.note || '').slice(0, MAX_NOTE_LENGTH);
  draft.status = 'submitted';
  draft.submittedAt = new Date();
  draft.isLate = cohortId ? await isPastDue(lesson, cohortId) : false;
  await draft.save();

  if (cohortId) {
    const cohort = await cohortRepository.findById(cohortId);
    void notifyAssignmentSubmitted({
      teacherId: cohort?.teacherId,
      courseTitle: course.title,
      courseSlug: course.slug,
      cohortId: String(cohortId),
      lessonTitle: lesson.title,
      studentId: userId,
    });
  }

  return { submittedAt: draft.submittedAt, isLate: draft.isLate };
}

async function isPastDue(lesson, cohortId) {
  const schedule = effectiveSchedule(lesson, await loadScheduleMap(cohortId));
  return Boolean(schedule.dueAt && new Date() > new Date(schedule.dueAt));
}

module.exports = {
  loadAssignmentContext,
  getDraft,
  attachStagingFile,
  validateDraftFiles,
  submitAssignment,
};
