const express = require('express');
const { validate } = require('../../../../shared/http');
const schema = require('../schemas/earthHistorySchemas');
const fossils = require('../controllers/fossilController');

const router = express.Router();

router.get('/', validate({ query: schema.localeQuery }), fossils.phylumMetadata);

module.exports = router;
