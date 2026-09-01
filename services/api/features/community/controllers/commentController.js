const { asyncController, ok } = require('../../../shared/http');
const { toViewer } = require('../http/viewer');
const commentService = require('../services/commentService');

module.exports = asyncController({
  async vote(req, res) {
    const result = await commentService.voteComment({
      commentId: req.params.id,
      viewer: toViewer(req),
      value: req.valid.body.value,
    });
    return ok(res, result);
  },

  async markHelpful(req, res) {
    const { comment, gemReward } = await commentService.markCommentHelpful({
      commentId: req.params.id,
      viewer: toViewer(req),
    });
    return ok(res, { data: comment, gemReward });
  },
});
