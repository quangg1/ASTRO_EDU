const { asyncController, ok } = require('../../../shared/http');
const { listActivePromotions } = require('../services/promoCodeService');
const checkout = require('../services/promoCheckoutService');

module.exports = asyncController({
  async listActive(req, res) {
    return ok(res, { data: await listActivePromotions({ limit: req.valid.query.limit }) });
  },

  async courseBanner(req, res) {
    return ok(res, { data: await checkout.getCourseBanner(req.valid.params.courseId) });
  },

  async validate(req, res) {
    const { code, courseId } = req.valid.body;
    const data = await checkout.validatePromoForCourse({ code, courseId, userId: req.userId });
    return ok(res, { data });
  },
});
