/* eslint-disable no-restricted-imports -- documented read-model boundary, see below */
/**
 * Admin reporting read model.
 *
 * Admin analytics is inherently cross-context: it counts users, enrolments,
 * orders, posts and learning-path events together. Rather than scattering those
 * foreign model imports across a dozen route handlers (which is how this
 * started), every cross-feature read lives in this one file. It is read-only
 * and never writes to another feature's collections, so the coupling is
 * explicit, greppable and reviewable in a single place.
 */
const User = require('../../auth/models/User');
const Enrollment = require('../../courses/models/Enrollment');
const TutorialProgress = require('../../courses/models/TutorialProgress');
const Course = require('../../courses/models/Course');
const Order = require('../../payment/models/Order');
const Post = require('../../community/models/Post');
const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const LearningPath = require('../../learning-path/models/LearningPath');
const Concept = require('../../concepts/models/Concept');
const CourseLearningEvent = require('../../courses/models/CourseLearningEvent');
const { amountToVndAggExpr } = require('../../../shared/money/revenueVnd');

const DAILY_KEY = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field } });

const completedLessonProgressStages = (startDate) => [
  { $match: { updatedAt: { $gte: startDate } } },
  { $unwind: '$progress' },
  {
    $match: {
      'progress.completed': true,
      'progress.completedAt': { $gte: startDate },
    },
  },
];

// ----------------------------------------------------------------- platform

const countUsers = (filter = {}) => User.countDocuments(filter);
const countNewUsers = (startDate) => User.countDocuments({ createdAt: { $gte: startDate } });
const countEnrollments = (startDate) => Enrollment.countDocuments({ createdAt: { $gte: startDate } });
const countOrders = (startDate) => Order.countDocuments({ createdAt: { $gte: startDate } });
const countPosts = (startDate) => Post.countDocuments({ createdAt: { $gte: startDate } });

const countCompletedOrders = (startDate) =>
  Order.countDocuments({ status: 'completed', createdAt: { $gte: startDate } });

const countCompletedTutorials = (startDate) =>
  TutorialProgress.countDocuments({ status: 'completed', completedAt: { $gte: startDate } });

async function countActiveLearners(startDate) {
  const ids = await Enrollment.distinct('userId', { updatedAt: { $gte: startDate } });
  return ids.length;
}

async function countLessonCompletions(startDate) {
  const rows = await Enrollment.aggregate([
    ...completedLessonProgressStages(startDate),
    { $count: 'count' },
  ]);
  return rows[0]?.count || 0;
}

async function sumCompletedRevenueVnd(startDate) {
  const rows = await Order.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: startDate } } },
    { $group: { _id: null, total: { $sum: amountToVndAggExpr() } } },
  ]);
  return Math.round(rows[0]?.total || 0);
}

/** Overall lesson completion ratio across all time, not just the range. */
async function getLessonProgressTotals() {
  const [totals, completed] = await Promise.all([
    Enrollment.aggregate([{ $unwind: '$progress' }, { $group: { _id: null, total: { $sum: 1 } } }]),
    Enrollment.aggregate([
      { $unwind: '$progress' },
      { $match: { 'progress.completed': true } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
  ]);
  return { total: totals[0]?.total || 0, completed: completed[0]?.total || 0 };
}

// -------------------------------------------------------------- daily series

const dailyNewUsers = (startDate) =>
  User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: DAILY_KEY('$createdAt'), count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

const dailyLessonCompletions = (startDate) =>
  Enrollment.aggregate([
    ...completedLessonProgressStages(startDate),
    { $group: { _id: DAILY_KEY('$progress.completedAt'), count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

const dailyRevenue = (startDate) =>
  Order.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: startDate } } },
    { $group: { _id: DAILY_KEY('$createdAt'), total: { $sum: amountToVndAggExpr() } } },
    { $sort: { _id: 1 } },
  ]);

const dailyEnrollments = (startDate) =>
  Enrollment.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: DAILY_KEY('$createdAt'), enrollments: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

const dailyPaidOrders = (startDate) =>
  Order.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: startDate } } },
    { $group: { _id: DAILY_KEY('$createdAt'), paidOrders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

const dailySignups = (startDate) =>
  User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: DAILY_KEY('$createdAt'), users: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

// ------------------------------------------------------------------ courses

const topCoursesByEnrollment = (startDate, limit = 5) =>
  Enrollment.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: '$courseId', enrollments: { $sum: 1 } } },
    { $sort: { enrollments: -1 } },
    { $limit: limit },
  ]);

