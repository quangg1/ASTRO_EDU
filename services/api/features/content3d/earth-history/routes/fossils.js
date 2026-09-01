const express = require('express');
const { validate } = require('../../../../shared/http');
const schema = require('../schemas/earthHistorySchemas');
const fossils = require('../controllers/fossilController');

const router = express.Router();

router.get('/by-time', validate({ query: schema.fossilsByTimeQuery }), fossils.byTime);
router.get('/search', validate({ query: schema.fossilSearchQuery }), fossils.search);
router.get('/stats', fossils.stats);
router.get(
  '/for-stage/:stageId',
  validate({ params: schema.stageIdPathParams, query: schema.fossilsForStageQuery }),
  fossils.forStage,
);

module.exports = router;
