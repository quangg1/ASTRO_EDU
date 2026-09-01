const express = require('express');
const { validate } = require('../../../../shared/http');
const schema = require('../schemas/earthHistorySchemas');
const stages = require('../controllers/earthHistoryController');
const earthHistoryEditorRouter = require('./earthHistoryEditor');

const router = express.Router();

router.use('/editor', earthHistoryEditorRouter);

router.get('/', stages.list);
router.get('/extinctions', stages.listExtinctions);
router.get('/summary', stages.summary);
router.get('/stats', stages.stats);
router.get('/time-range', validate({ query: schema.timeRangeQuery }), stages.listByTimeRange);
router.get('/stage/:id', validate({ params: schema.stageIdParams }), stages.detail);
router.get('/eon/:eon', validate({ params: schema.eonParams }), stages.listByEon);

module.exports = router;
