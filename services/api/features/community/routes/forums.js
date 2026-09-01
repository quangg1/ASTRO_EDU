const express = require('express');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/communitySchemas');
const forums = require('../controllers/forumController');

const router = express.Router();

const withSlug = validate({ params: schema.forumSlugParams });

router.get('/', optionalAuth, forums.list);
router.get('/:slug', optionalAuth, withSlug, forums.detail);

router.get(
  '/:slug/posts',
  optionalAuth,
  validate({ params: schema.forumSlugParams, query: schema.forumPostsQuery }),
  forums.listPosts,
);

router.post(
  '/:slug/posts',
  authMiddleware,
  validate({ params: schema.forumSlugParams, body: schema.createPostBody }),
  forums.createPost,
);

module.exports = router;
