/**
 * Data-access layer for the courses bounded context.
 *
 * Everything above this folder (services, controllers, routes) talks to these
 * repositories; Mongoose models are imported here and nowhere else.
 */
module.exports = {
  ...require('./courseRepository'),
  ...require('./cohortRepository'),
  ...require('./cohortEnrollmentRepository'),
  ...require('./cohortAnnouncementRepository'),
  ...require('./cohortScheduleRepository'),
  ...require('./gradebookRepository'),
  ...require('./enrollmentRepository'),
  ...require('./tutorialRepository'),
  ...require('./courseEventRepository'),
};
