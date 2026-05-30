const mongoose = require('mongoose');
const User = require('../../auth/models/User');
const Order = require('../../payment/models/Order');
const Enrollment = require('../../courses/models/Enrollment');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const Cohort = require('../../courses/models/Cohort');
const Course = require('../../courses/models/Course');
const UserReward = require('../../rewards/models/UserReward');
const GemTransaction = require('../../rewards/models/GemTransaction');
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService');
const { enrichOrdersForUser } = require('../../payment/lib/serializeUserOrder');
const { AppError } = require('../../../shared/errors');

async function getAdminUserDetail(userId) {
  const user = await User.findById(userId)
    .select(
      'email displayName avatar provider role accountStatus deactivatedAt deactivationReason createdAt',
    )
    .lean();
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }

  const uid = String(user._id);

  const [ordersRaw, enrollments, cohortEnrollments, ur, gemTxs] = await Promise.all([
    Order.find({ userId: uid }).sort({ createdAt: -1 }).limit(50).lean(),
    Enrollment.find({ userId: uid }).sort({ enrolledAt: -1 }).lean(),
    CohortEnrollment.find({ userId: uid }).sort({ joinedAt: -1 }).lean(),
    UserReward.findOne({ userId: uid }).lean(),
    GemTransaction.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const courseIds = [...new Set(enrollments.map((e) => String(e.courseId)))];
  const cohortIds = [...new Set(cohortEnrollments.map((e) => String(e.cohortId)))];
  const [courses, cohorts] = await Promise.all([
    courseIds.length
      ? Course.find({ _id: { $in: courseIds } })
          .select('title slug published')
          .lean()
      : [],
    cohortIds.length
      ? Cohort.find({ _id: { $in: cohortIds } })
          .select('title slug courseId status startAt')
          .lean()
      : [],
  ]);
  const courseById = Object.fromEntries(courses.map((c) => [String(c._id), c]));
  const cohortById = Object.fromEntries(cohorts.map((c) => [String(c._id), c]));

  const orders = await enrichOrdersForUser(ordersRaw);
  const totalGemsEarned = ur?.totalGemsEarned ?? 0;

  return {
    user: {
      id: uid,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      provider: user.provider,
      role: user.role || 'student',
      accountStatus: user.accountStatus || 'active',
      deactivatedAt: user.deactivatedAt || null,
      deactivationReason: user.deactivationReason || '',
      createdAt: user.createdAt,
    },
    wallet: {
      balance: ur?.gemBalance ?? 0,
      level: ur?.level ?? 1,
      totalGemsEarned,
      learnerTier: getWalletLearnerMeta(totalGemsEarned),
      recentTransactions: gemTxs.map((t) => ({
        id: String(t._id),
        delta: t.delta,
        reason: t.reason,
        createdAt: t.createdAt,
      })),
    },
    orders,
    catalogEnrollments: enrollments.map((e) => {
      const c = courseById[String(e.courseId)];
      return {
        id: String(e._id),
        courseId: String(e.courseId),
        courseSlug: c?.slug || null,
        courseTitle: c?.title || null,
        status: e.status,
        enrolledAt: e.enrolledAt,
        trialExpiresAt: e.trialExpiresAt || null,
      };
    }),
    cohortEnrollments: cohortEnrollments.map((e) => {
      const c = cohortById[String(e.cohortId)];
      const course = c ? courseById[String(c.courseId)] : null;
      return {
        id: String(e._id),
        cohortId: String(e.cohortId),
        cohortTitle: c?.title || null,
        cohortSlug: c?.slug || null,
        courseSlug: course?.slug || null,
        courseTitle: course?.title || null,
        joinedAt: e.joinedAt,
      };
    }),
  };
}

module.exports = { getAdminUserDetail };
