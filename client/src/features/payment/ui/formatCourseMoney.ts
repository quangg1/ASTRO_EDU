export function formatCourseMoney(n: number, currency: string) {
  if (currency === 'USD') return `$${n}`
  return `${n.toLocaleString('vi-VN')} ₫`
}
