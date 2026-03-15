const express = require('express');
const Order = require('./models/Order');
const { buildPaymentUrl, verifyReturnUrl } = require('./lib/vnpay');
const { authMiddleware } = require('../../shared/jwtAuth');
const fetch = require('node-fetch');

const router = express.Router();
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'galaxies-internal-secret';

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { courseId, courseSlug, amount, currency } = req.body || {};
    if (!courseId || !courseSlug) {
      return res.status(400).json({ success: false, error: 'Thiếu courseId hoặc courseSlug' });
    }
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) {
      return res.status(400).json({ success: false, error: 'Số tiền không hợp lệ' });
    }
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
    console.error('Create payment error:', err);
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

    order.status = 'completed';
    order.transactionId = transactionId;
    order.paidAt = new Date();
    await order.save();

    const confirmUrl = `${API_BASE}/api/courses/internal/confirm-enroll`;
    const confirmRes = await fetch(confirmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({
        userId: order.userId,
        courseId: order.courseId,
        orderId: String(order._id),
      }),
    }).catch((e) => {
      console.error('Confirm enroll error:', e);
      return null;
    });

    if (!confirmRes || !confirmRes.ok) {
      console.error('Confirm enroll failed:', await confirmRes?.text?.());
    }

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/courses/${order.courseSlug}?enrolled=1`);
  } catch (err) {
    console.error('VNPay callback error:', err);
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

module.exports = router;
