const express = require('express');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { getPublicProfile } = require('./publicProfileService');
const {
  getOrCreateLearnerProfile,
  updateMyLearnerProfile,
} = require('./services/learnerProfileService');
const {
  listSavedItems,
  listSavedItemKeys,
  toggleSavedItem,
  deleteSavedItem,
  getSavedAnalytics,
} = require('./services/savedItemsService');

const router = express.Router();

/** Wishlist / yêu thích — bài LP hoặc course */
router.get('/me/saved', authMiddleware, async (req, res) => {
  try {
    const source = String(req.query.source || '').trim();
    const items = await listSavedItems(req.userId, {
      source: source === 'learning-path' || source === 'course' ? source : undefined,
    });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('GET /api/users/me/saved error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/me/saved/keys', authMiddleware, async (req, res) => {
  try {
    const source = String(req.query.source || '').trim();
    const rows = await listSavedItemKeys(
      req.userId,
      source === 'learning-path' || source === 'course' ? source : undefined,
    );
    res.json({
      success: true,
      data: {
        itemKeys: rows.map((r) => r.itemKey),
        lessonIds: rows.filter((r) => r.source === 'learning-path').map((r) => r.lessonId).filter(Boolean),
      },
    });
  } catch (err) {
    console.error('GET /api/users/me/saved/keys error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/me/saved/toggle', authMiddleware, async (req, res) => {
  try {
    const data = await toggleSavedItem(req.userId, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('POST /api/users/me/saved/toggle error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.delete('/me/saved/:itemKey', authMiddleware, async (req, res) => {
  try {
    const data = await deleteSavedItem(req.userId, decodeURIComponent(req.params.itemKey));
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('DELETE /api/users/me/saved/:itemKey error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/admin/saved-analytics', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const data = await getSavedAnalytics({ days });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/users/admin/saved-analytics error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/me/learner-profile', authMiddleware, async (req, res) => {
  try {
    const data = await getOrCreateLearnerProfile(req.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/users/me/learner-profile error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.patch('/me/learner-profile', authMiddleware, async (req, res) => {
  try {
    const data = await updateMyLearnerProfile(req.userId, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('PATCH /api/users/me/learner-profile error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

/** Hồ sơ công khai — không lộ email. */
router.get('/:userId/public', async (req, res) => {
  try {
    const data = await getPublicProfile(req.params.userId);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error('GET /api/users/:userId/public error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
