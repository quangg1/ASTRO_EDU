const express = require('express');
const crypto = require('crypto');
const User = require('./models/User');
const { issueToken, verifyToken } = require('./lib/jwt');
const { findOrLinkFirebaseUser } = require('./lib/oauthUser');
const { getFirebaseAdmin } = require('./lib/firebaseAdmin');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { listAdminUsers, updateAdminUserRole } = require('../../services/adminUserService');
const { requireString } = require('../../shared/validation');
const { AppError } = require('../../shared/errors');

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
    accountStatus: user.accountStatus || 'active',
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
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      if (existing.accountStatus === 'deactivated') {
        return res.status(409).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          error: 'Email này thuộc về tài khoản đã ngừng hoạt động. Liên hệ quản trị viên để khôi phục.',
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
    const user = await User.create({
      email: email.trim().toLowerCase(),
      password,
      displayName: (displayName || '').trim() || undefined,
      provider: 'local',
    });
    const token = issueToken(user);
    res.status(201).json({
      success: true,
      token,
      user: normalizeAuthUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi đăng ký' });
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
        error: 'Server chưa cấu hình FIREBASE_SERVICE_ACCOUNT_JSON',
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
      res.json({
        success: true,
        user: normalizeAuthUser(user),
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
    const user = await User.findOne({ email: email.trim().toLowerCase(), provider: 'local', accountStatus: 'active' }).select('+resetToken +resetTokenExpires');
    if (!user) {
      return res.json({ success: true, message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetLink = `${clientUrl}/reset-password?token=${token}`;
    res.json({ success: true, message: 'Kiểm tra email của bạn.', resetLink });
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

router.get('/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const list = await listAdminUsers();
    res.json({ success: true, data: list });
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
