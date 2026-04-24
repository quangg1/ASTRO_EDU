const express = require('express');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { listAdminUsers, updateAdminUserRole, updateAdminUserStatus } = require('../../services/adminUserService');
const { listApplicationsForAdmin, reviewApplication } = require('../../services/teacherApplicationService');
const { getAdminOrderOverview } = require('../../services/adminOrderService');
const User = require('../auth/models/User');
const Enrollment = require('../courses/models/Enrollment');
const TutorialProgress = require('../courses/models/TutorialProgress');
const Course = require('../courses/models/Course');
const Order = require('../payment/models/Order');
const Post = require('../community/models/Post');
const LearningPathEvent = require('../courses/models/LearningPathEvent');
const LearningPath = require('../courses/models/LearningPath');

const router = express.Router();

const RANGE_TO_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function parseRangeDays(range) {
  return RANGE_TO_DAYS[range] || RANGE_TO_DAYS['30d'];
}

function buildDailyLabels(days) {
  const labels = [];
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    labels.push(date.toISOString().slice(0, 10));
  }
  return labels;
}

function toDailySeries(labels, rows, key = 'count') {
  const map = new Map(rows.map((r) => [String(r._id), Number(r[key]) || 0]));
  return labels.map((date) => ({ date, value: map.get(date) || 0 }));
}

function buildDateRange(days) {
  const labels = buildDailyLabels(days);
  const startDate = new Date(`${labels[0]}T00:00:00.000Z`);
  return { labels, startDate };
}

function buildLearningPathLookup(doc) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  const moduleMap = new Map();
  const nodeMap = new Map();
  const lessonMap = new Map();
  const conceptMap = new Map();
  for (const c of Array.isArray(doc?.concepts) ? doc.concepts : []) {
    const id = String(c?.id || '').trim();
    if (!id) continue;
    conceptMap.set(id, String(c.title || c.short_description || id).trim() || id);
  }

  for (const module of modules) {
    moduleMap.set(String(module.id), {
      moduleId: String(module.id),
      moduleTitle: module.titleVi || module.title || String(module.id),
      moduleOrder: Number(module.order) || null,
    });

    for (const node of module.nodes || []) {
      nodeMap.set(String(node.id), {
        moduleId: String(module.id),
        nodeId: String(node.id),
        nodeTitle: node.titleVi || node.title || String(node.id),
      });

      for (const depth of ['beginner', 'explorer', 'researcher']) {
        for (const lesson of node?.depths?.[depth] || []) {
          lessonMap.set(String(lesson.id), {
            moduleId: String(module.id),
            nodeId: String(node.id),
            lessonId: String(lesson.id),
            moduleTitle: module.titleVi || module.title || String(module.id),
            nodeTitle: node.titleVi || node.title || String(node.id),
            lessonTitle: lesson.titleVi || lesson.title || String(lesson.id),
            depth,
          });
        }
      }
    }
  }

  return { modules, moduleMap, nodeMap, lessonMap, conceptMap };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

router.get('/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const data = await listAdminUsers();
    res.json({ success: true, data });
  } catch (err) {
    req.logger?.error('admin_list_users_failed', { error: err.message });
    res.status(err.status || 500).json({ success: false, code: err.code || 'ADMIN_USERS_LIST_FAILED', error: err.message || 'Lỗi tải danh sách người dùng' });
  }
});

router.patch('/users/:id/role', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const user = await updateAdminUserRole({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      role: req.body?.role,
    });
    res.json({ success: true, user });
  } catch (err) {
    req.logger?.error('admin_update_role_failed', { error: err.message, targetUserId: req.params.id });
    res.status(err.status || 500).json({ success: false, code: err.code || 'ADMIN_USER_ROLE_UPDATE_FAILED', error: err.message || 'Lỗi cập nhật vai trò' });
  }
});

router.get('/teacher-applications', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const status = String(req.query.status || 'pending');
    const data = await listApplicationsForAdmin({ status });
    res.json({ success: true, data });
  } catch (err) {
    req.logger?.error('admin_teacher_applications_list_failed', { error: err.message });
    res.status(err.status || 500).json({ success: false, code: err.code, error: err.message || 'Lỗi tải đơn' });
  }
});

