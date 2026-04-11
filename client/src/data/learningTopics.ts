/**
 * Chủ đề landing ↔ lộ trình (Dual mapping: node.topicWeights.topicId).
 * Slug ổn định — đừng đổi để không gãy URL /topics/[slug].
 */
export type LearningTopic = {
  id: string
  labelVi: string
  label: string
  /** Gợi ý SEO / mô tả ngắn */
  descriptionVi: string
}

export const LEARNING_TOPICS: LearningTopic[] = [
  {
    id: 'solar-system',
    labelVi: 'Hệ Mặt Trời',
    label: 'Solar System',
    descriptionVi: 'Mặt Trời, hành tinh, quỹ đạo và hình thành hệ hành tinh.',
  },
  {
    id: 'stars-constellations',
    labelVi: 'Ngôi sao & Chòm sao',
    label: 'Stars & Constellations',
    descriptionVi: 'Vòng đời sao, biểu đồ HR, tàn dư sao.',
  },
  {
    id: 'exoplanets',
    labelVi: 'Hành tinh ngoài',
    label: 'Exoplanets',
    descriptionVi: 'Phát hiện và đặc trưng hành tinh ngoài hệ.',
  },
  {
    id: 'astrophysics',
    labelVi: 'Vật lý thiên thể',
    label: 'Astrophysics',
    descriptionVi: 'Ánh sáng, phổ, vật lý vũ trụ học.',
  },
  {
    id: 'space-exploration',
    labelVi: 'Khám phá không gian',
    label: 'Space exploration',
    descriptionVi: 'Nhiệm vụ, thiên thạch, thám hiểm hệ Mặt Trời.',
  },
  {
    id: 'galaxies-nebulae',
    labelVi: 'Thiên hà & Tinh vân',
    label: 'Galaxies & nebulae',
    descriptionVi: 'Cấu trúc thiên hà, vũ trụ học.',
  },
  {
    id: 'stargazing',
    labelVi: 'Quan sát bầu trời',
    label: 'Stargazing',
    descriptionVi: 'Bầu trời, thời gian thiên văn, tọa độ.',
  },
  {
    id: 'telescopes',
    labelVi: 'Kính thiên văn',
    label: 'Telescopes',
    descriptionVi: 'Dụng cụ quan sát và đa bước sóng.',
  },
]

export function getTopicBySlug(slug: string): LearningTopic | undefined {
  return LEARNING_TOPICS.find((t) => t.id === slug)
}

export function isValidTopicSlug(slug: string): boolean {
  return LEARNING_TOPICS.some((t) => t.id === slug)
}
