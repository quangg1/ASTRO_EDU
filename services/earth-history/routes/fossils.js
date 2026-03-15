const express = require('express');
const router = express.Router();
const Fossil = require('../models/Fossil');
const { getPaleoRegionNameString } = require('../lib/paleoPlateNames');

/**
 * GET /api/fossils
 * Lấy fossils với filters
 */
router.get('/', async (req, res) => {
    try {
        const {
            maxMa,
            minMa,
            phylum,
            era,
            period,
            limit = 100,
            skip = 0
        } = req.query;
        
        const query = {};
        const maxMaVal = maxMa ? parseFloat(maxMa) : null;
        const minMaVal = minMa ? parseFloat(minMa) : null;
        if (maxMaVal != null && !Number.isNaN(maxMaVal) && minMaVal != null && !Number.isNaN(minMaVal)) {
            const hi = Math.max(maxMaVal, minMaVal);
            const lo = Math.min(maxMaVal, minMaVal);
            query['time.maxMa'] = { $gte: lo };
            query['time.minMa'] = { $lte: hi };
        } else {
            if (maxMa) query['time.maxMa'] = { $lte: parseFloat(maxMa) };
            if (minMa) query['time.minMa'] = { $gte: parseFloat(minMa) };
        }
        if (phylum) query['taxonomy.phylum'] = phylum;
        if (era) query['time.era'] = era;
        if (period) query['time.period'] = period;
        
        const fossils = await Fossil.find(query)
            .select('-__v')
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();
            
        const total = await Fossil.countDocuments(query);
        
        res.json({
            success: true,
            count: fossils.length,
            total,
            data: fossils
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/fossils/for-stage/:stageId
 * Lấy fossils cho một Earth History stage cụ thể
 * Đây là endpoint chính để hiển thị fossils theo thời kỳ
 */
router.get('/for-stage/:stageId', async (req, res) => {
    try {
        const { stageId } = req.params;
        const { limit = 500 } = req.query;
        
        // Import EarthHistory model để lấy thông tin stage
        const EarthHistory = require('../models/EarthHistory');
        const stage = await EarthHistory.findOne({ stageId: parseInt(stageId) });
        
        if (!stage) {
            return res.status(404).json({ 
                success: false, 
                error: 'Stage not found' 
            });
        }
        
        // Lấy fossils trong khoảng thời gian của stage
        const stageTime = stage.time;
        const buffer = Math.max(stageTime * 0.1, 5); // 10% buffer hoặc ít nhất 5 Ma
        
        const rawFossils = await Fossil.getSampleForVisualization(
            stageTime + buffer,
            Math.max(0, stageTime - buffer),
            parseInt(limit)
        );
        const locale = (req.query.locale || 'vi').toLowerCase() === 'en' ? 'en' : 'vi';
        const fossils = rawFossils.map((f) => ({
            ...f,
            paleoRegionName: getPaleoRegionNameString(f.geoplate, locale)
        }));
        
        // Lấy phân bố phyla cho stage này
        const phylaDistribution = await Fossil.getPhylaDistribution(
            stageTime + buffer,
            Math.max(0, stageTime - buffer)
        );
        
        res.json({
            success: true,
            stage: {
                id: stage.stageId,
                name: stage.name,
                time: stage.time,
                timeDisplay: stage.timeDisplay
            },
            timeRange: {
                maxMa: stageTime + buffer,
                minMa: Math.max(0, stageTime - buffer)
            },
            fossils: {
                count: fossils.length,
                data: fossils
            },
            phylaDistribution
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/fossils/by-time
 * Lấy fossils theo khoảng thời gian. Trả về total (số thật trong DB) + sample (để hiển thị 3D).
 */
router.get('/by-time', async (req, res) => {
    try {
        const { maxMa, minMa, limit = 2000 } = req.query;
        const maxMaNum = parseFloat(maxMa);
        const minMaNum = parseFloat(minMa);
        const sampleSize = Math.min(parseInt(limit) || 2000, 5000); // tối đa 5k điểm 3D
        
        if (maxMa === undefined || maxMa === '' || minMa === undefined || minMa === '') {
            return res.status(400).json({
                success: false,
                error: 'maxMa and minMa are required'
            });
        }
        if (Number.isNaN(maxMaNum) || Number.isNaN(minMaNum)) {
            return res.status(400).json({
                success: false,
                error: 'maxMa and minMa must be numbers'
            });
        }
        const actualMax = Math.max(maxMaNum, minMaNum);
        const actualMin = Math.min(maxMaNum, minMaNum);
        const timeMatch = {
            'time.maxMa': { $gte: actualMin },
            'time.minMa': { $lte: actualMax },
            'paleoLocation.paleolng': { $exists: true, $ne: null },
            'paleoLocation.paleolat': { $exists: true, $ne: null }
        };
        
        const [total, rawFossils] = await Promise.all([
            Fossil.countDocuments(timeMatch),
            Fossil.getSampleForVisualization(actualMax, actualMin, sampleSize)
        ]);

        const locale = (req.query.locale || 'vi').toLowerCase() === 'en' ? 'en' : 'vi';
        const fossils = rawFossils.map((f) => ({
            ...f,
            paleoRegionName: getPaleoRegionNameString(f.geoplate, locale)
        }));
        
        res.json({
            success: true,
            timeRange: { maxMa: actualMax, minMa: actualMin },
            total,
            count: fossils.length,
            data: fossils
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/fossils/stats
 * Thống kê tổng quan
 */
router.get('/stats', async (req, res) => {
    try {
        const total = await Fossil.countDocuments();
        
        // Stats by era
        const byEra = await Fossil.aggregate([
            { $group: { _id: '$time.era', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Stats by period
        const byPeriod = await Fossil.aggregate([
            { $match: { 'time.period': { $ne: null } } },
            { $group: { 
                _id: '$time.period', 
                count: { $sum: 1 },
                avgMa: { $avg: '$time.maxMa' }
            }},
            { $sort: { avgMa: -1 } }
        ]);
        
        // Stats by phylum
        const byPhylum = await Fossil.aggregate([
            { $match: { 'taxonomy.phylum': { $ne: null } } },
            { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        
        // Có paleo coordinates
        const withPaleoCoords = await Fossil.countDocuments({
            'paleoLocation.paleolng': { $exists: true, $ne: null },
            'paleoLocation.paleolat': { $exists: true, $ne: null }
        });
        
        res.json({
            success: true,
            data: {
                total,
                withPaleoCoords,
                byEra: byEra.reduce((acc, curr) => {
                    acc[curr._id || 'Unknown'] = curr.count;
                    return acc;
                }, {}),
                byPeriod,
                byPhylum
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/fossils/phyla-by-era
 * Phân bố phyla theo era (cho visualization)
 */
router.get('/phyla-by-era', async (req, res) => {
    try {
        const result = await Fossil.aggregate([
            { $match: { 'taxonomy.phylum': { $ne: null }, 'time.era': { $ne: null } } },
            { 
                $group: { 
                    _id: { era: '$time.era', phylum: '$taxonomy.phylum' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.era',
                    phyla: { 
                        $push: { 
                            phylum: '$_id.phylum', 
                            count: '$count' 
                        }
                    },
                    total: { $sum: '$count' }
                }
            },
            { $sort: { total: -1 } }
        ]);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/fossils/search
 * Tìm kiếm fossils theo tên. Nếu có maxMa, minMa thì chỉ tìm trong kỷ đó (theo thời kỳ đang xem).
 * Dùng text index khi có; giới hạn 50 mặc định.
 */
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 50, locale = 'vi', maxMa, minMa } = req.query;
        const queryStr = String(q || '').trim();
        
        if (queryStr.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Query must be at least 2 characters'
            });
        }
        
        const cap = Math.min(parseInt(limit, 10) || 50, 100);
        const loc = (locale === 'en') ? 'en' : 'vi';
        const maxMaNum = maxMa != null ? parseFloat(maxMa) : null;
        const minMaNum = minMa != null ? parseFloat(minMa) : null;
        const timeFilter = (maxMaNum != null && minMaNum != null && !isNaN(maxMaNum) && !isNaN(minMaNum))
            ? { 'time.maxMa': { $lte: maxMaNum }, 'time.minMa': { $gte: minMaNum } }
            : {};
        
        let raw;
        
        try {
            const searchExpr = queryStr.includes(' ')
                ? `"${queryStr.replace(/"/g, '')}"`
                : queryStr;
            const textQuery = { $text: { $search: searchExpr } };
            const fullQuery = Object.keys(timeFilter).length ? { ...textQuery, ...timeFilter } : textQuery;
            raw = await Fossil.find(fullQuery, { score: { $meta: 'textScore' } })
                .select('taxonomy time location paleoLocation geology ecology')
                .sort({ score: { $meta: 'textScore' } })
                .limit(cap)
                .lean();
        } catch (textError) {
            const regexQuery = {
                'taxonomy.acceptedName': { $regex: queryStr, $options: 'i' },
                ...timeFilter
            };
            raw = await Fossil.find(regexQuery)
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
            paleoRegionName: getPaleoRegionNameString(f.paleoLocation?.geoplate, loc)
        }));
        
        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/fossils/timeline
 * Lấy timeline data cho animation
 */
router.get('/timeline', async (req, res) => {
    try {
        const result = await Fossil.aggregate([
            {
                $match: {
                    'paleoLocation.paleolng': { $exists: true, $ne: null },
                    'paleoLocation.paleolat': { $exists: true, $ne: null }
                }
            },
            {
                $bucket: {
                    groupBy: '$time.maxMa',
                    boundaries: [0, 66, 145, 201, 252, 299, 359, 419, 444, 485, 539, 1000, 4600],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 },
                        phyla: { $addToSet: '$taxonomy.phylum' },
                        sample: { $push: {
                            name: '$taxonomy.acceptedName',
                            paleolng: '$paleoLocation.paleolng',
                            paleolat: '$paleoLocation.paleolat'
                        }}
                    }
                }
            }
        ]);
        
        // Limit sample size
        result.forEach(bucket => {
            bucket.phylaCount = bucket.phyla.filter(p => p).length;
            bucket.sample = bucket.sample.slice(0, 100);
            delete bucket.phyla;
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
