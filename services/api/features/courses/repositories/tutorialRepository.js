const { BaseRepository } = require('../../../shared/db/BaseRepository');
const { Tutorial, TutorialCategory } = require('../models/Tutorial');
const TutorialTrack = require('../models/TutorialTrack');
const TutorialProgress = require('../models/TutorialProgress');

const LIST_FIELDS = 'title slug summary categoryId readTime tags';
const LIST_SORT = { order: 1, createdAt: -1 };

class TutorialRepository extends BaseRepository {
  constructor() {
    super(Tutorial);
  }

  listPublished(filter) {
    return this.findMany(
      { ...filter, published: true },
      { projection: LIST_FIELDS, sort: LIST_SORT },
    );
  }

  /** Giáo viên chỉ thấy bài của mình; admin thấy tất cả. */
  listForEditor({ authorId } = {}) {
    return this.findMany(authorId ? { authorId } : {}, { sort: LIST_SORT });
  }

  findPublishedBySlug(slug) {
    return this.findOne({ slug, published: true });
  }

  /** Editor sửa rồi `save()` nên cần document sống. */
  findDocBySlug(slug) {
    return this.findDocOne({ slug });
  }

  deleteBySlug(slug) {
    return this.raw.findOneAndDelete({ slug }).lean();
  }
}

class TutorialCategoryRepository extends BaseRepository {
  constructor() {
    super(TutorialCategory);
  }

  listOrdered() {
    return this.findMany({}, { sort: { order: 1 } });
  }
}

class TutorialTrackRepository extends BaseRepository {
  constructor() {
    super(TutorialTrack);
  }

  listOrdered() {
    return this.findMany({}, { sort: { level: 1, order: 1 } });
  }

  findBySlug(slug) {
    return this.findOne({ slug });
  }
}

class TutorialProgressRepository extends BaseRepository {
  constructor() {
    super(TutorialProgress);
  }

  listForUserAndSlugs(userId, tutorialSlugs) {
    return this.findMany({ userId, tutorialSlug: { $in: tutorialSlugs } });
  }

  markCompleted(userId, tutorialSlug, completedAt = new Date()) {
    return this.upsert(
      { userId, tutorialSlug },
      { $set: { status: 'completed', completedAt } },
    );
  }
}

module.exports = {
  tutorialRepository: new TutorialRepository(),
  tutorialCategoryRepository: new TutorialCategoryRepository(),
  tutorialTrackRepository: new TutorialTrackRepository(),
  tutorialProgressRepository: new TutorialProgressRepository(),
};