router.patch('/teacher-applications/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const application = await reviewApplication({
      actorUserId: req.userId,
      applicationId: req.params.id,
      action: req.body?.action,
      note: req.body?.note,
    });
    res.json({ success: true, application });
  } catch (err) {
    req.logger?.error('admin_teacher_application_review_failed', { error: err.message, id: req.params.id });
    res.status(err.status || 500).json({ success: false, code: err.code, error: err.message || 'Lỗi xử lý đơn' });
  }
});

router.patch('/users/:id/status', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const user = await updateAdminUserStatus({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      accountStatus: req.body?.accountStatus,
      reason: req.body?.reason,
    });
    res.json({ success: true, user });
  } catch (err) {
    req.logger?.error('admin_update_status_failed', { error: err.message, targetUserId: req.params.id });
    res.status(err.status || 500).json({ success: false, code: err.code || 'ADMIN_USER_STATUS_UPDATE_FAILED', error: err.message || 'Lỗi cập nhật trạng thái tài khoản' });
  }
});

router.get('/orders/overview', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { stats, orders } = await getAdminOrderOverview();
    res.json({ success: true, stats, orders });
  } catch (err) {
    req.logger?.error('admin_orders_overview_failed', { error: err.message });
    res.status(500).json({ success: false, code: 'ADMIN_ORDERS_OVERVIEW_FAILED', error: 'Lỗi tải tổng quan đơn hàng' });
  }
});

