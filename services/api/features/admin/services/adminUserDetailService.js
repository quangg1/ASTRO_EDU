const userReporting = require('../repositories/adminUserReportingRepository');
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService');
const { enrichOrdersForUser } = require('../../payment/lib/serializeUserOrder');
const { AppError } = require('../../../shared/errors');

async function getAdminUserDetail(userId) {
  const bundle = await userReporting.loadUserDetailBundle(userId);
  if (!bundle) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }

  const {
    user,
    ordersRaw,
    enrollments,
    cohortEnrollments,
    userReward: ur,
    gemTransactions: gemTxs,
    courses,
    cohorts,
  } = bundle;

  const uid = String(user._id);
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
