/**
 * Parse API response body as JSON; surface a clear Vietnamese error when the
 * server returns HTML (wrong base URL, 404 page, etc.).
 */
export function parseApiJsonBody<T>(raw: string): T {
  const t = raw.trimStart()
  if (t.startsWith('<!DOCTYPE') || t.startsWith('<html')) {
    throw new Error(
      'Không tải được dữ liệu. Vui lòng thử lại sau.',
    )
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error('Phản hồi từ máy chủ không phải JSON hợp lệ.')
  }
}

export async function readApiResponseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  return parseApiJsonBody<T>(text)
}
