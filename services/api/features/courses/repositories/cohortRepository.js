const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Cohort = require('../models/Cohort');

const MANAGE_SORT = { createdAt: -1 };
const PUBLIC_FIELDS = 'title slug startAt endAt timezone status price currency';

class CohortRepository extends BaseRepository {
  constructor() {
    super(Cohort);
  }

  findInCourse(cohortId, courseId, options = {}) {
    return this.findOne({ _id: cohortId, courseId }, options);
  }

  /** Hydrated document for flows that mutate and `save()` the cohort. */
  findDocInCourse(cohortId, courseId) {
    return this.findDocOne({ _id: cohortId, courseId });
  }

  listOpenForCourse(courseId) {
    return this.findMany(
      { courseId, status: 'open' },
      { projection: PUBLIC_FIELDS, sort: { startAt: 1 } },
    );
  }

  listAllForCourse(courseId) {
    return this.findMany({ courseId }, { sort: MANAGE_SORT });
  }

  listByIdsInCourse(cohortIds, courseId, projection = 'title slug status startAt endAt') {
    return this.findMany({ _id: { $in: cohortIds }, courseId }, { projection });
  }

  /** Appends `-1`, `-2`… until the slug is free within the course. */
  async reserveUniqueSlug(courseId, baseSlug) {
    let candidate = baseSlug;
    let suffix = 0;
    while (await this.exists({ courseId, slug: candidate })) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
    return candidate;
  }
}

module.exports = { cohortRepository: new CohortRepository(), CohortRepository };
