const express = require('express');
const router = express.Router();
const PhylumMetadata = require('../models/PhylumMetadata');

/**
 * GET /api/phyla
 * Lấy toàn bộ metadata phylum (nameVi, description, color) cho locale.
 * Query: ?locale=vi (mặc định vi)
 * Trả về object key theo phylum: { Mollusca: { nameVi, description, color }, ... }
 */
router.get('/', async (req, res) => {
  try {
    const locale = (req.query.locale || 'vi').trim();
    const docs = await PhylumMetadata.find({ locale }).select('phylum nameVi description color').lean();
    const byPhylum = {};
    docs.forEach((d) => {
      byPhylum[d.phylum] = {
        nameVi: d.nameVi ?? '',
        description: d.description ?? '',
        color: d.color ?? '#9ca3af',
      };
    });
    res.json({ success: true, data: byPhylum });
  } catch (err) {
    console.error('GET /api/phyla error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
