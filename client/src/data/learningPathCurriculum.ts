/**
 * Learning Path — mỗi Node có 3 tầng; mỗi tầng là danh sách bài học (LessonItem), mỗi bài có id ổn định.
 * Nội dung bài: **sections** (cùng block kit với Course — LessonSection).
 */

import type { LessonSection } from '@/lib/coursesApi'

export type DepthLevel = 'beginner' | 'explorer' | 'researcher'

export const DEPTH_ORDER: DepthLevel[] = ['beginner', 'explorer', 'researcher']

export const DEPTH_META: Record<
  DepthLevel,
  { label: string; labelVi: string; short: string; color: string; gradient: string }
> = {
  beginner: {
    label: 'Beginner',
    labelVi: 'Cơ bản',
    short: '🟢',
    color: 'text-emerald-300',
    gradient: 'from-emerald-500/30 to-cyan-500/20',
  },
  explorer: {
    label: 'Explorer',
    labelVi: 'Cơ chế',
    short: '🔵',
    color: 'text-sky-300',
    gradient: 'from-sky-500/30 to-blue-500/20',
  },
  researcher: {
    label: 'Researcher',
    labelVi: 'Sâu',
    short: '🔴',
    color: 'text-violet-300',
    gradient: 'from-violet-500/30 to-fuchsia-500/20',
  },
}

/** Cụm trong nội dung bài map tới concept (do giáo viên gắn trong Studio). */
export type LessonConceptAnchor = {
  conceptId: string
  phrase: string
}

/** Câu hỏi trắc nghiệm cuối bài (mastery) — biên tập trong Studio. */
export type LessonRecallQuizItem = {
  id?: string
  question: string
  options: string[]
  correctIndex: number
  /** Giải thích theo từng phương án (A-D), gồm cả lý do đúng/sai. */
  optionExplanations?: string[]
}

export type LessonItem = {
  id: string
  titleVi: string
  title: string
  /** Danh sách concept key (vd: scientific_method, orbit, moon_phases) */
  conceptIds?: string[]
  /** Highlight + link theo cụm văn bản cụ thể (ưu tiên hơn auto keyword). */
  conceptAnchors?: LessonConceptAnchor[]
  /** 3–5 câu kiểm tra nhanh; nếu thiếu, client sinh câu từ concept gắn bài. */
  recallQuiz?: LessonRecallQuizItem[]
  /** Block content — cùng schema với khóa học (richtext, image, video, …) */
  sections?: LessonSection[]
  /** Legacy: HTML đơn nếu chưa có sections (hoặc ghi đè từ API cũ) */
  body?: string
}

/** Map node → chủ đề landing (Dual mapping). weight: 0–1, tổng không cần = 1. */
export type TopicWeight = { topicId: string; weight: number }

/** Concept = "link + data + logic" (kiểu wiki nâng cấp). */
export type LearningConcept = {
  id: string
  title: string
  short_description: string
  explanation: string
  examples: string[]
  related: string[]
  /** Taxonomy: ngành lớn (vd: astronomy, geology, biology). */
  domain?: string
  /** Taxonomy: nhóm con trong domain (vd: orbital-mechanics). */
  subdomain?: string
  /** Biến thể từ khóa / đồng nghĩa để search map nhanh hơn. */
  aliases?: string[]
  /** Concept cần biết trước khi học concept này. */
  prerequisites?: string[]
  /** Khi sync từ API Mongo. */
  published?: boolean
}

export type LearningNode = {
  id: string
  title: string
  titleVi: string
  depths: Record<DepthLevel, LessonItem[]>
  /** Gắn với /topics/[slug] — chỉnh trong Learning Path Studio */
  topicWeights?: TopicWeight[]
}

export type LearningModule = {
  id: string
  order: number
  title: string
  titleVi: string
  emoji: string
  goal: string
  goalVi: string
  nodes: LearningNode[]
  connections: string[]
}

/** Tạo id dạng moduleId__nodeId__depth__index — dùng cho URL & DB */
export function makeDepthLessons(
  moduleId: string,
  nodeId: string,
  depth: DepthLevel,
  items: { titleVi: string; title?: string }[],
): LessonItem[] {
  return items.map((it, i) => ({
    id: `${moduleId}__${nodeId}__${depth}__${i}`,
    titleVi: it.titleVi,
    title: it.title ?? '',
    conceptIds: [],
    sections: [],
    body: '',
  }))
}

/** Slug an toàn cho id module/node (Studio tạo mới). */
function slugPart(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 36) || 'item'
  )
}

/** Id module mới (duy nhất trong collection). */
export function generateNewModuleId(titleHint?: string): string {
  const base = slugPart(titleHint || 'module')
  return `${base}-${Math.random().toString(36).slice(2, 9)}`
}

