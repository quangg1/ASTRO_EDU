const express = require('express');
const { optionalAuth } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/communitySchemas');
const community = require('../controllers/communityController');
const moderationRouter = require('./moderation');

const router = express.Router();

router.use('/mod', moderationRouter);

router.get('/search', optionalAuth, validate({ query: schema.searchQuery }), community.search);
router.get('/tags', validate({ query: schema.tagsQuery }), community.popularTags);

router.get(
  '/tags/:tag/posts',
  validate({ params: schema.tagParams, query: schema.tagPostsQuery }),
  community.postsByTag,
);

module.exports = router;
