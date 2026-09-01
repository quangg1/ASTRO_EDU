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

/** Tour ngắn (2–3 bước) — tránh chồng với panel learning / CTA sticky. */
export function buildExploreTourSteps(ctx: ExploreTourContext): ExploreTourStep[] {
  const compact: ExploreTourStep[] = [
    {
      id: 'welcome',
      title: 'Khám phá 3D',
      body: 'Chọn một thiên thể, đọc panel bên trái, rồi dùng nút “Học bài liên quan” / “Tiếp tục lộ trình” góc dưới để quay về Learning Path.',
      placement: 'center',
    },
    {
      id: 'scene-controls',
      title: 'Điều khiển camera',
      body: 'Kéo để xoay · cuộn để zoom. Danh mục góc trên giúp chọn thiên thể nếu quỹ đạo khó bấm.',
      anchor: EXPLORE_TOUR_ANCHOR.scene,
      placement: 'bottom',
    },
  ]

  if (ctx.hasLessonLinks) {
    compact.push({
      id: 'panel-lessons',
      title: 'Nối sang lộ trình',
      body: 'Link bài học trên panel mở Learning Path. Nút sticky phía dưới luôn dẫn về bước tiếp theo trên lộ trình.',
      anchor: EXPLORE_TOUR_ANCHOR.panelLessons,
      placement: 'right',
      optionalAnchor: true,
    })
  }

  if (ctx.hasDeepHistory) {
    compact.push({
      id: 'deep-history',
      title: 'Lịch sử sâu',
      body: 'Một số hành tinh có timeline Deep History — mở khi bạn muốn đi sâu hơn sau bài học nền.',
      anchor: EXPLORE_TOUR_ANCHOR.deepHistory,
      placement: 'right',
      optionalAnchor: true,
      when: (c) => c.hasDeepHistory,
    })
  }

  return compact.filter((s) => !s.when || s.when(ctx))
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
