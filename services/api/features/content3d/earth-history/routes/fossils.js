const express = require('express');
const Fossil = require('../models/Fossil');
const EarthHistory = require('../models/EarthHistory');
const { getPaleoRegionNameString } = require('../lib/paleoPlateNames');

const router = express.Router();

router.get('/by-time', async (req, res) => {
  try {
    const { maxMa, minMa, limit = 2000 } = req.query;
    const maxMaNum = parseFloat(maxMa);
    const minMaNum = parseFloat(minMa);
    if (maxMa === undefined || maxMa === '' || minMa === undefined || minMa === '') {
      return res.status(400).json({ success: false, error: 'maxMa and minMa are required' });
    }
    if (Number.isNaN(maxMaNum) || Number.isNaN(minMaNum)) {
      return res.status(400).json({ success: false, error: 'maxMa and minMa must be numbers' });
    }
    const actualMax = Math.max(maxMaNum, minMaNum);
    const actualMin = Math.min(maxMaNum, minMaNum);
    const sampleSize = Math.min(parseInt(limit, 10) || 2000, 5000);
    const timeMatch = {
      'time.maxMa': { $gte: actualMin },
      'time.minMa': { $lte: actualMax },
      'paleoLocation.paleolng': { $exists: true, $ne: null },
      'paleoLocation.paleolat': { $exists: true, $ne: null },
    };
    const [total, rawFossils] = await Promise.all([
      Fossil.countDocuments(timeMatch),
      Fossil.getSampleForVisualization(actualMax, actualMin, sampleSize),
    ]);
    const locale = (req.query.locale || 'vi').toLowerCase() === 'en' ? 'en' : 'vi';
    const data = rawFossils.map((f) => ({ ...f, paleoRegionName: getPaleoRegionNameString(f.geoplate, locale) }));
    res.json({ success: true, timeRange: { maxMa: actualMax, minMa: actualMin }, total, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, limit = 50, locale = 'vi', maxMa, minMa } = req.query;
    const queryStr = String(q || '').trim();
    if (queryStr.length < 2) return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
    const cap = Math.min(parseInt(limit, 10) || 50, 100);
    const loc = locale === 'en' ? 'en' : 'vi';
    const maxMaNum = maxMa != null ? parseFloat(maxMa) : null;
    const minMaNum = minMa != null ? parseFloat(minMa) : null;
    const timeFilter =
      maxMaNum != null && minMaNum != null && !Number.isNaN(maxMaNum) && !Number.isNaN(minMaNum)
        ? { 'time.maxMa': { $lte: maxMaNum }, 'time.minMa': { $gte: minMaNum } }
        : {};
    let raw;
    try {
      const searchExpr = queryStr.includes(' ') ? `"${queryStr.replace(/"/g, '')}"` : queryStr;
      const textQuery = { $text: { $search: searchExpr } };
      const fullQuery = Object.keys(timeFilter).length ? { ...textQuery, ...timeFilter } : textQuery;
      raw = await Fossil.find(fullQuery, { score: { $meta: 'textScore' } })
        .select('taxonomy time location paleoLocation geology ecology')
        .sort({ score: { $meta: 'textScore' } })
        .limit(cap)
        .lean();
    } catch (_error) {
      raw = await Fossil.find({ 'taxonomy.acceptedName': { $regex: queryStr, $options: 'i' }, ...timeFilter })
        .select('taxonomy time location paleoLocation geology ecology')
        .limit(cap)
        .lean();
    }
    const data = raw.map((f) => ({
      name: f.taxonomy?.acceptedName || 'Unknown',
      phylum: f.taxonomy?.phylum || null,
      class: f.taxonomy?.class,
      maxMa: f.time?.maxMa,
      minMa: f.time?.minMa,
      lng: f.location?.lng,
      lat: f.location?.lat,
      paleolng: f.paleoLocation?.paleolng,
      paleolat: f.paleoLocation?.paleolat,
      geoplate: f.paleoLocation?.geoplate ?? null,
      environment: f.ecology?.taxonEnvironment || f.geology?.environment || null,
      paleoRegionName: getPaleoRegionNameString(f.paleoLocation?.geoplate, loc),
    }));
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const total = await Fossil.countDocuments();
    const [byEra, byPeriod, byPhylum, withPaleoCoords] = await Promise.all([
      Fossil.aggregate([{ $group: { _id: '$time.era', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Fossil.aggregate([
        { $match: { 'time.period': { $ne: null } } },
        { $group: { _id: '$time.period', count: { $sum: 1 }, avgMa: { $avg: '$time.maxMa' } } },
        { $sort: { avgMa: -1 } },
      ]),
      Fossil.aggregate([
        { $match: { 'taxonomy.phylum': { $ne: null } } },
        { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Fossil.countDocuments({
        'paleoLocation.paleolng': { $exists: true, $ne: null },
        'paleoLocation.paleolat': { $exists: true, $ne: null },
      }),
    ]);
    const byEraMap = byEra.reduce((acc, curr) => {
      acc[curr._id || 'Unknown'] = curr.count;
      return acc;
    }, {});
    res.json({ success: true, data: { total, withPaleoCoords, byEra: byEraMap, byPeriod, byPhylum } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/for-stage/:stageId', async (req, res) => {
  try {
    const stage = await EarthHistory.findOne({ stageId: parseInt(req.params.stageId, 10) });
    if (!stage) return res.status(404).json({ success: false, error: 'Stage not found' });
    const stageTime = stage.time;
    const buffer = Math.max(stageTime * 0.1, 5);
    const [rawFossils, phylaDistribution] = await Promise.all([
      Fossil.getSampleForVisualization(stageTime + buffer, Math.max(0, stageTime - buffer), parseInt(req.query.limit, 10) || 500),
      Fossil.getPhylaDistribution(stageTime + buffer, Math.max(0, stageTime - buffer)),
    ]);
    const locale = (req.query.locale || 'vi').toLowerCase() === 'en' ? 'en' : 'vi';
    const data = rawFossils.map((f) => ({ ...f, paleoRegionName: getPaleoRegionNameString(f.geoplate, locale) }));
    res.json({
      success: true,
      stage: { id: stage.stageId, name: stage.name, time: stage.time, timeDisplay: stage.timeDisplay },
      timeRange: { maxMa: stageTime + buffer, minMa: Math.max(0, stageTime - buffer) },
      fossils: { count: data.length, data },
      phylaDistribution,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
