const { isLocalEmailVerified } = require('../services/emailVerificationService');

/** Hình dạng user duy nhất client được thấy — không lộ hash hay token nội bộ. */
function authUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    provider: user.provider,
    role: user.role || 'student',
    adminScopes: user.role === 'admin' ? user.adminScopes || [] : [],
    accountStatus: user.accountStatus || 'active',
    // Tài khoản mạng xã hội coi như email đã xác nhận bởi nhà cung cấp.
    emailVerified: user.provider !== 'local' ? true : isLocalEmailVerified(user),
  };
}

module.exports = { authUser };
