const Order = require('../features/payment/models/Order');

async function getAdminOrderOverview() {
  const totalOrders = await Order.countDocuments({});
  const completedOrders = await Order.countDocuments({ status: 'completed' });
  const failedOrders = await Order.countDocuments({ status: 'failed' });
  const agg = await Order.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const totalRevenue = agg.length > 0 ? agg[0].sum : 0;
  const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(50).lean();

  return {
    stats: { totalOrders, completedOrders, failedOrders, totalRevenue },
    orders: recentOrders,
  };
}

module.exports = { getAdminOrderOverview };
