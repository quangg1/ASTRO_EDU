import type { LearningConcept } from '@/data/learningPathCurriculum'

export type ConceptAnchorInput = { conceptId: string; phrase: string }

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Chuẩn hóa khoảng trắng / Unicode để khớp cụm với HTML từ TipTap (nbsp, v.v.) */
function normalizeChunk(s: string) {
  return s.replace(/\u00a0/g, ' ').normalize('NFC')
}

/**
 * Gắn highlight vào HTML theo danh sách cụm (conceptAnchors).
 * Chỉ xử lý text giữa thẻ; cụm dài được ưu tiên trước.
 */
export function applyConceptAnchorsToHtml(
  html: string,
  anchors: ConceptAnchorInput[],
  conceptMap: Map<string, LearningConcept>,
): string {
  const valid = anchors
    .map((a) => ({
      conceptId: String(a.conceptId || '').trim(),
      phrase: String(a.phrase || '').trim(),
    }))
    .filter((a) => a.conceptId && a.phrase && conceptMap.has(a.conceptId))
  if (valid.length === 0) return html

  const sorted = [...valid].sort((a, b) => b.phrase.length - a.phrase.length)

  const injectIntoText = (text: string) => {
    const placeholders: { conceptId: string; display: string }[] = []
    let phIdx = 0
    let T = normalizeChunk(text)
    for (const a of sorted) {
      const phraseNorm = normalizeChunk(a.phrase)
      if (!phraseNorm) continue
      const re = new RegExp(escapeRegex(phraseNorm), 'gi')
      T = T.replace(re, (match) => {
        const token = `__LPANCH_${phIdx}__`
        placeholders[phIdx] = { conceptId: a.conceptId, display: match }
        phIdx++
        return token
      })
    }
    let out = T
    for (let j = 0; j < placeholders.length; j++) {
      const token = `__LPANCH_${j}__`
      const p = placeholders[j]
      const btn = `<button type="button" class="lp-concept-inline" data-concept-id="${escapeHtml(p.conceptId)}">${escapeHtml(p.display)}</button>`
      out = out.split(token).join(btn)
    }
    return out
  }

  const chunks = html.split(/(<[^>]+>)/g)
  return chunks
    .map((part) => {
      if (part.startsWith('<') && part.endsWith('>')) return part
      return injectIntoText(part)
    })
    .join('')
}
