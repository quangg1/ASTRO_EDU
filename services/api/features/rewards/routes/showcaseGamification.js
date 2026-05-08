const express = require('express');
const ShowcaseCatalogBundle = require('../../content3d/models/ShowcaseCatalogBundle');
const ShowcaseEntityContent = require('../../content3d/models/ShowcaseEntityContent');
const ShowcaseUnlock = require('../models/ShowcaseUnlock');
const GemTransaction = require('../models/GemTransaction');
const UserReward = require('../models/UserReward');
const { authMiddleware } = require('../../../shared/jwtAuth');

const router = express.Router();

const SHOWCASE_COSTS = { story: 40, orbit: 55 };

router.get('/catalog', authMiddleware, async (req, res) => {
  try {
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const stories = Array.isArray(doc?.stories) ? doc.stories : [];
    const catalog = Array.isArray(doc?.catalog) ? doc.catalog : [];
    const orbits = Array.isArray(doc?.orbits) ? doc.orbits : [];
    if (!doc || catalog.length === 0 || orbits.length === 0) {
      return res.json({ success: true, data: null });
    }
    const unlocks = await ShowcaseUnlock.find({ userId: req.userId }).lean();
    const unlockedSet = new Set(unlocks.map((u) => `${u.entityId}:${u.contentType}`));
    const entities = catalog.map((e) => {
      const id = String(e.id || '').trim();
      const storyUnlocked = unlockedSet.has(`${id}:story`);
      const orbitUnlocked = unlockedSet.has(`${id}:orbit`);
      return {
        ...e,
        storyUnlocked,
        orbitUnlocked,
        storyCost: storyUnlocked ? 0 : SHOWCASE_COSTS.story,
        orbitCost: orbitUnlocked ? 0 : SHOWCASE_COSTS.orbit,
      };
    });
    res.json({
      success: true,
      data: { stories, catalog: entities, orbits, updatedAt: doc?.updatedAt || null },
    });
  } catch (err) {
    console.error('GET /showcase/catalog error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/unlocks', authMiddleware, async (req, res) => {
  try {
    const rows = await ShowcaseUnlock.find({ userId: req.userId }).select('entityId contentType').lean();
    res.json({
      success: true,
      data: {
        keys: rows.map((r) => `${r.entityId}:${r.contentType}`),
      },
    });
  } catch (err) {
    console.error('GET /showcase/unlocks error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/unlock', authMiddleware, async (req, res) => {
  try {
    const entityId = String(req.body?.entityId || '').trim();
    const contentType = String(req.body?.contentType || '').trim();
    if (!entityId || !['story', 'orbit'].includes(contentType)) {
      return res.status(400).json({ success: false, code: 'INVALID_UNLOCK', error: 'entityId hoặc contentType không hợp lệ' });
    }
    await UserReward.updateOne(
      { userId: req.userId },
      {
        $setOnInsert: {
          userId: req.userId,
          gemBalance: 0,
          totalGemsEarned: 0,
          level: 1,
          streakDays: 0,
          streakShields: 0,
          lastStreakDay: '',
        },
      },
      { upsert: true },
    );
    const cost = SHOWCASE_COSTS[contentType];
    const existing = await ShowcaseUnlock.findOne({ userId: req.userId, entityId, contentType }).lean();
    if (existing) {
      const content = await ShowcaseEntityContent.findOne({ entityId }).lean();
      return res.json({
        success: true,
        data: { alreadyUnlocked: true, entityId, contentType, gemBalance: (await UserReward.findOne({ userId: req.userId }).lean())?.gemBalance ?? 0, content },
      });
    }

    const updated = await UserReward.findOneAndUpdate(
      { userId: req.userId, gemBalance: { $gte: cost } },
      { $inc: { gemBalance: -cost } },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(402).json({
        success: false,
        code: 'INSUFFICIENT_GEMS',
        error: 'Không đủ gem để mở khóa',
      });
    }

    await ShowcaseUnlock.create({ userId: req.userId, entityId, contentType, gemCost: cost });
    await GemTransaction.create({
      userId: req.userId,
      delta: -cost,
      reason: 'showcase_unlock',
      balanceAfter: updated.gemBalance,
      entityId,
      contentType,
      metadata: {},
    });

    const content = await ShowcaseEntityContent.findOne({ entityId }).lean();
    res.json({
      success: true,
      data: {
        entityId,
        contentType,
        gemBalance: updated.gemBalance,
        content,
      },
    });
  } catch (err) {
    console.error('POST /showcase/unlock error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
