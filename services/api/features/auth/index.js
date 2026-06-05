const express = require('express');
const crypto = require('crypto');
const User = require('./models/User');
const { issueToken, verifyToken } = require('./lib/jwt');
const { findOrLinkFirebaseUser } = require('./lib/oauthUser');
const { getFirebaseAdmin } = require('./lib/firebaseAdmin');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { listAdminUsers, updateAdminUserRole } = require('../admin/services/adminUserService');
const {
  submitTeacherApplication,
  getMyApplicationStatus,
} = require('./services/teacherApplicationService');
const { getMyTeacherProfile, updateMyTeacherProfile } = require('./services/teacherProfileService');
const { requireString } = require('../../shared/validation');
const { AppError } = require('../../shared/errors');
const { getRuntimeEnv } = require('../../config/runtimeEnv');
const APP_PATHS = require('../../../../shared/appPaths');
const { sendWelcomeEmail } = require('../../shared/mailer');
const { issuePasswordResetForLocalUser } = require('../../shared/passwordReset');
const {
  isLocalEmailVerified,
  isLocalUserPendingVerification,
  createPendingLocalUser,
  refreshPendingLocalUser,
  verifyEmailCode,
  resendVerificationCode,
} = require('./services/emailVerificationService');

const ROLES = ['student', 'teacher', 'moderator', 'admin'];

const router = express.Router();

function normalizeAuthUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    provider: user.provider,
    role: user.role || 'student',
    adminScopes: user.role === 'admin' ? (user.adminScopes || []) : [],
    accountStatus: user.accountStatus || 'active',
    emailVerified: user.provider !== 'local' ? true : isLocalEmailVerified(user),
  };
}

function ensureUserIsActive(user) {
  if (user?.accountStatus === 'deactivated') {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Tài khoản đã ngừng hoạt động');
  }
}

// --- Local register ---
router.post('/register', async (req, res) => {
  try {
    const email = requireString(req.body?.email, 'email', 'Email');
    const password = requireString(req.body?.password, 'password', 'Mật khẩu');
    const { displayName } = req.body || {};
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu tối thiểu 6 ký tự' });
    }
    const emailNorm = email.trim().toLowerCase();
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      if (existing.accountStatus === 'deactivated') {
        return res.status(409).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          error: 'Email này thuộc về tài khoản đã ngừng hoạt động. Liên hệ quản trị viên để khôi phục.',
        });
      }
      if (isLocalUserPendingVerification(existing)) {
        const sendMeta = await refreshPendingLocalUser(existing, { password, displayName });
        return res.status(200).json({
          success: true,
          needsVerification: true,
          email: emailNorm,
          message: 'Nhập mã 6 số đã gửi tới email để hoàn tất đăng ký.',
          ...sendMeta,
        });
      }
      const socialOnly = !existing.password;
      return res.status(409).json({
        success: false,
        error: socialOnly
          ? 'Email đã được dùng với Google/Facebook/Firebase. Đăng nhập bằng tài khoản đó — không đăng ký mật khẩu riêng cho email này.'
          : 'Email đã được sử dụng',
      });
    }
    const user = await createPendingLocalUser({
      emailNorm,
      password,
      displayName,
    });
    const sendMeta = await refreshPendingLocalUser(user, {});
    res.status(201).json({
      success: true,
      needsVerification: true,
      email: emailNorm,
      message: 'Đã gửi mã xác nhận tới email. Nhập mã để kích hoạt tài khoản.',
      ...sendMeta,
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email đã được sử dụng' });
    }
    res.status(500).json({ success: false, error: 'Lỗi đăng ký' });
  }
});

router.post('/register/verify-email', async (req, res) => {
  try {
    const email = requireString(req.body?.email, 'email', 'Email');
    const code = requireString(req.body?.code, 'code', 'Mã xác nhận');
    const { user, alreadyVerified } = await verifyEmailCode({ email, code });
    if (!alreadyVerified) {
      void sendWelcomeEmail({ to: user.email, displayName: user.displayName }).catch((e) => {
        console.error('[auth] welcome email:', e?.message || e);
      });
    }
    const token = issueToken(user);
    res.json({
      success: true,
      token,
      user: normalizeAuthUser(user),
      message: 'Xác nhận email thành công.',
    });
  } catch (err) {
    console.error('Verify email error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Lỗi xác nhận' });
  }
});

