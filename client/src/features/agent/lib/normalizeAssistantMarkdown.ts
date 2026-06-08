import { sanitizeAssistantContent } from './sanitizeAssistantContent'

function lineLooksLikeMarkdownTable(line: string): boolean {
  if (!line.includes('|')) return false
  const pipeCount = (line.match(/\|/g) || []).length
  return line.includes('---') || line.includes(':---') || line.includes('---:') || pipeCount >= 4
}

/**
 * LLM often prefixes a title on the same line as the header row:
 * `Tiêu đề kỷ ... | Cột A | Cột B |` — GFM requires the row to start with `|`.
 */
export function peelTitleBeforeMarkdownTable(line: string): string {
  const trimmedStart = line.trimStart()
  if (trimmedStart.startsWith('|') || !lineLooksLikeMarkdownTable(line)) return line

  const firstPipe = line.indexOf('|')
  if (firstPipe <= 0) return line

  const title = line.slice(0, firstPipe).trim()
  const tablePart = line.slice(firstPipe).trim()
  if (!title || !tablePart) return line

  return `${title}\n\n${tablePart}`
}

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

    if (!lineLooksLikeMarkdownTable(line)) {
      out.push(line)
      continue
    }

    let row = peelTitleBeforeMarkdownTable(line)
    if (row.includes('\n\n')) {
      out.push(...row.split('\n'))
      continue
    }

    // `||` or `| |` between rows — split onto separate lines.
    row = row.replace(/\|{2,}/g, '|\n|')
    row = row.replace(/\|\s+\|/g, '|\n|')
    out.push(...row.split('\n'))
  }

  return out.join('\n')
}

/** Chuẩn hóa markdown assistant trước khi render UI. */
export function normalizeAssistantMarkdown(text: string): string {
  const cleaned = sanitizeAssistantContent(text)
  return unfoldCollapsedMarkdownTables(cleaned)
}
