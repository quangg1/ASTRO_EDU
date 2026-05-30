/**
 * Gem → giảm giá % khi thanh toán khóa học. Không mua full course bằng gem.
 * Gem chỉ trừ khi IPN xác nhận thanh toán thành công.
 */
const COURSE_VOUCHER_TIERS = [
  { id: 'voucher_discount_5', discountPct: 5, gemCost: 200, labelVi: 'Giảm 5%' },
  { id: 'voucher_discount_10', discountPct: 10, gemCost: 400, labelVi: 'Giảm 10%' },
  { id: 'voucher_discount_15', discountPct: 15, gemCost: 600, labelVi: 'Giảm 15%' },
]

function getTierById(tierId) {
  const id = String(tierId || '').trim()
  if (!id) return null
  return COURSE_VOUCHER_TIERS.find((t) => t.id === id) || null
}

module.exports = {
  COURSE_VOUCHER_TIERS,
  getTierById,
}