router.post('/register/resend-verification', async (req, res) => {
  try {
    const email = requireString(req.body?.email, 'email', 'Email');
    const sendMeta = await resendVerificationCode(email);
    res.json({
      success: true,
      message: 'Nếu email đang chờ xác nhận, mã mới đã được gửi.',
      ...sendMeta,
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Lỗi gửi lại mã' });
  }
});

// --- Local login ---
router.post('/login', async (req, res) => {
  try {
    const email = requireString(req.body?.email, 'email', 'Email');
    const password = requireString(req.body?.password, 'password', 'Mật khẩu');
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !user.password) {
      if (user && !user.password) {
        return res.status(401).json({
          success: false,
          error:
            'Tài khoản này đăng nhập bằng Google/Facebook (hoặc Firebase). Dùng nút đăng nhập tương ứng.',
        });
      }
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng' });
    }
    ensureUserIsActive(user);
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng' });
    }
    if (!isLocalEmailVerified(user)) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Email chưa xác nhận. Kiểm tra hộp thư hoặc đăng ký lại để nhận mã.',
        email: user.email,
      });
    }
    user.password = undefined;
    const token = issueToken(user);
    res.json({
      success: true,
      token,
      user: normalizeAuthUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi đăng nhập' });
  }
});

/**
 * Đăng nhập bằng Firebase ID token (Google / Facebook bật trong Firebase Console).
 * Client: signInWithPopup → getIdToken() → POST body { idToken }.
 */
router.post('/firebase', async (req, res) => {
  try {
    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        error: 'Đăng nhập chưa sẵn sàng. Vui lòng thử lại sau.',
      });
    }
    const idToken = req.body?.idToken;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ success: false, error: 'Thiếu idToken' });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const identities = decoded.firebase?.identities || {};
    const user = await findOrLinkFirebaseUser({
      firebaseUid: decoded.uid,
      email: decoded.email,
      identities,
      displayName: decoded.name || decoded.email?.split('@')[0] || 'User',
      avatar: decoded.picture || null,
      signInProvider: decoded.firebase?.sign_in_provider || '',
    });
    ensureUserIsActive(user);
    const token = issueToken(user);
    res.json({
      success: true,
      token,
      user: normalizeAuthUser(user),
    });
  } catch (err) {
    console.error('Firebase auth:', err);
    res.status(401).json({
      success: false,
      error: 'Token Firebase không hợp lệ hoặc đã hết hạn',
    });
  }
});

// --- Me ---
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Thiếu token' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
  User.findById(payload.sub)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ success: false, error: 'Người dùng không tồn tại' });
      }
      if (user.accountStatus === 'deactivated') {
        return res.status(403).json({ success: false, code: 'ACCOUNT_DEACTIVATED', error: 'Tài khoản đã ngừng hoạt động' });
      }
      if (!isLocalEmailVerified(user)) {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          error: 'Email chưa xác nhận.',
          email: user.email,
        });
      }
      const dbRole = user.role || 'student';
      const tokenRole = payload.role || 'student';
      const roleMismatch = dbRole !== tokenRole;
      const newToken = roleMismatch ? issueToken(user) : null;
      res.json({
        success: true,
        user: normalizeAuthUser(user),
        ...(newToken ? { token: newToken } : {}),
      });
    })
    .catch((err) => {
      console.error('Me error:', err);
      res.status(500).json({ success: false, error: 'Lỗi server' });
    });
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { displayName, avatar } = req.body || {};
    const update = {};
    if (typeof displayName === 'string') update.displayName = displayName.trim();
    if (typeof avatar === 'string') update.avatar = avatar.trim() || null;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, error: 'Người dùng không tồn tại' });
    }
    res.json({
      success: true,
      user: normalizeAuthUser(user),
    });
  } catch (err) {
    console.error('Patch me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật' });
  }
});

