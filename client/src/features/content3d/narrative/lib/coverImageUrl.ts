/** Chuẩn hóa URL ảnh NASA Photojournal — thử biến thể khi jpeg/404. */
export function narrativeCoverImageCandidates(url: string): string[] {
  const u = String(url || '').trim()
  if (!u) return []
  const out = [u]
  if (u.includes('photojournal.jpl.nasa.gov/jpeg/') && !u.includes('/jpeg-mod/')) {
    out.push(u.replace('/jpeg/', '/jpeg-mod/'))
  }
  if (u.includes('/jpeg-mod/')) {
    out.push(u.replace('/jpeg-mod/', '/jpeg/'))
  }
  return [...new Set(out)]
}
