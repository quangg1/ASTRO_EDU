/**
 * Public surface for the payment domain (VNPay checkout + order history).
 *
 * Consumers:
 *   • `components/courses/CoursePageClient` opens the QR modal
 *   • `app/payment/return/page`             reads order status after redirect
 *   • `app/my-courses`, `app/admin`         list orders / stats
 *
 * @see DOMAIN_MAP.md §3
 */
export {
  createPaymentQR,
  createPaymentUrl,
  fetchPaymentStatus,
  fetchMyOrders,
  fetchAdminOrderStats,
} from './api/paymentApi'
export type {
  PaymentQRTicket,
  PaymentStatus,
  PaymentStatusResponse,
  CreatePaymentQRResult,
  CreatePaymentUrlResult,
  Order,
  AdminOrderStats,
} from './api/paymentApi'
export { PaymentQRModal } from './ui/PaymentQRModal'
