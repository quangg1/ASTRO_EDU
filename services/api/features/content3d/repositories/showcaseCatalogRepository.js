const { BaseRepository } = require('../../../shared/db/BaseRepository');
const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');

/** Toàn bộ hệ Mặt Trời nằm trong một document duy nhất. */
const MAIN_SLUG = 'main';

class ShowcaseCatalogRepository extends BaseRepository {
  constructor() {
    super(ShowcaseCatalogBundle);
  }

  findBundle() {
    return this.findOne({ slug: MAIN_SLUG });
  }

  /** Luôn trả về mảng để hàng chục chỗ gọi khỏi tự kiểm tra `Array.isArray`. */
  async loadBundleParts() {
    const doc = await this.findBundle();
    return {
      doc,
      catalog: Array.isArray(doc?.catalog) ? doc.catalog : [],
      orbits: Array.isArray(doc?.orbits) ? doc.orbits : [],
      stories: Array.isArray(doc?.stories) ? doc.stories : [],
      updatedAt: doc?.updatedAt || null,
    };
  }

  saveBundleParts(parts) {
    return this.raw.updateOne({ slug: MAIN_SLUG }, { $set: parts }, { upsert: true });
  }
}

module.exports = { showcaseCatalogRepository: new ShowcaseCatalogRepository() };