/** Id node mới, gắn prefix moduleId để tránh trùng giữa các module. */
export function generateNewNodeId(moduleId: string, titleHint?: string): string {
  const base = slugPart(titleHint || 'topic')
  return `${moduleId}__${base}-${Math.random().toString(36).slice(2, 8)}`
}

/** Id bài học mới (hậu tố ngẫu nhiên — ổn định URL, không phụ thuộc chỉ số khi xóa giữa chừng). */
export function newLessonId(moduleId: string, nodeId: string, depth: DepthLevel): string {
  return `${moduleId}__${nodeId}__${depth}__${Math.random().toString(36).slice(2, 12)}`
}

export function createEmptyLessonItem(
  moduleId: string,
  nodeId: string,
  depth: DepthLevel,
  titleVi = 'Bài mới',
): LessonItem {
  return {
    id: newLessonId(moduleId, nodeId, depth),
    titleVi,
    title: '',
    conceptIds: [],
    sections: [],
    body: '',
  }
}

export function createEmptyNode(moduleId: string, titleVi = 'Chủ đề mới'): LearningNode {
  const id = generateNewNodeId(moduleId, titleVi)
  return {
    id,
    title: '',
    titleVi,
    depths: { beginner: [], explorer: [], researcher: [] },
    topicWeights: [],
  }
}

/**
 * Module trống cho Studio: 1 chủ đề + 1 bài Cơ bản để có thể soạn ngay.
 * Có thể thêm node/bài khác sau.
 */
export function createEmptyModule(order: number): LearningModule {
  const id = generateNewModuleId('module-moi')
  const node = createEmptyNode(id, 'Chủ đề đầu tiên')
  node.depths.beginner = [createEmptyLessonItem(id, node.id, 'beginner', 'Bài đầu tiên')]
  return {
    id,
    order,
    title: '',
    titleVi: 'Module mới',
    emoji: '📘',
    goal: '',
    goalVi: '',
    nodes: [node],
    connections: [],
  }
}

/** Sau khi xóa module, gán lại order 1..n theo thứ tự hiện tại. */
export function renumberModuleOrders(modules: LearningModule[]): LearningModule[] {
  return [...modules].sort((a, b) => a.order - b.order).map((m, i) => ({ ...m, order: i + 1 }))
}

/**
 * Bản sao module với id module / node / lesson mới (tránh trùng URL & DB).
 * Giữ nội dung bài (sections, conceptIds, …).
 */
export function duplicateLearningModule(src: LearningModule): LearningModule {
  const mid = generateNewModuleId(src.titleVi || 'module')
  const nodes: LearningNode[] = (src.nodes || []).map((n) => {
    const nid = generateNewNodeId(mid, n.titleVi || 'node')
    const depths = {
      beginner: [] as LessonItem[],
      explorer: [] as LessonItem[],
      researcher: [] as LessonItem[],
    }
    for (const d of DEPTH_ORDER) {
      depths[d] = (n.depths[d] ?? []).map((lesson) => ({
        ...lesson,
        id: newLessonId(mid, nid, d),
      }))
    }
    return {
      ...n,
      id: nid,
      depths,
    }
  })
  const titleSuffix = ' (bản sao)'
  const titleVi = (src.titleVi || '').trim() ? `${src.titleVi}${titleSuffix}` : `Module mới${titleSuffix}`
  return {
    ...src,
    id: mid,
    titleVi,
    title: src.title,
    order: src.order,
    nodes,
    connections: Array.isArray(src.connections) ? [...src.connections] : [],
  }
}

/** Đổi chỗ hai module theo chỉ số trong danh sách đã sort theo order. */
export function reorderModuleOrderList(
  modules: LearningModule[],
  fromIndex: number,
  toIndex: number,
): LearningModule[] {
  const sorted = [...modules].sort((a, b) => a.order - b.order)
  if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) {
    return modules
  }
  if (fromIndex === toIndex) return modules
  const next = [...sorted]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return renumberModuleOrders(next)
}

/** Di chuyển module một bước lên / xuống. */
export function moveModuleStep(modules: LearningModule[], moduleId: string, dir: -1 | 1): LearningModule[] {
  const sorted = [...modules].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((m) => m.id === moduleId)
  if (idx < 0) return modules
  const to = idx + dir
  if (to < 0 || to >= sorted.length) return modules
  return reorderModuleOrderList(modules, idx, to)
}

/** Kéo thả: đặt module draggedId vào vị trí của dropTargetId. */
export function reorderModulesDragDrop(
  modules: LearningModule[],
  draggedId: string,
  dropTargetId: string,
): LearningModule[] {
  if (draggedId === dropTargetId) return modules
  const sorted = [...modules].sort((a, b) => a.order - b.order)
  const fromIdx = sorted.findIndex((m) => m.id === draggedId)
  const toIdx = sorted.findIndex((m) => m.id === dropTargetId)
  if (fromIdx < 0 || toIdx < 0) return modules
  return reorderModuleOrderList(modules, fromIdx, toIdx)
}

