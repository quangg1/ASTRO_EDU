const express = require('express');
const crypto = require('crypto');
const Course = require('../models/Course');
const Cohort = require('../models/Cohort');
const CohortEnrollment = require('../models/CohortEnrollment');
const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizAttempt = require('../models/QuizAttempt');
const { authMiddleware, requireRole, canEditCourse } = require('../../../shared/jwtAuth');
const { courseRequiresPayment } = require('../lib/coursePricing');
const Enrollment = require('../models/Enrollment');
const { loadScheduleMap, buildSyllabusLessons, scheduleMapFromRows } = require('../services/scheduleResolver');
const { scheduleItemToUtcFields } = require('../services/scheduleTz');
const { notifyAssignmentGraded } = require('../services/deliveryNotifications');
const { findCourseForLearnerOrEditor } = require('../services/courseAccess');
const {
  isCohortEnrollmentOpen,
  publicCohortCard,
  loadEnrollableCohort,
  placeStudentInCohort,
} = require('../services/cohortEnrollmentService');

const router = express.Router();

function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

/** GET my cohort enrollments for this course */
router.get('/:slug/cohorts/my', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true }).lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const enrollments = await CohortEnrollment.find({ userId: req.userId }).lean();
    const enMap = Object.fromEntries(enrollments.map((e) => [String(e.cohortId), e]));
    const cohortIds = enrollments.map((e) => e.cohortId);
    const cohorts = await Cohort.find({ _id: { $in: cohortIds }, courseId: course._id })
      .select('title slug status startAt endAt')
      .lean();
    res.json({
      success: true,
      data: cohorts.map((c) => ({
        id: c._id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        startAt: c.startAt,
        endAt: c.endAt,
        inviteEmailSent: Boolean(enMap[String(c._id)]?.inviteCodeEmailSentAt),
      })),
    });
  } catch (err) {
    console.error('[cohorts] my error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET cohorts for a course (public list open cohorts) */
router.get('/:slug/cohorts', async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true }).lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const now = new Date();
    const cohorts = await Cohort.find({ courseId: course._id, status: 'open' })
      .select('title slug startAt endAt timezone status')
      .sort({ startAt: 1 })
      .lean();
    const data = cohorts
      .map((c) => publicCohortCard(c, now))
      .filter((c) => c.enrollmentOpen);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[cohorts] list error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET all cohorts for teacher (includes invite code, draft) */
router.get('/:slug/cohorts/manage', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    if (req.userRole === 'teacher' && course.teacherId && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
      return res.status(403).json({ success: false, error: 'Không có quyền' });
    }
    const cohorts = await Cohort.find({ courseId: course._id }).sort({ createdAt: -1 }).lean();
    const counts = await CohortEnrollment.aggregate([
      { $match: { cohortId: { $in: cohorts.map((c) => c._id) } } },
      { $group: { _id: '$cohortId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((r) => [String(r._id), r.count]));
    res.json({
      success: true,
      data: cohorts.map((c) => ({
        id: c._id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        timezone: c.timezone,
        inviteCode: c.inviteCode,
        startAt: c.startAt,
        endAt: c.endAt,
        studentCount: countMap[String(c._id)] || 0,
      })),
    });
  } catch (err) {
    console.error('[cohorts] manage error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** POST create cohort (teacher) */
router.post('/:slug/cohorts', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const title = String(req.body?.title || '').trim() || `${course.title} — Lớp mới`;
    const baseSlug = slugify(req.body?.slug || title) || `cohort-${Date.now()}`;
    let slug = baseSlug;
    let n = 0;
    while (await Cohort.findOne({ courseId: course._id, slug })) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const cohort = await Cohort.create({
      courseId: course._id,
      title,
      slug,
      timezone: req.body?.timezone || 'Asia/Ho_Chi_Minh',
      status: req.body?.status === 'open' ? 'open' : 'draft',
      startAt: req.body?.startAt ? new Date(req.body.startAt) : null,
      endAt: req.body?.endAt ? new Date(req.body.endAt) : null,
      inviteCode,
      teacherId: req.userRole === 'teacher' ? req.userId : req.body?.teacherId || null,
    });
    res.status(201).json({ success: true, data: cohort });
  } catch (err) {
    console.error('[cohorts] create error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/**
 * Đăng ký lớp theo kỳ (chọn lớp trên UI) — khóa miễn phí.
 * Khóa trả phí: dùng checkout kèm cohortId.
 */
router.post('/:slug/cohorts/enroll', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true });
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohortId = String(req.body?.cohortId || '').trim();
    if (!cohortId) {
      return res.status(400).json({ success: false, error: 'Thiếu cohortId' });
    }
    if (courseRequiresPayment(course)) {
      return res.status(402).json({
        success: false,
        code: 'payment_required',
        requiresPayment: true,
        error: 'Khóa trả phí — chọn lớp và thanh toán trên trang khóa học.',
        courseSlug: course.slug,
        courseId: String(course._id),
        amount: Math.round(Number(course.price) || 0),
        currency: course.currency || 'VND',
        cohortId,
      });
    }
    const cohort = await loadEnrollableCohort({ courseId: course._id, cohortId });
    let enrollment = await Enrollment.findOne({ userId: req.userId, courseId: course._id });
    if (!enrollment) {
      const progress = (course.lessons || []).map((l) => ({
        lessonSlug: l.slug,
        completed: false,
        completedAt: null,
      }));
      enrollment = await Enrollment.create({
        userId: req.userId,
        courseId: course._id,
        progress,
      });
    }
    const placement = await placeStudentInCohort({
      userId: req.userId,
      course,
      cohort,
    });
    res.status(201).json({
      success: true,
      data: {
        cohortId: placement.cohortId,
        slug: placement.cohortSlug,
        title: cohort.title,
        inviteEmailSent: placement.emailSent,
        message: 'Mã lớp đã gửi qua email (không hiển thị trên web).',
      },
    });
  } catch (err) {
    if (err.status && err.code) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[cohorts] enroll error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** POST join by mã — tắt với khóa theo kỳ / trả phí (mã chỉ qua email sau đăng ký). */
router.post('/:slug/cohorts/join', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true });
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    if (courseRequiresPayment(course) || course.catalogEnabled === false) {
      return res.status(403).json({
        success: false,
        code: 'invite_code_disabled',
        error:
          'Không nhập mã trên web. Chọn lớp trên trang khóa học, thanh toán (nếu có phí) — mã lớp gửi qua email.',
      });
    }
    const code = String(req.body?.inviteCode || '').trim().toUpperCase();
    const cohort = await Cohort.findOne({ courseId: course._id, inviteCode: code, status: 'open' });
    if (!cohort) return res.status(404).json({ success: false, error: 'Mã lớp không hợp lệ' });
    if (!isCohortEnrollmentOpen(cohort)) {
      return res.status(403).json({ success: false, error: 'Lớp đã đóng đăng ký' });
    }
    const existing = await CohortEnrollment.findOne({ cohortId: cohort._id, userId: req.userId });
    if (existing) {
      return res.json({ success: true, data: { cohortId: cohort._id, slug: cohort.slug } });
    }
    const placement = await placeStudentInCohort({
      userId: req.userId,
      course,
      cohort,
    });
    res.status(201).json({
      success: true,
      data: {
        cohortId: placement.cohortId,
        slug: placement.cohortSlug,
        title: cohort.title,
        inviteEmailSent: placement.emailSent,
      },
    });
  } catch (err) {
    console.error('[cohorts] join error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET syllabus for cohort (batch schedules) */
router.get('/:slug/cohort/:cohortId/syllabus', authMiddleware, async (req, res) => {
  try {
    const course = await findCourseForLearnerOrEditor(req.params.slug, req);
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    const en = await CohortEnrollment.findOne({ cohortId: cohort._id, userId: req.userId });
    const isCourseEditor =
      ['teacher', 'admin'].includes(req.userRole) &&
      (req.userRole === 'admin' || canEditCourse(course, { id: req.userId, role: req.userRole }));
    if (!en && !isCourseEditor) {
      return res.status(403).json({ success: false, error: 'Chưa tham gia lớp' });
    }
    const scheduleMap = await loadScheduleMap(CohortActivitySchedule, cohort._id);
    const modules = [...(course.modules || [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((m) => ({
        _id: m._id,
        title: m.title,
        slug: m.slug,
        icon: m.icon || '',
        order: m.order ?? 0,
        materials: (m.materials || []).map((mat) => ({
          id: mat.id,
          label: mat.label || '',
          kind: mat.kind || 'pdf',
          url: mat.url,
        })),
      }));
    const lessons = buildSyllabusLessons(course, scheduleMap);
    res.json({
      success: true,
      data: {
        cohort: {
          id: cohort._id,
          title: cohort.title,
          slug: cohort.slug,
          timezone: cohort.timezone,
          startAt: cohort.startAt,
          endAt: cohort.endAt,
        },
        course: { slug: course.slug, title: course.title },
        modules,
        lessons,
      },
    });
  } catch (err) {
    console.error('[cohorts] syllabus error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET schedules + lesson list for editor */
router.get('/:slug/cohort/:cohortId/schedules', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id }).lean();
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    const rows = await CohortActivitySchedule.find({ cohortId: cohort._id }).lean();
    const scheduleByLesson = scheduleMapFromRows(rows);
    const lessons = (course.lessons || [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((l) => ({
        slug: l.slug,
        title: l.title,
        type: l.type || 'text',
        moduleId: l.moduleId,
        schedule: scheduleByLesson[l.slug] || { openAt: null, dueAt: null, closeAt: null },
      }));
    res.json({
      success: true,
      data: {
        cohort: {
          id: cohort._id,
          title: cohort.title,
          timezone: cohort.timezone,
          inviteCode: cohort.inviteCode,
          status: cohort.status,
        },
        lessons,
      },
    });
  } catch (err) {
    console.error('[cohorts] get schedules error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** PATCH cohort status / metadata */
router.patch('/:slug/cohort/:cohortId', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    if (req.body?.status && ['draft', 'open', 'closed'].includes(req.body.status)) {
      cohort.status = req.body.status;
    }
    if (req.body?.title) cohort.title = String(req.body.title).trim().slice(0, 200);
    if (req.body?.timezone) cohort.timezone = String(req.body.timezone).trim().slice(0, 64) || 'Asia/Ho_Chi_Minh';
    if (req.body?.startAt !== undefined) {
      cohort.startAt = req.body.startAt ? new Date(req.body.startAt) : null;
    }
    if (req.body?.endAt !== undefined) {
      cohort.endAt = req.body.endAt ? new Date(req.body.endAt) : null;
    }
    await cohort.save();
    res.json({ success: true, data: cohort });
  } catch (err) {
    console.error('[cohorts] patch error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET assignment submissions inbox (teacher) */
router.get('/:slug/cohort/:cohortId/submissions', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    const status = req.query.status || 'submitted';
    const filter = { cohortId: cohort._id, courseId: course._id };
    if (status !== 'all') filter.status = status;
    const rows = await AssignmentSubmission.find(filter).sort({ submittedAt: -1 }).limit(200).lean();
    const lessonMap = Object.fromEntries((course.lessons || []).map((l) => [l.slug, l.title]));
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r._id,
        userId: r.userId,
        lessonSlug: r.lessonSlug,
        lessonTitle: lessonMap[r.lessonSlug] || r.lessonSlug,
        status: r.status,
        submittedAt: r.submittedAt,
        isLate: r.isLate,
        grade: r.grade,
        feedback: r.feedback,
        files: r.files || [],
        note: r.note,
      })),
    });
  } catch (err) {
    console.error('[cohorts] submissions error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** PATCH grade assignment */
router.patch(
  '/:slug/cohort/:cohortId/submissions/:submissionId/grade',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { grade, feedback, status } = req.body || {};
      const course = await Course.findOne({ slug: req.params.slug }).lean();
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      const doc = await AssignmentSubmission.findById(req.params.submissionId);
      if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy bài nộp' });
      if (grade != null && Number.isFinite(Number(grade))) {
        doc.grade = Math.min(100, Math.max(0, Number(grade)));
      }
      if (typeof feedback === 'string') doc.feedback = feedback.slice(0, 4000);
      if (status === 'graded') doc.status = 'graded';
      await doc.save();
      const lesson = (course.lessons || []).find((l) => l.slug === doc.lessonSlug);
      void notifyAssignmentGraded({
        userId: doc.userId,
        courseTitle: course.title,
        courseSlug: course.slug,
        lessonTitle: lesson?.title || doc.lessonSlug,
        grade: doc.grade,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      console.error('[cohorts] grade error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

/** GET quiz attempts summary for cohort */
router.get('/:slug/cohort/:cohortId/quiz-attempts', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    const attempts = await QuizAttempt.find({
      courseId: course._id,
      cohortId: cohort._id,
      status: { $in: ['submitted', 'timed_out'] },
    })
      .sort({ submittedAt: -1 })
      .limit(200)
      .lean();
    const lessonMap = Object.fromEntries((course.lessons || []).map((l) => [l.slug, l.title]));
    res.json({
      success: true,
      data: attempts.map((a) => ({
        id: a._id,
        userId: a.userId,
        lessonSlug: a.lessonSlug,
        lessonTitle: lessonMap[a.lessonSlug] || a.lessonSlug,
        score: a.score,
        correctCount: a.correctCount,
        questionCount: a.questionCount,
        submittedAt: a.submittedAt,
        status: a.status,
      })),
    });
  } catch (err) {
    console.error('[cohorts] quiz attempts error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** PUT schedule overrides (teacher) */
router.put(
  '/:slug/cohort/:cohortId/schedules',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug });
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const items = Array.isArray(req.body?.schedules) ? req.body.schedules : [];
      const tz = cohort.timezone || 'Asia/Ho_Chi_Minh';
      for (const item of items) {
        const lessonSlug = String(item?.lessonSlug || '').trim();
        if (!lessonSlug) continue;
        const utc = scheduleItemToUtcFields(item, tz);
        await CohortActivitySchedule.findOneAndUpdate(
          { cohortId: cohort._id, lessonSlug },
          {
            openAt: utc.openAt,
            dueAt: utc.dueAt,
            closeAt: utc.closeAt,
          },
          { upsert: true, new: true },
        );
      }
      res.json({ success: true, message: 'Đã lưu lịch' });
    } catch (err) {
      console.error('[cohorts] schedules error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

module.exports = router;
