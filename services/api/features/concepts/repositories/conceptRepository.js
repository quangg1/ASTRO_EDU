const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Concept = require('../models/Concept');
const TaxonomyRegistry = require('../models/TaxonomyRegistry');

const TAXONOMY_KEY = 'default';

class ConceptRepository extends BaseRepository {
  constructor() {
    super(Concept);
  }

  listPublished() {
    return this.findMany({ published: true }, { sort: { id: 1 } });
  }

  listAll() {
    return this.findMany({}, { sort: { id: 1 } });
  }

  listByIds(ids) {
    return this.findMany({ id: { $in: ids } }, { sort: { id: 1 } });
  }

  listIds() {
    return this.distinct('id');
  }

  /** Editor lưu cả bộ: xóa sạch rồi ghi lại để id bị bỏ không còn sót lại. */
  async replaceAll(concepts) {
    await this.deleteMany({});
    if (concepts.length) await this.insertMany(concepts, { ordered: false });
    return this.listAll();
  }
}

class TaxonomyRegistryRepository extends BaseRepository {
  constructor() {
    super(TaxonomyRegistry);
  }

  findDefault() {
    return this.findOne({ key: TAXONOMY_KEY });
  }

  saveDefault(taxonomy) {
    return this.model.updateOne({ key: TAXONOMY_KEY }, { $set: { taxonomy } }, { upsert: true });
  }
}

module.exports = {
  conceptRepository: new ConceptRepository(),
  taxonomyRegistryRepository: new TaxonomyRegistryRepository(),
};
