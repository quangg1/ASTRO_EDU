const { asyncController, ok } = require('../../../shared/http');
const { getCheckoutQuote } = require('../services/courseCheckoutService');
const checkout = require('../services/orderCheckoutService');

module.exports = asyncController({
  async quote(req, res) {
    const { courseId, voucherTierId, promoCode, cohortId } = req.valid.query;
    const quote = await getCheckoutQuote({
      userId: req.userId,
      courseId,
      voucherTierId,
      promoCode,
      cohortId,
    });
    return ok(res, { data: quote });
  },

  async create(req, res) {
    return ok(res, { data: await checkout.createCheckout(req.userId, req.valid.body) });
  },

  async confirm(req, res) {
    const data = await checkout.confirmCheckout({
      userId: req.userId,
      txnRef: req.valid.params.txnRef,
      paymentMethod: req.valid.body.paymentMethod,
    });

    req.logger?.info('checkout_confirmed', {
      txnRef: data.txnRef,
      transactionId: data.transactionId,
      userId: req.userId,
      courseSlug: data.courseSlug,
    });

    return ok(res, { data });
  },

  async status(req, res) {
    return ok(res, { data: await checkout.getOrderStatus(req.userId, req.valid.params.txnRef) });
  },

  async listOrders(req, res) {
    return ok(res, { data: await checkout.listOrders(req.userId) });
  },
});
