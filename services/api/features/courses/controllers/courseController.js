const { asyncController, ok, created } = require('../../../shared/http');
const { AppError } = require('../../../shared/errors');
const catalog = require('../services/courseCatalogService');
const { buildCourseDetail } = require('../services/courseDetailService');
const enrolment = require('../services/courseEnrollmentService');
const { findCourseForLearnerOrEditor } = require('../services/courseAccess');
const presenter = require('../presenters/coursePresenter');

module.exports = asyncController({
  async listCatalog(req, res) {
    return ok(res, { data: await catalog.listCatalog(req.valid.query) });
  },

  async listMine(req, res) {
    return ok(res, { data: await catalog.listMyCourses(req.userId) });
  },

  async detail(req, res) {
    const course = await findCourseForLearnerOrEditor(req.params.slug, req);
    if (!course) throw AppError.notFound('Không tìm thấy khóa học');

    const data = await buildCourseDetail({
      course,
      userId: req.userId,
      userRole: req.userRole,
      req,
      outlineOnly: req.valid.query.outline,
    });

    // Detail is personalised (enrolment, paywall, cohort schedule) — never cache.
    res.set('Cache-Control', 'private, no-store');
    return ok(res, { data });
  },

  async enroll(req, res) {
    const result = await enrolment.enrollInCatalogCourse({
      userId: req.userId,
      userRole: req.userRole,
      slug: req.params.slug,
    });

    if (result.status === 'payment_required') {
      return res.status(400).json(presenter.coursePaymentRequired(result.course));
    }
    if (result.status === 'already_enrolled') {
      return ok(res, {
        message: 'Bạn đã đăng ký khóa học này',
        enrollment: presenter.enrollmentState(result.enrollment),
      });
    }
    return created(res, {
      message: 'Đăng ký khóa học thành công',
      enrollment: presenter.enrollmentState(result.enrollment),
    });
  },

  async updateProgress(req, res) {
    const progress = await enrolment.setLessonProgress({
      userId: req.userId,
      slug: req.params.slug,
      lessonSlug: req.valid.body.lessonSlug,
      completed: req.valid.body.completed,
    });
    return ok(res, { progress });
  },
});
