const { BaseRepository } = require('../../../shared/db/BaseRepository');
const SkyExploreContentBundle = require('../models/SkyExploreContentBundle');

const MAIN_SLUG = 'main';

class SkyExploreContentRepository extends BaseRepository {
  constructor() {
    super(SkyExploreContentBundle);
  }

  async listItems() {
    const doc = await this.findOne({ slug: MAIN_SLUG });
    return Array.isArray(doc?.items) ? doc.items : [];
  }

  saveItems(items) {
    return this.raw.updateOne({ slug: MAIN_SLUG }, { $set: { items } }, { upsert: true });
  }
}

module.exports = { skyExploreContentRepository: new SkyExploreContentRepository() };
