import type { LessonSection, SectionType } from '@/features/courses/api/coursesApi'

const TYPE_LABEL_VI: Record<SectionType, string> = {
  richtext: 'Nội dung',
  text: 'Văn bản',
  image: 'Hình ảnh',
  gif: 'Ảnh động',
  video: 'Video',
  code: 'Mã',
  math: 'Công thức',
  chart: 'Biểu đồ',
  slider: 'Thanh trượt',
  embed: 'Nhúng',
  observable: 'Notebook',
  '3d': 'Mô hình 3D',
  callout: 'Ghi chú',
  divider: '',
}

export type LessonSectionTocNavItem = {
  idx: number
  id: string
  title: string
  type: SectionType | string
  sectionLevel: 'main' | 'sub'
}

export type LessonSectionTocGroup = {
  parent: LessonSectionTocNavItem
  children: LessonSectionTocNavItem[]
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstHeadingFromHtml(html: string): string {
  const m = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)
  if (!m?.[1]) return ''
  return stripHtml(m[1])
}

function excerptText(raw: string, max = 72): string {
  const t = stripHtml(raw)
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

function firstLine(raw: string | undefined): string {
  if (!raw?.trim()) return ''
  return raw.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || ''
}

function fallbackLabel(index: number, style: 'muc' | 'phan' | 'block'): string {
  const n = index + 1
  if (style === 'phan') return `Phần ${n}`
  if (style === 'block') return `Block ${n}`
  return `Mục ${n}`
}

/**
 * TOC label for a lesson block — matches Course lesson UX:
 * explicit block title → heading/summary in content → type label → numbered fallback.
 */
export function resolveLessonSectionTocTitle(
  section: LessonSection,
  index: number,
  options?: { fallbackStyle?: 'muc' | 'phan' | 'block' },
): string | null {
  if (section.type === 'divider') return null

  const explicit = section.title?.trim()
  if (explicit) return explicit

  const fallbackStyle = options?.fallbackStyle ?? 'muc'
  const numbered = () => fallbackLabel(index, fallbackStyle)

  switch (section.type) {
    case 'richtext': {
      const html = section.html || section.content || ''
      return firstHeadingFromHtml(html) || excerptText(html) || numbered()
    }
    case 'text':
      return section.summary?.trim() || firstLine(section.content) || numbered()
    case 'image':
    case 'gif':
      return section.caption?.trim() || TYPE_LABEL_VI[section.type]
    case 'video':
      return section.caption?.trim() || TYPE_LABEL_VI.video
    case 'callout':
      return excerptText(section.content || section.html || '') || TYPE_LABEL_VI.callout
    default:
      return TYPE_LABEL_VI[section.type] || numbered()
  }
}

export function buildLessonSectionTocNavItems(
  sections: LessonSection[],
  options?: { idPrefix?: string; fallbackStyle?: 'muc' | 'phan' | 'block' },
): LessonSectionTocNavItem[] {
  const idPrefix = options?.idPrefix ?? 'lesson-section'
  const items: LessonSectionTocNavItem[] = []
  sections.forEach((sec, idx) => {
    const title = resolveLessonSectionTocTitle(sec, idx, options)
    if (!title) return
    items.push({
      idx,
      id: `${idPrefix}-${idx}`,
      title,
      type: sec.type,
      sectionLevel: sec.sectionLevel ?? 'main',
    })
  })
  return items
}

/** Group TOC rows: `sub` blocks nest under the previous `main` parent. */
export function groupLessonSectionTocItems(items: LessonSectionTocNavItem[]): LessonSectionTocGroup[] {
  const groups: LessonSectionTocGroup[] = []
  let lastParent = -1
  for (const item of items) {
    if (item.sectionLevel === 'sub' && lastParent >= 0) {
      groups[lastParent].children.push(item)
      continue
    }
    groups.push({ parent: item, children: [] })
    lastParent = groups.length - 1
  }
  return groups
}
