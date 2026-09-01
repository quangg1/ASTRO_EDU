const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/communitySchemas');
const comments = require('../controllers/commentController');

const router = express.Router();

router.post(
  '/:id/vote',
  authMiddleware,
  validate({ params: schema.commentIdParams, body: schema.voteBody }),
  comments.vote,
);

router.post(
  '/:id/helpful',
  authMiddleware,
  validate({ params: schema.commentIdParams }),
  comments.markHelpful,
);

module.exports = router;