const findCourseTitles = (courseIds) =>
  Course.find({ _id: { $in: courseIds } })
    .select('title slug')
    .lean();

// ---------------------------------------------------------------- retention

const listSignupCohort = (startDate) =>
  User.find({ createdAt: { $gte: startDate } })
    .select('_id createdAt')
    .lean();

/** Every activity timestamp per user, used to compute D1/D7/D30 retention. */
function listActivityTimestamps(userIds) {
  return Promise.all([
    Enrollment.find({ userId: { $in: userIds } }).select('userId updatedAt').lean(),
    TutorialProgress.find({ userId: { $in: userIds } }).select('userId updatedAt').lean(),
    Order.find({ userId: { $in: userIds } }).select('userId createdAt').lean(),
  ]).then(([enrollments, tutorials, orders]) => ({ enrollments, tutorials, orders }));
}

// ----------------------------------------------------------- learning path

const findMainLearningPath = () => LearningPath.findOne({ slug: 'main' }).lean();

const findConceptTitles = (conceptIds) =>
  Concept.find({ id: { $in: conceptIds } })
    .select('id title short_description')
    .lean();

const countIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });
const IS_LESSON_COMPLETED = {
  $and: [{ $eq: ['$eventName', 'lp_lesson_completed_toggled'] }, { $eq: ['$completed', true] }],
};

const learningPathSummary = (match) =>
  LearningPathEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' },
        lessonOpens: countIf({ $eq: ['$eventName', 'lp_lesson_opened'] }),
        lessonCompletions: countIf(IS_LESSON_COMPLETED),
        lessonMastered: countIf({ $eq: ['$eventName', 'lp_lesson_mastered'] }),
        depthSwitches: countIf({ $eq: ['$eventName', 'lp_depth_switched'] }),
      },
    },
  ]);

const learningPathDepthSwitches = (match) =>
  LearningPathEvent.aggregate([
    {
      $match: {
        ...match,
        eventName: 'lp_depth_switched',
        depth: { $in: ['beginner', 'explorer', 'researcher'] },
      },
    },
    { $group: { _id: '$depth', switches: { $sum: 1 } } },
    { $sort: { switches: -1 } },
  ]);

const learningPathModuleEngagement = (match, limit = 12) =>
  LearningPathEvent.aggregate([
    { $match: { ...match, eventName: 'lp_lesson_opened', moduleId: { $ne: null } } },
    {
      $group: {
        _id: '$moduleId',
        opens: { $sum: 1 },
        sessions: { $addToSet: '$sessionId' },
        users: { $addToSet: '$userId' },
      },
    },
    { $sort: { opens: -1 } },
    { $limit: limit },
  ]);

const learningPathLessonStats = (match) =>
  LearningPathEvent.aggregate([
    {
      $match: {
        ...match,
        lessonId: { $ne: null },
        $or: [
          { eventName: 'lp_lesson_opened' },
          { eventName: 'lp_lesson_completed_toggled', completed: true },
        ],
      },
    },
    {
      $group: {
        _id: { lessonId: '$lessonId', moduleId: '$moduleId', nodeId: '$nodeId' },
        opens: countIf({ $eq: ['$eventName', 'lp_lesson_opened'] }),
        completions: countIf(IS_LESSON_COMPLETED),
        openSessions: {
          $addToSet: { $cond: [{ $eq: ['$eventName', 'lp_lesson_opened'] }, '$sessionId', null] },
        },
        completionSessions: {
          $addToSet: { $cond: [IS_LESSON_COMPLETED, '$sessionId', null] },
        },
      },
    },
    { $sort: { opens: -1, completions: -1 } },
  ]);

