const { asyncController, ok } = require('../../../shared/http');
const { AppError } = require('../../../shared/errors');
const {
  setAuthCookie,
  clearAuthCookie,
  shouldExposeTokenInBody,
  extractAuthToken,
} = require('../../../shared/authCookie');
const { verifyToken } = require('../lib/jwt');
const { authUser } = require('../presenters/authPresenter');
const account = require('../services/authAccountService');

/** Cookie là nguồn chính; token trong body chỉ dành cho client không dùng cookie. */
function sendSession(req, res, { user, token }, extra = {}) {
  setAuthCookie(res, token);
  return res.json({
    success: true,
    user: authUser(user),
    ...(shouldExposeTokenInBody(req) ? { token } : {}),
    ...extra,
  });
}

/** Phiên hỏng thì phải xóa cookie, nếu không client sẽ lặp lại mãi. */
const SESSION_BREAKING_CODES = new Set(['USER_NOT_FOUND', 'ACCOUNT_DEACTIVATED']);

module.exports = asyncController({
  async register(req, res) {
    const { created, ...result } = await account.register(req.valid.body);
    return res.status(created ? 201 : 200).json({
      success: true,
      needsVerification: true,
      ...result,
    });
  },

  async verifyEmail(req, res) {
    const { user, token, message } = await account.verifyEmail(req.valid.body);
    return sendSession(req, res, { user, token }, { message });
  },

  async resendVerification(req, res) {
    const sendMeta = await account.resendVerification(req.valid.body.email);
    return ok(res, {
      message: 'Nếu email đang chờ xác nhận, mã mới đã được gửi.',
      ...sendMeta,
    });
  },

  async login(req, res) {
    return sendSession(req, res, await account.login(req.valid.body));
  },

  async firebaseLogin(req, res) {
    return sendSession(req, res, await account.loginWithFirebase(req.valid.body.idToken));
  },

  async logout(_req, res) {
    clearAuthCookie(res);
    return ok(res);
  },

  async me(req, res) {
    const token = extractAuthToken(req);
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Thiếu token');

    const payload = verifyToken(token);
    if (!payload) {
      clearAuthCookie(res);
      throw new AppError(401, 'INVALID_SESSION', 'Token không hợp lệ hoặc đã hết hạn');
    }

    let session;
    try {
      session = await account.loadSession(payload);
    } catch (err) {
      if (err instanceof AppError && SESSION_BREAKING_CODES.has(err.code)) clearAuthCookie(res);
      throw err;
    }

    const { user, refreshedToken } = session;
    if (refreshedToken) setAuthCookie(res, refreshedToken);

    return res.json({
      success: true,
      user: authUser(user),
      ...(refreshedToken && shouldExposeTokenInBody(req) ? { token: refreshedToken } : {}),
    });
  },

  async updateMe(req, res) {
    const user = await account.updateProfile(req.userId, req.valid.body);
    return ok(res, { user: authUser(user) });
  },

  async deactivateMe(req, res) {
    await account.deactivateAccount(req.userId, req.valid.body.reason);
    clearAuthCookie(res);
    return ok(res, { message: 'Tài khoản đã được đánh dấu ngừng hoạt động' });
  },

  async changePassword(req, res) {
    await account.changePassword(req.userId, req.valid.body);
    return ok(res, { message: 'Đã đổi mật khẩu' });
  },

  async forgotPassword(req, res) {
    return ok(res, await account.requestPasswordReset(req.valid.body.email));
  },

  async resetPassword(req, res) {
    await account.resetPassword(req.valid.body);
    return ok(res, { message: 'Đã đặt lại mật khẩu. Bạn có thể đăng nhập.' });
  },
});
