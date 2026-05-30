const express = require('express');
const { authMiddleware } = require('../../shared/jwtAuth');
const Notification = require('./models/Notification');
const { notificationToClientDto } = require('./lib/notificationDto');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 30));
    const unreadOnly = String(req.query?.unreadOnly || '') === '1';
    const filter = { userId: req.userId };
    if (unreadOnly) filter.readAt = null;
    const rows = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({
      success: true,
      data: rows.map((n) => notificationToClientDto(n)),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, readAt: null });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const row = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { readAt: new Date() },
      { new: true },
    ).lean();
    if (!row) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, readAt: null }, { readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
