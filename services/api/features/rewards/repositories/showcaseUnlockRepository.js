const { BaseRepository } = require('../../../shared/db/BaseRepository');
const ShowcaseUnlock = require('../models/ShowcaseUnlock');

class ShowcaseUnlockRepository extends BaseRepository {
  constructor() {
    super(ShowcaseUnlock);
  }

  listForUser(userId) {
    return this.findMany({ userId }, { projection: 'entityId contentType' });
  }

  findOneForUser({ userId, entityId, contentType }) {
    return this.findOne({ userId, entityId, contentType });
  }

  createUnlock({ userId, entityId, contentType, gemCost }) {
    return this.create({ userId, entityId, contentType, gemCost });
  }
}

module.exports = { showcaseUnlockRepository: new ShowcaseUnlockRepository() };
