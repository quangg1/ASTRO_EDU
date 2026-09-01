const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Order = require('../models/Order');

/** Lịch sử đơn của một người dùng hiếm khi dài hơn ngần này. */
const USER_ORDER_LIMIT = 100;

class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }

  findByTxnRefForUser(txnRef, userId) {
    return this.findOne({ txnRef, userId });
  }

  /** Bản hydrated để đổi trạng thái rồi `save()` trong luồng xác nhận. */
  findDocByTxnRefForUser(txnRef, userId) {
    return this.findDocOne({ txnRef, userId });
  }

  /** Đơn đã hủy chỉ là rác của luồng checkout, không đưa vào lịch sử. */
  listVisibleForUser(userId) {
    return this.findMany(
      { userId, status: { $ne: 'cancelled' } },
      { sort: { createdAt: -1 }, limit: USER_ORDER_LIMIT },
    );
  }

  listPending(filter) {
    return this.findMany({ ...filter, status: 'pending' }, { sort: { createdAt: -1 } });
  }

  findCompleted(filter) {
    return this.findOne({ ...filter, status: 'completed' });
  }

  cancelById(orderId) {
    return this.model.updateOne({ _id: orderId }, { status: 'cancelled' });
  }

  cancelMany(filter) {
    return this.updateMany(filter, { status: 'cancelled' });
  }

  groupCompletedByLearnerCourse() {
    return this.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            userId: '$userId',
            courseId: '$courseId',
            cohortId: { $ifNull: ['$cohortId', ''] },
          },
        },
      },
    ]);
  }
}

module.exports = { orderRepository: new OrderRepository(), USER_ORDER_LIMIT };
