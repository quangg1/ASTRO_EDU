const express = require('express');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authMiddleware, optionalAuth, requireRole, canEditCourse } = require('../../../shared/jwtAuth');
const { requireString } = require('../../../shared/validation');
const { AppError } = require('../../../shared/errors');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const filter = { published: true };
    if (q) {
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
      ];
    }
    const courses = await Course.find(filter)
      .select('title slug description thumbnail level lessons')
      .sort({ createdAt: -1 })
      .lean();
    const list = courses.map((c) => ({
      id: c._id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnail: c.thumbnail,
      level: c.level,
      lessonCount: (c.lessons || []).length,
      price: c.price ?? 0,
      currency: c.currency ?? 'VND',
      isPaid: c.isPaid ?? false,
    }));
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('List courses error:', err);
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
      .select('title slug description thumbnail level lessons published')
      .sort({ updatedAt: -1 })
      .lean();
    const list = courses.map((c) => ({
      id: c._id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnail: c.thumbnail,
      level: c.level,
      lessonCount: (c.lessons || []).length,
      price: c.price ?? 0,
      currency: c.currency ?? 'VND',
      isPaid: c.isPaid ?? false,
      published: c.published ?? false,
    }));
    res.json({ success: true, data: list });
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
    res.status(201).json({
      success: true,
      data: {
        id: course._id,
        title: course.title,
        slug: course.slug,
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
    const course = await Course.findOne({ slug: req.params.slug, published: true }).lean();
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    let enrollment = null;
    if (req.userId) {
      enrollment = await Enrollment.findOne({
        userId: req.userId,
        courseId: course._id,
      }).lean();
    }
    res.json({
      success: true,
      data: {
        id: course._id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        level: course.level,
        price: course.price ?? 0,
        currency: course.currency ?? 'VND',
        isPaid: course.isPaid ?? false,
        modules: (course.modules || []).sort((a, b) => a.order - b.order),
        lessons: (course.lessons || []).sort((a, b) => a.order - b.order),
        enrollment: enrollment
          ? {
              enrolledAt: enrollment.enrolledAt,
              progress: enrollment.progress || [],
            }
          : null,
      },
    });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:slug/enroll', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, published: true });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    if (course.isPaid && (course.price ?? 0) > 0) {
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
        price: data.price ?? 0,
        currency: data.currency ?? 'VND',
        isPaid: data.isPaid ?? false,
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
    const { title, description, level, durationWeeks, published, price, currency, isPaid, modules, lessons } = req.body || {};
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

    if (typeof title === 'string' && title.trim()) course.title = title.trim();
    if (typeof description === 'string') course.description = description;
    if (['beginner', 'intermediate', 'advanced'].includes(level)) course.level = level;
    if (durationWeeks != null) course.durationWeeks = Number(durationWeeks) || null;
    if (typeof published === 'boolean') course.published = published;
    if (price != null) course.price = Math.max(0, Math.floor(Number(price)) || 0);
    if (['VND', 'USD'].includes(currency)) course.currency = currency;
    if (typeof isPaid === 'boolean') course.isPaid = isPaid;

    if (Array.isArray(modules)) {
      course.modules = modules.map((m, idx) => ({
        _id: m?._id || undefined,
        title: m?.title || `Module ${idx + 1}`,
        slug: m?.slug || `module-${idx + 1}`,
        description: m?.description || '',
        icon: m?.icon || '',
        order: m?.order != null ? Number(m.order) : idx,
      }));
    }

    if (Array.isArray(lessons)) {
      const sanitized = lessons.map((l, idx) => ({
        title: l?.title || `Lesson ${idx + 1}`,
        slug: l?.slug || `lesson-${idx + 1}`,
        description: l?.description || '',
        type: ['text', 'visualization', 'quiz'].includes(l?.type) ? l.type : 'text',
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
    res.json({ success: true, message: 'Lưu khóa học thành công' });
  } catch (err) {
    console.error('Save editor course error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
