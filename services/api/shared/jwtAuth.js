const { verifyToken } = require('@galaxies/auth-shared');
const { AppError } = require('./errors');
const User = require('../features/auth/models/User');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Thiếu token' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
  try {
    const user = await User.findById(payload.sub).select('role accountStatus');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Người dùng không tồn tại' });
    }
    if (user.accountStatus === 'deactivated') {
      return res.status(403).json({ success: false, code: 'ACCOUNT_DEACTIVATED', error: 'Tài khoản đã ngừng hoạt động' });
    }
    req.userDoc = user;
    req.userId = payload.sub;
    req.user = payload;
    req.userRole = user.role || payload.role || 'student';
    next();
  } catch (error) {
    next(error);
  }
}

/** Giống authMiddleware nhưng không bắt buộc token — role luôn đọc từ DB (JWT có thể cũ). */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return next();
  }
  const payload = verifyToken(token);
  if (!payload) {
    return next();
  }
  try {
    const user = await User.findById(payload.sub).select('role accountStatus');
    if (!user || user.accountStatus === 'deactivated') {
      return next();
    }
    req.userDoc = user;
    req.userId = payload.sub;
    req.user = payload;
    req.userRole = user.role || payload.role || 'student';
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ success: false, error: 'Không có quyền truy cập' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

function canEditCourse(course, actor) {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (actor.role !== 'teacher') return false;
  return !course.teacherId || String(course.teacherId) === String(actor.id);
}

function canEditTutorial(tutorial, actor) {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (actor.role !== 'teacher') return false;
  return !tutorial.authorId || String(tutorial.authorId) === String(actor.id);
}

/** Kiểm duyệt diễn đàn — chỉ moderator (admin dùng override riêng). */
function canModerate(actor) {
  return !!actor && actor.role === 'moderator';
}

function canModerateOrAdminOverride(actor) {
  return !!actor && (actor.role === 'moderator' || actor.role === 'admin');
}

function canManagePlatform(actor) {
  return !!actor && actor.role === 'admin';
}

function canEditContentAsTeacher(actor) {
  return !!actor && actor.role === 'teacher';
}

function canEditContentWithAdminOverride(actor) {
  return !!actor && actor.role === 'admin';
}

function requirePolicy(check, code = 'FORBIDDEN', message = 'Không có quyền truy cập') {
  return (req, _res, next) => {
    const actor = { id: req.userId, role: req.userRole };
    if (!check(req, actor)) {
      return next(new AppError(403, code, message));
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  requireAdmin,
  canEditCourse,
  canEditTutorial,
  canModerate,
  canModerateOrAdminOverride,
  canManagePlatform,
  canEditContentAsTeacher,
  canEditContentWithAdminOverride,
  requirePolicy,
};
