/**
 * Payment routes — checkout nội bộ (demo, không cổng bên thứ ba).
 *
 *   GET  /payments/checkout-quote          → báo giá + voucher gem (Model B)
 *   POST /payments/checkout                  → tạo đơn pending
 *   POST /payments/checkout/:txnRef/confirm  → xác nhận thanh toán (demo card)
 *   GET  /payments/status/:txnRef          → trạng thái đơn
 *   GET  /payments/orders                  → lịch sử đơn
 */

const express = require('express')
const crypto = require('crypto')

const Order = require('./models/Order')
const Course = require('../courses/models/Course')
const { authMiddleware } = require('../../shared/jwtAuth')
const { completeOrderAndEnroll } = require('./services/paymentFulfillmentService')
const { getCheckoutQuote } = require('./services/courseCheckoutService')
const { enrichOrdersForUser } = require('./lib/serializeUserOrder')
const { runOrderMaintenance, PENDING_TTL_MS, pendingExpiresAt } = require('./lib/orderMaintenance')
const {
  findReusablePendingOrder,
  cancelOtherPendingOrders,
} = require('./lib/orderPurchaseGuard')
const { requireString } = require('../../shared/validation')
const { AppError } = require('../../shared/errors')
const { toClientMessage } = require('../../shared/publicError')

const router = express.Router()

function mintTxnRef() {
  return `GAL${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

function mintTransactionId() {
  return `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

/**
 * Tạo đơn pending — chưa trừ gem, chưa enroll.
 */
async function mintPendingOrder({ userId, courseId, voucherTierId, promoCode, cohortId }) {
  const quote = await getCheckoutQuote({
    userId,
    courseId,
    voucherTierId: voucherTierId || null,
    promoCode: promoCode || null,
    cohortId: cohortId ? String(cohortId).trim() : null,
  })
  const course = await Course.findOne({ _id: courseId, published: true }).lean()
  if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học')

  let resolvedCohortId = null
  if (cohortId) {
    const { loadEnrollableCohort } = require('../courses/services/cohortEnrollmentService')
    const cohort = await loadEnrollableCohort({ courseId: course._id, cohortId: String(cohortId).trim() })
    resolvedCohortId = String(cohort._id)
  }

  const selected = quote.selected

  const reusable = await findReusablePendingOrder({
    userId,
    courseId: course._id,
    cohortId: resolvedCohortId,
  })
  if (reusable) {
    return { course, order: reusable, quote, reusedPending: true }
  }

  await cancelOtherPendingOrders({
    userId,
    courseId: course._id,
    cohortId: resolvedCohortId,
  })

  const txnRef = mintTxnRef()
  const order = await Order.create({
    userId,
    courseId: String(course._id),
    courseSlug: course.slug,
    cohortId: resolvedCohortId,
    listPrice: quote.listPrice,
    discountPct: selected.discountPct,
    discountAmount: selected.discountAmount,
    amount: selected.finalAmount,
    voucherTierId: selected.tierId,
    learnerTierId: selected.learnerTierId,
    promoCodeId: selected.promoCodeId,
    promoCode: selected.promoCode,
    discountSource:
      quote.discountSource ||
      (selected.promoCode
        ? 'promo'
        : selected.tierId
          ? 'gem_voucher'
          : selected.learnerTierId
            ? 'learner_tier'
            : 'none'),
    gemsCommitted: selected.gemCost,
    currency: quote.currency || 'VND',
    status: 'pending',
    expiresAt: pendingExpiresAt(new Date()),
    gateway: 'demo',
    txnRef,
    metadata: {
      demoMode: true,
      ...(quote.isCatalogUpgrade
        ? {
            upgradeFromCatalog: true,
            catalogCredit: quote.catalogCredit,
            cohortFullPrice: quote.cohortFullPrice,
          }
        : {}),
    },
  })
  return { course, order, quote, reusedPending: false }
}

router.get('/checkout-quote', authMiddleware, async (req, res) => {
  try {
    const courseId = requireString(req.query?.courseId, 'courseId')
    const voucherTierId = String(req.query?.voucherTierId || '').trim() || null
    const promoCode = String(req.query?.promoCode || '').trim() || null
    const cohortId = String(req.query?.cohortId || '').trim() || null
    const quote = await getCheckoutQuote({
      userId: req.userId,
      courseId,
      voucherTierId,
      promoCode,
      cohortId,
    })
    return res.json({ success: true, data: quote })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message })
    }
    req.logger?.error('checkout_quote_failed', { error: err.message })
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Không tải được thông tin thanh toán.'),
    })
  }
})

