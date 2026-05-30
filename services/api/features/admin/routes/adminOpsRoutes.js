const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { getAdminUserDetail } = require('../services/adminUserDetailService');
const {
  listAdminOrders,
  getAdminOrderDetail,
  updateAdminOrderNote,
  cancelAdminPendingOrder,
  refundAdminOrder,
} = require('../services/adminOrderService');
const {
  grantCatalogEnrollment,
  revokeCatalogEnrollment,
  grantCohortEnrollment,
  revokeCohortEnrollment,
} = require('../services/adminEnrollmentService');
const { listAdminCourses, setAdminCoursePublished } = require('../services/adminCourseService');
const { getAdminSystemStatus, triggerAdminNewsCrawl } = require('../services/adminSystemService');
const { listAdminAuditLog } = require('../services/adminAuditService');
const { getModerationQueue } = require('../../community/services/moderationService');
const UserReward = require('../../rewards/models/UserReward');
const GemTransaction = require('../../rewards/models/GemTransaction');
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService');
const { AppError } = require('../../../shared/errors');

const router = express.Router();

function adminHandler(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ success: true, ...data });
    } catch (err) {
      req.logger?.error('admin_ops_failed', { error: err.message, path: req.path });
      res.status(err.status || 500).json({
        success: false,
        code: err.code || 'ADMIN_OP_FAILED',
        error: err.message || 'Lỗi server',
      });
    }
  };
}

router.get(
  '/users/:id/detail',
  authMiddleware,
  requireAdminScope('users'),
  adminHandler(async (req) => {
    const data = await getAdminUserDetail(req.params.id);
    return { data };
  }),
);

router.get(
  '/users/:id/wallet',
  authMiddleware,
  requireAdminScope('users'),
  adminHandler(async (req) => {
    const uid = String(req.params.id);
    const ur = await UserReward.findOne({ userId: uid }).lean();
    const txs = await GemTransaction.find({ userId: uid }).sort({ createdAt: -1 }).limit(40).lean();
    const totalGemsEarned = ur?.totalGemsEarned ?? 0;
    return {
      data: {
        balance: ur?.gemBalance ?? 0,
        level: ur?.level ?? 1,
        totalGemsEarned,
        learnerTier: getWalletLearnerMeta(totalGemsEarned),
        transactions: txs.map((t) => ({
          id: String(t._id),
          delta: t.delta,
          reason: t.reason,
          createdAt: t.createdAt,
        })),
      },
    };
  }),
);

router.post(
  '/enrollments/catalog/grant',
  authMiddleware,
  requireAdminScope('users'),
  adminHandler(async (req) => {
    const userId = String(req.body?.userId || '').trim();
    const courseId = String(req.body?.courseId || '').trim();
    const reason = String(req.body?.reason || 'Admin cấp quyền tự học').trim();
    if (!userId || !courseId) throw new AppError(400, 'MISSING_FIELDS', 'Thiếu userId hoặc courseId');
    const data = await grantCatalogEnrollment({ actorUserId: req.userId, userId, courseId, reason });
    return { data };
  }),
);

router.post(
  '/enrollments/catalog/revoke',
  authMiddleware,
  requireAdminScope('users'),
  adminHandler(async (req) => {
    const userId = String(req.body?.userId || '').trim();
    const courseId = String(req.body?.courseId || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!userId || !courseId) throw new AppError(400, 'MISSING_FIELDS', 'Thiếu userId hoặc courseId');
    const data = await revokeCatalogEnrollment({ actorUserId: req.userId, userId, courseId, reason });
    return { data };
  }),
);

router.post(
  '/enrollments/cohort/grant',
  authMiddleware,
  requireAdminScope('users'),
  adminHandler(async (req) => {
    const userId = String(req.body?.userId || '').trim();
    const cohortId = String(req.body?.cohortId || '').trim();
    const reason = String(req.body?.reason || 'Admin cấp quyền lớp').trim();
    if (!userId || !cohortId) throw new AppError(400, 'MISSING_FIELDS', 'Thiếu userId hoặc cohortId');
    const data = await grantCohortEnrollment({ actorUserId: req.userId, userId, cohortId, reason });
    return { data };
  }),
);

