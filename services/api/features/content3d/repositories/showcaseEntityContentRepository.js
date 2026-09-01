const { BaseRepository } = require('../../../shared/db/BaseRepository');
const ShowcaseEntityContent = require('../models/ShowcaseEntityContent');

class ShowcaseEntityContentRepository extends BaseRepository {
  constructor() {
    super(ShowcaseEntityContent);
  }

  findByEntityId(entityId, options = {}) {
    return this.findOne({ entityId }, options);
  }
}

module.exports = {
  showcaseEntityContentRepository: new ShowcaseEntityContentRepository(),
};
