const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const orders = require('../controllers/adminOrderController');

const router = express.Router();

const manageOrders = [authMiddleware, requireAdminScope('orders')];

router.get('/', ...manageOrders, validate({ query: schema.listOrdersQuery }), orders.list);

// Phải khai trước `/:txnRef`, nếu không "overview" bị đọc thành mã giao dịch.
router.get('/overview', ...manageOrders, orders.overview);

router.get('/:txnRef', ...manageOrders, validate({ params: schema.txnRefParams }), orders.detail);

router.patch(
  '/:txnRef/note',
  ...manageOrders,
  validate({ params: schema.txnRefParams, body: schema.orderNoteBody }),
  orders.updateNote,
);

router.post(
  '/:txnRef/cancel',
  ...manageOrders,
  validate({ params: schema.txnRefParams, body: schema.reasonBody }),
  orders.cancel,
);

router.post(
  '/:txnRef/refund',
  ...manageOrders,
  validate({ params: schema.txnRefParams, body: schema.refundOrderBody }),
  orders.refund,
);

module.exports = router;
