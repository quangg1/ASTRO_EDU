/**
 * Schema chuẩn: Course → Module → Node (concept) → Beginner | Explorer | Researcher
 *
 * - 3 tầng là **local trong từng Node** (3 tầng độ sâu của *cùng một concept*).
 * - KHÔNG phải cây global: Module → Beginner / Explorer / Researcher cho cả khóa.
 * - Một Node = một khái niệm; `levels` = ba mức hiểu (không phải 3 bài không liên quan).
 * - Không bắt buộc mọi Node đều đủ 3 tầng — chỉ khai báo key có nội dung.
 *
 * DB/UI: docs/TUTORIAL_CURRICULUM_SCHEMA.md — Tutorial một slug + `depthLevels` trên document.
 */

/** Lớp độ sâu hiểu (cùng một concept) */
export type DepthLevel = 'beginner' | 'explorer' | 'researcher'

/** Nội dung một tầng — có thể map sang section HTML/markdown hoặc tutorialSlug phụ */
export type ConceptDepthContent = {
  /** Tiêu đề ngắn tầng (tuỳ chọn — mặc định dùng label level) */
  headline?: string
  /** Mô tả 1–2 dòng */
  summary?: string
  /** Bullet hoặc đoạn — app render (markdown) */
  body?: string
  /** Gợi ý asset: ảnh minh họa trên CDN */
  heroImage?: string
  /** Nếu tách riêng bài legacy theo slug (tùy pipeline) */
  tutorialSlug?: string
}

/**
 * Một Node = một khái niệm.
 * `levels` chỉ chứa key cho những tầng thực sự có — không ép đủ 3.
 */
export type ConceptNode = {
  id: string
  /** Tên concept (EN hoặc song ngữ tùy sản phẩm) */
  title: string
  titleVi?: string
  description?: string
  order: number
  /** Các tầng có mặt; thiếu key = không có nội dung tầng đó */
  levels: Partial<Record<DepthLevel, ConceptDepthContent>>
  /**
   * true: phải “hoàn thành” tầng trước trong cùng node để mở tầng sau (Beginner → Explorer → Researcher).
   * false/undefined: mọi tầng có sẵn (hoặc chỉ ẩn tab không có content).
   */
  depthProgression?: boolean
  /** Tag tìm kiếm / gắn 3D journey sau này */
  tags?: string[]
}

export type CurriculumModule = {
  id: string
  title: string
  titleVi?: string
  order: number
  nodes: ConceptNode[]
}

export type CourseDefinition = {
  courseId: string
  title: string
  titleVi?: string
  version: number
  modules: CurriculumModule[]
}

const DEPTH_ORDER: DepthLevel[] = ['beginner', 'explorer', 'researcher']

/** Các level có nội dung của node, theo thứ tự sâu dần */
export function getAvailableDepths(node: ConceptNode): DepthLevel[] {
  return DEPTH_ORDER.filter((d) => node.levels[d] != null)
}

/** Level kế tiếp trong progression (nếu có) */
export function getNextDepth(current: DepthLevel, node: ConceptNode): DepthLevel | null {
  const avail = getAvailableDepths(node)
  const i = avail.indexOf(current)
  if (i < 0 || i >= avail.length - 1) return null
  return avail[i + 1] ?? null
}

/** Gợi ý tab mặc định theo profile người học */
export function suggestDefaultDepth(
  node: ConceptNode,
  profile: 'new' | 'intermediate' | 'advanced'
): DepthLevel | null {
  const avail = getAvailableDepths(node)
  if (avail.length === 0) return null
  if (profile === 'new') return avail[0] ?? null
  if (profile === 'intermediate') return avail.find((d) => d === 'explorer') ?? avail[0] ?? null
  return avail.find((d) => d === 'researcher') ?? avail[avail.length - 1] ?? null
}

/** Label hiển thị tab */
export const DEPTH_LABELS: Record<DepthLevel, { vi: string; en: string }> = {
  beginner: { vi: 'Beginner', en: 'Beginner' },
  explorer: { vi: 'Explorer', en: 'Explorer' },
  researcher: { vi: 'Researcher', en: 'Researcher' },
}
