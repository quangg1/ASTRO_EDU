const express = require('express');
const Order = require('./models/Order');
const { buildPaymentUrl, verifyReturnUrl } = require('./lib/vnpay');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { completeOrderAndEnroll } = require('../../services/paymentFulfillmentService');
const { getAdminOrderOverview } = require('../../services/adminOrderService');
const { requireString, requirePositiveNumber } = require('../../shared/validation');
const { AppError } = require('../../shared/errors');

const router = express.Router();

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const courseId = requireString(req.body?.courseId, 'courseId');
    const courseSlug = requireString(req.body?.courseSlug, 'courseSlug');
    const amt = requirePositiveNumber(req.body?.amount, 'amount', 'Số tiền');
    const currency = req.body?.currency;
    const txnRef = `GAL${Date.now()}-${req.userId.slice(-6)}`;
    const returnUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/return?slug=${encodeURIComponent(courseSlug)}`;
    const order = await Order.create({
      userId: req.userId,
      courseId: String(courseId),
      courseSlug,
      amount: amt,
      currency: currency || 'VND',
      status: 'pending',
      gateway: 'vnpay',
      txnRef,
      returnUrl,
    });
    const paymentUrl = buildPaymentUrl({
      amount: order.amount,
      orderId: order.txnRef,
      orderInfo: `Galaxies Edu - ${courseSlug}`,
      courseSlug,
      returnUrl,
      ipAddr: req.ip || req.connection?.remoteAddress || '127.0.0.1',
    });
    res.json({
      success: true,
      data: { paymentUrl, orderId: order._id, txnRef: order.txnRef },
    });
  } catch (err) {
    req.logger?.error('create_payment_failed', { error: err.message });
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi tạo thanh toán' });
  }
});

router.get('/callback/vnpay', async (req, res) => {
  try {
    const secretKey = process.env.VNPAY_HASH_SECRET || '';
    const q = req.query;
    const isValid = verifyReturnUrl(q, secretKey);
    const vnpResponseCode = q.vnp_ResponseCode || '';
    const txnRef = q.vnp_TxnRef || '';
    const transactionId = q.vnp_TransactionNo || q.vnp_TransactionStatus || '';

    const order = await Order.findOne({ txnRef });
    if (!order) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/return?success=0&error=order_not_found`);
    }
    if (order.status === 'completed') {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/courses/${order.courseSlug}?enrolled=1`);
    }

    if (!isValid || vnpResponseCode !== '00') {
      order.status = 'failed';
      await order.save();
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/return?success=0&slug=${encodeURIComponent(order.courseSlug)}&error=payment_failed`);
    }

    await completeOrderAndEnroll({ txnRef, transactionId });
    req.logger?.info('payment_fulfilled', {
      txnRef,
      transactionId,
      orderId: String(order._id),
      userId: order.userId,
      courseId: order.courseId,
    });

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/courses/${order.courseSlug}?enrolled=1`);
  } catch (err) {
    req.logger?.error('vnpay_callback_failed', { error: err.message });
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/return?success=0&error=server`);
  }
});

router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// Admin: thống kê cơ bản + danh sách đơn gần đây
router.get('/admin/overview', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { stats, orders } = await getAdminOrderOverview();
    res.json({
      success: true,
      stats,
      orders,
    });
  } catch (err) {
    req.logger?.error('admin_orders_overview_failed', { error: err.message });
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
