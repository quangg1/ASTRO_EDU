/** Trích URL ảnh đầu tiên trong chuỗi HTML (RSS/crawl thường nhét <img> trong content). */
export function firstImageSrcFromHtml(html: string | undefined | null): string | null {
  if (!html || typeof html !== 'string') return null
  const m = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/i)
  if (m?.[1]) return m[1].trim()
  const m2 = html.match(/<img[^>]+src\s*=\s*([^\s>]+)[^>]*>/i)
  return m2?.[1]?.replace(/^["']|["']$/g, '').trim() || null
}

export function stripFirstImgTag(html: string): string {
  return html.replace(/<img\b[^>]*>/i, '').trim()
}

/** TipTap / rich text rỗng: chỉ còn thẻ hoặc khoảng trắng. */
export function isHtmlFragmentEmpty(html: string | undefined | null): boolean {
  if (!html?.trim()) return true
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length === 0
}

/** Heuristic: nội dung crawl / rich text HTML. */
export function looksLikeHtml(s: string | undefined | null): boolean {
  if (!s || typeof s !== 'string') return false
  const t = s.trim()
  if (t.startsWith('<') && /<\s*(p|div|article|section|br|img|h[1-6]|ul|ol|li|blockquote|figure)\b/i.test(t)) {
    return true
  }
  return /<\s*p[\s>]|<\s*br\s*\/?\s*>|<\s*img\b/i.test(s)
}

/** Ảnh bìa hiển thị trên card: ưu tiên imageUrl, sau đó <img> trong HTML. */
export function postThumbnailUrl(
  imageUrl: string | null | undefined,
  content: string | undefined | null
): string | null {
  if (imageUrl) return imageUrl
  return firstImageSrcFromHtml(content)
}

/** Tin RSS dạng link-out: href tới bài gốc hoặc trang chi tiết trong app. */
export function newsPostHref(p: {
  _id: string
  sourceUrl?: string | null
  isExternalArticle?: boolean
}): string {
  if (p.isExternalArticle && p.sourceUrl) return p.sourceUrl
  return `/community/post/${p._id}`
}

export function newsPostOpensNewTab(p: {
  sourceUrl?: string | null
  isExternalArticle?: boolean
}): boolean {
  return Boolean(p.isExternalArticle && p.sourceUrl)
}

/** Đoạn xem trước trên card: bỏ thẻ HTML (tin crawl) rồi cắt độ dài. */
export function plainTextExcerpt(raw: string | undefined | null, max = 220): string {
  if (!raw?.trim()) return ''
  let t = raw.trim()
  if (looksLikeHtml(t)) {
    t = t.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    t = t.replace(/<[^>]+>/g, ' ')
  }
  t = t.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}
