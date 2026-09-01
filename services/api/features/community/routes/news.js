const express = require('express');
const { optionalAuth } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/communitySchemas');
const community = require('../controllers/communityController');

const router = express.Router();

router.get('/categories', optionalAuth, community.newsCategories);
router.get('/', optionalAuth, validate({ query: schema.newsQuery }), community.listNews);

module.exports = router;
