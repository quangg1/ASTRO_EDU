const { asyncController, ok } = require('../../../shared/http');
const {
  listAdminOrders,
  getAdminOrderDetail,
  getAdminOrderOverview,
  updateAdminOrderNote,
  cancelAdminPendingOrder,
  refundAdminOrder,
} = require('../services/adminOrderService');

module.exports = asyncController({
  async list(req, res) {
    return ok(res, { data: await listAdminOrders(req.valid.query) });
  },

  /** Bảng tổng quan doanh thu trả `stats`/`orders` ở gốc body theo hợp đồng cũ. */
  async overview(_req, res) {
    const { stats, orders } = await getAdminOrderOverview();
    return ok(res, { stats, orders });
  },

  async detail(req, res) {
    return ok(res, { data: await getAdminOrderDetail(req.valid.params.txnRef) });
  },

  async updateNote(req, res) {
    const data = await updateAdminOrderNote({
      actorUserId: req.userId,
      txnRef: req.valid.params.txnRef,
      adminNote: req.valid.body.adminNote,
    });
    return ok(res, { data });
  },

  async cancel(req, res) {
    const data = await cancelAdminPendingOrder({
      actorUserId: req.userId,
      txnRef: req.valid.params.txnRef,
      reason: req.valid.body.reason,
    });
    return ok(res, { data });
  },

  async refund(req, res) {
    const data = await refundAdminOrder({
      actorUserId: req.userId,
      txnRef: req.valid.params.txnRef,
      reason: req.valid.body.reason,
      revokeAccess: req.valid.body.revokeAccess,
    });
    return ok(res, { data });
  },
});
