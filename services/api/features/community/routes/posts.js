const express = require('express');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/communitySchemas');
const posts = require('../controllers/postController');

const router = express.Router();

const withId = validate({ params: schema.postIdParams });

router.get('/:id', optionalAuth, withId, posts.detail);
router.post('/:id/view', withId, posts.trackView);

router.post(
  '/:id/comments',
  authMiddleware,
  validate({ params: schema.postIdParams, body: schema.commentBody }),
  posts.addComment,
);

router.post(
  '/:id/vote',
  authMiddleware,
  validate({ params: schema.postIdParams, body: schema.voteBody }),
  posts.vote,
);

router.patch(
  '/:id',
  authMiddleware,
  validate({ params: schema.postIdParams, body: schema.moderatePostBody }),
  posts.moderate,
);

router.delete('/:id', authMiddleware, withId, posts.remove);

module.exports = router;
