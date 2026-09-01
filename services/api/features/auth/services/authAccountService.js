const { AppError } = require('../../../shared/errors');
const { sendWelcomeEmail } = require('../../../shared/mailer');
const { issuePasswordResetForLocalUser } = require('../../../shared/passwordReset');
const { userRepository } = require('../repositories/userRepository');
const { issueToken } = require('../lib/jwt');
const { findOrLinkFirebaseUser } = require('../lib/oauthUser');
const { getFirebaseAdmin } = require('../lib/firebaseAdmin');
const {
  isLocalEmailVerified,
  isLocalUserPendingVerification,
  createPendingLocalUser,
  refreshPendingLocalUser,
  verifyEmailCode,
  resendVerificationCode,
} = require('./emailVerificationService');

const MIN_PASSWORD_LENGTH = 6;

const RESET_MESSAGE = 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.';
const SOCIAL_ONLY_MESSAGE =
  'Email đã được dùng với Google/Facebook/Firebase. Đăng nhập bằng tài khoản đó — không đăng ký mật khẩu riêng cho email này.';
const SOCIAL_LOGIN_MESSAGE =
  'Tài khoản này đăng nhập bằng Google/Facebook (hoặc Firebase). Dùng nút đăng nhập tương ứng.';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

function assertPasswordLength(password, label = 'Mật khẩu') {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`${label} tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`);
  }
}

function assertActive(user) {
  if (user?.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Tài khoản đã ngừng hoạt động');
  }
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');

function emailNotVerified(user) {
  return new AppError(403, 'EMAIL_NOT_VERIFIED', 'Email chưa xác nhận.', { email: user.email });
}

/**
 * Đăng ký cục bộ luôn dừng ở bước chờ mã 6 số; tài khoản chỉ dùng được sau khi
 * xác nhận email. Email đang chờ xác nhận thì gửi lại mã thay vì báo trùng.
 */
async function register({ email, password, displayName }) {
  assertPasswordLength(password);
  const emailNorm = normalizeEmail(email);

  const existing = await userRepository.findDocByEmail(emailNorm);
  if (existing) {
    if (existing.accountStatus === 'deactivated') {
      throw new AppError(
        409,
        'ACCOUNT_DEACTIVATED',
        'Email này thuộc về tài khoản đã ngừng hoạt động. Liên hệ quản trị viên để khôi phục.',
      );
    }
    if (isLocalUserPendingVerification(existing)) {
      const sendMeta = await refreshPendingLocalUser(existing, { password, displayName });
      return {
        created: false,
        email: emailNorm,
        message: 'Nhập mã 6 số đã gửi tới email để hoàn tất đăng ký.',
        ...sendMeta,
      };
    }
    throw AppError.conflict(existing.password ? 'Email đã được sử dụng' : SOCIAL_ONLY_MESSAGE);
  }

  const user = await createPendingLocalUser({ emailNorm, password, displayName });
  const sendMeta = await refreshPendingLocalUser(user, {});
  return {
    created: true,
    email: emailNorm,
    message: 'Đã gửi mã xác nhận tới email. Nhập mã để kích hoạt tài khoản.',
    ...sendMeta,
  };
}

async function verifyEmail({ email, code }) {
  const { user, alreadyVerified } = await verifyEmailCode({ email, code });

  if (!alreadyVerified) {
    // Thư chào mừng không được phép chặn luồng đăng nhập ngay sau xác nhận.
    void sendWelcomeEmail({ to: user.email, displayName: user.displayName }).catch((err) => {
      console.error('[auth] welcome email:', err?.message || err);
    });
  }

  return { user, token: issueToken(user), message: 'Xác nhận email thành công.' };
}

async function resendVerification(email) {
  return resendVerificationCode(email);
}

async function login({ email, password }) {
  const user = await userRepository.findDocByEmailWithPassword(normalizeEmail(email));
  if (!user) throw invalidCredentials();
  if (!user.password) throw new AppError(401, 'SOCIAL_ACCOUNT', SOCIAL_LOGIN_MESSAGE);

  assertActive(user);
  if (!(await user.comparePassword(password))) throw invalidCredentials();
  if (!isLocalEmailVerified(user)) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Email chưa xác nhận. Kiểm tra hộp thư hoặc đăng ký lại để nhận mã.',
      { email: user.email },
    );
  }

  user.password = undefined;
  return { user, token: issueToken(user) };
}

