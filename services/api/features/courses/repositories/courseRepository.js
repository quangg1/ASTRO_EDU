const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Course = require('../models/Course');

const CATALOG_FIELDS =
  'title slug description thumbnail level lessons price currency isPaid durationWeeks';
const EDITOR_LIST_FIELDS = `${CATALOG_FIELDS} published catalogEnabled distributionStrategy`;
const ENROLLED_CARD_FIELDS = 'title slug description thumbnail level lessons';

class CourseRepository extends BaseRepository {
  constructor() {
    super(Course);
  }

  findBySlug(slug, options = {}) {
    return this.findOne({ slug }, options);
  }

  findPublishedBySlug(slug, options = {}) {
    return this.findOne({ slug, published: true }, options);
  }

  /** Hydrated document for flows that mutate and `save()` the course. */
  findDocBySlug(slug) {
    return this.findDocOne({ slug });
  }

  /** Public catalog listing, newest first. */
  listCatalog(filter) {
    return this.findMany(filter, { projection: CATALOG_FIELDS, sort: { createdAt: -1 } });
  }

  /** Studio listing, most recently edited first. */
  listForEditor(filter) {
    return this.findMany(filter, { projection: EDITOR_LIST_FIELDS, sort: { updatedAt: -1 } });
  }

  listCardsByIds(courseIds) {
    return this.findMany({ _id: { $in: courseIds } }, { projection: ENROLLED_CARD_FIELDS });
  }

  findPublishedById(courseId, options = {}) {
    return this.findOne({ _id: courseId, published: true }, options);
  }

  listPublishedByIds(courseIds, options = {}) {
    return this.findMany({ _id: { $in: courseIds }, published: true }, options);
  }

  slugExists(slug) {
    return this.exists({ slug });
  }

  /** `isPaid` là cờ mới; khóa cũ chỉ có giá > 0 nên phải chấp nhận cả hai. */
  countPaidPublished() {
    return this.count({ published: true, $or: [{ isPaid: true }, { price: { $gt: 0 } }] });
  }
}

module.exports = { courseRepository: new CourseRepository(), CourseRepository };
