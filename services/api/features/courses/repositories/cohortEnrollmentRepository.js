const { BaseRepository } = require('../../../shared/db/BaseRepository');
const CohortEnrollment = require('../models/CohortEnrollment');

class CohortEnrollmentRepository extends BaseRepository {
  constructor() {
    super(CohortEnrollment);
  }

  listForUser(userId) {
    return this.findMany({ userId });
  }

  findMembership(cohortId, userId) {
    return this.findOne({ cohortId, userId });
  }

  listMemberIds(cohortId) {
    return this.distinct('userId', { cohortId });
  }

  /** `{ [cohortId]: memberCount }` for the teacher management list. */
  async countByCohortIds(cohortIds) {
    if (!cohortIds?.length) return {};
    const rows = await this.aggregate([
      { $match: { cohortId: { $in: cohortIds } } },
      { $group: { _id: '$cohortId', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
  }
}

module.exports = {
  cohortEnrollmentRepository: new CohortEnrollmentRepository(),
  CohortEnrollmentRepository,
};
