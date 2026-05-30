/**
 * Public surface for the payment domain (checkout + order history).
 */
export {
  fetchCheckoutQuote,
  createCheckoutSession,
  confirmCheckout,
  fetchPaymentStatus,
  fetchMyOrders,
  fetchAdminOrderStats,
} from './api/paymentApi'
export type {
  PaymentStatus,
  PaymentStatusResponse,
  CheckoutQuote,
  CheckoutVoucherTier,
  CheckoutSession,
  CreateCheckoutSessionResult,
  ConfirmCheckoutResult,
  ConfirmCheckoutResponse,
  FetchCheckoutQuoteResult,
  Order,
  AdminOrder,
  AdminOrderStats,
} from './api/paymentApi'
export { CourseCheckoutClient } from './ui/CourseCheckoutClient'
export { OrderHistoryClient } from './ui/OrderHistoryClient'
export {
  orderStatusLabelVi,
  orderKindLabelVi,
  discountSourceLabelVi,
  formatOrderDateVi,
} from './lib/orderLabels'
