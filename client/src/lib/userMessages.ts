/** Thông báo hiển thị cho người dùng — không chứa tên biến env, stack, hay chi tiết hạ tầng. */

export const userMessages = {
  genericError: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  networkError: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
  loadDataFailed: 'Không tải được dữ liệu. Vui lòng thử lại sau.',
  aiUnavailable: 'Trợ lý AI tạm thời không khả dụng. Vui lòng thử lại sau.',
  authSocialUnavailable: 'Đăng nhập Google/Facebook tạm thời không khả dụng.',
  paymentQrFailed: 'Không tạo được mã thanh toán. Bạn có thể thử thanh toán trên trang VNPay.',
  paymentUrlFailed: 'Không mở được trang thanh toán. Vui lòng thử lại sau.',
} as const
