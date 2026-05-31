const express = require('express');
const { parseCourseEditorListResponse } = require('@galaxies/contracts');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../../auth/models/User');
const TeacherProfile = require('../../auth/models/TeacherProfile');
const { authMiddleware, optionalAuth, requireRole, canEditCourse } = require('../../../shared/jwtAuth');
const { findCourseForLearnerOrEditor } = require('../services/courseAccess');
const { requireString } = require('../../../shared/validation');
const { AppError } = require('../../../shared/errors');
const {
  normalizeCoursePricingFields,
  courseRequiresPayment,
  paidCoursesQuery,
  freeCoursesQuery,
} = require('../lib/coursePricing');
const { normalizeCourseCohortPricingFields } = require('../lib/cohortPricing');
const {
  resolveDistributionStrategy,
  applyDistributionStrategy,
} = require('../lib/distributionStrategy');
const { notifyFreeEnrollment } = require('../../notifications/services/notificationService');
const { getTeacherProfileByUserId, resolveCourseTeacherPublic } = require('../../auth/services/teacherProfileService');
const {
  viewerMaySeeQuizSecrets,
  redactLessonsForLearnerDelivery,
  resolveDeliveryContext,
  isCourseEditor,
  ensureStaffEnrollment,
} = require('../services/courseContentSecurity');

const router = express.Router();

