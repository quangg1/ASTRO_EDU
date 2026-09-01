const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Comment = require('../models/Comment');

class CommentRepository extends BaseRepository {
  constructor() {
    super(Comment);
  }

  /** Bình luận đọc theo thứ tự thời gian để client tự dựng cây trả lời. */
  listForPost(postId, visibilityFilter = {}) {
    return this.findMany({ postId, ...visibilityFilter }, { sort: { createdAt: 1 } });
  }

  findInPost(commentId, postId) {
    return this.findOne({ _id: commentId, postId });
  }

  deleteForPost(postId) {
    return this.deleteMany({ postId });
  }

  incrementVoteCount(id, delta) {
    return this.updateById(id, { $inc: { voteCount: delta } });
  }

  markHelpful(id, markedBy) {
    return this.updateById(id, {
      $set: { isHelpful: true, helpfulMarkedBy: markedBy, helpfulMarkedAt: new Date() },
    });
  }
}

module.exports = new CommentRepository();
