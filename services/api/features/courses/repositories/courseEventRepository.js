const { BaseRepository } = require('../../../shared/db/BaseRepository');
const CourseLearningEvent = require('../models/CourseLearningEvent');

class CourseEventRepository extends BaseRepository {
  constructor() {
    super(CourseLearningEvent);
  }

  /**
   * Telemetry ghi theo lô và không xếp thứ tự: một sự kiện hỏng không được
   * làm rớt cả batch.
   */
  recordBatch(events) {
    if (!events.length) return Promise.resolve([]);
    return this.insertMany(events, { ordered: false });
  }
}

module.exports = { courseEventRepository: new CourseEventRepository() };
