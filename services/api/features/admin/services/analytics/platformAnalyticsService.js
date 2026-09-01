const reporting = require('../../repositories/reportingRepository');
const { getUsdToVndRate } = require('../../../../shared/money/revenueVnd');
const { resolveRange, toDailySeries, toRate, withConversionRates } = require('./analyticsRange');

const TOP_COURSES_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = [1, 7, 30];

/** Headline KPIs, daily trends and best-performing courses. */
async function getPlatformOverview(rangeInput) {
  const { range, labels, startDate } = resolveRange(rangeInput);

  const [
    newUsers,
    activeLearners,
    lessonCompletions,
    completedTutorials,
    completedOrders,
    communityPosts,
    revenue,
    totalUsers,
    usersDaily,
    lessonsDaily,
    revenueDaily,
    topCoursesRaw,
    lessonProgress,
  ] = await Promise.all([
    reporting.countNewUsers(startDate),
    reporting.countActiveLearners(startDate),
    reporting.countLessonCompletions(startDate),
    reporting.countCompletedTutorials(startDate),
    reporting.countCompletedOrders(startDate),
    reporting.countPosts(startDate),
    reporting.sumCompletedRevenueVnd(startDate),
    reporting.countUsers(),
    reporting.dailyNewUsers(startDate),
    reporting.dailyLessonCompletions(startDate),
    reporting.dailyRevenue(startDate),
    reporting.topCoursesByEnrollment(startDate, TOP_COURSES_LIMIT),
    reporting.getLessonProgressTotals(),
  ]);

  return {
    range,
    revenueCurrency: 'VND',
    usdToVndRate: getUsdToVndRate(),
    kpis: {
      totalUsers,
      newUsers,
      activeLearners,
      lessonCompletions: lessonCompletions + completedTutorials,
      completionRate: toRate(lessonProgress.completed, lessonProgress.total),
      completedOrders,
      revenue,
      communityPosts,
    },
    trends: {
      users: toDailySeries(labels, usersDaily, 'count'),
      lessonCompletions: toDailySeries(labels, lessonsDaily, 'count'),
      revenue: toDailySeries(labels, revenueDaily, 'total'),
    },
    topCourses: await resolveTopCourses(topCoursesRaw),
  };
}

async function resolveTopCourses(rows) {
  if (!rows.length) return [];
  const courses = await reporting.findCourseTitles(rows.map((row) => row._id));
  const byId = new Map(courses.map((course) => [String(course._id), course]));
  return rows.map((row) => {
    const course = byId.get(String(row._id));
    return {
      courseId: String(row._id),
      title: course?.title || 'Không xác định',
      slug: course?.slug || '',
      enrollments: row.enrollments,
    };
  });
}

/** Signup -> enrol -> checkout -> pay -> learn, with step conversion rates. */
async function getAcquisitionFunnel(rangeInput) {
  const { range, startDate } = resolveRange(rangeInput);

  const [newUsers, enrollments, ordersStarted, completedOrders, lessonCompletions] =
    await Promise.all([
      reporting.countNewUsers(startDate),
      reporting.countEnrollments(startDate),
      reporting.countOrders(startDate),
      reporting.countCompletedOrders(startDate),
      reporting.countLessonCompletions(startDate),
    ]);

  return {
    range,
    funnel: withConversionRates([
      { step: 'new_users', label: 'Người dùng mới', value: newUsers },
      { step: 'enrolled', label: 'Người dùng ghi danh', value: enrollments },
      { step: 'checkout_started', label: 'Bắt đầu thanh toán', value: ordersStarted },
      { step: 'payment_success', label: 'Thanh toán thành công', value: completedOrders },
      { step: 'lesson_completed', label: 'Bài học đã hoàn thành', value: lessonCompletions },
    ]),
  };
}

/**
 * Share of the signup cohort that came back on/after day 1, 7 and 30.
 * "Coming back" is any enrolment, tutorial or order activity.
 */
async function getRetention(rangeInput) {
  const { range, startDate } = resolveRange(rangeInput);
  const users = await reporting.listSignupCohort(startDate);

  if (users.length === 0) {
    return { range, retention: { cohortSize: 0, d1: 0, d7: 0, d30: 0 } };
  }

  const activityByUser = await buildActivityIndex(users.map((user) => String(user._id)));
  const retained = { 1: 0, 7: 0, 30: 0 };

  for (const user of users) {
    const signupAt = new Date(user.createdAt).getTime();
    const activities = activityByUser.get(String(user._id)) || [];
    for (const day of RETENTION_DAYS) {
      if (activities.some((at) => at >= signupAt + day * DAY_MS)) retained[day] += 1;
    }
  }

  return {
    range,
    retention: {
      cohortSize: users.length,
      d1: toRate(retained[1], users.length),
      d7: toRate(retained[7], users.length),
      d30: toRate(retained[30], users.length),
    },
  };
}

async function buildActivityIndex(userIds) {
  const { enrollments, tutorials, orders } = await reporting.listActivityTimestamps(userIds);
  const index = new Map();

  const add = (rows, field) => {
    for (const row of rows) {
      const key = String(row.userId);
      const timestamps = index.get(key) || [];
      timestamps.push(new Date(row[field]).getTime());
      index.set(key, timestamps);
    }
  };

  add(enrollments, 'updatedAt');
  add(tutorials, 'updatedAt');
  add(orders, 'createdAt');
  return index;
}

/** Daily signup cohorts with how many of them enrolled and paid. */
async function getSignupCohorts(rangeInput = '90d') {
  const { range, labels, startDate } = resolveRange(rangeInput);

  const [usersDaily, enrollDaily, paidDaily] = await Promise.all([
    reporting.dailySignups(startDate),
    reporting.dailyEnrollments(startDate),
    reporting.dailyPaidOrders(startDate),
  ]);

  const userMap = new Map(usersDaily.map((row) => [String(row._id), row.users]));
  const enrollMap = new Map(enrollDaily.map((row) => [String(row._id), row.enrollments]));
  const paidMap = new Map(paidDaily.map((row) => [String(row._id), row.paidOrders]));

  return {
    range,
    cohorts: labels.map((date) => {
      const users = userMap.get(date) || 0;
      const enrollments = enrollMap.get(date) || 0;
      const paidOrders = paidMap.get(date) || 0;
      return {
        date,
        users,
        enrollments,
        paidOrders,
        enrollmentRate: toRate(enrollments, users),
        paidRate: toRate(paidOrders, users),
      };
    }),
  };
}

module.exports = { getPlatformOverview, getAcquisitionFunnel, getRetention, getSignupCohorts };
