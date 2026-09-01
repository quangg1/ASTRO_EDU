const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Post = require('../models/Post');

/** Điểm tương tác: mỗi lượt xem 1, bình luận 2, vote 3. */
const ADD_INTERACTION_SCORE = {
  $addFields: {
    interactionScore: {
      $add: [
        { $ifNull: ['$viewCount', 0] },
        { $multiply: [{ $ifNull: ['$commentCount', 0] }, 2] },
        { $multiply: [{ $ifNull: ['$voteCount', 0] }, 3] },
      ],
    },
  },
};

/**
 * Bài thảo luận xếp theo thời gian tạo; tin RSS xếp theo `publishedAt` vì
 * thời điểm crawl không phản ánh thời điểm xuất bản.
 */
const SORTS = {
  discussion: {
    newest: { isPinned: -1, createdAt: -1 },
    top: { isPinned: -1, voteCount: -1, createdAt: -1 },
  },
  news: {
    newest: { isPinned: -1, publishedAt: -1, createdAt: -1 },
    top: { isPinned: -1, voteCount: -1, publishedAt: -1, createdAt: -1 },
  },
};

class PostRepository extends BaseRepository {
  constructor() {
    super(Post);
  }

  /**
   * Một cửa duy nhất để lấy trang bài viết. `hot` phải đi qua aggregate nên
   * không dùng chung đường với sort thường — người gọi chỉ cần nói kiểu sort.
   */
  listPage(filter, { sort = 'newest', skip = 0, limit = 20, news = false } = {}) {
    if (sort === 'hot') return this.listHot(filter, skip, limit);
    const presets = news ? SORTS.news : SORTS.discussion;
    return this.findMany(filter, { sort: presets[sort] || presets.newest, skip, limit });
  }

  listHot(filter, skip, limit) {
    return this.aggregate([
      { $match: filter },
      ADD_INTERACTION_SCORE,
      { $sort: { isPinned: -1, interactionScore: -1, publishedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { interactionScore: 0 } },
    ]);
  }

  listRssCategories(forumId) {
    return this.distinct('rssCategories', {
      forumId,
      isCrawled: true,
      rssCategories: { $exists: true, $ne: [] },
    });
  }

  async countTagUsage(forumIds, limit) {
    const rows = await this.aggregate([
      { $match: { forumId: { $in: forumIds }, tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    return rows.map((row) => ({ tag: row._id, count: row.count }));
  }

  incrementViewCount(id) {
    return this.updateById(id, { $inc: { viewCount: 1 } });
  }

  incrementCommentCount(id, delta = 1) {
    return this.updateById(id, { $inc: { commentCount: delta } });
  }

  incrementVoteCount(id, delta) {
    return this.updateById(id, { $inc: { voteCount: delta } });
  }

  setPinned(id, isPinned) {
    return this.updateById(id, { $set: { isPinned } });
  }
}

module.exports = new PostRepository();
