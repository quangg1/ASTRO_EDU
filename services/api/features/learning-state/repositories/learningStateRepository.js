const { BaseRepository } = require('../../../shared/db/BaseRepository');
const ConceptLearningState = require('../models/ConceptLearningState');

class ConceptLearningStateRepository extends BaseRepository {
  constructor() {
    super(ConceptLearningState);
  }

  listForConcepts(userId, conceptIds) {
    return this.findMany({ userId, conceptId: { $in: conceptIds } });
  }
}

module.exports = {
  conceptLearningStateRepository: new ConceptLearningStateRepository(),
};
