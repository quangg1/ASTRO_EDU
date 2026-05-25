/**
 * Một nguồn sự thật: khóa có thu phí khi isPaid và price > 0.
 * Tự sửa lệch: price > 0 → bật isPaid; isPaid tắt → price = 0.
 */
function normalizeCoursePricingFields(course) {
  const price = Math.max(0, Math.round(Number(course.price) || 0))
  let isPaid = Boolean(course.isPaid)
  if (price > 0 && !isPaid) isPaid = true
  if (isPaid && price <= 0) isPaid = false
  course.price = price
  course.isPaid = isPaid
  return course
}

function courseRequiresPayment(course) {
  const price = Math.round(Number(course?.price) || 0)
  return Boolean(course?.isPaid && price > 0)
}

function paidCoursesQuery() {
  return { isPaid: true, price: { $gt: 0 } }
}

function freeCoursesQuery() {
  return {
    $or: [{ isPaid: { $ne: true } }, { price: { $lte: 0 } }],
  }
}

module.exports = {
  normalizeCoursePricingFields,
  courseRequiresPayment,
  paidCoursesQuery,
  freeCoursesQuery,
}
