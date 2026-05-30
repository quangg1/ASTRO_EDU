const express = require('express');
const { getPublicProfile } = require('./publicProfileService');

const router = express.Router();

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
