const express = require('express');
const crypto = require('crypto');
const User = require('./models/User');
const { issueToken, verifyToken } = require('./lib/jwt');
const { findOrLinkFirebaseUser } = require('./lib/oauthUser');
const { getFirebaseAdmin } = require('./lib/firebaseAdmin');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');

const ROLES = ['student', 'teacher', 'moderator', 'admin'];

const router = express.Router();

// --- Local register ---
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email và mật khẩu là bắt buộc' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu tối thiểu 6 ký tự' });
    }
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
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
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role || 'student',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Lỗi đăng ký' });
  }
});

// --- Local login ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email và mật khẩu là bắt buộc' });
    }
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
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng' });
    }
    user.password = undefined;
    const token = issueToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role || 'student',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
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
    const token = issueToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role || 'student',
      },
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
      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          provider: user.provider,
          role: user.role || 'student',
        },
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
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role || 'student',
      },
    });
  } catch (err) {
    console.error('Patch me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật' });
  }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Cần mật khẩu hiện tại và mật khẩu mới' });
    }
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
    res.status(500).json({ success: false, error: 'Lỗi đổi mật khẩu' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập email' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase(), provider: 'local' }).select('+resetToken +resetTokenExpires');
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
    res.status(500).json({ success: false, error: 'Lỗi xử lý' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Thiếu token hoặc mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
      provider: 'local',
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
    res.status(500).json({ success: false, error: 'Lỗi đặt lại mật khẩu' });
  }
});

router.get('/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('email displayName avatar provider role createdAt').sort({ createdAt: -1 }).limit(500).lean();
    const list = users.map((u) => ({
      id: u._id,
      email: u.email,
      displayName: u.displayName,
      avatar: u.avatar,
      provider: u.provider,
      role: u.role || 'student',
      createdAt: u.createdAt,
    }));
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.patch('/admin/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Role không hợp lệ. Chọn: student, teacher, moderator, admin' });
    }
    if (id === req.userId && role !== 'admin') {
      return res.status(400).json({ success: false, error: 'Admin không được tự hạ quyền của chính mình' });
    }
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, runValidators: true }
    ).select('email displayName avatar provider role createdAt');
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy user' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role || 'student',
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Admin update user role error:', err);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật role' });
  }
});

module.exports = router;
