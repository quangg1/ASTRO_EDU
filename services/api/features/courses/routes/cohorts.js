const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const { loadCourse, loadCohort, requireCourseEditor } = require('../http/courseContext');
const schema = require('../schemas/cohortSchemas');
const cohorts = require('../controllers/cohortController');
const announcements = require('../controllers/cohortAnnouncementController');
const schedules = require('../controllers/cohortScheduleController');
const gradebook = require('../controllers/cohortGradebookController');

/**
 * Cohort endpoints, declared as middleware pipelines:
 * authenticate -> validate -> load context -> authorize -> controller.
 *
 * The file is intentionally free of logic: what a route needs is visible from
 * its pipeline alone.
 */
const router = express.Router();

const staff = [authMiddleware, requireRole('teacher', 'admin')];
const learnerCourse = loadCourse({ visibility: 'published' });
const staffCourse = [loadCourse({ visibility: 'any' }), requireCourseEditor];
const memberCourse = loadCourse({ visibility: 'learnerOrEditor' });

// ---------------------------------------------------------------- catalog

router.get(
  '/:slug/cohorts/my',
  authMiddleware,
  validate({ params: schema.courseSlugParams }),
  learnerCourse,
  cohorts.listMine,
);

router.get(
  '/:slug/cohorts/manage',
  ...staff,
  validate({ params: schema.courseSlugParams }),
  ...staffCourse,
  cohorts.listManaged,
);

router.get(
  '/:slug/cohorts',
  validate({ params: schema.courseSlugParams }),
  learnerCourse,
  cohorts.listEnrollable,
);

router.post(
  '/:slug/cohorts',
  ...staff,
  validate({ params: schema.courseSlugParams, body: schema.createCohortBody }),
  ...staffCourse,
  cohorts.create,
);

// ------------------------------------------------------------- enrolment

router.post(
  '/:slug/cohorts/enroll',
  authMiddleware,
  validate({ params: schema.courseSlugParams, body: schema.enrollBody }),
  learnerCourse,
  cohorts.enroll,
);

router.post('/:slug/cohorts/join', authMiddleware, cohorts.join);

router.post(
  '/:slug/cohort/:cohortId/resend-invite-email',
  authMiddleware,
  validate({ params: schema.cohortParams }),
  learnerCourse,
  cohorts.resendEnrollmentEmail,
);

// ------------------------------------------------------- learner surfaces

router.get(
  '/:slug/cohort/:cohortId/syllabus',
  authMiddleware,
  validate({ params: schema.cohortParams }),
  memberCourse,
  loadCohort(),
  cohorts.syllabus,
);

router.get(
  '/:slug/cohort/:cohortId/home',
  authMiddleware,
  validate({ params: schema.cohortParams }),
  memberCourse,
  loadCohort(),
  cohorts.home,
);

router.get(
  '/:slug/cohort/:cohortId/discussion',
  authMiddleware,
  validate({ params: schema.cohortParams }),
  memberCourse,
  loadCohort(),
  cohorts.discussion,
);

// --------------------------------------------------------- announcements

router.get(
  '/:slug/cohort/:cohortId/announcements',
  authMiddleware,
  validate({ params: schema.cohortParams }),
  memberCourse,
  loadCohort(),
  announcements.list,
);

router.post(
  '/:slug/cohort/:cohortId/announcements',
  ...staff,
  validate({ params: schema.cohortParams, body: schema.createAnnouncementBody }),
  ...staffCourse,
  loadCohort(),
  announcements.create,
);

router.patch(
  '/:slug/cohort/:cohortId/announcements/:announcementId',
  ...staff,
  validate({ params: schema.announcementParams, body: schema.updateAnnouncementBody }),
  ...staffCourse,
  loadCohort(),
  announcements.update,
);

router.delete(
  '/:slug/cohort/:cohortId/announcements/:announcementId',
  ...staff,
  validate({ params: schema.announcementParams }),
  ...staffCourse,
  loadCohort(),
  announcements.remove,
);

// ------------------------------------------------------------- gradebook

router.get(
  '/:slug/cohort/:cohortId/analytics',
  ...staff,
  validate({ params: schema.cohortParams }),
  ...staffCourse,
  loadCohort(),
  cohorts.analytics,
);

router.get(
  '/:slug/cohort/:cohortId/submissions',
  ...staff,
  validate({ params: schema.cohortParams, query: schema.submissionsQuery }),
  ...staffCourse,
  loadCohort(),
  gradebook.listSubmissions,
);

router.patch(
  '/:slug/cohort/:cohortId/submissions/:submissionId/grade',
  ...staff,
  validate({ params: schema.submissionParams, body: schema.gradeSubmissionBody }),
  ...staffCourse,
  gradebook.gradeSubmission,
);

router.get(
  '/:slug/cohort/:cohortId/quiz-attempts',
  ...staff,
  validate({ params: schema.cohortParams }),
  ...staffCourse,
  loadCohort(),
  gradebook.quizAttempts,
);

// -------------------------------------------------------------- schedules

router.get(
  '/:slug/cohort/:cohortId/schedules',
  ...staff,
  validate({ params: schema.cohortParams }),
  ...staffCourse,
  loadCohort(),
  schedules.board,
);

router.put(
  '/:slug/cohort/:cohortId/schedules',
  ...staff,
  validate({ params: schema.cohortParams, body: schema.saveSchedulesBody }),
  ...staffCourse,
  loadCohort(),
  schedules.saveOverrides,
);

router.post(
  '/:slug/cohort/:cohortId/schedules/apply-weekly',
  ...staff,
  validate({ params: schema.cohortParams, body: schema.applyWeeklyBody }),
  ...staffCourse,
  loadCohort(),
  schedules.applyWeekly,
);

router.post(
  '/:slug/cohort/:cohortId/schedules/copy-from',
  ...staff,
  validate({ params: schema.cohortParams, body: schema.copySchedulesBody }),
  ...staffCourse,
  loadCohort(),
  schedules.copyFrom,
);

// ------------------------------------------------------------ management

router.patch(
  '/:slug/cohort/:cohortId',
  ...staff,
  validate({ params: schema.cohortParams, body: schema.updateCohortBody }),
  ...staffCourse,
  loadCohort({ hydrate: true }),
  cohorts.update,
);

module.exports = router;
