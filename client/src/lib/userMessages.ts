/** Thông báo hiển thị cho người dùng — không chứa tên biến env, stack, hay chi tiết hạ tầng. */

export const userMessages = {
  genericError: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  networkError: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
  loadDataFailed: 'Không tải được dữ liệu. Vui lòng thử lại sau.',
  aiUnavailable: 'Trợ lý AI tạm thời không khả dụng. Vui lòng thử lại sau.',
  authSocialUnavailable: 'Đăng nhập Google/Facebook tạm thời không khả dụng.',
  checkoutSessionFailed: 'Không tạo được đơn hàng. Vui lòng thử lại sau.',
  paymentConfirmFailed: 'Thanh toán không hoàn tất. Vui lòng thử lại.',
} as const
