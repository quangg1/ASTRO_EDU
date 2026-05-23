/**
 * Payment routes — VNPay only.
 *
 * Endpoints:
 *   POST   /payments/create-qr        (auth)   → in-app VietQR via VNPay `generateQr`
 *   POST   /payments/create-url       (auth)   → hosted-redirect URL (fallback)
 *   GET    /payments/ipn              (none)   → server-to-server IPN callback
 *   GET    /payments/return           (none)   → browser redirect return URL
 *   GET    /payments/status/:txnRef   (auth)   → frontend poll until 'completed'
 *   GET    /payments/orders           (auth)   → user order history
 *   GET    /payments/admin/overview   (admin)  → admin stats + recent orders
 *
 * Why both `/create-qr` and `/create-url`?  Merchant-hosted QR requires a
 * specific VNPay agreement (`vnp_Command=genqr`). If the sandbox/production
 * merchant doesn't have it, `generateQr` returns `code !== '00'` and the
 * frontend falls back to the hosted redirect URL so checkout still works.
 *
 * Refs:
 *   • https://vnpay.js.org/create-payment-url
 *   • https://vnpay.js.org/generate-qr
 *   • https://vnpay.js.org/ipn/verify-ipn-call
 *   • https://vnpay.js.org/ipn/config-ipn          ← where to paste the URL
 */

const express = require('express')
const crypto = require('crypto')
const {
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  IpnUnknownError,
  InpOrderAlreadyConfirmed,
} = require('vnpay')

const Order = require('./models/Order')
const Course = require('../courses/models/Course')
const {
  buildPaymentUrl,
  generateQrContent,
  verifyIpnCall,
  verifyReturnUrl,
} = require('./lib/vnpay')
const { authMiddleware } = require('../../shared/jwtAuth')
const { completeOrderAndEnroll } = require('./services/paymentFulfillmentService')
const { requireString } = require('../../shared/validation')
const { AppError } = require('../../shared/errors')
const { toClientMessage, sanitizeClientText } = require('../../shared/publicError')
const { getRuntimeEnv } = require('../../config/runtimeEnv')
const APP_PATHS = require('../../../../shared/appPaths')

const router = express.Router()

/* ───────────────────────── helpers ────────────────────────────────── */

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim()
  return req.ip || req.socket?.remoteAddress || '127.0.0.1'
}

function publicReturnUrl(courseSlug) {
  const base = getRuntimeEnv().clientUrl
  return `${base}${APP_PATHS.paymentReturn}?slug=${encodeURIComponent(courseSlug || '')}`
}

/**
 * Validate the request and mint a fresh pending Order. Shared by
 * /create-qr and /create-url so the two endpoints stay in lockstep on
 * pricing + txnRef format. Returns { course, order } or throws AppError.
 */
