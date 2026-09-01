const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Enrollment = require('../models/Enrollment');

class EnrollmentRepository extends BaseRepository {
  constructor() {
    super(Enrollment);
  }

  findForUserAndCourse(userId, courseId, options = {}) {
    return this.findOne({ userId, courseId }, options);
  }

  /** Hydrated document for progress updates, which mutate the subdocument array. */
  findDocForUserAndCourse(userId, courseId) {
    return this.findDocOne({ userId, courseId });
  }

  listForUser(userId) {
    return this.findMany({ userId }, { sort: { enrolledAt: -1 } });
  }

  /** Creates the enrollment with a progress row per lesson, if not already enrolled. */
  async ensureForCourse(userId, course, options = {}) {
    const existing = await this.findForUserAndCourse(userId, course._id, options);
    if (existing) return existing;
    const createOpts = options.session ? { session: options.session } : {};
    return this.create(
      {
        userId,
        courseId: course._id,
        progress: (course.lessons || []).map((lesson) => ({
          lessonSlug: lesson.slug,
          completed: false,
          completedAt: null,
        })),
      },
      createOpts,
    );
  }
}

module.exports = { enrollmentRepository: new EnrollmentRepository(), EnrollmentRepository };