/** Chèn một module đã clone (duplicateLearningModule) ngay sau afterModuleId. */
export function insertModuleCloneAfter(
  modules: LearningModule[],
  afterModuleId: string,
  clone: LearningModule,
): LearningModule[] {
  const sorted = [...modules].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((m) => m.id === afterModuleId)
  if (idx < 0) return modules
  const next = [...sorted]
  next.splice(idx + 1, 0, clone)
  return renumberModuleOrders(next)
}

export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'intro-scale',
    order: 1,
    title: 'Introduction & Scale',
    titleVi: 'Giới thiệu & Quy mô',
    emoji: '🌌',
    goal: 'Understand what the universe is and how vast it is.',
    goalVi: 'Hiểu “vũ trụ là gì và lớn đến đâu”.',
    connections: ['→ Module 6 (Cosmology)'],
    nodes: [
      {
        id: 'astronomy-what-is',
        title: 'What is Astronomy?',
        titleVi: 'Astronomy là gì',
        depths: {
          beginner: makeDepthLessons('intro-scale', 'astronomy-what-is', 'beginner', [
            { titleVi: 'Thiên văn học vs chiêm tinh' },
            { titleVi: 'Các nhánh cơ bản của thiên văn học' },
          ]),
          explorer: makeDepthLessons('intro-scale', 'astronomy-what-is', 'explorer', [
            { titleVi: 'Observation vs Theory' },
            { titleVi: 'Data-driven science' },
          ]),
          researcher: makeDepthLessons('intro-scale', 'astronomy-what-is', 'researcher', [
            { titleVi: 'Model uncertainty' },
            { titleVi: 'Bias trong quan sát' },
          ]),
        },
      },
      {
        id: 'universe-scale',
        title: 'Scale of the universe',
        titleVi: 'Quy mô vũ trụ',
        depths: {
          beginner: makeDepthLessons('intro-scale', 'universe-scale', 'beginner', [
            { titleVi: 'Earth → Sun → Galaxy — trực giác thứ bậc khoảng cách' },
          ]),
          explorer: makeDepthLessons('intro-scale', 'universe-scale', 'explorer', [
            { titleVi: 'AU, light-year, parsec — khi nào dùng đơn vị nào' },
          ]),
          researcher: makeDepthLessons('intro-scale', 'universe-scale', 'researcher', [
            { titleVi: 'Log scale' },
            { titleVi: 'Fermi estimation — ước lượng đúng thứ tự độ lớn' },
          ]),
        },
      },
      {
        id: 'hierarchical-structure',
        title: 'Hierarchical structure',
        titleVi: 'Cấu trúc phân cấp',
        depths: {
          beginner: makeDepthLessons('intro-scale', 'hierarchical-structure', 'beginner', [
            { titleVi: 'Hành tinh → sao → thiên hà' },
          ]),
          explorer: makeDepthLessons('intro-scale', 'hierarchical-structure', 'explorer', [
            { titleVi: 'Galaxy cluster — thiên hà không đứng một mình' },
          ]),
          researcher: makeDepthLessons('intro-scale', 'hierarchical-structure', 'researcher', [
            { titleVi: 'Cosmic web — cấu trúc xốp của vũ trụ quy mô lớn' },
          ]),
        },
      },
    ],
  },
  {
    id: 'sky-motion',
    order: 2,
    title: 'Sky & Motion',
    titleVi: 'Bầu trời & Chuyển động',
    emoji: '🌍',
    goal: 'Understand the sky from Earth’s perspective.',
    goalVi: 'Hiểu bầu trời từ góc nhìn Trái Đất.',
    connections: ['→ Module 4 (Solar System)', '→ Module 3 (Observation)'],
    nodes: [
      {
        id: 'day-night',
        title: 'Day & night',
        titleVi: 'Ngày & đêm',
        depths: {
          beginner: makeDepthLessons('sky-motion', 'day-night', 'beginner', [
            { titleVi: 'Trái Đất quay → ngày và đêm' },
          ]),
          explorer: makeDepthLessons('sky-motion', 'day-night', 'explorer', [
            { titleVi: 'Trục nghiêng và mùa (liên hệ ngắn)' },
          ]),
          researcher: makeDepthLessons('sky-motion', 'day-night', 'researcher', [
            { titleVi: 'Reference frame — ITRS / GCRS, sidereal vs solar day' },
          ]),
        },
      },
      {
        id: 'moon-phases',
        title: 'Moon phases',
        titleVi: 'Pha Mặt Trăng',
        depths: {
          beginner: makeDepthLessons('sky-motion', 'moon-phases', 'beginner', [
            { titleVi: 'Trăng non / trăng tròn — nhận diện pha' },
          ]),
          explorer: makeDepthLessons('sky-motion', 'moon-phases', 'explorer', [
            { titleVi: 'Vị trí Sun–Earth–Moon quyết định pha' },
          ]),
          researcher: makeDepthLessons('sky-motion', 'moon-phases', 'researcher', [
            { titleVi: 'Mô hình hình học — góc pha và khoảng cách' },
          ]),
        },
      },
      {
        id: 'eclipses',
        title: 'Solar & lunar eclipses',
        titleVi: 'Nhật thực / Nguyệt thực',
        depths: {
          beginner: makeDepthLessons('sky-motion', 'eclipses', 'beginner', [
            { titleVi: 'Hiện tượng — khi nào thấy gì' },
          ]),
          explorer: makeDepthLessons('sky-motion', 'eclipses', 'explorer', [
            { titleVi: 'Điều kiện để xảy ra (đồng hàng, node)' },
          ]),
          researcher: makeDepthLessons('sky-motion', 'eclipses', 'researcher', [
            { titleVi: 'Shadow geometry — umbra, penumbra, saros (giới thiệu)' },
          ]),
        },
      },
      {
        id: 'coordinate-systems',
        title: 'Astronomical coordinates',
        titleVi: 'Hệ tọa độ thiên văn',
        depths: {
          beginner: makeDepthLessons('sky-motion', 'coordinate-systems', 'beginner', [
            { titleVi: 'Alt–az — độ cao & phương vị' },
          ]),
          explorer: makeDepthLessons('sky-motion', 'coordinate-systems', 'explorer', [
            { titleVi: 'RA–Dec — mặt trời xích đạo' },
          ]),
          researcher: makeDepthLessons('sky-motion', 'coordinate-systems', 'researcher', [
            { titleVi: 'Chuyển đổi giữa các hệ — ma trận rotation' },
          ]),
        },
      },
      {
        id: 'astronomical-time',
        title: 'Astronomical time',
        titleVi: 'Thời gian thiên văn',
        depths: {
          beginner: makeDepthLessons('sky-motion', 'astronomical-time', 'beginner', [
            { titleVi: 'Ngày thường — Mặt Trời lên/xuống' },
          ]),
          explorer: makeDepthLessons('sky-motion', 'astronomical-time', 'explorer', [
            { titleVi: 'Ngày sao vs ngày Mặt Trời' },
          ]),
          researcher: makeDepthLessons('sky-motion', 'astronomical-time', 'researcher', [
            { titleVi: 'Time standard — UTC, leap second, equation of time (ý niệm)' },
          ]),
        },
      },
    ],
  },
  {
    id: 'light-observation',
    order: 3,
    title: 'Light & Observation',
    titleVi: 'Ánh sáng & Quan sát',
    emoji: '🔭',
    goal: 'How we “read” the universe.',
    goalVi: 'Hiểu cách con người “đọc” vũ trụ.',
    connections: ['→ Module 6 (Cosmology — redshift)', '→ Module 5 (Stars)'],
    nodes: [
      {
        id: 'what-is-light',
        title: 'What is light?',
        titleVi: 'Ánh sáng là gì',
        depths: {
          beginner: makeDepthLessons('light-observation', 'what-is-light', 'beginner', [
            { titleVi: 'Sóng — bước sóng, màu' },
          ]),
          explorer: makeDepthLessons('light-observation', 'what-is-light', 'explorer', [
            { titleVi: 'Photon — năng lượng & momentum' },
          ]),
          researcher: makeDepthLessons('light-observation', 'what-is-light', 'researcher', [
            { titleVi: 'Dual nature — thí nghiệm gợi ý sóng–hạt' },
          ]),
        },
      },
      {
        id: 'spectrum',
        title: 'Spectrum',
        titleVi: 'Quang phổ',
        depths: {
          beginner: makeDepthLessons('light-observation', 'spectrum', 'beginner', [
            { titleVi: 'Màu sắc — phổ liên tục' },
          ]),
          explorer: makeDepthLessons('light-observation', 'spectrum', 'explorer', [
            { titleVi: 'Phát xạ / hấp thụ — vạch phổ' },
          ]),
          researcher: makeDepthLessons('light-observation', 'spectrum', 'researcher', [
            { titleVi: 'Phân tích vạch phổ — nguyên tố, vận tốc' },
          ]),
        },
      },
      {
        id: 'doppler',
        title: 'Doppler effect',
        titleVi: 'Hiệu ứng Doppler',
        depths: {
          beginner: makeDepthLessons('light-observation', 'doppler', 'beginner', [
            { titleVi: 'Ví dụ âm thanh — qua xe cứu thương' },
          ]),
          explorer: makeDepthLessons('light-observation', 'doppler', 'explorer', [
            { titleVi: 'Redshift / blueshift trong thiên văn' },
          ]),
          researcher: makeDepthLessons('light-observation', 'doppler', 'researcher', [
            { titleVi: 'Relativistic Doppler — khi v ~ c' },
          ]),
        },
      },
      {
        id: 'telescopes',
        title: 'Telescopes',
        titleVi: 'Kính thiên văn',
        depths: {
          beginner: makeDepthLessons('light-observation', 'telescopes', 'beginner', [
            { titleVi: 'Thu thập thêm ánh sáng — nhìn xa hơn' },
          ]),
          explorer: makeDepthLessons('light-observation', 'telescopes', 'explorer', [
            { titleVi: 'Độ phân giải — Rayleigh' },
          ]),
          researcher: makeDepthLessons('light-observation', 'telescopes', 'researcher', [
            { titleVi: 'Interferometry — ghép nhiều kính' },
          ]),
        },
      },
      {
        id: 'multi-wavelength',
        title: 'Multi-wavelength observing',
        titleVi: 'Quan sát đa bước sóng',
        depths: {
          beginner: makeDepthLessons('light-observation', 'multi-wavelength', 'beginner', [
            { titleVi: 'Radio / X-ray / quang — mỗi kênh một câu chuyện' },
          ]),
          explorer: makeDepthLessons('light-observation', 'multi-wavelength', 'explorer', [
            { titleVi: 'Tại sao cần nhiều loại — bụi, nhiệt độ' },
          ]),
          researcher: makeDepthLessons('light-observation', 'multi-wavelength', 'researcher', [
            { titleVi: 'Atmospheric window — chỗ nào quan sát được từ mặt đất' },
          ]),
        },
      },
    ],
  },
  {
    id: 'solar-system',
    order: 4,
    title: 'Solar System',
    titleVi: 'Hệ Mặt Trời',
    emoji: '☀️',
    goal: 'Our nearest cosmic neighbourhood.',
    goalVi: 'Hiểu hệ gần nhất với chúng ta.',
    connections: ['→ Module 5 (Stars)'],
    nodes: [
      {
        id: 'the-sun',
        title: 'The Sun',
        titleVi: 'Mặt Trời',
        depths: {
          beginner: makeDepthLessons('solar-system', 'the-sun', 'beginner', [
            { titleVi: 'Nguồn sáng & nhiệt cho Hệ Mặt Trời' },
          ]),
          explorer: makeDepthLessons('solar-system', 'the-sun', 'explorer', [
            { titleVi: 'Cấu trúc lớp — lõi, bức xạ, đối lưu' },
          ]),
          researcher: makeDepthLessons('solar-system', 'the-sun', 'researcher', [
            { titleVi: 'Fusion — proton–proton, cân bằng thủy tĩnh' },
          ]),
        },
      },
      {
        id: 'planets',
        title: 'Planets',
        titleVi: 'Hành tinh',
        depths: {
          beginner: makeDepthLessons('solar-system', 'planets', 'beginner', [
            { titleVi: '8 hành tinh — thứ tự và nhóm' },
          ]),
          explorer: makeDepthLessons('solar-system', 'planets', 'explorer', [
            { titleVi: 'Rocky / gas giant / ice giant' },
          ]),
          researcher: makeDepthLessons('solar-system', 'planets', 'researcher', [
            { titleVi: 'Formation models — accretion, migration (ý niệm)' },
          ]),
        },
      },
      {
        id: 'orbits',
        title: 'Orbits',
        titleVi: 'Quỹ đạo',
        depths: {
          beginner: makeDepthLessons('solar-system', 'orbits', 'beginner', [
            { titleVi: 'Chuyển động quanh Mặt Trời' },
          ]),
          explorer: makeDepthLessons('solar-system', 'orbits', 'explorer', [
            { titleVi: 'Ellipse — Kepler' },
          ]),
          researcher: makeDepthLessons('solar-system', 'orbits', 'researcher', [
            { titleVi: 'N-body problem — hỗn loạn nhẹ, resonance' },
          ]),
        },
      },
      {
        id: 'small-bodies',
        title: 'Small bodies',
        titleVi: 'Vật thể nhỏ',
        depths: {
          beginner: makeDepthLessons('solar-system', 'small-bodies', 'beginner', [
            { titleVi: 'Sao chổi / tiểu hành tinh — khác nhau thế nào' },
          ]),
          explorer: makeDepthLessons('solar-system', 'small-bodies', 'explorer', [
            { titleVi: 'Vành đai Kuiper — Pluto & bạn' },
          ]),
          researcher: makeDepthLessons('solar-system', 'small-bodies', 'researcher', [
            { titleVi: 'Mô hình đám mây Oort — nguồn sao chổi dài chu kỳ' },
          ]),
        },
      },
      {
        id: 'solar-system-formation',
        title: 'Formation of the Solar System',
        titleVi: 'Hình thành hệ Mặt Trời',
        depths: {
          beginner: makeDepthLessons('solar-system', 'solar-system-formation', 'beginner', [
            { titleVi: 'Từ đám mây khí — trực giác' },
          ]),
          explorer: makeDepthLessons('solar-system', 'solar-system-formation', 'explorer', [
            { titleVi: 'Accretion disk — gom khối lượng' },
          ]),
          researcher: makeDepthLessons('solar-system', 'solar-system-formation', 'researcher', [
            { titleVi: 'Angular momentum problem — hướng giải thích' },
          ]),
        },
      },
    ],
  },
  {
    id: 'stars-evolution',
    order: 5,
    title: 'Stars & Evolution',
    titleVi: 'Sao & Tiến hóa',
    emoji: '⭐',
    goal: 'The engines of the universe.',
    goalVi: 'Hiểu “động cơ” của vũ trụ.',
    connections: ['→ Module 6 (Galaxy & Universe)'],
    nodes: [
      {
        id: 'what-is-a-star',
        title: 'What is a star?',
        titleVi: 'Sao là gì',
        depths: {
          beginner: makeDepthLessons('stars-evolution', 'what-is-a-star', 'beginner', [
            { titleVi: 'Quả cầu khí nóng — phát sáng' },
          ]),
          explorer: makeDepthLessons('stars-evolution', 'what-is-a-star', 'explorer', [
            { titleVi: 'Khối lượng, nhiệt độ, độ sáng liên hệ' },
          ]),
          researcher: makeDepthLessons('stars-evolution', 'what-is-a-star', 'researcher', [
            { titleVi: 'Hydrostatic equilibrium — cân bằng áp suất vs hấp dẫn' },
          ]),
        },
      },
      {
        id: 'stellar-energy',
        title: 'Stellar energy',
        titleVi: 'Năng lượng sao',
        depths: {
          beginner: makeDepthLessons('stars-evolution', 'stellar-energy', 'beginner', [
            { titleVi: 'Sao “cháy” bằng fusion — trực giác' },
          ]),
          explorer: makeDepthLessons('stars-evolution', 'stellar-energy', 'explorer', [
            { titleVi: 'Vai trò fusion — vùng lõi' },
          ]),
          researcher: makeDepthLessons('stars-evolution', 'stellar-energy', 'researcher', [
            { titleVi: 'Proton–proton chain / CNO — điều kiện nhiệt độ' },
          ]),
        },
      },
      {
        id: 'hr-diagram',
        title: 'H–R diagram',
        titleVi: 'Biểu đồ H–R',
        depths: {
          beginner: makeDepthLessons('stars-evolution', 'hr-diagram', 'beginner', [
            { titleVi: 'Màu vs độ sáng — nhóm sao' },
          ]),
          explorer: makeDepthLessons('stars-evolution', 'hr-diagram', 'explorer', [
            { titleVi: 'Phân loại sao — dãy chính, khổng lồ' },
          ]),
          researcher: makeDepthLessons('stars-evolution', 'hr-diagram', 'researcher', [
            { titleVi: 'Stellar modeling — đường đẳng thế' },
          ]),
        },
      },
      {
        id: 'stellar-lifecycle',
        title: 'Stellar lifecycle',
        titleVi: 'Vòng đời sao',
        depths: {
          beginner: makeDepthLessons('stars-evolution', 'stellar-lifecycle', 'beginner', [
            { titleVi: 'Sinh → già → chết — câu chuyện' },
          ]),
          explorer: makeDepthLessons('stars-evolution', 'stellar-lifecycle', 'explorer', [
            { titleVi: 'Red giant — lõi He, vỏ H' },
          ]),
          researcher: makeDepthLessons('stars-evolution', 'stellar-lifecycle', 'researcher', [
            { titleVi: 'Stellar evolution equations — ý niệm' },
          ]),
        },
      },
      {
        id: 'stellar-remnants',
        title: 'Stellar endpoints',
        titleVi: 'Kết thúc sao',
        depths: {
          beginner: makeDepthLessons('stars-evolution', 'stellar-remnants', 'beginner', [
            { titleVi: 'Lùn trắng — lõi còn lại' },
          ]),
          explorer: makeDepthLessons('stars-evolution', 'stellar-remnants', 'explorer', [
            { titleVi: 'Sao neutron — vật chất siêu đặc' },
          ]),
          researcher: makeDepthLessons('stars-evolution', 'stellar-remnants', 'researcher', [
            { titleVi: 'Vật lý lỗ đen — horizon, singularity (giới thiệu)' },
          ]),
        },
      },
    ],
  },
  {
    id: 'universe-cosmology',
    order: 6,
    title: 'Universe & Cosmology',
    titleVi: 'Vũ trụ & Vũ trụ học',
    emoji: '🌌',
    goal: 'The universe at the largest scales.',
    goalVi: 'Hiểu vũ trụ ở quy mô lớn nhất.',
    connections: [],
    nodes: [
      {
        id: 'galaxies',
        title: 'Galaxies',
        titleVi: 'Thiên hà',
        depths: {
          beginner: makeDepthLessons('universe-cosmology', 'galaxies', 'beginner', [
            { titleVi: 'Tập hợp sao + khí + bụi' },
          ]),
          explorer: makeDepthLessons('universe-cosmology', 'galaxies', 'explorer', [
            { titleVi: 'Xoắn ốc / elip — hình dạng' },
          ]),
          researcher: makeDepthLessons('universe-cosmology', 'galaxies', 'researcher', [
            { titleVi: 'Dark matter halo — quay mép sao' },
          ]),
        },
      },
      {
        id: 'big-bang',
        title: 'Big Bang',
        titleVi: 'Big Bang',
        depths: {
          beginner: makeDepthLessons('universe-cosmology', 'big-bang', 'beginner', [
            { titleVi: 'Vũ trụ bắt đầu từ trạng thái nóng, đặc' },
          ]),
          explorer: makeDepthLessons('universe-cosmology', 'big-bang', 'explorer', [
            { titleVi: 'Timeline — hạt nhân nguyên thủy, CMB (ý niệm)' },
          ]),
          researcher: makeDepthLessons('universe-cosmology', 'big-bang', 'researcher', [
            { titleVi: 'Inflation — giải quyết thống nhất/thẳng (ý niệm)' },
          ]),
        },
      },
      {
        id: 'expansion',
        title: 'Expansion of the universe',
        titleVi: 'Giãn nở vũ trụ',
        depths: {
          beginner: makeDepthLessons('universe-cosmology', 'expansion', 'beginner', [
            { titleVi: 'Vũ trụ “lớn dần” — khoảng cách tăng' },
          ]),
          explorer: makeDepthLessons('universe-cosmology', 'expansion', 'explorer', [
            { titleVi: 'Định luật Hubble — v ~ d' },
          ]),
          researcher: makeDepthLessons('universe-cosmology', 'expansion', 'researcher', [
            { titleVi: 'Metric expansion — FLRW (ý niệm)' },
          ]),
        },
      },
      {
        id: 'dark-matter',
        title: 'Dark matter',
        titleVi: 'Vật chất tối',
        depths: {
          beginner: makeDepthLessons('universe-cosmology', 'dark-matter', 'beginner', [
            { titleVi: 'Không phát sáng nhưng có hấp dẫn' },
          ]),
          explorer: makeDepthLessons('universe-cosmology', 'dark-matter', 'explorer', [
            { titleVi: 'Bằng chứng — quay thiên hà, thấu kính' },
          ]),
          researcher: makeDepthLessons('universe-cosmology', 'dark-matter', 'researcher', [
            { titleVi: 'Particle models — WIMP, axion (tổng quan)' },
          ]),
        },
      },
      {
        id: 'dark-energy',
        title: 'Dark energy',
        titleVi: 'Năng lượng tối',
        depths: {
          beginner: makeDepthLessons('universe-cosmology', 'dark-energy', 'beginner', [
            { titleVi: 'Làm vũ trụ giãn nhanh dần' },
          ]),
          explorer: makeDepthLessons('universe-cosmology', 'dark-energy', 'explorer', [
            { titleVi: 'Quan sát — supernovae Ia' },
          ]),
          researcher: makeDepthLessons('universe-cosmology', 'dark-energy', 'researcher', [
            { titleVi: 'Hằng số vũ trụ — ΛCDM' },
          ]),
        },
      },
      {
        id: 'fate-of-universe',
        title: 'Fate of the universe',
        titleVi: 'Số phận vũ trụ',
        depths: {
          beginner: makeDepthLessons('universe-cosmology', 'fate-of-universe', 'beginner', [
            { titleVi: 'Kết thúc — nhiệt độ, giãn nở' },
          ]),
          explorer: makeDepthLessons('universe-cosmology', 'fate-of-universe', 'explorer', [
            { titleVi: 'Kịch bản — Big Rip / Big Freeze (ý niệm)' },
          ]),
          researcher: makeDepthLessons('universe-cosmology', 'fate-of-universe', 'researcher', [
            { titleVi: 'Thermodynamics — entropy, heat death (ý niệm)' },
          ]),
        },
      },
    ],
  },
]

