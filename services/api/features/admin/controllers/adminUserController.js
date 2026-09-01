const { asyncController, ok } = require('../../../shared/http');
const {
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserScopes,
  updateAdminUserStatus,
  deleteAdminUserPermanently,
  adminSendUserPasswordReset,
} = require('../services/adminUserService');
const { getAdminUserDetail } = require('../services/adminUserDetailService');
const { getWallet } = require('../../rewards/services/gemWalletService');
const { adminWalletView } = require('../presenters/adminWalletPresenter');

module.exports = asyncController({
  async list(req, res) {
    const { items, total, page, limit } = await listAdminUsers(req.valid.query);
    return ok(res, { data: items, total, page, limit });
  },

  async detail(req, res) {
    return ok(res, { data: await getAdminUserDetail(req.valid.params.id) });
  },

  async wallet(req, res) {
    return ok(res, { data: adminWalletView(await getWallet(req.valid.params.id)) });
  },

  async updateRole(req, res) {
    const user = await updateAdminUserRole({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      role: req.valid.body.role,
    });
    return ok(res, { user });
  },

  async updateScopes(req, res) {
    const user = await updateAdminUserScopes({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      adminScopes: req.valid.body.adminScopes,
    });
    return ok(res, { user });
  },

  async updateStatus(req, res) {
    const user = await updateAdminUserStatus({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      accountStatus: req.valid.body.accountStatus,
      reason: req.valid.body.reason,
    });
    return ok(res, { user });
  },

  async sendPasswordReset(req, res) {
    const result = await adminSendUserPasswordReset({
      actorUserId: req.userId,
      targetUserId: req.params.id,
    });
    return ok(res, result);
  },

  async remove(req, res) {
    const result = await deleteAdminUserPermanently({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      confirmEmail: req.valid.body.confirmEmail,
      reason: req.valid.body.reason,
    });
    return ok(res, {
      message: result.emailSent
        ? 'Đã gửi email thông báo và xóa vĩnh viễn tài khoản.'
        : 'Đã xóa vĩnh viễn (email thông báo chưa gửi được — môi trường dev).',
      ...result,
    });
  },
});
