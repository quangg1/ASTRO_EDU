/** Khớp API `courseRequiresPayment` / enroll. */
export function courseRequiresPayment(course: {
  isPaid?: boolean
  price?: number
  requiresPayment?: boolean
}): boolean {
  if (typeof course.requiresPayment === 'boolean') return course.requiresPayment
  const price = Math.round(Number(course.price) || 0)
  // Giá > 0 là tín hiệu trả phí (phòng API cũ thiếu isPaid trong list).
  if (price > 0) return true
  return Boolean(course.isPaid && price > 0)
}

export function courseLevelLabel(level: string | undefined): string {
  switch (level) {
    case 'beginner':
      return 'Cơ bản'
    case 'intermediate':
      return 'Trung cấp'
    case 'advanced':
      return 'Nâng cao'
    default:
      return level || 'Mọi cấp độ'
  }
}

export function formatCatalogPrice(
  price: number | undefined,
  currency: string | undefined,
  isPaid?: boolean,
  requiresPayment?: boolean,
): string {
  if (!courseRequiresPayment({ isPaid, price, requiresPayment })) return 'Miễn phí'
  const p = Math.round(Number(price) || 0)
  if (currency === 'USD') return `$${p}`
  return `${p.toLocaleString('vi-VN')} ₫`
}