router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const courseId = requireString(req.body?.courseId, 'courseId')
    const voucherTierId = String(req.body?.voucherTierId || '').trim() || null
    const promoCode = String(req.body?.promoCode || '').trim() || null
    const cohortId = String(req.body?.cohortId || '').trim() || null
    const resolvedCohortId = cohortId || null
    const { course, order, quote, reusedPending } = await mintPendingOrder({
      userId: req.userId,
      courseId,
      voucherTierId,
      promoCode,
      cohortId: resolvedCohortId,
    })

    const expiresAt = (
      order.expiresAt
        ? new Date(order.expiresAt)
        : pendingExpiresAt(order.createdAt || new Date())
    ).toISOString()

    return res.json({
      success: true,
      data: {
        txnRef: order.txnRef,
        reusedPending: Boolean(reusedPending),
        amount: order.amount,
        listPrice: order.listPrice,
        discountAmount: order.discountAmount,
        discountPct: order.discountPct,
        currency: order.currency,
        courseSlug: course.slug,
        courseTitle: quote.courseTitle,
        gemsCommitted: order.gemsCommitted,
        promoCode: order.promoCode,
        discountSource: order.discountSource,
        learnerTierId: order.learnerTierId,
        expiresAt,
        demoMode: true,
      },
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message })
    }
    req.logger?.error('checkout_create_failed', { error: err.message })
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Không tạo được đơn hàng. Vui lòng thử lại.'),
    })
  }
})

router.post('/checkout/:txnRef/confirm', authMiddleware, async (req, res) => {
  try {
    const txnRef = requireString(req.params.txnRef, 'txnRef')
    const paymentMethod = String(req.body?.paymentMethod || 'card').trim().toLowerCase()
    if (paymentMethod !== 'card') {
      throw new AppError(400, 'INVALID_PAYMENT_METHOD', 'Phương thức thanh toán không hợp lệ')
    }

    const order = await Order.findOne({ txnRef, userId: req.userId })
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
    }
    if (order.status === 'completed') {
      return res.json({
        success: true,
        data: {
          status: 'completed',
          courseSlug: order.courseSlug,
          txnRef: order.txnRef,
          alreadyCompleted: true,
        },
      })
    }
    if (order.status !== 'pending') {
      throw new AppError(400, 'ORDER_NOT_PAYABLE', 'Đơn hàng không thể thanh toán')
    }

    const expiresMs = order.expiresAt
      ? new Date(order.expiresAt).getTime()
      : new Date(order.createdAt).getTime() + PENDING_TTL_MS
    if (Date.now() > expiresMs) {
      order.status = 'cancelled'
      await order.save()
      throw new AppError(400, 'ORDER_EXPIRED', 'Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.')
    }

    const transactionId = mintTransactionId()
    const result = await completeOrderAndEnroll({ txnRef, transactionId })

    req.logger?.info('checkout_confirmed', {
      txnRef,
      transactionId,
      userId: req.userId,
      courseSlug: result.courseSlug,
    })

    return res.json({
      success: true,
      data: {
        status: 'completed',
        courseSlug: result.courseSlug,
        txnRef,
        transactionId,
        paidAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message })
    }
    req.logger?.error('checkout_confirm_failed', { error: err.message })
    return res.status(500).json({
      success: false,
      error: toClientMessage(err, 'Thanh toán thất bại. Vui lòng thử lại.'),
    })
  }
})

router.get('/status/:txnRef', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      txnRef: req.params.txnRef,
      userId: req.userId,
    }).lean()
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' })
    return res.json({
      success: true,
      data: {
        status: order.status,
        courseSlug: order.courseSlug,
        paidAt: order.paidAt || null,
        transactionId: order.transactionId || null,
      },
    })
  } catch (err) {
    req.logger?.error('payment_status_failed', { error: err.message })
    return res.status(500).json({ success: false, error: 'Lỗi server' })
  }
})

router.get('/orders', authMiddleware, async (req, res) => {
  try {
    await runOrderMaintenance()
    const orders = await Order.find({ userId: req.userId, status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    const data = await enrichOrdersForUser(orders)
    res.json({ success: true, data })
  } catch (err) {
    req.logger?.error('list_orders_failed', { error: err.message })
    res.status(500).json({ success: false, error: 'Lỗi server' })
  }
})

module.exports = router
