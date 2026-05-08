const express = require('express');
const PhylumMetadata = require('../models/PhylumMetadata');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const locale = (req.query.locale || 'vi').trim();
    const docs = await PhylumMetadata.find({ locale }).select('phylum nameVi description color').lean();
    const byPhylum = {};
    docs.forEach((d) => {
      byPhylum[d.phylum] = {
        nameVi: d.nameVi || '',
        description: d.description || '',
        color: d.color || '#9ca3af',
      };
    });
    res.json({ success: true, data: byPhylum });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
