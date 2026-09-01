/**
 * Checkout nội bộ (demo, không qua cổng thanh toán bên thứ ba).
 *
 *   GET  /payments/checkout-quote           → báo giá + voucher gem
 *   POST /payments/checkout                 → tạo đơn pending
 *   POST /payments/checkout/:txnRef/confirm → xác nhận thanh toán
 *   GET  /payments/status/:txnRef           → trạng thái đơn
 *   GET  /payments/orders                   → lịch sử đơn
 */
const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/paymentSchemas');
const payments = require('../controllers/paymentController');

const router = express.Router();

router.use(authMiddleware);

router.get('/checkout-quote', validate({ query: schema.checkoutQuoteQuery }), payments.quote);
router.post('/checkout', validate({ body: schema.checkoutBody }), payments.create);
router.post(
  '/checkout/:txnRef/confirm',
  validate({ params: schema.txnRefParams, body: schema.confirmBody }),
  payments.confirm,
);
router.get('/status/:txnRef', validate({ params: schema.txnRefParams }), payments.status);
router.get('/orders', payments.listOrders);

module.exports = router;
