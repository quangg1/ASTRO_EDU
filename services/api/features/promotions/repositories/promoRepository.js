const { BaseRepository } = require('../../../shared/db/BaseRepository');
const PromoCode = require('../models/PromoCode');
const PromoRedemption = require('../models/PromoRedemption');

/** Trang quản trị chỉ liệt kê các mã gần đây, không phân trang. */
const ADMIN_LIST_LIMIT = 200;

class PromoCodeRepository extends BaseRepository {
  constructor() {
    super(PromoCode);
  }

  findByCode(code) {
    return this.findOne({ code });
  }

  listActive(filter, { sort, limit } = {}) {
    return this.findMany(filter, { sort, limit });
  }

  listForAdmin() {
    return this.findMany({}, { sort: { createdAt: -1 }, limit: ADMIN_LIST_LIMIT });
  }

  incrementRedemptions(promoCodeId, session) {
    return this.model.updateOne(
      { _id: promoCodeId },
      { $inc: { redemptionCount: 1 } },
      session ? { session } : undefined,
    );
  }
}

class PromoRedemptionRepository extends BaseRepository {
  constructor() {
    super(PromoRedemption);
  }

  countForUser(promoCodeId, userId) {
    return this.count({ promoCodeId, userId });
  }

  record(entry, session) {
    return this.create(entry, session ? { session } : {});
  }
}

module.exports = {
  promoCodeRepository: new PromoCodeRepository(),
  promoRedemptionRepository: new PromoRedemptionRepository(),
};
