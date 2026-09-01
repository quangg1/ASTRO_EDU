const { parseGemShopCatalogItems, parseGemWalletResponse } = require('@galaxies/contracts');
const { asyncController, ok } = require('../../../shared/http');
const shop = require('../services/gemShopService');
const wallet = require('../services/gemWalletService');
const decorations = require('../services/avatarDecorationService');

module.exports = asyncController({
  async learnerTiers(_req, res) {
    return ok(res, { data: shop.getLearnerTiers() });
  },

  async shopBootstrap(_req, res) {
    return ok(res, { data: await shop.getBootstrap() });
  },

  async shopCatalog(_req, res) {
    const items = parseGemShopCatalogItems(await shop.listCatalogItems());
    return ok(res, { data: { items } });
  },

  async decorationCatalog(_req, res) {
    return ok(res, { data: await decorations.listDecorationCatalogGroupedPublic() });
  },

  async myDecorations(req, res) {
    return ok(res, { data: await decorations.getDecorationState(req.userId) });
  },

  async purchaseDecoration(req, res) {
    return ok(res, { data: await decorations.purchaseDecoration(req.userId, req.body?.skuId) });
  },

  async equipDecoration(req, res) {
    const data = await decorations.equipDecoration(req.userId, req.body?.skuId ?? null);
    return ok(res, { data });
  },

  async wallet(req, res) {
    const payload = { success: true, data: await wallet.getWallet(req.userId) };
    // Hợp đồng chung với client: sai hình dạng thì hỏng ở server chứ không lọt ra ngoài.
    parseGemWalletResponse(payload);
    return res.json(payload);
  },
});
