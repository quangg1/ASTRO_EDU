import { formatOrderAmount } from '@/lib/money'

export function formatCourseMoney(n: number, currency: string) {
  return formatOrderAmount(n, currency)
}
