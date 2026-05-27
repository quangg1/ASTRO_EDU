const crypto = require('crypto');
const User = require('../models/User');
const { sendEmailVerificationCode } = require('../../../shared/mailer');
const { AppError } = require('../../../shared/errors');

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function pepper() {
  return process.env.JWT_SECRET || 'cosmo-learn-email-verify';
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(`${String(code)}:${pepper()}`).digest('hex');
}

function generateSixDigitCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function isLocalUserPendingVerification(user) {
  return user?.provider === 'local' && user.emailVerified === false;
}

/** Legacy user (không có field) coi như đã xác nhận. */
function isLocalEmailVerified(user) {
  if (!user || user.provider !== 'local') return true;
  if (user.emailVerified === undefined || user.emailVerified === null) return true;
  return user.emailVerified === true;
}

async function assignAndSendVerificationCode(user) {
  const code = generateSixDigitCode();
  user.emailVerificationCodeHash = hashVerificationCode(code);
  user.emailVerificationExpires = new Date(Date.now() + CODE_TTL_MS);
  user.emailVerificationSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  const emailResult = await sendEmailVerificationCode({
    to: user.email,
    displayName: user.displayName,
    code,
  });

  const payload = {
    emailSent: !!emailResult.sent,
    expiresInMinutes: 15,
  };
  if (!emailResult.sent && process.env.NODE_ENV !== 'production') {
    payload.devVerificationCode = code;
    payload.devHint = 'SMTP chưa gửi được — dùng mã dev bên dưới.';
  }
  if (!emailResult.sent && process.env.NODE_ENV === 'production') {
    throw new AppError(
      503,
      'EMAIL_SEND_FAILED',
      'Không gửi được email xác nhận. Kiểm tra cấu hình SMTP hoặc thử lại sau.',
    );
  }
  return payload;
}

async function createPendingLocalUser({ emailNorm, password, displayName }) {
  return User.create({
    email: emailNorm,
    password,
    displayName: (displayName || '').trim() || undefined,
    provider: 'local',
    providerId: emailNorm,
    emailVerified: false,
  });
}

async function refreshPendingLocalUser(user, { password, displayName }) {
  if (password) user.password = password;
  if (displayName !== undefined) {
    user.displayName = (displayName || '').trim() || '';
  }
  return assignAndSendVerificationCode(user);
}

async function verifyEmailCode({ email, code }) {
  const emailNorm = String(email || '').trim().toLowerCase();
  const rawCode = String(code || '').trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(rawCode)) {
    throw new AppError(400, 'INVALID_CODE', 'Mã xác nhận gồm 6 chữ số.');
  }

  const user = await User.findOne({ email: emailNorm, provider: 'local' }).select(
    '+emailVerificationCodeHash +emailVerificationExpires +password',
  );
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy đăng ký với email này.');
  }
  if (user.emailVerified === true) {
    return { user, alreadyVerified: true };
  }
  if (!user.emailVerificationCodeHash || !user.emailVerificationExpires) {
    throw new AppError(400, 'NO_PENDING_CODE', 'Chưa có mã xác nhận — gửi lại mã.');
  }
  if (user.emailVerificationExpires < new Date()) {
    throw new AppError(400, 'CODE_EXPIRED', 'Mã đã hết hạn. Gửi mã mới.');
  }
  const expected = hashVerificationCode(rawCode);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(user.emailVerificationCodeHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AppError(400, 'INVALID_CODE', 'Mã xác nhận không đúng.');
  }

  user.emailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationSentAt = undefined;
  await user.save({ validateBeforeSave: false });
  return { user, alreadyVerified: false };
}

async function resendVerificationCode(email) {
  const emailNorm = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm, provider: 'local' }).select(
    '+emailVerificationSentAt',
  );
  if (!user) {
    return { ok: true, message: 'Nếu email đang chờ xác nhận, bạn sẽ nhận mã mới.' };
  }
  if (user.emailVerified === true) {
    throw new AppError(400, 'ALREADY_VERIFIED', 'Email đã được xác nhận — hãy đăng nhập.');
  }
  if (
    user.emailVerificationSentAt &&
    Date.now() - user.emailVerificationSentAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    throw new AppError(429, 'RESEND_TOO_SOON', 'Vui lòng đợi 1 phút trước khi gửi lại mã.');
  }
  return assignAndSendVerificationCode(user);
}

module.exports = {
  isLocalEmailVerified,
  isLocalUserPendingVerification,
  createPendingLocalUser,
  refreshPendingLocalUser,
  assignAndSendVerificationCode,
  verifyEmailCode,
  resendVerificationCode,
};
