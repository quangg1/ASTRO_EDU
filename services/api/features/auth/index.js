/**
 * Auth feature barrel.
 *
 * Quản trị người dùng đã chuyển hẳn sang `features/admin` (`/api/admin/users`),
 * nên router này chỉ còn lo phiên đăng nhập và hồ sơ của chính người dùng.
 */
module.exports = require('./routes/auth');