/** Concept mặc định cục bộ (fallback nếu API chưa có). */
export const LEARNING_CONCEPTS: LearningConcept[] = []

export function getModuleById(id: string): LearningModule | undefined {
  return LEARNING_MODULES.find((m) => m.id === id)
}

export function getNodeByIds(moduleId: string, nodeId: string): LearningNode | undefined {
  return getModuleById(moduleId)?.nodes.find((n) => n.id === nodeId)
}

export function countNodes(): number {
  return LEARNING_MODULES.reduce((acc, m) => acc + m.nodes.length, 0)
}

export function countLessonSlots(): number {
  let n = 0
  for (const m of LEARNING_MODULES) {
    for (const node of m.nodes) {
      for (const d of DEPTH_ORDER) {
        n += node.depths[d]?.length ?? 0
      }
    }
  }
  return n
}

/** @deprecated dùng countLessonSlots */
export function countDepthSlots(): number {
  return countLessonSlots()
}

export function flattenLessons(modules: LearningModule[]) {
  const flat: Array<{
    moduleId: string
    nodeId: string
    depth: DepthLevel
    lesson: LessonItem
  }> = []
  for (const m of modules) {
    for (const node of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const lesson of node.depths[d] ?? []) {
          flat.push({ moduleId: m.id, nodeId: node.id, depth: d, lesson })
        }
      }
    }
  }
  return flat
}

