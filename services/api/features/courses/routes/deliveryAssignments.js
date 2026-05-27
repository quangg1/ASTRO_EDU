const express = require('express');
const Course = require('../models/Course');
const Cohort = require('../models/Cohort');
const Enrollment = require('../models/Enrollment');
const CohortEnrollment = require('../models/CohortEnrollment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { findLesson, assertCatalogAccess } = require('../services/quizExamService');
const { effectiveSchedule, loadScheduleMap } = require('../services/scheduleResolver');
const { detectAssignmentMime } = require('../lib/assignmentMime');
const { validateStagingFiles } = require('../services/assignmentStaging');
const {
  notifyAssignmentSubmitted,
  notifyAssignmentGraded,
} = require('../services/deliveryNotifications');
const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const { findCourseForLearnerOrEditor } = require('../services/courseAccess');

const router = express.Router({ mergeParams: true });
const assignmentRouter = express.Router({ mergeParams: true });

function parseCohortId(req) {
  const raw = req.params.cohortId;
  if (!raw || raw === 'catalog') return null;
  return raw;
}

async function loadAssignmentLesson(slug, lessonSlug, req) {
  const course = req
    ? await findCourseForLearnerOrEditor(slug, req)
    : await Course.findOne({ slug, published: true });
  if (!course) {
    const err = new Error('Không tìm thấy khóa học');
    err.status = 404;
    throw err;
  }
  const lesson = findLesson(course, lessonSlug);
  if (!lesson || lesson.type !== 'assignment') {
    const err = new Error('Không tìm thấy bài tập');
    err.status = 404;
    throw err;
  }
  return { course, lesson };
}

async function getOrCreateDraft({ userId, courseId, lessonSlug, cohortId }) {
  let doc = await AssignmentSubmission.findOne({
    userId,
    courseId,
    lessonSlug,
    cohortId: cohortId || null,
  });
  if (!doc) {
    doc = await AssignmentSubmission.create({
      userId,
      courseId,
      lessonSlug,
      cohortId: cohortId || null,
      status: 'draft',
      stagingFiles: [],
      files: [],
    });
  }
  return doc;
}

/** GET draft */
assignmentRouter.get('/draft', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson } = await loadAssignmentLesson(req.params.slug, req.params.lessonSlug, req);
    if (cohortId) {
      const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const en = await CohortEnrollment.findOne({ cohortId, userId: req.userId });
      if (!en) return res.status(403).json({ success: false, error: 'Chưa tham gia lớp' });
    } else {
      await assertCatalogAccess({ course, userId: req.userId });
    }
    const draft = await getOrCreateDraft({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId,
    });
    const validated = await validateStagingFiles(draft.stagingFiles);
    if (
      validated.some((f, i) => f.status !== (draft.stagingFiles[i]?.status || 'ok')) ||
      validated.some((f) => f.status === 'expired')
    ) {
      draft.stagingFiles = validated;
      draft.stagingExpired = validated.some((f) => f.status === 'expired');
      await draft.save();
    }
    res.json({
      success: true,
      data: {
        id: draft._id,
        note: draft.note,
        stagingFiles: validated,
        stagingExpired: draft.stagingExpired,
        status: draft.status,
        lessonTitle: lesson.title,
        brief: lesson.content || lesson.description,
      },
    });
  } catch (err) {
    console.error('[assignment] draft error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

/** POST attach staged file metadata (after /upload) */
assignmentRouter.post('/staging-files', authMiddleware, async (req, res) => {
  try {
    const { storageKey, url, name, mime, size } = req.body || {};
    if (!storageKey || !url) {
      return res.status(400).json({ success: false, error: 'Thiếu storageKey hoặc url' });
    }
    const safeMime = await detectAssignmentMime(null, name, mime);
    if (!safeMime) {
      return res.status(400).json({ success: false, error: 'Định dạng file không được phép' });
    }
    const cohortId = parseCohortId(req);
    const { course, lesson } = await loadAssignmentLesson(req.params.slug, req.params.lessonSlug, req);
    if (cohortId) {
      const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const en = await CohortEnrollment.findOne({ cohortId, userId: req.userId });
      if (!en) return res.status(403).json({ success: false, error: 'Chưa tham gia lớp' });
    } else {
      await assertCatalogAccess({ course, userId: req.userId });
    }
    const draft = await getOrCreateDraft({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId,
    });
    const maxFiles = lesson.assignmentSettings?.maxFiles ?? 5;
    if ((draft.stagingFiles || []).length >= maxFiles) {
      return res.status(400).json({ success: false, error: `Tối đa ${maxFiles} file` });
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
    res.json({ success: true, data: draft.stagingFiles });
  } catch (err) {
    console.error('[assignment] staging error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

/** POST validate staging files (headObject / age) */
assignmentRouter.post('/validate-files', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson } = await loadAssignmentLesson(req.params.slug, req.params.lessonSlug, req);
    if (cohortId) {
      const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const en = await CohortEnrollment.findOne({ cohortId, userId: req.userId });
      if (!en) return res.status(403).json({ success: false, error: 'Chưa tham gia lớp' });
    } else {
      await assertCatalogAccess({ course, userId: req.userId });
    }
    const draft = await getOrCreateDraft({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId,
    });
    const validated = await validateStagingFiles(draft.stagingFiles);
    draft.stagingFiles = validated;
    draft.stagingExpired = validated.some((f) => f.status === 'expired');
    await draft.save();
    res.json({
      success: true,
      data: {
        files: validated.map((f) => ({
          storageKey: f.storageKey,
          name: f.name,
          status: f.status,
        })),
        stagingExpired: draft.stagingExpired,
      },
    });
  } catch (err) {
    console.error('[assignment] validate-files error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

/** POST validate + submit */
assignmentRouter.post('/submit', authMiddleware, async (req, res) => {
  try {
    const cohortId = parseCohortId(req);
    const { course, lesson } = await loadAssignmentLesson(req.params.slug, req.params.lessonSlug, req);
    if (cohortId) {
      const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const en = await CohortEnrollment.findOne({ cohortId, userId: req.userId });
      if (!en) return res.status(403).json({ success: false, error: 'Chưa tham gia lớp' });
    } else {
      await assertCatalogAccess({ course, userId: req.userId });
    }
    const draft = await getOrCreateDraft({
      userId: req.userId,
      courseId: course._id,
      lessonSlug: lesson.slug,
      cohortId,
    });
    const validated = await validateStagingFiles(draft.stagingFiles);
    const okFiles = validated.filter((f) => f.status === 'ok');
    if (okFiles.length === 0) {
      draft.stagingFiles = validated;
      draft.stagingExpired = true;
      await draft.save();
      return res.status(409).json({
        success: false,
        code: 'STAGING_FILE_EXPIRED',
        error: 'File nháp đã quá hạn hoặc chưa có file, vui lòng tải lên lại',
      });
    }
    let isLate = false;
    if (cohortId) {
      const map = await loadScheduleMap(CohortActivitySchedule, cohortId);
      const schedule = effectiveSchedule(lesson, map);
      if (schedule.dueAt && new Date() > new Date(schedule.dueAt)) isLate = true;
    }
    draft.files = okFiles;
    draft.stagingFiles = [];
    draft.note = String(req.body?.note || draft.note || '').slice(0, 4000);
    draft.status = 'submitted';
    draft.submittedAt = new Date();
    draft.isLate = isLate;
    await draft.save();
    if (cohortId) {
      const cohort = await Cohort.findById(cohortId).lean();
      void notifyAssignmentSubmitted({
        teacherId: cohort?.teacherId,
        courseTitle: course.title,
        courseSlug: course.slug,
        cohortId: String(cohortId),
        lessonTitle: lesson.title,
        studentId: req.userId,
      });
    }
    res.json({ success: true, data: { submittedAt: draft.submittedAt, isLate } });
  } catch (err) {
    console.error('[assignment] submit error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.use('/:slug/assignment/:lessonSlug', assignmentRouter);
router.use('/:slug/cohort/:cohortId/assignment/:lessonSlug', assignmentRouter);

module.exports = router;
