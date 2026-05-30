const express = require('express');
const { parseGemShopCatalogItems, parseGemWalletResponse } = require('@galaxies/contracts');
const Course = require('../../courses/models/Course');
const UserReward = require('../models/UserReward');
const GemTransaction = require('../models/GemTransaction');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { getPublicRuntimeSummary } = require('../services/gemRuntimeConfigService');
const { listVisiblePublic } = require('../services/shopCatalogService');
const {
  listDecorationCatalogGroupedPublic,
  getDecorationState,
  purchaseDecoration,
  equipDecoration,
} = require('../services/avatarDecorationService');
const { listLearnerTiersPublic } = require('../constants/learnerTiers');
const { getWalletLearnerMeta } = require('../services/learnerTierService');

const router = express.Router();

/** Public — catalog hạng Learner (trang so sánh). */
router.get('/learner-tiers', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        tiers: listLearnerTiersPublic(),
        policyVi:
          'Hạng tính trên tổng gem bạn đã kiếm (không giảm khi tiêu). Mỗi đơn khóa trả phí chỉ một ưu đãi: coupon, voucher gem, hoặc giảm giá hạng.',
      },
    });
  } catch (err) {
    console.error('GET /gems/learner-tiers error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

/** Public — client tab Khóa học / voucher + seasonal hiển thị */
router.get('/shop/bootstrap', async (req, res) => {
  try {
    const paidCoursesCount = await Course.countDocuments({
      published: true,
      $or: [{ isPaid: true }, { price: { $gt: 0 } }],
    });
    const runtime = await getPublicRuntimeSummary();
    res.json({
      success: true,
      data: {
        paidCoursesCount,
        voucherTabVisible: paidCoursesCount >= 1,
        ...runtime,
      },
    });
  } catch (err) {
    console.error('GET /gems/shop/bootstrap error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

/** Public — catalog shop items (visible + seasonal window) */
router.get('/shop/catalog', async (req, res) => {
  try {
    const items = parseGemShopCatalogItems(await listVisiblePublic());
    res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET /gems/shop/catalog error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

/** Danh mục trang trí avatar (public, có overlay CDN). */
router.get('/decorations/catalog', async (req, res) => {
  try {
    const data = await listDecorationCatalogGroupedPublic();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /gems/decorations/catalog error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/decorations/me', authMiddleware, async (req, res) => {
  try {
    const data = await getDecorationState(req.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /gems/decorations/me error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/decorations/purchase', authMiddleware, async (req, res) => {
  try {
    const data = await purchaseDecoration(req.userId, req.body?.skuId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('POST /gems/decorations/purchase error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code,
      error: err.message || 'Không mua được trang trí',
    });
  }
});

router.patch('/decorations/equip', authMiddleware, async (req, res) => {
  try {
    const data = await equipDecoration(req.userId, req.body?.skuId ?? null);
    res.json({ success: true, data });
  } catch (err) {
    console.error('PATCH /gems/decorations/equip error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code,
      error: err.message || 'Không đổi trang trí được',
    });
  }
});

router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const ur = await UserReward.findOne({ userId: req.userId }).lean();
    const balance = ur?.gemBalance ?? 0;
    const level = ur?.level ?? 1;
    const txs = await GemTransaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();
    const transactions = txs.map((t) => ({
      id: String(t._id),
      amount: t.delta,
      reason: t.reason,
      type: t.reason,
      createdAt: t.createdAt?.toISOString?.() || new Date().toISOString(),
      meta: {
        lessonId: t.lessonId || undefined,
        entityId: t.entityId || undefined,
        depth: t.depth || undefined,
      },
    }));
    const totalGemsEarned = ur?.totalGemsEarned ?? 0;
    const learnerTier = getWalletLearnerMeta(totalGemsEarned);
    const payload = {
      success: true,
      data: {
        balance,
        level,
        totalGemsEarned,
        learnerTier,
        transactions,
      },
    };
    parseGemWalletResponse(payload);
    res.json(payload);
  } catch (err) {
    console.error('GET /gems/wallet error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
