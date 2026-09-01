const { asyncHandler } = require('../../../shared/http');
const { AppError } = require('../../../shared/errors');
const { canEditCourse } = require('../../../shared/jwtAuth');
const { courseRepository, cohortRepository } = require('../repositories');
const { findCourseForLearnerOrEditor } = require('../services/courseAccess');

/**
 * Route-level context loaders.
 *
 * Every cohort endpoint used to repeat the same preamble: fetch course by slug,
 * 404, fetch cohort by id scoped to that course, 404, then check edit rights.
 * These middlewares own that flow and publish `req.course` / `req.cohort`, so
 * controllers start from an already-validated context.
 */

const VISIBILITY = {
  /** Learner-facing: only published courses. */
  published: (slug, _req, options) => courseRepository.findPublishedBySlug(slug, options),
  /** Staff-facing: any course, authorization is a separate concern. */
  any: (slug, _req, options) => courseRepository.findBySlug(slug, options),
  /** Published for learners, plus drafts for the owning teacher/admin. */
  learnerOrEditor: (slug, req) => findCourseForLearnerOrEditor(slug, req),
};

/**
 * Loads `req.course` from `:slug`.
 * `hydrate` returns a Mongoose document for flows that mutate and save it.
 */
function loadCourse({ visibility = 'any', hydrate = false, param = 'slug' } = {}) {
  const resolve = VISIBILITY[visibility];
  if (!resolve) throw new Error(`loadCourse: visibility không hợp lệ "${visibility}"`);

  return asyncHandler(async (req, _res, next) => {
    const course = await resolve(req.params[param], req, { lean: !hydrate });
    if (!course) throw AppError.notFound('Không tìm thấy khóa học');
    req.course = course;
    next();
  });
}

/** Loads `req.cohort` from `:cohortId`, scoped to the already-loaded course. */
function loadCohort({ hydrate = false, param = 'cohortId' } = {}) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.course) throw new Error('loadCohort phải chạy sau loadCourse');
    const cohortId = req.params[param];
    const cohort = hydrate
      ? await cohortRepository.findDocInCourse(cohortId, req.course._id)
      : await cohortRepository.findInCourse(cohortId, req.course._id);
    if (!cohort) throw AppError.notFound('Không tìm thấy lớp');
    req.cohort = cohort;
    next();
  });
}

/**
 * Admins pass; teachers pass only for courses they own (or unassigned ones).
 * Mirrors `canEditCourse`, which already grants admins.
 */
function requireCourseEditor(req, _res, next) {
  if (!canEditCourse(req.course, { id: req.userId, role: req.userRole })) {
    return next(AppError.forbidden('Bạn không có quyền quản lý khóa học này'));
  }
  return next();
}

module.exports = { loadCourse, loadCohort, requireCourseEditor };
