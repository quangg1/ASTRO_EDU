const { BaseRepository } = require('../../../shared/db/BaseRepository');
const AstronomyEvent = require('../models/AstronomyEvent');
const AstronomyEventReminder = require('../models/AstronomyEventReminder');
const UserAstronomyEventEngagement = require('../models/UserAstronomyEventEngagement');

/** Bảng biên tập chỉ vài trăm dòng nên console đọc thẳng, không phân trang. */
const ADMIN_LIST_LIMIT = 500;

class AstronomyEventRepository extends BaseRepository {
  constructor() {
    super(AstronomyEvent);
  }

  listForAdmin(limit = ADMIN_LIST_LIMIT) {
    return this.findMany({}, { sort: { startAt: 1 }, limit });
  }

  listPublished({ start, end, type, eventKind, limit = 500 }) {
    const filter = { status: 'published', endAt: { $gte: start } };
    if (end) filter.startAt = { $lte: end };
    if (type) filter.type = type;
    if (eventKind) filter.eventKind = eventKind;
    return this.findMany(filter, { sort: { peakAt: 1, startAt: 1, priority: -1 }, limit });
  }

  findPublishedByPublicId(eventId) {
    return this.findOne({ eventId: String(eventId), status: 'published' });
  }

  findByComputeId(computeId) {
    return this.findOne({ computeId });
  }

  countPublished() {
    return this.count({ status: 'published' });
  }

  applyComputeUpdate(id, fields) {
    return this.updateById(id, { $set: fields });
  }
}

class EventEngagementRepository extends BaseRepository {
  constructor() {
    super(UserAstronomyEventEngagement);
  }

  listForUserEvents(userId, eventIds) {
    if (!eventIds.length) return Promise.resolve([]);
    return this.findMany({ userId: String(userId), eventId: { $in: eventIds } });
  }

  markEngagement(userId, eventId, patch) {
    return this.upsert({ userId: String(userId), eventId: String(eventId) }, { $set: patch });
  }
}

/** Hàng đợi nhắc lịch do job nền quét, tách khỏi bản ghi tương tác của người học. */
class EventReminderRepository extends BaseRepository {
  constructor() {
    super(AstronomyEventReminder);
  }

  schedule(userId, eventId, remindAt) {
    return this.upsert(
      { userId: String(userId), eventId: String(eventId) },
      { $set: { remindAt, active: true, notifiedAt: null } },
    );
  }

  listDue(now, limit = 100) {
    return this.findMany({ active: true, notifiedAt: null, remindAt: { $lte: now } }, { limit });
  }

  deactivate(id) {
    return this.updateById(id, { $set: { active: false } });
  }

  markNotified(id, notifiedAt) {
    return this.updateById(id, { $set: { notifiedAt } });
  }
}

module.exports = {
  astronomyEventRepository: new AstronomyEventRepository(),
  eventEngagementRepository: new EventEngagementRepository(),
  eventReminderRepository: new EventReminderRepository(),
};
