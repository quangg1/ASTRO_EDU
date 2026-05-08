const express = require('express');
const EarthHistory = require('../models/EarthHistory');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const stages = await EarthHistory.getAllStages();
    res.json({ success: true, count: stages.length, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stage/:id', async (req, res) => {
  try {
    const stage = await EarthHistory.findOne({ stageId: parseInt(req.params.id, 10), isActive: true });
    if (!stage) return res.status(404).json({ success: false, error: 'Stage not found' });
    res.json({ success: true, data: stage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/eon/:eon', async (req, res) => {
  try {
    const stages = await EarthHistory.getByEon(req.params.eon);
    res.json({ success: true, count: stages.length, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/time-range', async (req, res) => {
  try {
    const startMya = parseFloat(req.query.start) || 4600;
    const endMya = parseFloat(req.query.end) || 0;
    const stages = await EarthHistory.getByTimeRange(startMya, endMya);
    res.json({ success: true, count: stages.length, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/extinctions', async (_req, res) => {
  try {
    const extinctions = await EarthHistory.getExtinctionEvents();
    res.json({ success: true, count: extinctions.length, data: extinctions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/summary', async (_req, res) => {
  try {
    const stages = await EarthHistory.find({ isActive: true })
      .select('stageId name nameEn icon time eon era period flags.isExtinction order')
      .sort({ order: 1 });
    res.json({ success: true, count: stages.length, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const [totalStages, extinctionCount, eonCountsRaw] = await Promise.all([
      EarthHistory.countDocuments({ isActive: true }),
      EarthHistory.countDocuments({ 'flags.isExtinction': true, isActive: true }),
      EarthHistory.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$eon', count: { $sum: 1 } } }]),
    ]);
    const eonCounts = eonCountsRaw.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    res.json({ success: true, data: { totalStages, extinctionCount, eonCounts } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
