const { asyncController, ok, created } = require('../../../shared/http');
const { toViewer } = require('../http/viewer');
const postService = require('../services/postService');

module.exports = asyncController({
  async detail(req, res) {
    const data = await postService.getPostDetail({
      postId: req.params.id,
      viewer: toViewer(req),
    });
    return ok(res, { data });
  },

  async trackView(req, res) {
    return ok(res, { viewCount: await postService.trackPostView(req.params.id) });
  },

  async addComment(req, res) {
    const data = await postService.addComment({
      postId: req.params.id,
      viewer: toViewer(req),
      content: req.valid.body.content,
      parentId: req.valid.body.parentId,
    });
    return created(res, { data });
  },

  async vote(req, res) {
    const result = await postService.votePost({
      postId: req.params.id,
      viewer: toViewer(req),
      value: req.valid.body.value,
    });
    return ok(res, result);
  },

  async moderate(req, res) {
    const data = await postService.setPostPinned({
      postId: req.params.id,
      viewer: toViewer(req),
      isPinned: req.valid.body.isPinned,
    });
    return ok(res, { data });
  },

  async remove(req, res) {
    await postService.deletePost({ postId: req.params.id, viewer: toViewer(req) });
    return ok(res, { message: 'Đã xóa bài viết' });
  },
});
