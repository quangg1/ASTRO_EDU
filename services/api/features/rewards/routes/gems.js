const express = require('express');
const GemTransaction = require('../models/GemTransaction');
const UserReward = require('../models/UserReward');
const { authMiddleware } = require('../../../shared/jwtAuth');

const router = express.Router();

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
    res.json({
      success: true,
      data: {
        balance,
        level,
        transactions,
      },
    });
  } catch (err) {
    console.error('GET /gems/wallet error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
