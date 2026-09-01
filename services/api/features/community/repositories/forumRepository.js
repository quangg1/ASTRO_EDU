const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Forum = require('../models/Forum');
const { NEWS_FORUM_SLUG } = require('../constants/forumCatalog');

class ForumRepository extends BaseRepository {
  constructor() {
    super(Forum);
  }

  /** Forum công khai — forum riêng của lớp học có `cohortId`. */
  listPublic() {
    return this.findMany({ cohortId: null }, { sort: { order: 1, title: 1 } });
  }

  listAll() {
    return this.findMany({});
  }

  listDiscussion(options = {}) {
    return this.findMany({ isNews: { $ne: true } }, options);
  }

  findBySlug(slug) {
    return this.findOne({ slug });
  }

  /** Slug là nguồn chính; cờ `isNews` là đường lui cho dữ liệu cũ. */
  async findNewsForum() {
    return (await this.findBySlug(NEWS_FORUM_SLUG)) || this.findOne({ isNews: true });
  }

  incrementPostCount(id, delta = 1) {
    return this.updateById(id, { $inc: { postCount: delta } });
  }
}

module.exports = new ForumRepository();
