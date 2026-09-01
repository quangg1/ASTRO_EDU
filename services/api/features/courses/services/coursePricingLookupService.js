const { courseRepository } = require('../repositories');
const { courseRequiresPayment } = require('../lib/coursePricing');

/**
 * API công khai cho khuyến mãi/thanh toán: chỉ đủ dữ liệu để tính giá và dựng
 * liên kết, không lộ nội dung khóa học.
 */
const PRICING_FIELDS = 'title slug price currency isPaid published';

async function getPublishedPricing(courseId) {
  const course = await courseRepository.findPublishedById(courseId, {
    projection: PRICING_FIELDS,
  });
  if (!course) return null;
  return { ...course, requiresPayment: courseRequiresPayment(course) };
}

function listPublishedPricingByIds(courseIds) {
  return courseRepository.listPublishedByIds(courseIds, { projection: PRICING_FIELDS });
}

module.exports = { getPublishedPricing, listPublishedPricingByIds };