export function getLessonById(
  lessonId: string,
  modules: LearningModule[] = LEARNING_MODULES,
): { module: LearningModule; node: LearningNode; depth: DepthLevel; lesson: LessonItem } | undefined {
  for (const m of modules) {
    for (const node of m.nodes) {
      for (const d of DEPTH_ORDER) {
        const found = (node.depths[d] ?? []).find((l) => l.id === lessonId)
        if (found) return { module: m, node, depth: d, lesson: found }
      }
    }
  }
  return undefined
}

export function getLessonNeighbors(lessonId: string, modules: LearningModule[] = LEARNING_MODULES) {
  const flat = flattenLessons(modules)
  const idx = flat.findIndex((x) => x.lesson.id === lessonId)
  if (idx < 0) return { prev: null as (typeof flat)[0] | null, next: null as (typeof flat)[0] | null }
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  }
}

/** Láng giềng theo node (chủ đề), không phải theo bài */
export function getLearningPathNeighbors(
  moduleId: string,
  nodeId: string,
  modules: LearningModule[] = LEARNING_MODULES,
): {
  prev: { moduleId: string; nodeId: string; titleVi: string } | null
  next: { moduleId: string; nodeId: string; titleVi: string } | null
} {
  const flat: { moduleId: string; node: LearningNode }[] = []
  for (const m of modules) {
    for (const node of m.nodes) {
      flat.push({ moduleId: m.id, node })
    }
  }
  const idx = flat.findIndex((x) => x.moduleId === moduleId && x.node.id === nodeId)
  if (idx < 0) return { prev: null, next: null }
  const prev = idx > 0 ? flat[idx - 1] : null
  const next = idx < flat.length - 1 ? flat[idx + 1] : null
  return {
    prev: prev
      ? { moduleId: prev.moduleId, nodeId: prev.node.id, titleVi: prev.node.titleVi }
      : null,
    next: next
      ? { moduleId: next.moduleId, nodeId: next.node.id, titleVi: next.node.titleVi }
      : null,
  }
}

