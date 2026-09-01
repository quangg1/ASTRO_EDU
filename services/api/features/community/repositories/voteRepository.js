const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Vote = require('../models/Vote');

class VoteRepository extends BaseRepository {
  constructor() {
    super(Vote);
  }

  findUserVote(userId, targetType, targetId) {
    return this.findOne({ userId, targetType, targetId });
  }

  listUserVotes(userId, targetType, targetIds) {
    return this.findMany({ userId, targetType, targetId: { $in: targetIds } });
  }

  setValue(id, value) {
    return this.updateById(id, { $set: { value } });
  }

  deleteForTarget(targetType, targetId) {
    return this.deleteMany({ targetType, targetId });
  }
}

module.exports = new VoteRepository();