function sortedModules(course) {
  return [...(course.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function sortedLessons(course) {
  return [...(course.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function applyAdminCourseTeacherId(course, teacherId) {
  if (teacherId === undefined) return;
  if (teacherId === null || teacherId === '') {
    course.teacherId = null;
    return;
  }
  const id = String(teacherId).trim();
  const user = await User.findById(id).select('role accountStatus').lean();
  if (!user || user.role !== 'teacher') {
    throw new AppError(400, 'INVALID_TEACHER', 'Giảng viên không hợp lệ — chọn tài khoản role teacher');
  }
  if (user.accountStatus === 'deactivated') {
    throw new AppError(400, 'TEACHER_DEACTIVATED', 'Tài khoản giảng viên đã ngừng hoạt động');
  }
  course.teacherId = id;
}

function courseIsPaidLocked(course) {
  return courseRequiresPayment(course);
}

function lessonOutlinePayload(l) {
  const desc = typeof l.description === 'string' ? l.description : '';
  const safeDesc = desc.length > 560 ? `${desc.slice(0, 560)}…` : desc;
  return {
    title: l.title,
    slug: l.slug,
    description: safeDesc,
    type: l.type || 'text',
    order: l.order ?? 0,
    moduleId: l.moduleId || null,
    week: l.week ?? null,
    visualizationId: l.visualizationId || null,
    quizQuestionCount: Array.isArray(l.quizQuestions) ? l.quizQuestions.length : 0,
    sectionCount: Array.isArray(l.sections) ? l.sections.length : 0,
  };
}

function redactLessonForPaywall(l) {
  const desc = typeof l.description === 'string' ? l.description : '';
  return {
    ...lessonOutlinePayload({ ...l, description: desc.length > 400 ? `${desc.slice(0, 400)}…` : desc }),
    content: '',
    sections: [],
    quizQuestions: [],
    resourceLinks: [],
    galleryImages: [],
    videoUrl: null,
    coverImage: null,
    learningGoals: [],
    sourcePdf: null,
    sourcePageCount: null,
    stageTime: null,
  };
}

/** @param {object} enrollment - null hoặc doc enrollment */
async function buildCourseDetailPayload(course, enrollment, outlineOnly, options = {}) {
  const { includeQuizSecrets = false, deliveryContext = null } = options;
  const staffEditor = Boolean(includeQuizSecrets);
  const mods = sortedModules(course);
  const locksContent =
    outlineOnly ? false : courseIsPaidLocked(course) && !enrollment && !staffEditor;
  let lessons = sortedLessons(course);
  if (outlineOnly) {
    lessons = lessons.map((l) => lessonOutlinePayload(l));
  } else if (locksContent) {
    lessons = lessons.map((l) => redactLessonForPaywall(l));
  } else if (!includeQuizSecrets) {
    lessons = redactLessonsForLearnerDelivery(lessons);
  }
  let teacher = null;
  if (course.teacherId) {
    teacher = await resolveCourseTeacherPublic(course.teacherId, { requirePublished: true });
  }
  return {
    id: course._id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    durationWeeks: course.durationWeeks ?? null,
    price: Math.round(Number(course.price) || 0),
    currency: course.currency ?? 'VND',
    cohortPrice: course.cohortPrice != null ? Math.round(Number(course.cohortPrice)) : null,
    cohortCurrency: course.cohortCurrency || null,
    isPaid: Boolean(course.isPaid),
    requiresPayment: courseRequiresPayment(course),
    catalogEnabled: course.catalogEnabled !== false,
    distributionStrategy: resolveDistributionStrategy(course),
    modules: mods,
    lessons,
    enrollment: enrollment
      ? {
          enrolledAt: enrollment.enrolledAt,
          progress: enrollment.progress || [],
        }
      : null,
    outlineOnly: Boolean(outlineOnly),
    paywalledLessonBodies: outlineOnly ? true : locksContent,
    crossSellTutorialHref:
      typeof course.crossSellTutorialHref === 'string' && course.crossSellTutorialHref.trim()
        ? course.crossSellTutorialHref.trim()
        : '/tutorial',
    crossSellTutorialLabelVi:
      typeof course.crossSellTutorialLabelVi === 'string' && course.crossSellTutorialLabelVi.trim()
        ? course.crossSellTutorialLabelVi.trim()
        : 'Học thêm miễn phí · Lộ trình',
    crossSellTutorialBodyVi:
      typeof course.crossSellTutorialBodyVi === 'string' ? course.crossSellTutorialBodyVi : '',
    published: Boolean(course.published),
    editorPreview: Boolean(!course.published),
    staffAccess: staffEditor,
    teacherId: course.teacherId || null,
    teacher,
    deliveryContext: deliveryContext || { mode: 'catalog' },
  };
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const pieces = [{ published: true }, { catalogEnabled: { $ne: false } }];
    const q = (req.query.q || '').toString().trim();
    if (q) {
      pieces.push({
        $or: [{ title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }],
      });
    }
    const levelRaw = String(req.query.level || '').trim().toLowerCase();
    if (['beginner', 'intermediate', 'advanced'].includes(levelRaw)) {
      pieces.push({ level: levelRaw });
    }
    const pricing = String(req.query.pricing || '').trim().toLowerCase();
    if (pricing === 'free') {
      pieces.push(freeCoursesQuery());
    }
    if (pricing === 'paid') {
      pieces.push(paidCoursesQuery());
    }

    const filter = pieces.length === 1 ? pieces[0] : { $and: pieces };
    const courses = await Course.find(filter)
      .select('title slug description thumbnail level lessons price currency isPaid durationWeeks')
      .sort({ createdAt: -1 })
      .lean();
    const list = courses.map((c) => {
      const price = Math.round(Number(c.price) || 0);
      const isPaid = Boolean(c.isPaid);
      const requiresPayment = courseRequiresPayment({ isPaid, price });
      return {
        id: String(c._id),
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnail: c.thumbnail,
        level: c.level,
        lessonCount: (c.lessons || []).length,
        durationWeeks: c.durationWeeks ?? null,
        price,
        currency: c.currency ?? 'VND',
        isPaid,
        requiresPayment,
      };
    });
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/editor/teachers', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'teacher', accountStatus: { $ne: 'deactivated' } })
      .select('_id email displayName avatar')
      .sort({ displayName: 1, email: 1 })
      .limit(200)
      .lean();
    const ids = users.map((u) => String(u._id));
    const profiles = ids.length
      ? await TeacherProfile.find({ userId: { $in: ids } }).select('userId fullName headline').lean()
      : [];
    const profileByUserId = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));
    res.json({
      success: true,
      data: users.map((u) => {
        const id = String(u._id);
        const profile = profileByUserId[id];
        return {
          id,
          email: u.email || null,
          displayName: u.displayName || '',
          fullName: profile?.fullName?.trim() || u.displayName?.trim() || u.email?.split('@')[0] || 'Giảng viên',
          headline: profile?.headline || '',
        };
      }),
    });
  } catch (err) {
    console.error('List editor teachers error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/editor/list', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const query = {};
    if (req.userRole === 'teacher') {
      // Teacher chỉ thấy khóa học của mình; khóa cũ chưa gán teacherId vẫn ẩn
      query.teacherId = req.userId;
    }
    const courses = await Course.find(query)
      .select(
        'title slug description thumbnail level lessons published price currency isPaid durationWeeks catalogEnabled distributionStrategy',
      )
      .sort({ updatedAt: -1 })
      .lean();
    const list = courses.map((c) => {
      const price = Math.round(Number(c.price) || 0);
      const isPaid = Boolean(c.isPaid);
      return {
        id: String(c._id),
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnail: c.thumbnail,
        level: c.level,
        lessonCount: (c.lessons || []).length,
        durationWeeks: c.durationWeeks ?? null,
        price,
        currency: c.currency ?? 'VND',
        isPaid,
        requiresPayment: courseRequiresPayment({ isPaid, price }),
        published: c.published ?? false,
        catalogEnabled: c.catalogEnabled !== false,
        distributionStrategy: resolveDistributionStrategy(c),
      };
    });
    const payload = { success: true, data: list };
    parseCourseEditorListResponse(payload);
    res.json(payload);
  } catch (err) {
    console.error('Editor list courses error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.userId })
      .sort({ enrolledAt: -1 })
      .lean();
    const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('title slug description thumbnail level lessons')
      .lean();
    const courseMap = Object.fromEntries(courses.map((c) => [c._id.toString(), c]));
    const list = enrollments.map((e) => {
      const course = courseMap[e.courseId.toString()];
      const lessons = course?.lessons || [];
      const progress = e.progress || [];
      const completed = progress.filter((p) => p.completed).length;
      const total = lessons.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: e._id,
        courseId: e.courseId,
        title: course?.title || 'Khóa học',
        slug: course?.slug || '',
        description: course?.description || '',
        thumbnail: course?.thumbnail,
        level: course?.level || 'beginner',
        lessonCount: total,
        enrolledAt: e.enrolledAt,
        progress: e.progress || [],
        completedCount: completed,
        totalLessons: total,
        percentComplete: percent,
      };
    });
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('My courses error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const title = requireString(req.body?.title, 'title', 'Tiêu đề khóa học');
    const { slug } = req.body || {};
    const rawSlug = (slug || title).toString().trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'course-' + Date.now();
    const existing = await Course.findOne({ slug: rawSlug });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Slug đã tồn tại. Thử tiêu đề hoặc slug khác.', slug: rawSlug });
    }
    const course = await Course.create({
      title: title.trim(),
      slug: rawSlug,
      description: '',
      level: 'beginner',
      published: false,
      modules: [],
      lessons: [],
      teacherId: req.userRole === 'teacher' ? req.userId : null,
    });
    await ensureStaffEnrollment(course.toObject(), { userId: req.userId, userRole: req.userRole });
    res.status(201).json({
      success: true,
      data: {
        id: course._id,
        title: course.title,
        slug: course.slug,
        published: course.published === true,
      },
    });
  } catch (err) {
    console.error('Create course error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi tạo khóa học' });
  }
});

router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const course = await findCourseForLearnerOrEditor(req.params.slug, req);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    let enrollment = null;
    if (req.userId) {
      enrollment = await ensureStaffEnrollment(course, { userId: req.userId, userRole: req.userRole });
      if (!enrollment) {
        enrollment = await Enrollment.findOne({
          userId: req.userId,
          courseId: course._id,
        }).lean();
      }
    }
    const outlineOnly = String(req.query.outline || '').trim() === '1';
    const includeQuizSecrets = viewerMaySeeQuizSecrets(req, course);
    let deliveryContext = { mode: 'catalog' };
    if (req.userId && !includeQuizSecrets) {
      deliveryContext = await resolveDeliveryContext({
        userId: req.userId,
        courseId: course._id,
        userRole: req.userRole,
        course,
      });
    } else if (includeQuizSecrets) {
      deliveryContext = { mode: 'editor' };
    }
    const data = await buildCourseDetailPayload(course, enrollment, outlineOnly, {
      includeQuizSecrets,
      deliveryContext,
    });

    res.set('Cache-Control', 'private, no-store');
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:slug/enroll', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    const isStaff = isCourseEditor(req.userId, req.userRole, course);
    if (!course.published && !isStaff) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    if (course.catalogEnabled === false && !isStaff) {
      return res.status(403).json({
        success: false,
        code: 'catalog_disabled',
        error: 'Khóa học chỉ mở qua lớp theo kỳ. Dùng mã lớp để tham gia.',
      });
    }
    if (course.isPaid && (course.price ?? 0) > 0 && !isStaff) {
      return res.status(400).json({
        success: false,
        requiresPayment: true,
        error: 'Khóa học trả phí. Vui lòng thanh toán.',
        courseId: String(course._id),
        courseSlug: course.slug,
        amount: course.price,
        currency: course.currency || 'VND',
      });
    }
    let enrollment = await Enrollment.findOne({
      userId: req.userId,
      courseId: course._id,
    });
    if (enrollment) {
      return res.json({
        success: true,
        message: 'Bạn đã đăng ký khóa học này',
        enrollment: { enrolledAt: enrollment.enrolledAt, progress: enrollment.progress || [] },
      });
    }
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
    void notifyFreeEnrollment({
      userId: req.userId,
      courseTitle: course.title,
      courseSlug: course.slug,
    });
    res.status(201).json({
      success: true,
      message: 'Đăng ký khóa học thành công',
      enrollment: { enrolledAt: enrollment.enrolledAt, progress: enrollment.progress },
    });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.patch('/:slug/progress', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    const { completed } = req.body || {};
    const lessonSlug = requireString(req.body?.lessonSlug, 'lessonSlug', 'lessonSlug');
    let enrollment = await Enrollment.findOne({
      userId: req.userId,
      courseId: course._id,
    });
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Chưa đăng ký khóa học này' });
    }
    const progress = enrollment.progress || [];
    let entry = progress.find((p) => p.lessonSlug === lessonSlug);
    if (!entry) {
      entry = { lessonSlug, completed: false, completedAt: null };
      progress.push(entry);
    }
    entry.completed = completed !== false;
    entry.completedAt = entry.completed ? new Date() : null;
    enrollment.progress = progress;
    await enrollment.save();
    res.json({
      success: true,
      progress: enrollment.progress,
    });
  } catch (err) {
    console.error('Progress error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/:slug/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    // Chỉ đọc dữ liệu ở GET; việc claim ownership chỉ được thực hiện ở mutation route.
    if (req.userRole === 'teacher') {
      if (!canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền sửa khóa học này' });
      }
    }
    const data = course.toObject();
    res.json({
      success: true,
      data: {
        id: data._id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        thumbnail: data.thumbnail,
        level: data.level,
        durationWeeks: data.durationWeeks,
        published: data.published,
        price: Math.round(Number(data.price) || 0),
        currency: data.currency ?? 'VND',
        isPaid: Boolean(data.isPaid),
        requiresPayment: courseRequiresPayment(data),
        catalogEnabled: data.catalogEnabled !== false,
        distributionStrategy: resolveDistributionStrategy(data),
        crossSellTutorialHref: data.crossSellTutorialHref ?? '/tutorial',
        crossSellTutorialLabelVi: data.crossSellTutorialLabelVi ?? '',
        crossSellTutorialBodyVi: data.crossSellTutorialBodyVi ?? '',
        teacherId: data.teacherId || null,
        modules: (data.modules || []).sort((a, b) => a.order - b.order),
        lessons: (data.lessons || []).sort((a, b) => a.order - b.order),
      },
    });
  } catch (err) {
    console.error('Get editor course error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.put('/:slug/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      level,
      durationWeeks,
      published,
      price,
      currency,
      isPaid,
      cohortPrice,
      cohortCurrency,
      modules,
      lessons,
      thumbnail,
      crossSellTutorialHref,
      crossSellTutorialLabelVi,
      crossSellTutorialBodyVi,
      catalogEnabled,
      distributionStrategy,
      teacherId,
    } = req.body || {};
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }

    // Phân quyền: teacher chỉ lưu course của mình
    if (req.userRole === 'teacher') {
      if (!course.teacherId) {
        course.teacherId = req.userId;
      } else if (!canEditCourse(course, { id: req.userId, role: req.userRole })) {
        return res.status(403).json({ success: false, error: 'Không có quyền sửa khóa học này' });
      }
    }
    if (req.userRole === 'admin') {
      await applyAdminCourseTeacherId(course, teacherId);
    }

    if (typeof title === 'string' && title.trim()) course.title = title.trim();
    if (typeof description === 'string') course.description = description;
    if (thumbnail === null || thumbnail === '') {
      course.thumbnail = null;
    } else if (typeof thumbnail === 'string' && thumbnail.trim()) {
      course.thumbnail = thumbnail.trim().slice(0, 2048);
    }
    if (['beginner', 'intermediate', 'advanced'].includes(level)) course.level = level;
    if (durationWeeks != null) course.durationWeeks = Number(durationWeeks) || null;
    if (typeof published === 'boolean') course.published = published;
    if (price != null) course.price = Math.max(0, Math.floor(Number(price)) || 0);
    if (['VND', 'USD'].includes(currency)) course.currency = currency;
    if (typeof isPaid === 'boolean') course.isPaid = isPaid;
    if (cohortPrice !== undefined) {
      course.cohortPrice =
        cohortPrice === null || cohortPrice === ''
          ? null
          : Math.max(0, Math.round(Number(cohortPrice)) || 0);
    }
    if (cohortCurrency !== undefined) {
      course.cohortCurrency = ['VND', 'USD'].includes(cohortCurrency) ? cohortCurrency : null;
    }
    if (typeof distributionStrategy === 'string' && distributionStrategy.trim()) {
      applyDistributionStrategy(course, distributionStrategy.trim());
    } else if (typeof catalogEnabled === 'boolean') {
      course.catalogEnabled = catalogEnabled;
      if (catalogEnabled === false) course.distributionStrategy = 'instructor_led';
      else if (course.distributionStrategy === 'instructor_led') {
        course.distributionStrategy = 'hybrid';
      }
    }
    normalizeCoursePricingFields(course);
    normalizeCourseCohortPricingFields(course);
    if (typeof crossSellTutorialHref === 'string' && crossSellTutorialHref.trim()) {
      course.crossSellTutorialHref = crossSellTutorialHref.trim().slice(0, 512);
    }
    if (typeof crossSellTutorialLabelVi === 'string')
      course.crossSellTutorialLabelVi = crossSellTutorialLabelVi.trim().slice(0, 200);
    if (typeof crossSellTutorialBodyVi === 'string')
      course.crossSellTutorialBodyVi = crossSellTutorialBodyVi.trim().slice(0, 2000);

    if (Array.isArray(modules)) {
      course.modules = modules.map((m, idx) => ({
        _id: m?._id || undefined,
        title: m?.title || `Module ${idx + 1}`,
        slug: m?.slug || `module-${idx + 1}`,
        description: m?.description || '',
        icon: m?.icon || '',
        order: m?.order != null ? Number(m.order) : idx,
        materials: Array.isArray(m?.materials)
          ? m.materials.map((mat) => ({
              id: mat?.id || `mat-${idx}-${Date.now()}`,
              label: mat?.label || '',
              kind: ['pdf', 'slides', 'link', 'video'].includes(mat?.kind) ? mat.kind : 'pdf',
              url: mat?.url || '',
              uploadedAt: mat?.uploadedAt ? new Date(mat.uploadedAt) : null,
            }))
          : [],
      }));
    }

    if (Array.isArray(lessons)) {
      const sanitized = lessons.map((l, idx) => ({
        title: l?.title || `Lesson ${idx + 1}`,
        slug: l?.slug || `lesson-${idx + 1}`,
        description: l?.description || '',
        type: ['text', 'visualization', 'quiz', 'assignment', 'live_session'].includes(l?.type)
          ? l.type
          : 'text',
        quizSettings: l?.quizSettings || null,
        assignmentSettings: l?.assignmentSettings || null,
        meetingUrl: l?.meetingUrl || null,
        liveScheduledAt: l?.liveScheduledAt ? new Date(l.liveScheduledAt) : null,
        visualizationId: l?.visualizationId || null,
        stageTime: l?.stageTime != null ? Number(l.stageTime) : null,
        videoUrl: l?.videoUrl || null,
        coverImage: l?.coverImage || null,
        galleryImages: Array.isArray(l?.galleryImages) ? l.galleryImages : [],
        week: l?.week != null ? Number(l.week) : null,
        moduleId: l?.moduleId || null,
        content: l?.content || '',
        learningGoals: Array.isArray(l?.learningGoals) ? l.learningGoals : [],
        sections: Array.isArray(l?.sections) ? l.sections : [],
        quizQuestions: Array.isArray(l?.quizQuestions) ? l.quizQuestions : [],
        resourceLinks: Array.isArray(l?.resourceLinks) ? l.resourceLinks : [],
        sourcePdf: l?.sourcePdf || null,
        sourcePageCount: l?.sourcePageCount != null ? Number(l.sourcePageCount) : null,
        order: l?.order != null ? Number(l.order) : idx,
      }));
      course.lessons = sanitized;
    }

    await course.save();
    await ensureStaffEnrollment(course.toObject(), { userId: req.userId, userRole: req.userRole });
    res.json({ success: true, message: 'Lưu khóa học thành công' });
  } catch (err) {
    console.error('Save editor course error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
