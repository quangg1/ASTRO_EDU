const { BaseRepository } = require('../../../shared/db/BaseRepository');
const CohortActivitySchedule = require('../models/CohortActivitySchedule');

class CohortScheduleRepository extends BaseRepository {
  constructor() {
    super(CohortActivitySchedule);
  }

  listForCohort(cohortId) {
    return this.findMany({ cohortId });
  }

  upsertLessonSchedule({ cohortId, lessonSlug, openAt, dueAt, closeAt }) {
    return this.upsert({ cohortId, lessonSlug }, { openAt, dueAt, closeAt });
  }

  /** One round-trip for a whole schedule grid instead of N sequential upserts. */
  bulkUpsertLessonSchedules(cohortId, entries) {
    if (!entries.length) return Promise.resolve({ modifiedCount: 0, upsertedCount: 0 });
    return this.raw.bulkWrite(
      entries.map(({ lessonSlug, openAt, dueAt, closeAt }) => ({
        updateOne: {
          filter: { cohortId, lessonSlug },
          update: { $set: { openAt, dueAt, closeAt } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
}

module.exports = {
  cohortScheduleRepository: new CohortScheduleRepository(),
  CohortScheduleRepository,
};