router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          accountStatus: 'deactivated',
          deactivatedAt: new Date(),
          deactivatedByUserId: String(req.userId),
          deactivationReason: reason,
        },
        $unset: {
          restoredAt: 1,
        },
      },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, error: 'Người dùng không tồn tại' });
    }
    res.json({ success: true, message: 'Tài khoản đã được đánh dấu ngừng hoạt động' });
  } catch (err) {
    console.error('Deactivate me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi ngừng hoạt động tài khoản' });
  }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const currentPassword = requireString(req.body?.currentPassword, 'currentPassword', 'Mật khẩu hiện tại');
    const newPassword = requireString(req.body?.newPassword, 'newPassword', 'Mật khẩu mới');
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }
    const user = await User.findById(req.userId).select('+password');
    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: 'Tài khoản đăng nhập bằng mạng xã hội, không đổi mật khẩu được' });
    }
    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không đúng' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Đã đổi mật khẩu' });
  } catch (err) {
    console.error('Change password error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi đổi mật khẩu' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = requireString(req.body?.email, 'email', 'Email');
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      provider: 'local',
      accountStatus: 'active',
    }).select('+resetToken +resetTokenExpires email displayName provider accountStatus');
    if (!user) {
      return res.json({ success: true, message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
    }
    const issued = await issuePasswordResetForLocalUser(user);
    const payload = {
      success: true,
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
      emailSent: issued.emailSent,
    };
    if (issued.resetLink) {
      payload.resetLink = issued.resetLink;
      payload.devHint = issued.devHint;
    }
    res.json(payload);
  } catch (err) {
    console.error('Forgot password error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi xử lý' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const token = requireString(req.body?.token, 'token', 'Token');
    const newPassword = requireString(req.body?.newPassword, 'newPassword', 'Mật khẩu mới');
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
      provider: 'local',
      accountStatus: 'active',
    }).select('+password +resetToken +resetTokenExpires');
    if (!user) {
      return res.status(400).json({ success: false, error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });
    }
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Đã đặt lại mật khẩu. Bạn có thể đăng nhập.' });
  } catch (err) {
    console.error('Reset password error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi đặt lại mật khẩu' });
  }
});

router.post('/teacher-application', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const application = await submitTeacherApplication({
      userId: req.userId,
      bio: body.bio,
      organization: body.organization,
      fullName: body.fullName,
      phone: body.phone,
      headline: body.headline,
      city: body.city,
      organizationRole: body.organizationRole,
      teachingLevels: body.teachingLevels,
      expertise: body.expertise,
      education: body.education,
      yearsExperience: body.yearsExperience,
      website: body.website,
      linkedin: body.linkedin,
      avatarUrl: body.avatarUrl,
      cvUrl: body.cvUrl,
      cvFileName: body.cvFileName,
      certificateUrl: body.certificateUrl,
      certificateFileName: body.certificateFileName,
    });
    res.status(201).json({ success: true, application });
  } catch (err) {
    console.error('Teacher application submit error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Lỗi gửi đơn' });
  }
});

router.get('/teacher-application/me', authMiddleware, async (req, res) => {
  try {
    const data = await getMyApplicationStatus(req.userId);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Teacher application me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi tải trạng thái đơn' });
  }
});

router.get('/teacher-profile/me', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const profile = await getMyTeacherProfile(req.userId);
    res.json({ success: true, profile });
  } catch (err) {
    console.error('Teacher profile me error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Lỗi tải hồ sơ giáo viên' });
  }
});

router.patch('/teacher-profile/me', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const profile = await updateMyTeacherProfile(req.userId, req.body || {});
    res.json({ success: true, profile });
  } catch (err) {
    console.error('Teacher profile patch error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Lỗi cập nhật hồ sơ' });
  }
});

router.get('/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await listAdminUsers({
      q: String(req.query.q || ''),
      role: String(req.query.role || '').trim() || undefined,
      accountStatus: String(req.query.accountStatus || '').trim() || undefined,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json({ success: true, data: result.items, total: result.total, page: result.page, limit: result.limit });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.patch('/admin/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const user = await updateAdminUserRole({
      actorUserId: req.userId,
      targetUserId: req.params.id,
      role: req.body?.role,
    });
    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error('Admin update user role error:', err);
    res.status(err.status || 500).json({ success: false, code: err.code || 'ADMIN_USER_ROLE_UPDATE_FAILED', error: err.message || 'Lỗi cập nhật vai trò' });
  }
});

module.exports = router;
