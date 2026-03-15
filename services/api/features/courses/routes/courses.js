const express = require('express');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authMiddleware, optionalAuth, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'galaxies-internal-secret';

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

router.post('/internal/confirm-enroll', (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
}, async (req, res) => {
  try {
    const { userId, courseId, orderId } = req.body || {};
    if (!userId || !courseId) {
      return res.status(400).json({ success: false, error: 'Thiếu userId hoặc courseId' });
    }
    const course = await Course.findOne({ _id: courseId, published: true });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
    let enrollment = await Enrollment.findOne({ userId, courseId: course._id });
    if (enrollment) {
      return res.json({ success: true, message: 'Đã đăng ký từ trước' });
    }
    const progress = (course.lessons || []).map((l) => ({
      lessonSlug: l.slug,
      completed: false,
      completedAt: null,
    }));
    await Enrollment.create({
      userId,
      courseId: course._id,
      progress,
    });
    res.json({ success: true, message: 'Enroll thành công' });
  } catch (err) {
    console.error('Internal confirm-enroll error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
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
    const { lessonSlug, completed } = req.body || {};
    if (!lessonSlug) {
      return res.status(400).json({ success: false, error: 'Thiếu lessonSlug' });
    }
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
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/:slug/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug }).lean();
    if (!course) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
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
        durationWeeks: course.durationWeeks,
        published: course.published,
        price: course.price ?? 0,
        currency: course.currency ?? 'VND',
        isPaid: course.isPaid ?? false,
        modules: (course.modules || []).sort((a, b) => a.order - b.order),
        lessons: (course.lessons || []).sort((a, b) => a.order - b.order),
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