router.post(
  '/enrollments/cohort/revoke',
  authMiddleware,
  requireAdminScope('users'),
  adminHandler(async (req) => {
    const userId = String(req.body?.userId || '').trim();
    const cohortId = String(req.body?.cohortId || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (!userId || !cohortId) throw new AppError(400, 'MISSING_FIELDS', 'Thiếu userId hoặc cohortId');
    const data = await revokeCohortEnrollment({ actorUserId: req.userId, userId, cohortId, reason });
    return { data };
  }),
);

router.get(
  '/orders',
  authMiddleware,
  requireAdminScope('orders'),
  adminHandler(async (req) => {
    const data = await listAdminOrders({
      status: String(req.query.status || 'all'),
      q: String(req.query.q || ''),
      courseSlug: String(req.query.courseSlug || '').trim() || undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 30,
    });
    return { data };
  }),
);

router.get(
  '/orders/:txnRef',
  authMiddleware,
  requireAdminScope('orders'),
  adminHandler(async (req) => {
    const data = await getAdminOrderDetail(req.params.txnRef);
    return { data };
  }),
);

router.patch(
  '/orders/:txnRef/note',
  authMiddleware,
  requireAdminScope('orders'),
  adminHandler(async (req) => {
    const data = await updateAdminOrderNote({
      actorUserId: req.userId,
      txnRef: req.params.txnRef,
      adminNote: req.body?.adminNote,
    });
    return { data };
  }),
);

router.post(
  '/orders/:txnRef/cancel',
  authMiddleware,
  requireAdminScope('orders'),
  adminHandler(async (req) => {
    const data = await cancelAdminPendingOrder({
      actorUserId: req.userId,
      txnRef: req.params.txnRef,
      reason: req.body?.reason,
    });
    return { data };
  }),
);

router.post(
  '/orders/:txnRef/refund',
  authMiddleware,
  requireAdminScope('orders'),
  adminHandler(async (req) => {
    const data = await refundAdminOrder({
      actorUserId: req.userId,
      txnRef: req.params.txnRef,
      reason: req.body?.reason,
      revokeAccess: req.body?.revokeAccess !== false,
    });
    return { data };
  }),
);

router.get(
  '/courses',
  authMiddleware,
  requireAdminScope('courses'),
  adminHandler(async (req) => {
    const data = await listAdminCourses({
      q: String(req.query.q || ''),
      published: String(req.query.published || 'all'),
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 30,
    });
    return { data };
  }),
);

router.patch(
  '/courses/:id/published',
  authMiddleware,
  requireAdminScope('courses'),
  adminHandler(async (req) => {
    const data = await setAdminCoursePublished({
      actorUserId: req.userId,
      courseId: req.params.id,
      published: Boolean(req.body?.published),
      reason: req.body?.reason,
    });
    return { data };
  }),
);

router.get(
  '/system/status',
  authMiddleware,
  requireAdminScope('system'),
  adminHandler(async () => {
    const data = await getAdminSystemStatus();
    return { data };
  }),
);

router.post(
  '/system/news-crawl',
  authMiddleware,
  requireAdminScope('system'),
  adminHandler(async (req) => {
    const data = await triggerAdminNewsCrawl({
      actorUserId: req.userId,
      reason: req.body?.reason,
    });
    return { data };
  }),
);

router.get(
  '/audit-log',
  authMiddleware,
  requireAdminScope('audit'),
  adminHandler(async (req) => {
    const data = await listAdminAuditLog({
      source: String(req.query.source || 'admin'),
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
    });
    return { data };
  }),
);

router.get(
  '/moderation/queue',
  authMiddleware,
  requireAdminScope('moderation'),
  adminHandler(async (req) => {
    const data = await getModerationQueue({
      status: String(req.query.status || 'open'),
      limit: parseInt(req.query.limit, 10) || 50,
    });
    return { data };
  }),
);

module.exports = router;
