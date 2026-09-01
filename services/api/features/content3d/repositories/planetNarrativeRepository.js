const { BaseRepository } = require('../../../shared/db/BaseRepository');
const PlanetNarrative = require('../planet-narrative/models/PlanetNarrative');

class PlanetNarrativeRepository extends BaseRepository {
  constructor() {
    super(PlanetNarrative);
  }

  findByEntityId(entityId) {
    return this.findOne({ entityId });
  }

  /** Bản ghi cũ không có cờ `published` nên mặc định coi là đã xuất bản. */
  findPublished(entityId) {
    return this.findOne({ entityId, published: { $ne: false } });
  }

  findDocByEntityId(entityId) {
    return this.findDocOne({ entityId });
  }

  deleteForEntityIds(entityIds) {
    return this.deleteMany({ entityId: { $in: entityIds } });
  }
}

module.exports = { planetNarrativeRepository: new PlanetNarrativeRepository() };
