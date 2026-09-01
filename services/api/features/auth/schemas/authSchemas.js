const { z } = require('../../../shared/http');

/**
 * Mật khẩu vẫn được `trim()` như luồng cũ (`requireString`) — đổi hành vi này sẽ
 * làm hỏng đăng nhập của những tài khoản đã băm mật khẩu sau khi cắt khoảng trắng.
 */
const required = (label) => z.string().trim().min(1, `${label} là bắt buộc`);

const email = required('Email').toLowerCase();

const registerBody = z.object({
  email,
  password: required('Mật khẩu'),
  displayName: z.string().trim().max(120).optional(),
});

const verifyEmailBody = z.object({
  email,
  code: required('Mã xác nhận'),
});

const emailOnlyBody = z.object({ email });

const loginBody = z.object({
  email,
  password: required('Mật khẩu'),
});

const firebaseLoginBody = z.object({
  idToken: z.string().trim().min(1, 'Thiếu idToken'),
});

/**
 * Hai schema dưới đây cố tình dễ tính: client cũ vẫn gửi `avatar: null` hay bỏ
 * trống body, và tầng service đã tự lọc theo kiểu dữ liệu.
 */
const lenientObject = z.preprocess(
  (value) => (value && typeof value === 'object' ? value : {}),
  z.looseObject({}),
);

const updateProfileBody = lenientObject;
const deactivateBody = lenientObject;

const changePasswordBody = z.object({
  currentPassword: required('Mật khẩu hiện tại'),
  newPassword: required('Mật khẩu mới'),
});

const resetPasswordBody = z.object({
  token: required('Token'),
  newPassword: required('Mật khẩu mới'),
});

module.exports = {
  registerBody,
  verifyEmailBody,
  emailOnlyBody,
  loginBody,
  firebaseLoginBody,
  updateProfileBody,
  deactivateBody,
  changePasswordBody,
  resetPasswordBody,
};
