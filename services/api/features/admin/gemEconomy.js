/**
 * Gem Economy admin — §8 gem-rewards-system.md (Tầng 2 + Tầng 3 + metrics).
 * Base earn (GEM_EARN) chỉ đổi qua code, không PATCH từ đây.
 */
/* eslint-disable no-restricted-imports -- Admin read-model: cross-feature aggregates for ops console. */
const express = require('express');
const { authMiddleware } = require('../../shared/jwtAuth');
const { requireAdminScope } = require('../../shared/adminScopes');
const GemEconomyAuditLog = require('../rewards/models/GemEconomyAuditLog');
const { GEM_EARN, RUNTIME_CONFIG_BOUNDS } = require('../rewards/constants/gemEarn');
const { getOrCreateConfigDoc, patchRuntimeConfig } = require('../rewards/services/gemRuntimeConfigService');
const {
  aggregateSupply,
  velocityWindows,
  topReasons,
} = require('../rewards/services/gemEconomyMetricsService');
const { applyManualGemAdjustment } = require('../rewards/services/manualGemAdjustmentService');
const {
  listAllAdmin,
  createShopItem,
  updateShopItem,
} = require('../rewards/services/shopCatalogService');
const {
  listCategoriesAdmin,
  createCategory,
  updateCategory,
} = require('../rewards/services/decorationCategoryService');

const router = express.Router();

router.get('/earn-constants', authMiddleware, requireAdminScope('gem'), (req, res) => {
  res.json({
    success: true,
    data: {
      GEM_EARN,
      bounds: RUNTIME_CONFIG_BOUNDS,
      note: 'Chỉnh GEM_EARN qua pull request (tầng 1 — mã nguồn); không chỉnh từ giao diện quản trị.',
    },
  });
});

router.get('/config', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const doc = await getOrCreateConfigDoc();
    res.json({ success: true, data: doc });
  } catch (err) {
    req.logger?.error('gem_economy_config_get_failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Lỗi tải config' });
  }
});

router.patch('/config', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const doc = await patchRuntimeConfig(req.body || {}, req.userId);
    res.json({ success: true, data: doc });
  } catch (err) {
    req.logger?.error('gem_economy_config_patch_failed', { error: err.message });
    res.status(err.status || 400).json({ success: false, code: err.code, error: err.message || 'Lỗi lưu' });
  }
});

router.get('/metrics', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const range = String(req.query.range || '7d');
    const [supply, velocity, reasons] = await Promise.all([
      aggregateSupply(),
      velocityWindows(range),
      topReasons(range),
    ]);
    const ratio = velocity.earnToSpendRatio;
    const warnEarnSink =
      velocity.spendPerDayAvg > 0 &&
      velocity.earnPerDayAvg / Math.max(0.001, velocity.spendPerDayAvg) > 3;

    res.json({
      success: true,
      range,
      supply,
      velocity,
      topReasons: reasons,
      alerts: warnEarnSink
        ? [
            {
              level: 'info',
              code: 'HIGH_EARN_TO_SINK',
              message:
                'Tỉ lệ kiếm gem / tiêu gem trong cửa sổ lớn hơn 3× — nên xem xét điều chỉnh hệ số seasonal, giá shop hoặc mức thưởng (theo quy trình PR).',
              ratio,
            },
          ]
        : [],
    });
  } catch (err) {
    req.logger?.error('gem_economy_metrics_failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Lỗi metrics' });
  }
});

router.get('/shop-items', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const items = await listAllAdmin();
    res.json({ success: true, data: { items } });
  } catch (err) {
    req.logger?.error('gem_shop_list_failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Lỗi catalog' });
  }
});

router.post('/shop-items', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const row = await createShopItem(req.body || {}, req.userId);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    req.logger?.error('gem_shop_create_failed', { error: err.message });
    res.status(err.status || 400).json({ success: false, error: err.message || 'Lỗi tạo SKU' });
  }
});

router.patch('/shop-items/:skuId', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const row = await updateShopItem(req.params.skuId, req.body || {}, req.userId);
    res.json({ success: true, data: row });
  } catch (err) {
    req.logger?.error('gem_shop_update_failed', { error: err.message, skuId: req.params.skuId });
    res.status(err.status || 400).json({ success: false, error: err.message || 'Lỗi cập nhật' });
  }
});

router.post('/manual-adjust', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const updated = await applyManualGemAdjustment({
      actorUserId: req.userId,
      targetUserId: String(req.body?.targetUserId || ''),
      delta: Number(req.body?.delta),
      reason: String(req.body?.reason || ''),
    });
    res.json({ success: true, data: { gemBalance: updated.gemBalance, totalGemsEarned: updated.totalGemsEarned } });
  } catch (err) {
    req.logger?.error('gem_manual_adjust_failed', { error: err.message });
    res.status(err.status || 400).json({
      success: false,
      code: err.code,
      error: err.message || 'Lỗi điều chỉnh',
    });
  }
});

/** Nhóm trang trí avatar (Lunar New Year, Steampunk…) */
router.get('/decoration-categories', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const categories = await listCategoriesAdmin();
    res.json({ success: true, data: { categories } });
  } catch (err) {
    req.logger?.error('decoration_categories_list_failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Lỗi danh sách nhóm' });
  }
});

router.post('/decoration-categories', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const row = await createCategory(req.body || {}, req.userId);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    req.logger?.error('decoration_category_create_failed', { error: err.message });
    res.status(err.status || 400).json({ success: false, error: err.message || 'Lỗi tạo nhóm' });
  }
});

router.patch('/decoration-categories/:slug', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const row = await updateCategory(req.params.slug, req.body || {}, req.userId);
    res.json({ success: true, data: row });
  } catch (err) {
    req.logger?.error('decoration_category_update_failed', { error: err.message });
    res.status(err.status || 400).json({ success: false, error: err.message || 'Lỗi cập nhật nhóm' });
  }
});

router.get('/audit-log', authMiddleware, requireAdminScope('gem'), async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await GemEconomyAuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: { items: rows } });
  } catch (err) {
    req.logger?.error('gem_audit_log_failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Lỗi audit log' });
  }
});

module.exports = router;
