/**
 * Thin data-access boundary over a Mongoose model.
 *
 * Purpose is containment, not abstraction for its own sake: services and
 * controllers state *what* they need, and every query/projection/`lean()`
 * decision for a collection lives in one place. Escape hatches (`aggregate`,
 * `raw`) exist so genuinely complex pipelines stay in the repository layer
 * instead of leaking back into route handlers.
 */
class BaseRepository {
  constructor(model) {
    if (!model) throw new Error('BaseRepository cần một Mongoose model');
    this.model = model;
  }

  /** Mongoose documents by default are heavy; reads are lean unless asked otherwise. */
  #applyReadOptions(query, { lean = true, populate, sort, skip, limit, session } = {}) {
    if (populate) query.populate(populate);
    if (sort) query.sort(sort);
    if (typeof skip === 'number') query.skip(skip);
    if (typeof limit === 'number') query.limit(limit);
    if (session) query.session(session);
    if (lean) query.lean();
    return query;
  }

  findById(id, options = {}) {
    if (!id) return Promise.resolve(null);
    return this.#applyReadOptions(this.model.findById(id, options.projection), options);
  }

  findOne(filter, options = {}) {
    return this.#applyReadOptions(this.model.findOne(filter, options.projection), options);
  }

  findMany(filter = {}, options = {}) {
    return this.#applyReadOptions(this.model.find(filter, options.projection), options);
  }

  /** Returns a `{ items, total, page, limit }` shape ready for `respond.paginated`. */
  async paginate(filter = {}, { page = 1, limit = 20, ...options } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const [items, total] = await Promise.all([
      this.findMany(filter, { ...options, skip: (safePage - 1) * safeLimit, limit: safeLimit }),
      this.count(filter),
    ]);
    return { items, total, page: safePage, limit: safeLimit };
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter) {
    return Boolean(await this.model.exists(filter));
  }

  distinct(field, filter = {}) {
    return this.model.distinct(field, filter);
  }

  create(data, options = {}) {
    return this.model.create([data], options).then(([doc]) => doc);
  }

  insertMany(docs, options = {}) {
    return this.model.insertMany(docs, options);
  }

  updateById(id, update, options = {}) {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options })
      .lean();
  }

  updateOne(filter, update, options = {}) {
    return this.model
      .findOneAndUpdate(filter, update, { new: true, runValidators: true, ...options })
      .lean();
  }

  updateMany(filter, update, options = {}) {
    return this.model.updateMany(filter, update, options);
  }

  upsert(filter, update, options = {}) {
    return this.updateOne(filter, update, { upsert: true, setDefaultsOnInsert: true, ...options });
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  deleteMany(filter) {
    return this.model.deleteMany(filter);
  }

  aggregate(pipeline, options = {}) {
    return this.model.aggregate(pipeline, options);
  }

  /**
   * Loads a hydrated (non-lean) document when the caller genuinely needs
   * Mongoose instance behaviour such as `save()` hooks.
   */
  findDocById(id, options = {}) {
    return this.#applyReadOptions(this.model.findById(id), { ...options, lean: false });
  }

  findDocOne(filter, options = {}) {
    return this.#applyReadOptions(this.model.findOne(filter), { ...options, lean: false });
  }

  /** Last-resort escape hatch, intentionally verbose so misuse is visible in review. */
  get raw() {
    return this.model;
  }
}

module.exports = { BaseRepository };
