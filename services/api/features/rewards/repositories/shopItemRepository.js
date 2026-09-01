const { BaseRepository } = require('../../../shared/db/BaseRepository');
const ShopItem = require('../models/ShopItem');

class ShopItemRepository extends BaseRepository {
  constructor() {
    super(ShopItem);
  }

  findBySku(skuId) {
    return this.findOne({ skuId });
  }

  findVisibleBySku(skuId) {
    return this.findOne({ skuId, visible: true });
  }

  listVisible(extraFilter = {}) {
    return this.findMany({ visible: true, ...extraFilter }, { sort: { skuId: 1 } });
  }

  listAll() {
    return this.findMany({}, { sort: { updatedAt: -1 } });
  }

  findDocBySku(skuId) {
    return this.findDocOne({ skuId });
  }
}

module.exports = { shopItemRepository: new ShopItemRepository() };