router.get('/analytics/overview', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    const days = parseRangeDays(range);
    const { labels, startDate } = buildDateRange(days);

    const [
      newUsers,
      activeLearners,
      lessonCompletions,
      completedTutorials,
      completedOrders,
      postsCreated,
      revenueAgg,
      totalUsers,
      usersDaily,
      lessonsDaily,
      revenueDaily,
      topCoursesRaw,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Enrollment.distinct('userId', { updatedAt: { $gte: startDate } }).then((ids) => ids.length),
      Enrollment.aggregate([
        { $match: { updatedAt: { $gte: startDate } } },
        { $unwind: '$progress' },
        { $match: { 'progress.completed': true, 'progress.completedAt': { $gte: startDate } } },
        { $count: 'count' },
      ]),
      TutorialProgress.countDocuments({ status: 'completed', completedAt: { $gte: startDate } }),
      Order.countDocuments({ status: 'completed', createdAt: { $gte: startDate } }),
      Post.countDocuments({ createdAt: { $gte: startDate } }),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.countDocuments({}),
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Enrollment.aggregate([
        { $match: { updatedAt: { $gte: startDate } } },
        { $unwind: '$progress' },
        { $match: { 'progress.completed': true, 'progress.completedAt': { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$progress.completedAt',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Enrollment.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$courseId', enrollments: { $sum: 1 } } },
        { $sort: { enrollments: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const revenue = revenueAgg[0]?.total || 0;
    const totalLessonRecords = await Enrollment.aggregate([
      { $unwind: '$progress' },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const completedLessonRecords = await Enrollment.aggregate([
      { $unwind: '$progress' },
      { $match: { 'progress.completed': true } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    const completionRate = totalLessonRecords[0]?.total
      ? Math.round(((completedLessonRecords[0]?.total || 0) / totalLessonRecords[0].total) * 1000) / 10
      : 0;

    const topCourseIds = topCoursesRaw.map((row) => row._id);
    const topCourseDocs = await Course.find({ _id: { $in: topCourseIds } })
      .select('title slug')
      .lean();
    const courseMap = new Map(topCourseDocs.map((c) => [String(c._id), c]));
    const topCourses = topCoursesRaw.map((row) => {
      const course = courseMap.get(String(row._id));
      return {
        courseId: String(row._id),
        title: course?.title || 'Không xác định',
        slug: course?.slug || '',
        enrollments: row.enrollments,
      };
    });

    res.json({
      success: true,
      range,
      kpis: {
        totalUsers,
        newUsers,
        activeLearners,
        lessonCompletions: (lessonCompletions[0]?.count || 0) + completedTutorials,
        completionRate,
        completedOrders,
        revenue,
        communityPosts: postsCreated,
      },
      trends: {
        users: toDailySeries(labels, usersDaily, 'count'),
        lessonCompletions: toDailySeries(labels, lessonsDaily, 'count'),
        revenue: toDailySeries(labels, revenueDaily, 'total'),
      },
      topCourses,
    });
  } catch (err) {
    req.logger?.error('admin_analytics_overview_failed', { error: err.message, range: req.query.range });
    res.status(500).json({ success: false, error: 'Lỗi tải analytics admin' });
  }
});

router.get('/analytics/funnel', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    const days = parseRangeDays(range);
    const { startDate } = buildDateRange(days);

    const [newUsers, enrollments, ordersStarted, completedOrders, lessonCompletions] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Enrollment.countDocuments({ createdAt: { $gte: startDate } }),
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.countDocuments({ status: 'completed', createdAt: { $gte: startDate } }),
      Enrollment.aggregate([
        { $match: { updatedAt: { $gte: startDate } } },
        { $unwind: '$progress' },
        { $match: { 'progress.completed': true, 'progress.completedAt': { $gte: startDate } } },
        { $count: 'count' },
      ]),
    ]);

    const funnel = [
      { step: 'new_users', label: 'Người dùng mới', value: newUsers },
      { step: 'enrolled', label: 'Người dùng ghi danh', value: enrollments },
      { step: 'checkout_started', label: 'Bắt đầu thanh toán', value: ordersStarted },
      { step: 'payment_success', label: 'Thanh toán thành công', value: completedOrders },
      { step: 'lesson_completed', label: 'Bài học đã hoàn thành', value: lessonCompletions[0]?.count || 0 },
    ];

    const first = funnel[0].value || 1;
    const withRates = funnel.map((row, idx) => ({
      ...row,
      conversionFromStart: Math.round((row.value / first) * 1000) / 10,
      conversionFromPrev:
        idx === 0
          ? 100
          : Math.round((row.value / Math.max(1, funnel[idx - 1].value)) * 1000) / 10,
    }));

    res.json({ success: true, range, funnel: withRates });
  } catch (err) {
    req.logger?.error('admin_analytics_funnel_failed', { error: err.message, range: req.query.range });
    res.status(500).json({ success: false, error: 'Lỗi tải funnel analytics' });
  }
});

router.get('/analytics/retention', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    const days = parseRangeDays(range);
    const { startDate } = buildDateRange(days);

    const users = await User.find({ createdAt: { $gte: startDate } })
      .select('_id createdAt')
      .lean();
    const userIds = users.map((u) => String(u._id));
    if (userIds.length === 0) {
      return res.json({
        success: true,
        range,
        retention: { cohortSize: 0, d1: 0, d7: 0, d30: 0 },
      });
    }

    const enrollments = await Enrollment.find({ userId: { $in: userIds } })
      .select('userId updatedAt')
      .lean();
    const tutorials = await TutorialProgress.find({ userId: { $in: userIds } })
      .select('userId updatedAt')
      .lean();
    const orders = await Order.find({ userId: { $in: userIds } })
      .select('userId createdAt')
      .lean();

    const activityByUser = new Map();
    for (const row of enrollments) {
      const arr = activityByUser.get(String(row.userId)) || [];
      arr.push(new Date(row.updatedAt));
      activityByUser.set(String(row.userId), arr);
    }
    for (const row of tutorials) {
      const arr = activityByUser.get(String(row.userId)) || [];
      arr.push(new Date(row.updatedAt));
      activityByUser.set(String(row.userId), arr);
    }
    for (const row of orders) {
      const arr = activityByUser.get(String(row.userId)) || [];
      arr.push(new Date(row.createdAt));
      activityByUser.set(String(row.userId), arr);
    }

    let d1 = 0;
    let d7 = 0;
    let d30 = 0;
    for (const user of users) {
      const signup = new Date(user.createdAt).getTime();
      const activities = activityByUser.get(String(user._id)) || [];
      const hasD1 = activities.some((a) => a.getTime() >= signup + 1 * 24 * 60 * 60 * 1000);
      const hasD7 = activities.some((a) => a.getTime() >= signup + 7 * 24 * 60 * 60 * 1000);
      const hasD30 = activities.some((a) => a.getTime() >= signup + 30 * 24 * 60 * 60 * 1000);
      if (hasD1) d1 += 1;
      if (hasD7) d7 += 1;
      if (hasD30) d30 += 1;
    }

    const size = users.length;
    res.json({
      success: true,
      range,
      retention: {
        cohortSize: size,
        d1: Math.round((d1 / size) * 1000) / 10,
        d7: Math.round((d7 / size) * 1000) / 10,
        d30: Math.round((d30 / size) * 1000) / 10,
      },
    });
  } catch (err) {
    console.error('Admin analytics retention error:', err);
    res.status(500).json({ success: false, error: 'Lỗi tải retention analytics' });
  }
});

router.get('/analytics/cohort', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const range = String(req.query.range || '90d');
    const days = parseRangeDays(range);
    const { labels, startDate } = buildDateRange(days);

    const usersDaily = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, users: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const enrollDaily = await Enrollment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, enrollments: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const paidDaily = await Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, paidOrders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const userMap = new Map(usersDaily.map((r) => [String(r._id), r.users]));
    const enrollMap = new Map(enrollDaily.map((r) => [String(r._id), r.enrollments]));
    const paidMap = new Map(paidDaily.map((r) => [String(r._id), r.paidOrders]));

    const cohorts = labels.map((date) => {
      const users = userMap.get(date) || 0;
      const enrollments = enrollMap.get(date) || 0;
      const paidOrders = paidMap.get(date) || 0;
      return {
        date,
        users,
        enrollments,
        paidOrders,
        enrollmentRate: users ? Math.round((enrollments / users) * 1000) / 10 : 0,
        paidRate: users ? Math.round((paidOrders / users) * 1000) / 10 : 0,
      };
    });

    res.json({ success: true, range, cohorts });
  } catch (err) {
    console.error('Admin analytics cohort error:', err);
    res.status(500).json({ success: false, error: 'Lỗi tải cohort analytics' });
  }
});

router.get('/analytics/learning-path', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const range = String(req.query.range || '30d');
    const days = parseRangeDays(range);
    const { startDate } = buildDateRange(days);
    const selectedModuleId = String(req.query.moduleId || '').trim();
    const selectedDepth = ['beginner', 'explorer', 'researcher'].includes(String(req.query.depth || '').trim())
      ? String(req.query.depth).trim()
      : '';
    const learningPathDoc = await LearningPath.findOne({ slug: 'main' }).lean();
    const lookup = buildLearningPathLookup(learningPathDoc);

    const baseMatch = {
      timestamp: { $gte: startDate },
      ...(selectedModuleId ? { moduleId: selectedModuleId } : {}),
      ...(selectedDepth ? { depth: selectedDepth } : {}),
    };

    const [summaryAgg, depthAgg, moduleAgg, lessonStatsAgg, funnelAgg] = await Promise.all([
      LearningPathEvent.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueSessions: { $addToSet: '$sessionId' },
            lessonOpens: {
              $sum: {
                $cond: [{ $eq: ['$eventName', 'lp_lesson_opened'] }, 1, 0],
              },
            },
            lessonCompletions: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$eventName', 'lp_lesson_completed_toggled'] },
                      { $eq: ['$completed', true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            lessonMastered: {
              $sum: { $cond: [{ $eq: ['$eventName', 'lp_lesson_mastered'] }, 1, 0] },
            },
            depthSwitches: {
              $sum: {
                $cond: [{ $eq: ['$eventName', 'lp_depth_switched'] }, 1, 0],
              },
            },
          },
        },
      ]),
      LearningPathEvent.aggregate([
        { $match: { ...baseMatch, eventName: 'lp_depth_switched', depth: { $in: ['beginner', 'explorer', 'researcher'] } } },
        { $group: { _id: '$depth', switches: { $sum: 1 } } },
        { $sort: { switches: -1 } },
      ]),
      LearningPathEvent.aggregate([
        { $match: { ...baseMatch, eventName: 'lp_lesson_opened', moduleId: { $ne: null } } },
        {
          $group: {
            _id: '$moduleId',
            opens: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
            users: { $addToSet: '$userId' },
          },
        },
        { $sort: { opens: -1 } },
        { $limit: 12 },
      ]),
      LearningPathEvent.aggregate([
        {
          $match: {
            ...baseMatch,
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
            opens: {
              $sum: { $cond: [{ $eq: ['$eventName', 'lp_lesson_opened'] }, 1, 0] },
            },
            completions: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$eventName', 'lp_lesson_completed_toggled'] },
                      { $eq: ['$completed', true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            openSessions: {
              $addToSet: {
                $cond: [{ $eq: ['$eventName', 'lp_lesson_opened'] }, '$sessionId', null],
              },
            },
            completionSessions: {
              $addToSet: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$eventName', 'lp_lesson_completed_toggled'] },
                      { $eq: ['$completed', true] },
                    ],
                  },
                  '$sessionId',
                  null,
                ],
              },
            },
          },
        },
        { $sort: { opens: -1, completions: -1 } },
      ]),
      LearningPathEvent.aggregate([
        {
          $match: {
            ...baseMatch,
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
            moduleViewed: {
              $sum: { $cond: [{ $eq: ['$eventName', 'lp_module_viewed'] }, 1, 0] },
            },
            nodeViewed: {
              $sum: { $cond: [{ $eq: ['$eventName', 'lp_node_viewed'] }, 1, 0] },
            },
            lessonOpened: {
              $sum: { $cond: [{ $eq: ['$eventName', 'lp_lesson_opened'] }, 1, 0] },
            },
            lessonCompleted: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$eventName', 'lp_lesson_completed_toggled'] },
                      { $eq: ['$completed', true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            lessonMastered: {
              $sum: { $cond: [{ $eq: ['$eventName', 'lp_lesson_mastered'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const dwellAgg = await LearningPathEvent.aggregate([
      { $match: { ...baseMatch, eventName: 'lp_lesson_dwell' } },
      {
        $group: {
          _id: '$moduleId',
          avgDurationSec: { $avg: '$durationSec' },
        },
      },
    ]);
    const dwellByModule = new Map(dwellAgg.map((row) => [String(row._id || ''), row.avgDurationSec || 0]));

    const conceptEngagementAgg = await LearningPathEvent.aggregate([
      { $match: { ...baseMatch, eventName: 'lp_concept_opened' } },
      { $match: { 'metadata.conceptId': { $exists: true, $nin: [null, ''] } } },
      {
        $group: {
          _id: { $toString: '$metadata.conceptId' },
          opens: { $sum: 1 },
          users: { $addToSet: '$userId' },
        },
      },
      { $sort: { opens: -1 } },
      { $limit: 25 },
    ]);

    const summaryRow = summaryAgg[0] || {};
    const uniqueUsers = ensureArray(summaryRow.uniqueUsers).filter(Boolean);
    const uniqueSessions = ensureArray(summaryRow.uniqueSessions).filter(Boolean);
    const funnel = funnelAgg[0] || { moduleViewed: 0, nodeViewed: 0, lessonOpened: 0, lessonCompleted: 0, lessonMastered: 0 };

    const funnelSteps = [
      { step: 'session_started', label: 'Phiên học', value: uniqueSessions.length },
      { step: 'module_viewed', label: 'Xem module', value: funnel.moduleViewed || 0 },
      { step: 'node_viewed', label: 'Xem chủ đề', value: funnel.nodeViewed || 0 },
      { step: 'lesson_opened', label: 'Mở bài học', value: funnel.lessonOpened || 0 },
      { step: 'lesson_completed', label: 'Hoàn thành bài', value: funnel.lessonCompleted || 0 },
      { step: 'lesson_mastered', label: 'Vượt kiểm tra (mastery)', value: funnel.lessonMastered || 0 },
    ];
    const base = funnelSteps[0].value || 1;
    const funnelWithRates = funnelSteps.map((row, idx) => ({
      ...row,
      conversionFromStart: Math.round((row.value / base) * 1000) / 10,
      conversionFromPrev: idx === 0 ? 100 : Math.round((row.value / Math.max(1, funnelSteps[idx - 1].value)) * 1000) / 10,
    }));
    res.json({
      success: true,
      range,
      filters: {
        moduleId: selectedModuleId || null,
        depth: selectedDepth || null,
      },
      filterOptions: {
        modules: lookup.modules.map((module) => ({
          moduleId: String(module.id),
          moduleTitle: module.titleVi || module.title || String(module.id),
          moduleOrder: Number(module.order) || null,
        })),
        depths: [
          { value: 'beginner', label: 'Cơ bản' },
          { value: 'explorer', label: 'Cơ chế' },
          { value: 'researcher', label: 'Sâu' },
        ],
      },
      summary: {
        totalEvents: summaryRow.totalEvents || 0,
        uniqueUsers: uniqueUsers.length,
        uniqueSessions: uniqueSessions.length,
        lessonOpens: summaryRow.lessonOpens || 0,
        lessonCompletions: summaryRow.lessonCompletions || 0,
        lessonMastered: summaryRow.lessonMastered || 0,
        depthSwitches: summaryRow.depthSwitches || 0,
      },
      funnel: funnelWithRates,
      depthDistribution: depthAgg.map((row) => ({ depth: row._id, switches: row.switches })),
      moduleEngagement: moduleAgg.map((row) => {
        const moduleId = String(row._id || '');
        const moduleInfo = lookup.moduleMap.get(moduleId);
        return {
          moduleId,
          moduleTitle: moduleInfo?.moduleTitle || moduleId,
          moduleOrder: moduleInfo?.moduleOrder || null,
          opens: row.opens || 0,
          uniqueSessions: ensureArray(row.sessions).filter(Boolean).length,
          uniqueUsers: ensureArray(row.users).filter(Boolean).length,
          avgDwellSec: Math.round((dwellByModule.get(moduleId) || 0) * 10) / 10,
        };
      }),
      topLessons: lessonStatsAgg
        .map((row) => {
          const lessonId = String(row._id?.lessonId || '');
          const meta = lookup.lessonMap.get(lessonId);
          const opens = row.opens || 0;
          const completions = row.completions || 0;
          return {
            lessonId,
            moduleId: row._id?.moduleId || null,
            nodeId: row._id?.nodeId || null,
            moduleTitle: meta?.moduleTitle || String(row._id?.moduleId || ''),
            nodeTitle: meta?.nodeTitle || String(row._id?.nodeId || ''),
            lessonTitle: meta?.lessonTitle || lessonId,
            depth: meta?.depth || null,
            opens,
            uniqueSessions: ensureArray(row.openSessions).filter(Boolean).length,
            completions,
            uniqueCompletionSessions: ensureArray(row.completionSessions).filter(Boolean).length,
            dropOffCount: Math.max(0, opens - completions),
            dropOffRate: Math.round((Math.max(0, opens - completions) / Math.max(1, opens)) * 1000) / 10,
          };
        })
        .sort((a, b) => b.dropOffCount - a.dropOffCount || b.completions - a.completions || b.opens - a.opens)
        .slice(0, 15),
      topConcepts: conceptEngagementAgg.map((row) => {
        const conceptId = String(row._id || '').trim();
        return {
          conceptId,
          conceptTitle: lookup.conceptMap.get(conceptId) || conceptId,
          opens: row.opens || 0,
          uniqueUsers: ensureArray(row.users).filter(Boolean).length,
        };
      }),
    });
  } catch (err) {
    req.logger?.error('admin_analytics_learning_path_failed', { error: err.message, range: req.query.range });
    res.status(500).json({ success: false, error: 'Lỗi tải learning path analytics' });
  }
});

module.exports = router;
