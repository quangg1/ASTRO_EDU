const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { buildExplorePassportPayload } = require('../services/explorePassportService');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await buildExplorePassportPayload(req.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /explore/passport error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
