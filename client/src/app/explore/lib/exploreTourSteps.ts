export type ExploreTourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type ExploreTourStep = {
  id: string
  title: string
  body: string
  /** `data-explore-tour` value, or `cosmo-fab` for Cosmo widget. */
  anchor?: string
  placement?: ExploreTourPlacement
  /** Still show copy when anchor missing (e.g. deep history on comets). */
  optionalAnchor?: boolean
  /** Hide unless context matches. */
  when?: (ctx: ExploreTourContext) => boolean
}

export type ExploreTourContext = {
  sceneMode: 'showcase' | 'earth' | 'planet-history'
  hasDeepHistory: boolean
  hasLessonLinks: boolean
  loggedIn: boolean
}

export const EXPLORE_TOUR_ANCHOR = {
  scene: 'explore-scene-canvas',
  panel: 'explore-panel',
  panelTabs: 'explore-panel-tabs',
  learningSteps: 'explore-learning-steps',
  conceptChips: 'explore-concept-chips',
  panelLessons: 'explore-panel-lessons',
  catalog: 'explore-catalog-btn',
  progress: 'explore-progress-strip',
  quizZone: 'explore-quiz-zone',
  deepHistory: 'explore-deep-history',
} as const

export function buildExploreTourSteps(ctx: ExploreTourContext): ExploreTourStep[] {
  const all: ExploreTourStep[] = [
    {
      id: 'welcome',
      title: 'Chào mừng Khám phá 3D',
      body: 'Đây là hệ Mặt Trời tương tác — đọc, làm quiz nhỏ, mở bài trên lộ trình và hỏi Cosmo. Tour này chỉ mất vài phút.',
      placement: 'center',
    },
    {
      id: 'scene-controls',
      title: 'Điều khiển camera',
      body: 'Kéo chuột trái để xoay; cuộn để zoom. Tiến gần bề mặt hoặc lùi ra toàn cảnh hệ Mặt Trời.',
      anchor: EXPLORE_TOUR_ANCHOR.scene,
      placement: 'bottom',
    },
    {
      id: 'scene-select',
      title: 'Chọn thiên thể',
      body: 'Click hành tinh / mặt trăng trên quỹ đạo 3D, hoặc dùng Danh mục góc trên nếu quỹ đạo khó bấm.',
      anchor: EXPLORE_TOUR_ANCHOR.scene,
      placement: 'bottom',
    },
    {
      id: 'panel',
      title: 'Panel bên trái',
      body: 'Mỗi thiên thể có tên, mô tả và khối nội dung do đội nội dung soạn — đây là “bài đọc” trên Explore.',
      anchor: EXPLORE_TOUR_ANCHOR.panel,
      placement: 'right',
    },
    {
      id: 'panel-tabs',
      title: 'Ba tab nội dung',
      body: 'Tổng quan · Vật lý · Bầu trời. Tab Bầu trời thường chứa link sang bài học trên lộ trình của bạn.',
      anchor: EXPLORE_TOUR_ANCHOR.panelTabs,
      placement: 'right',
    },
    {
      id: 'learning-steps',
      title: 'Bước học',
      body: 'Checklist: đọc panel → quiz ngữ cảnh → bài lộ trình → hỏi Cosmo. Bước đang làm được highlight.',
      anchor: EXPLORE_TOUR_ANCHOR.learningSteps,
      placement: 'right',
    },
    {
      id: 'concept-chips',
      title: 'Khái niệm & mastery',
      body: 'Mỗi chip hiện % nắm / “Cần ôn”. Bấm chip để làm quiz concept, mở bài LP, hoặc hỏi Cosmo.',
      anchor: EXPLORE_TOUR_ANCHOR.conceptChips,
      placement: 'right',
      optionalAnchor: true,
    },
    {
      id: 'panel-lessons',
      title: 'Bài trên lộ trình',
      body: 'Cuối panel hoặc tab Bầu trời: bấm tên bài để sang tutorial. Footer hiển thị số bài gắn với thiên thể đang chọn.',
      anchor: EXPLORE_TOUR_ANCHOR.panelLessons,
      placement: 'right',
      when: (c) => c.hasLessonLinks,
      optionalAnchor: true,
    },
    {
      id: 'catalog',
      title: 'Danh mục',
      body: 'Mở cây thực thể (hành tinh, sao chổi, tàu…) khi bạn muốn nhảy nhanh mà không cần click trên 3D.',
      anchor: EXPLORE_TOUR_ANCHOR.catalog,
      placement: 'bottom',
    },
    {
      id: 'quiz',
      title: 'Quiz ngữ cảnh',
      body: 'Dừng vài giây trên một thiên thể — popup góc phải hỏi 1–2 câu. Trả lời đúng hết (khi đăng nhập) để ghi tiến độ và nhận gem.',
      anchor: EXPLORE_TOUR_ANCHOR.quizZone,
      placement: 'left',
    },
    {
      id: 'progress',
      title: 'Tiến độ & Gem',
      body: 'Thanh trên: Tiến độ X/Y = số bài đã hoàn thành quiz cho thiên thể này. Gem (khi đăng nhập) là phần thưởng khám phá.',
      anchor: EXPLORE_TOUR_ANCHOR.progress,
      placement: 'bottom',
      when: (c) => c.loggedIn || c.hasLessonLinks,
      optionalAnchor: true,
    },
    {
      id: 'deep-history',
      title: 'Lịch sử sâu',
      body: 'Với hành tinh có timeline (vd. Trái Đất): mở chế độ giai đoạn + hóa thạch. Quay lại Showcase bằng nút trên header.',
      anchor: EXPLORE_TOUR_ANCHOR.deepHistory,
      placement: 'right',
      when: (c) => c.hasDeepHistory,
      optionalAnchor: true,
    },
    {
      id: 'cosmo',
      title: 'Hỏi Cosmo',
      body: 'Nút trợ lý góc màn hình — hỏi về thiên thể đang xem. Cosmo biết bạn đang ở trang Khám phá.',
      anchor: 'cosmo-fab',
      placement: 'left',
      optionalAnchor: true,
    },
    {
      id: 'finish',
      title: 'Luồng học gợi ý',
      body: 'Chọn thiên thể → đọc panel → làm quiz → mở bài LP / Lịch sử sâu → hỏi Cosmo khi kẹt. Bấm “Hướng dẫn” trên thanh trên để xem lại tour.',
      placement: 'center',
    },
  ]

  return all.filter((s) => !s.when || s.when(ctx))
}

/** Steps when user is not in showcase (earth / deep history). */
export const EXPLORE_TOUR_ALT_MODE_STEPS: ExploreTourStep[] = [
  {
    id: 'alt-mode',
    title: 'Chế độ khác Showcase',
    body: 'Tour chi tiết dành cho chế độ Hệ Mặt Trời (Showcase). Quay lại Showcase để xem đủ bước panel, quiz và danh mục.',
    placement: 'center',
  },
]
