const express = require('express');
const crypto = require('crypto');
const Course = require('../models/Course');
const Cohort = require('../models/Cohort');
const CohortEnrollment = require('../models/CohortEnrollment');
const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizAttempt = require('../models/QuizAttempt');
const CohortAnnouncement = require('../models/CohortAnnouncement');
const User = require('../../auth/models/User');
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
const { assertCohortMemberOrStaff } = require('../services/cohortAccess');
const { buildCohortHome } = require('../services/cohortHomeService');
const { buildCohortAnalytics } = require('../services/cohortAnalyticsService');
const { ensureCohortForum } = require('../services/cohortForumService');
const { notifyCohortAnnouncement } = require('../services/cohortAnnouncementService');
const { applyWeeklySchedule, copySchedulesFromCohort } = require('../services/cohortScheduleService');
const { resolveCohortPrice, normalizeCohortPricingFields } = require('../lib/cohortPricing');
const {
  collectLessonVisibilityIssues,
  hasScheduledOpen,
} = require('../services/lessonVisibility');
const {
  normalizeModuleWeekMap,
  resolveLessonDeliveryWeek,
  moduleWeekMapFromCourseModules,
} = require('../services/moduleDeliveryWeek');

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
      .select('title slug startAt endAt timezone status price currency')
      .sort({ startAt: 1 })
      .lean();
    const data = cohorts
      .map((c) => publicCohortCard(c, course, now))
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
        price: c.price != null ? Math.round(Number(c.price)) : null,
        currency: c.currency || null,
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
      price: req.body?.price != null ? Math.max(0, Math.round(Number(req.body.price)) || 0) : null,
      currency: ['VND', 'USD'].includes(req.body?.currency) ? req.body.currency : null,
    });
    normalizeCohortPricingFields(cohort, course);
    await cohort.save();
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
    const cohort = await loadEnrollableCohort({ courseId: course._id, cohortId });
    const { resolveCohortCheckoutPrice } = require('../lib/cohortCheckoutPricing');
    const pricing = await resolveCohortCheckoutPrice({
      userId: req.userId,
      cohort,
      course,
    });
    if (pricing.requiresPayment) {
      return res.status(402).json({
        success: false,
        code: 'payment_required',
        requiresPayment: true,
        error: pricing.isCatalogUpgrade
          ? 'Chỉ cần thanh toán phần chênh lệch lên lớp có GV.'
          : 'Lớp có học phí — thanh toán trên trang khóa học.',
        courseSlug: course.slug,
        courseId: String(course._id),
        amount: pricing.listPrice,
        currency: pricing.currency,
        cohortId,
        cohortFullPrice: pricing.cohortFullPrice,
        catalogCredit: pricing.catalogCredit,
        isCatalogUpgrade: pricing.isCatalogUpgrade,
        catalogPrice: pricing.catalogPrice,
        catalogCurrency: pricing.catalogCurrency,
      });
    }
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

