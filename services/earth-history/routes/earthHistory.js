const express = require('express');
const router = express.Router();
const EarthHistory = require('../models/EarthHistory');

// GET /api/earth-history - Lấy tất cả stages
router.get('/', async (req, res) => {
    try {
        const stages = await EarthHistory.getAllStages();
        res.json({
            success: true,
            count: stages.length,
            data: stages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/earth-history/stage/:id - Lấy một stage theo stageId
router.get('/stage/:id', async (req, res) => {
    try {
        const stage = await EarthHistory.findOne({ 
            stageId: parseInt(req.params.id),
            isActive: true 
        });
        
        if (!stage) {
            return res.status(404).json({
                success: false,
                error: 'Stage not found'
            });
        }
        
        res.json({
            success: true,
            data: stage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/earth-history/eon/:eon - Lấy stages theo eon
router.get('/eon/:eon', async (req, res) => {
    try {
        const stages = await EarthHistory.getByEon(req.params.eon);
        res.json({
            success: true,
            count: stages.length,
            data: stages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/earth-history/time-range - Lấy stages theo khoảng thời gian
router.get('/time-range', async (req, res) => {
    try {
        const { start, end } = req.query;
        const startMya = parseFloat(start) || 4600;
        const endMya = parseFloat(end) || 0;
        
        const stages = await EarthHistory.getByTimeRange(startMya, endMya);
        res.json({
            success: true,
            count: stages.length,
            data: stages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/earth-history/extinctions - Lấy các sự kiện tuyệt chủng
router.get('/extinctions', async (req, res) => {
    try {
        const extinctions = await EarthHistory.getExtinctionEvents();
        res.json({
            success: true,
            count: extinctions.length,
            data: extinctions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/earth-history/summary - Lấy summary (cho timeline)
router.get('/summary', async (req, res) => {
    try {
        const stages = await EarthHistory.find({ isActive: true })
            .select('stageId name nameEn icon time eon era period flags.isExtinction order')
            .sort({ order: 1 });
            
        res.json({
            success: true,
            count: stages.length,
            data: stages
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/earth-history/stats - Thống kê
router.get('/stats', async (req, res) => {
    try {
        const totalStages = await EarthHistory.countDocuments({ isActive: true });
        const extinctionCount = await EarthHistory.countDocuments({ 
            'flags.isExtinction': true, 
            isActive: true 
        });
        
        const eonCounts = await EarthHistory.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$eon', count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            data: {
                totalStages,
                extinctionCount,
                eonCounts: eonCounts.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