const learningPathFunnel = (match) =>
  LearningPathEvent.aggregate([
    {
      $match: {
        ...match,
        eventName: {
          $in: [
            'lp_module_viewed',
            'lp_node_viewed',
            'lp_lesson_opened',
            'lp_lesson_completed_toggled',
            'lp_lesson_mastered',
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        moduleViewed: countIf({ $eq: ['$eventName', 'lp_module_viewed'] }),
        nodeViewed: countIf({ $eq: ['$eventName', 'lp_node_viewed'] }),
        lessonOpened: countIf({ $eq: ['$eventName', 'lp_lesson_opened'] }),
        lessonCompleted: countIf(IS_LESSON_COMPLETED),
        lessonMastered: countIf({ $eq: ['$eventName', 'lp_lesson_mastered'] }),
      },
    },
  ]);

const learningPathDwellByModule = (match) =>
  LearningPathEvent.aggregate([
    { $match: { ...match, eventName: 'lp_lesson_dwell' } },
    { $group: { _id: '$moduleId', avgDurationSec: { $avg: '$durationSec' } } },
  ]);

const learningPathConceptEngagement = (match, limit = 25) =>
  LearningPathEvent.aggregate([
    { $match: { ...match, eventName: 'lp_concept_opened' } },
    { $match: { 'metadata.conceptId': { $exists: true, $nin: [null, ''] } } },
    {
      $group: {
        _id: { $toString: '$metadata.conceptId' },
        opens: { $sum: 1 },
        users: { $addToSet: '$userId' },
      },
    },
    { $sort: { opens: -1 } },
    { $limit: limit },
  ]);

// --------------------------------------------------------------- explore

const exploreEventCounts = (startDate, eventNames) =>
  LearningPathEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        eventName: { $in: eventNames },
      },
    },
    {
      $group: {
        _id: '$eventName',
        events: { $sum: 1 },
        users: { $addToSet: '$userId' },
        sessions: { $addToSet: '$sessionId' },
      },
    },
  ]);

const exploreTopEntityEvents = (startDate, eventNames, limit = 40) =>
  LearningPathEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        eventName: { $in: eventNames },
        'metadata.entityId': { $exists: true, $nin: [null, ''] },
      },
    },
    {
      $group: {
        _id: { entityId: { $toString: '$metadata.entityId' }, eventName: '$eventName' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

// ------------------------------------------------------ unified learners

const learningPathEventStats = (startDate) =>
  LearningPathEvent.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        users: { $addToSet: '$userId' },
        sessions: { $addToSet: '$sessionId' },
      },
    },
  ]);

const courseLearningEventStats = (startDate) =>
  CourseLearningEvent.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        users: { $addToSet: '$userId' },
        sessions: { $addToSet: '$sessionId' },
      },
    },
  ]);

const distinctLearningPathUsers = (startDate) =>
  LearningPathEvent.distinct('userId', {
    timestamp: { $gte: startDate },
    userId: { $nin: [null, ''] },
  });

const distinctCourseLearningUsers = (startDate) =>
  CourseLearningEvent.distinct('userId', {
    timestamp: { $gte: startDate },
    userId: { $nin: [null, ''] },
  });

const dailyLearningPathEvents = (startDate) =>
  LearningPathEvent.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const dailyCourseLearningEvents = (startDate) =>
  CourseLearningEvent.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

module.exports = {
  countUsers,
  countNewUsers,
  countEnrollments,
  countOrders,
  countPosts,
  countCompletedOrders,
  countCompletedTutorials,
  countActiveLearners,
  countLessonCompletions,
  sumCompletedRevenueVnd,
  getLessonProgressTotals,
  dailyNewUsers,
  dailyLessonCompletions,
  dailyRevenue,
  dailyEnrollments,
  dailyPaidOrders,
  dailySignups,
  topCoursesByEnrollment,
  findCourseTitles,
  listSignupCohort,
  listActivityTimestamps,
  findMainLearningPath,
  findConceptTitles,
  learningPathSummary,
  learningPathDepthSwitches,
  learningPathModuleEngagement,
  learningPathLessonStats,
  learningPathFunnel,
  learningPathDwellByModule,
  learningPathConceptEngagement,
  exploreEventCounts,
  exploreTopEntityEvents,
  learningPathEventStats,
  courseLearningEventStats,
  distinctLearningPathUsers,
  distinctCourseLearningUsers,
  dailyLearningPathEvents,
  dailyCourseLearningEvents,
};
