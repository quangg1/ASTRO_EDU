const { BaseRepository } = require('../../../shared/db/BaseRepository');
const LearningPath = require('../models/LearningPath');
const UserProgress = require('../models/UserProgress');
const LearningPathEvent = require('../models/LearningPathEvent');

/** Toàn hệ thống hiện chỉ có một lộ trình chính. */
const MAIN_SLUG = 'main';

class LearningPathRepository extends BaseRepository {
  constructor() {
    super(LearningPath);
  }

  findMain() {
    return this.findOne({ slug: MAIN_SLUG });
  }

  findMainDoc() {
    return this.findDocOne({ slug: MAIN_SLUG });
  }

  findMainPublished() {
    return this.findOne(
      { slug: MAIN_SLUG, published: { $ne: false } },
      { projection: 'modules concepts published' },
    );
  }

  createMain(data) {
    return new this.raw({ slug: MAIN_SLUG, ...data });
  }
}

class UserProgressRepository extends BaseRepository {
  constructor() {
    super(UserProgress);
  }

  findForUser(userId, options = {}) {
    return this.findOne({ userId }, options);
  }

  saveForUser(userId, set) {
    return this.upsert({ userId }, { $set: set }, { runValidators: false });
  }
}

class LearningPathEventRepository extends BaseRepository {
  constructor() {
    super(LearningPathEvent);
  }

  /** Ghi theo `eventId` để client gửi lại cùng một sự kiện cũng không nhân đôi. */
  upsertByEventId(events) {
    return this.raw.bulkWrite(
      events.map((event) => ({
        updateOne: { filter: { eventId: event.eventId }, update: { $setOnInsert: event }, upsert: true },
      })),
      { ordered: false },
    );
  }

  claimGuestSession(anonSessionId, userId) {
    return this.updateMany({ anonSessionId, userId: null }, { $set: { userId } });
  }
}

module.exports = {
  learningPathRepository: new LearningPathRepository(),
  userProgressRepository: new UserProgressRepository(),
  learningPathEventRepository: new LearningPathEventRepository(),
};