async function mintPendingOrder({ userId, courseId }) {
  const course = await Course.findOne({ _id: courseId, published: true })
  if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học')
  if (!course.isPaid || !(course.price > 0)) {
    throw new AppError(400, 'NOT_PAID_COURSE', 'Khóa học không yêu cầu thanh toán')
  }
  // Timestamp + random hex prevents collisions on double-click within the
  // same millisecond. VNPay also requires uniqueness per day.
  const txnRef = `GAL${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const order = await Order.create({
    userId,
    courseId: String(course._id),
    courseSlug: course.slug,
    amount: course.price,
    currency: course.currency || 'VND',
    status: 'pending',
    gateway: 'vnpay',
    txnRef,
  })
  return { course, order }
}

/* ───────────────────────── /create-qr ─────────────────────────────── */
router.post('/create-qr', authMiddleware, async (req, res) => {
  try {
    const courseId = requireString(req.body?.courseId, 'courseId')
    const { course, order } = await mintPendingOrder({ userId: req.userId, courseId })

    const qr = await generateQrContent({
      amount: order.amount,
      ipAddr: clientIp(req),
      txnRef: order.txnRef,
      orderInfo: `Thanh toan khoa hoc ${course.slug}`,
      returnUrl: publicReturnUrl(course.slug),
    })

    if (qr.code !== '00' || !qr.qrContent) {
      // QR not enabled for this merchant — surface the message and let the
      // frontend fall back to /create-url (or show the error).
      return res.status(200).json({
        success: false,
        code: qr.code,
        error: sanitizeClientText(
          qr.message,
          'Không tạo được mã thanh toán. Bạn có thể thử thanh toán trên trang VNPay.',
        ),
        txnRef: order.txnRef,
      })
    }

    return res.json({
      success: true,
      data: {
        qrContent: qr.qrContent,
        txnRef: order.txnRef,
        amount: order.amount,
        currency: order.currency,
        expiresInSec: 15 * 60,
      },
    })
  } catch (err) {
    req.logger?.error('create_qr_failed', { error: err.message })
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message })
    }
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Không tạo được mã thanh toán. Vui lòng thử lại sau.'),
    })
  }
})

/* ───────────────────────── /create-url (fallback) ─────────────────── */
router.post('/create-url', authMiddleware, async (req, res) => {
  try {
    const courseId = requireString(req.body?.courseId, 'courseId')
    const { course, order } = await mintPendingOrder({ userId: req.userId, courseId })

    const paymentUrl = buildPaymentUrl({
      amount: order.amount,
      ipAddr: clientIp(req),
      txnRef: order.txnRef,
      orderInfo: `Thanh toan khoa hoc ${course.slug}`,
      returnUrl: publicReturnUrl(course.slug),
    })

    return res.json({
      success: true,
      data: { paymentUrl, txnRef: order.txnRef, amount: order.amount, currency: order.currency },
    })
  } catch (err) {
    req.logger?.error('create_url_failed', { error: err.message })
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message })
    }
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Không mở được trang thanh toán. Vui lòng thử lại sau.'),
    })
  }
})

/* ───────────────────────── /ipn ───────────────────────────────────── */
/**
 * VNPay IPN handler. Configure this URL in your VNPay merchant dashboard
 * (https://sandbox.vnpayment.vn/merchantv2/Account/TerminalEdit.htm).
 *
 * Response codes follow VNPay convention (RspCode 00 = OK). We use the
 * SDK's sentinel objects so re-keyed RspCodes can't drift.
 */
router.get('/ipn', async (req, res) => {
  try {
    const verify = verifyIpnCall(req.query)
    if (!verify.isVerified) return res.json(IpnFailChecksum)
    if (!verify.isSuccess) return res.json(IpnUnknownError)

    const order = await Order.findOne({ txnRef: verify.vnp_TxnRef })
    if (!order) return res.json(IpnOrderNotFound)
    if (Number(verify.vnp_Amount) !== Number(order.amount)) return res.json(IpnInvalidAmount)
    if (order.status === 'completed') return res.json(InpOrderAlreadyConfirmed)

    await completeOrderAndEnroll({
      txnRef: order.txnRef,
      transactionId: String(verify.vnp_TransactionNo || ''),
    })
    req.logger?.info('vnpay_ipn_fulfilled', {
      txnRef: order.txnRef,
      transactionNo: verify.vnp_TransactionNo,
      orderId: String(order._id),
    })
    return res.json(IpnSuccess)
  } catch (err) {
    req.logger?.error('vnpay_ipn_error', { error: err.message })
    return res.json(IpnUnknownError)
  }
})

/* ───────────────────────── /return ────────────────────────────────── */
/**
 * Browser return URL after the hosted redirect flow. The IPN above is the
 * source of truth — this handler only computes a UI-friendly status string
 * the `/payment/return` Next page can render.
 */
router.get('/return', async (req, res) => {
  try {
    const verify = verifyReturnUrl(req.query)
    const base = getRuntimeEnv().clientUrl
    const slug = String(req.query.slug || '')
    const params = new URLSearchParams({
      slug,
      txn: String(req.query.vnp_TxnRef || ''),
      status: verify.isVerified ? (verify.isSuccess ? 'success' : 'failed') : 'invalid',
    })
    return res.redirect(`${base}${APP_PATHS.paymentReturn}?${params.toString()}`)
  } catch (err) {
    req.logger?.error('vnpay_return_error', { error: err.message })
    const base = getRuntimeEnv().clientUrl
    return res.redirect(`${base}${APP_PATHS.paymentReturn}?status=error`)
  }
})

/* ───────────────────────── /status/:txnRef ────────────────────────── */
router.get('/status/:txnRef', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      txnRef: req.params.txnRef,
      userId: req.userId,
    }).lean()
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' })
    return res.json({
      success: true,
      data: { status: order.status, courseSlug: order.courseSlug, paidAt: order.paidAt || null },
    })
  } catch (err) {
    req.logger?.error('payment_status_failed', { error: err.message })
    return res.status(500).json({ success: false, error: 'Lỗi server' })
  }
})

/* ───────────────────────── /orders ────────────────────────────────── */
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    res.json({ success: true, data: orders })
  } catch (err) {
    req.logger?.error('list_orders_failed', { error: err.message })
    res.status(500).json({ success: false, error: 'Lỗi server' })
  }
})

// Admin overview lives in features/admin (mounted at /api/admin/orders/overview).

module.exports = router
