import { userMessages } from '@/lib/userMessages'

/** Nội dung có thể là lỗi nội bộ — không đưa thẳng ra UI. */
const INTERNAL_HINT =
  /NEXT_PUBLIC_|API_PROXY|EMBEDDING_URL|AI_SERVICE|MEDIA_SERVICE|\.env|localhost|127\.0\.0\.1|VNPAY_|MONGODB|JWT_|MODULE_NOT_FOUND|chưa được cấu hình|FIREBASE_SERVICE|Merchant-hosted|process\.env|\/api\//i

export function forUserFacingError(
  raw: string | null | undefined,
  fallback: string = userMessages.genericError,
): string {
  const text = (raw ?? '').trim()
  if (!text) return fallback
  if (INTERNAL_HINT.test(text)) return fallback
  return text
}