/** Gộp dữ liệu từ API (ưu tiên title/body từ server) */
export function mergeLearningModules(
  base: LearningModule[],
  incoming: LearningModule[] | null | undefined,
): LearningModule[] {
  if (!incoming?.length) return base
  const byLesson = new Map<string, LessonItem>()
  for (const m of incoming) {
    for (const n of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const le of n.depths[d] ?? []) {
          byLesson.set(le.id, le)
        }
      }
    }
  }
  return base.map((m) => {
    const mIn = incoming.find((x) => x.id === m.id)
    if (!mIn) return m
    return {
      ...m,
      nodes: m.nodes.map((n) => {
        const nIn = mIn.nodes.find((x) => x.id === n.id)
        if (!nIn) return n
        const depths = { ...n.depths } as Record<DepthLevel, LessonItem[]>
        for (const d of DEPTH_ORDER) {
          depths[d] = (n.depths[d] ?? []).map((lesson) => {
            const ov = (nIn.depths[d] ?? []).find((l) => l.id === lesson.id)
            if (!ov) return lesson
            return {
              ...lesson,
              titleVi: ov.titleVi || lesson.titleVi,
              title: ov.title ?? lesson.title,
              conceptIds: Array.isArray(ov.conceptIds) ? ov.conceptIds : lesson.conceptIds,
              conceptAnchors: Array.isArray(ov.conceptAnchors)
                ? ov.conceptAnchors
                : lesson.conceptAnchors,
              body: ov.body ?? lesson.body,
              sections:
                ov.sections !== undefined && ov.sections !== null
                  ? ov.sections
                  : lesson.sections,
            }
          })
        }
        return { ...n, depths }
      }),
    }
  })
}
