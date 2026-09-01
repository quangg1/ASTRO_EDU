const { BaseRepository } = require('../../../shared/db/BaseRepository');
const GemTransaction = require('../models/GemTransaction');

class GemTransactionRepository extends BaseRepository {
  constructor() {
    super(GemTransaction);
  }

  listForUser(userId, { limit = 50, skip = 0 } = {}) {
    return this.findMany({ userId }, { sort: { createdAt: -1 }, skip, limit });
  }

  countSince(filter, since) {
    return this.count({ ...filter, createdAt: { $gte: since } });
  }

  existsInRange(filter, { start, end }) {
    return this.exists({ ...filter, createdAt: { $gte: start, $lt: end } });
  }

  recordSpend({
    userId,
    cost,
    reason,
    balanceAfter,
    entityId,
    contentType,
    metadata = {},
    session = null,
  }) {
    return this.create(
      {
        userId,
        delta: -cost,
        reason,
        balanceAfter,
        entityId,
        contentType,
        metadata,
      },
      session ? { session } : {},
    );
  }
}

module.exports = new GemTransactionRepository();
