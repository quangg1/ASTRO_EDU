import { sanitizeAssistantContent } from './sanitizeAssistantContent'

/**
 * GFM tables need one row per line. LLM/streaming sometimes collapses rows into:
 * `| A | B | |---|---| | r1 | r2 |` — remark-gfm then treats it as plain text.
 */
export function unfoldCollapsedMarkdownTables(text: string): string {
  const s = String(text || '')
  if (!s.includes('|')) return s

  const lines = s.split('\n')
  const out: string[] = []

  for (const line of lines) {
    if (!line.includes('|')) {
      out.push(line)
      continue
    }

    const pipeCount = (line.match(/\|/g) || []).length
    const looksLikeTable =
      line.includes('---') || line.includes(':---') || line.includes('---:') || pipeCount >= 4

    if (!looksLikeTable) {
      out.push(line)
      continue
    }

    // Row boundary = adjacent pipes with only whitespace between (not `| cell |`).
    out.push(line.replace(/\|\s+\|/g, '|\n|'))
  }

  return out.join('\n')
}

/** Chuẩn hóa markdown assistant trước khi render UI. */
export function normalizeAssistantMarkdown(text: string): string {
  const cleaned = sanitizeAssistantContent(text)
  return unfoldCollapsedMarkdownTables(cleaned)
}
