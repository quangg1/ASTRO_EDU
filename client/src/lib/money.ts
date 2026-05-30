/** Hiển thị & cộng doanh thu báo cáo (VND); đơn hàng vẫn hiển thị đúng USD/VND gốc. */

export function getUsdToVndRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_USD_TO_VND_RATE)
  return Number.isFinite(raw) && raw > 0 ? raw : 25000
}

export function toVnd(amount: number, currency: string): number {
  const n = Number(amount) || 0
  if (String(currency || 'VND').toUpperCase() === 'USD') {
    return Math.round(n * getUsdToVndRate())
  }
  return Math.round(n)
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`
}

/** Giá trên UI đơn / checkout — giữ USD cho học viên quốc tế */
export function formatOrderAmount(amount: number, currency: string): string {
  if (String(currency || 'VND').toUpperCase() === 'USD') {
    return `$${Number(amount).toFixed(2)}`
  }
  return formatVnd(amount)
}

export function sumCompletedOrdersVnd(
  orders: { amount: number; currency: string; status?: string }[],
): number {
  return orders
    .filter((o) => !o.status || o.status === 'completed')
    .reduce((sum, o) => sum + toVnd(o.amount, o.currency), 0)
}