/** GET cohort home — announcements, upcoming, progress, syllabus */
router.get('/:slug/cohort/:cohortId/home', authMiddleware, async (req, res) => {
  try {
    const course = await findCourseForLearnerOrEditor(req.params.slug, req);
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    await assertCohortMemberOrStaff({
      cohort,
      course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const data = await buildCohortHome({ course, cohort, userId: req.userId });
    res.json({ success: true, data });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('[cohorts] home error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET cohort analytics / gradebook (teacher) */
router.get(
  '/:slug/cohort/:cohortId/analytics',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug }).lean();
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      if (req.userRole !== 'admin' && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền' });
      }
      const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id }).lean();
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const data = await buildCohortAnalytics({ course, cohort });
      res.json({ success: true, data });
    } catch (err) {
      console.error('[cohorts] analytics error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

/** GET cohort discussion forum meta */
router.get('/:slug/cohort/:cohortId/discussion', authMiddleware, async (req, res) => {
  try {
    const course = await findCourseForLearnerOrEditor(req.params.slug, req);
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    await assertCohortMemberOrStaff({
      cohort,
      course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const forum = await ensureCohortForum({ cohort, course });
    res.json({ success: true, data: forum });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('[cohorts] discussion error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** GET announcements */
router.get('/:slug/cohort/:cohortId/announcements', authMiddleware, async (req, res) => {
  try {
    const course = await findCourseForLearnerOrEditor(req.params.slug, req);
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    await assertCohortMemberOrStaff({
      cohort,
      course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const rows = await CohortAnnouncement.find({ cohortId: cohort._id })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(50)
      .lean();
    res.json({
      success: true,
      data: rows.map((a) => ({
        id: a._id,
        title: a.title,
        body: a.body,
        pinned: a.pinned,
        notifyEmail: a.notifyEmail,
        authorId: a.authorId,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    console.error('[cohorts] announcements list error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** POST announcement (teacher) */
router.post(
  '/:slug/cohort/:cohortId/announcements',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug });
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      if (req.userRole !== 'admin' && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền' });
      }
      const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const title = String(req.body?.title || '').trim();
      const body = String(req.body?.body || '').trim();
      if (!title) return res.status(400).json({ success: false, error: 'Thiếu tiêu đề' });
      const doc = await CohortAnnouncement.create({
        cohortId: cohort._id,
        courseId: course._id,
        authorId: req.userId,
        title: title.slice(0, 200),
        body: body.slice(0, 12000),
        pinned: Boolean(req.body?.pinned),
        notifyEmail: Boolean(req.body?.notifyEmail),
      });
      void notifyCohortAnnouncement({
        cohort,
        course,
        announcement: doc,
        authorId: req.userId,
      });
      res.status(201).json({
        success: true,
        data: {
          id: doc._id,
          title: doc.title,
          body: doc.body,
          pinned: doc.pinned,
          notifyEmail: doc.notifyEmail,
          authorId: doc.authorId,
          createdAt: doc.createdAt,
        },
      });
    } catch (err) {
      console.error('[cohorts] announcement create error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

/** PATCH announcement */
router.patch(
  '/:slug/cohort/:cohortId/announcements/:announcementId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug });
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      if (req.userRole !== 'admin' && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền' });
      }
      const doc = await CohortAnnouncement.findOne({
        _id: req.params.announcementId,
        cohortId: req.params.cohortId,
        courseId: course._id,
      });
      if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy thông báo' });
      if (req.body?.title != null) doc.title = String(req.body.title).trim().slice(0, 200);
      if (req.body?.body != null) doc.body = String(req.body.body).trim().slice(0, 12000);
      if (req.body?.pinned != null) doc.pinned = Boolean(req.body.pinned);
      await doc.save();
      res.json({
        success: true,
        data: {
          id: doc._id,
          title: doc.title,
          body: doc.body,
          pinned: doc.pinned,
          createdAt: doc.createdAt,
        },
      });
    } catch (err) {
      console.error('[cohorts] announcement patch error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

/** DELETE announcement */
router.delete(
  '/:slug/cohort/:cohortId/announcements/:announcementId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug });
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      if (req.userRole !== 'admin' && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền' });
      }
      await CohortAnnouncement.deleteOne({
        _id: req.params.announcementId,
        cohortId: req.params.cohortId,
        courseId: course._id,
      });
      res.json({ success: true });
    } catch (err) {
      console.error('[cohorts] announcement delete error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

/** GET schedules + lesson list for editor */
router.get('/:slug/cohort/:cohortId/schedules', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id }).lean();
    if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
    const rows = await CohortActivitySchedule.find({ cohortId: cohort._id }).lean();
    const scheduleByLesson = scheduleMapFromRows(rows);
    const coursePublished = Boolean(course.published);
    const modules = [...(course.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let moduleWeekMap = normalizeModuleWeekMap(cohort.moduleWeekMap);
    if (!Object.keys(moduleWeekMap).length) {
      moduleWeekMap = moduleWeekMapFromCourseModules(modules);
    }
    const moduleById = Object.fromEntries(
      modules.map((m) => [String(m._id || ''), m]).filter(([id]) => id),
    );
    const lessons = (course.lessons || [])
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((l) => {
        const schedule = scheduleByLesson[l.slug] || { openAt: null, dueAt: null, closeAt: null };
        const visibilityIssues = collectLessonVisibilityIssues(l, coursePublished);
        const scheduledOpen = hasScheduledOpen(schedule);
        const deliveryWeek = resolveLessonDeliveryWeek(l, moduleWeekMap) || null;
        const moduleId = l.moduleId ? String(l.moduleId) : null;
        const mod = moduleId ? moduleById[moduleId] : null;
        return {
          slug: l.slug,
          title: l.title,
          type: l.type || 'text',
          videoUrl: l.videoUrl || null,
          week: deliveryWeek,
          deliveryWeek,
          order: l.order ?? 0,
          moduleId,
          moduleTitle: mod?.title || null,
          schedule,
          visibilityIssues,
          scheduleWarning:
            scheduledOpen && visibilityIssues.length > 0
              ? visibilityIssues.includes('course_draft')
                ? 'course_draft'
                : visibilityIssues[0]
              : null,
        };
      });
    const moduleRows = modules.map((m) => {
      const id = String(m._id || '');
      return {
        id,
        title: m.title,
        order: m.order ?? 0,
        deliveryWeek: id && moduleWeekMap[id] != null ? moduleWeekMap[id] : null,
      };
    });
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
        coursePublished,
        catalogEnabled: course.catalogEnabled !== false,
        modules: moduleRows,
        moduleWeekMap,
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
    if (req.body?.moduleWeekMap !== undefined) {
      const map = normalizeModuleWeekMap(req.body.moduleWeekMap);
      cohort.moduleWeekMap = map;
      cohort.markModified('moduleWeekMap');
    }
    if (req.body?.price !== undefined) {
      cohort.price =
        req.body.price === null || req.body.price === ''
          ? null
          : Math.max(0, Math.round(Number(req.body.price)) || 0);
    }
    if (req.body?.currency !== undefined) {
      cohort.currency = ['VND', 'USD'].includes(req.body.currency) ? req.body.currency : null;
    }
    normalizeCohortPricingFields(cohort, course);
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
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id displayName email')
      .lean();
    const userMap = Object.fromEntries(
      users.map((u) => [String(u._id), u.displayName || u.email || String(u._id)]),
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r._id,
        userId: r.userId,
        studentName: userMap[r.userId] || r.userId.slice(0, 8),
        lessonSlug: r.lessonSlug,
        lessonTitle: lessonMap[r.lessonSlug] || r.lessonSlug,
        status: r.status,
        submittedAt: r.submittedAt,
        isLate: r.isLate,
        grade: r.grade,
        feedback: r.feedback,
        gradedAt: r.gradedAt,
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
      if (status === 'graded' || grade != null) {
        doc.status = 'graded';
        doc.gradedBy = req.userId;
        doc.gradedAt = new Date();
      }
      await doc.save();
      const lesson = (course.lessons || []).find((l) => l.slug === doc.lessonSlug);
      void notifyAssignmentGraded({
        userId: doc.userId,
        courseTitle: course.title,
        courseSlug: course.slug,
        cohortId: doc.cohortId ? String(doc.cohortId) : null,
        lessonSlug: doc.lessonSlug,
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

/** POST apply weekly schedule from lesson.week + week1 open date */
router.post(
  '/:slug/cohort/:cohortId/schedules/apply-weekly',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug });
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      if (req.userRole !== 'admin' && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền' });
      }
      const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const week1OpenAtLocal = String(req.body?.week1OpenAtLocal || '').trim();
      if (!week1OpenAtLocal) {
        return res.status(400).json({ success: false, error: 'Thiếu ngày mở tuần 1' });
      }
      const data = await applyWeeklySchedule({
        course,
        cohort,
        week1OpenLocal: week1OpenAtLocal,
        daysPerWeek: req.body?.daysPerWeek,
        setDueAndClose: req.body?.setDueAndClose,
      });
      res.json({
        success: true,
        message: `Đã áp lịch theo tuần cho ${data.saved} bài (${data.weekCount} tuần).`,
        data,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[cohorts] apply-weekly error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

/** POST copy schedule from another cohort */
router.post(
  '/:slug/cohort/:cohortId/schedules/copy-from',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const course = await Course.findOne({ slug: req.params.slug });
      if (!course) return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      if (req.userRole !== 'admin' && !canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền' });
      }
      const cohort = await Cohort.findOne({ _id: req.params.cohortId, courseId: course._id });
      if (!cohort) return res.status(404).json({ success: false, error: 'Không tìm thấy lớp' });
      const sourceCohortId = String(req.body?.sourceCohortId || '').trim();
      if (!sourceCohortId) {
        return res.status(400).json({ success: false, error: 'Thiếu sourceCohortId' });
      }
      const data = await copySchedulesFromCohort({
        courseId: course._id,
        sourceCohortId,
        targetCohortId: cohort._id,
      });
      res.json({
        success: true,
        message: `Đã sao chép lịch từ «${data.sourceTitle}» (${data.copied} bài).`,
        data,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      console.error('[cohorts] copy schedule error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    }
  },
);

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