/** Đăng nhập Google/Facebook: client đổi popup lấy idToken rồi gửi lên đây. */
async function loginWithFirebase(idToken) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    throw new AppError(503, 'AUTH_UNAVAILABLE', 'Đăng nhập chưa sẵn sàng. Vui lòng thử lại sau.');
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    console.error('Firebase auth:', err);
    throw new AppError(401, 'FIREBASE_TOKEN_INVALID', 'Token Firebase không hợp lệ hoặc đã hết hạn');
  }

  const user = await findOrLinkFirebaseUser({
    firebaseUid: decoded.uid,
    email: decoded.email,
    identities: decoded.firebase?.identities || {},
    displayName: decoded.name || decoded.email?.split('@')[0] || 'User',
    avatar: decoded.picture || null,
    signInProvider: decoded.firebase?.sign_in_provider || '',
  });
  assertActive(user);

  return { user, token: issueToken(user) };
}

/**
 * Phiên hiện tại. Vai trò trong token có thể cũ hơn CSDL (admin vừa đổi quyền),
 * khi đó phát lại token để client không mắc kẹt ở vai trò cũ.
 */
async function loadSession(payload) {
  const user = await userRepository.findDocById(payload.sub);
  if (!user) throw new AppError(401, 'USER_NOT_FOUND', 'Người dùng không tồn tại');
  assertActive(user);
  if (!isLocalEmailVerified(user)) throw emailNotVerified(user);

  const roleChanged = (user.role || 'student') !== (payload.role || 'student');
  return { user, refreshedToken: roleChanged ? issueToken(user) : null };
}

async function updateProfile(userId, { displayName, avatar }) {
  const update = {};
  if (typeof displayName === 'string') update.displayName = displayName.trim();
  if (typeof avatar === 'string') update.avatar = avatar.trim() || null;

  const user = await userRepository.updateProfile(userId, update);
  if (!user) throw AppError.notFound('Người dùng không tồn tại');
  return user;
}

async function deactivateAccount(userId, reason) {
  const user = await userRepository.deactivate(userId, {
    reason: typeof reason === 'string' ? reason.trim() : '',
    actorUserId: userId,
  });
  if (!user) throw AppError.notFound('Người dùng không tồn tại');
}

async function changePassword(userId, { currentPassword, newPassword }) {
  assertPasswordLength(newPassword, 'Mật khẩu mới');

  const user = await userRepository.findDocByIdWithPassword(userId);
  if (!user || !user.password) {
    throw AppError.badRequest('Tài khoản đăng nhập bằng mạng xã hội, không đổi mật khẩu được');
  }
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng');
  }

  user.password = newPassword;
  await user.save();
}

/** Không tiết lộ email nào có tồn tại: mọi trường hợp đều trả cùng thông điệp. */
async function requestPasswordReset(email) {
  const user = await userRepository.findActiveLocalDocByEmail(normalizeEmail(email));
  if (!user) return { message: RESET_MESSAGE };

  const issued = await issuePasswordResetForLocalUser(user);
  return {
    message: RESET_MESSAGE,
    emailSent: issued.emailSent,
    ...(issued.resetLink ? { resetLink: issued.resetLink, devHint: issued.devHint } : {}),
  };
}

async function resetPassword({ token, newPassword }) {
  assertPasswordLength(newPassword, 'Mật khẩu mới');

  const user = await userRepository.findActiveLocalDocByResetToken(token);
  if (!user) {
    throw AppError.badRequest('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  }

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  loginWithFirebase,
  loadSession,
  updateProfile,
  deactivateAccount,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
