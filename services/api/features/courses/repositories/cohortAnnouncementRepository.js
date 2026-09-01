const { BaseRepository } = require('../../../shared/db/BaseRepository');
const CohortAnnouncement = require('../models/CohortAnnouncement');

const FEED_LIMIT = 50;

class CohortAnnouncementRepository extends BaseRepository {
  constructor() {
    super(CohortAnnouncement);
  }

  listForCohort(cohortId, limit = FEED_LIMIT) {
    return this.findMany({ cohortId }, { sort: { pinned: -1, createdAt: -1 }, limit });
  }

  findDocInCohort({ announcementId, cohortId, courseId }) {
    return this.findDocOne({ _id: announcementId, cohortId, courseId });
  }

  deleteInCohort({ announcementId, cohortId, courseId }) {
    return this.deleteMany({ _id: announcementId, cohortId, courseId });
  }
}

module.exports = {
  cohortAnnouncementRepository: new CohortAnnouncementRepository(),
  CohortAnnouncementRepository,
};
