const crypto = require('crypto');
const User = require('../features/auth/models/User');
const { AppError } = require('./errors');
const { getRuntimeEnv } = require('../config/runtimeEnv');
const APP_PATHS = require('../../../shared/appPaths');
const { sendPasswordResetEmail } = require('./mailer');

/**
 * Tạo token reset + gửi email (local provider, tài khoản active).
 * Dùng cho forgot-password và admin gửi link hộ user.
 */
async function issuePasswordResetForLocalUser(userOrId) {
  const user =
    userOrId && typeof userOrId === 'object' && userOrId._id
      ? userOrId
      : await User.findById(userOrId).select(
          '+resetToken +resetTokenExpires email displayName provider accountStatus',
        );

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }
  if (user.provider !== 'local') {
    throw new AppError(
      400,
      'SOCIAL_ACCOUNT',
      'Tài khoản đăng nhập bằng mạng xã hội — không gửi link đặt lại mật khẩu.',
    );
  }
  if (user.accountStatus === 'deactivated') {
    throw new AppError(400, 'ACCOUNT_DEACTIVATED', 'Tài khoản đã ngừng hoạt động.');
  }
  if (!user.email) {
    throw new AppError(400, 'NO_EMAIL', 'Tài khoản không có email.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const clientUrl = getRuntimeEnv().clientUrl;
  const resetLink = `${clientUrl}${APP_PATHS.resetPassword}?token=${token}`;
  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    displayName: user.displayName,
    resetLink,
  });

  const payload = {
    email: user.email,
    emailSent: !!emailResult.sent,
    message: emailResult.sent
      ? 'Đã gửi email đặt lại mật khẩu.'
      : 'Đã tạo link đặt lại (email chưa gửi được).',
  };
  if (!emailResult.sent && process.env.NODE_ENV !== 'production') {
    payload.resetLink = resetLink;
    payload.devHint = 'SMTP chưa cấu hình — link hiển thị để dev test.';
  }
  return payload;
}

module.exports = { issuePasswordResetForLocalUser };
