/**
 * Hành trình chu du: mỗi chặng đến một hành tinh có các milestone khám phá (vệ tinh, vành đai, tinh vân…).
 * Mọi đường dẫn media dùng path tương đối CDN — resolve bằng resolveMediaUrl() / getStaticAssetUrl().
 */

import { planetsData } from '@/lib/solarSystemData'

/** Loại nội dung milestone (ảnh hưởng UI sau này). */
export type JourneyMilestoneKind = 'article' | 'observation' | 'quiz'

/**
 * Media cho milestone — lưu trên cloud (S3/CloudFront).
 * Chỉ điền field khi đã upload; app resolve URL qua NEXT_PUBLIC_MEDIA_CDN.
 */
export type JourneyMilestoneMedia = {
  /** Ảnh bìa / hero (webp/jpg), path CDN ví dụ: /journey/milestones/mer-in-01/hero.webp */
  heroImage?: string
  /** Ảnh thumbnail list */
  posterImage?: string
  /** Model GLB/GLTF (tùy milestone) */
  modelGlbUrl?: string
  /** Giọng đọc / ambient (mp3/ogg) */
  audioUrl?: string
}

export type JourneyMilestone = {
  id: string
  title: string
  titleVi: string
  summaryVi: string
  order: number
  kind: JourneyMilestoneKind
  media?: JourneyMilestoneMedia
}

export type JourneyLeg = {
  id: string
  /** null = xuất phát từ vùng neo / hướng vào trong */
  fromPlanetIndex: number | null
  toPlanetIndex: number
  titleVi: string
  milestones: JourneyMilestone[]
}

function planetName(i: number) {
  return planetsData[i]?.name ?? `Planet ${i}`
}

/**
 * Chặng đến hành tinh `toPlanetIndex`:
 * - 0: từ neo nội → Mercury
 * - k>0: từ hành tinh k-1 → k
 */
export const solarJourneyLegs: JourneyLeg[] = [
  {
    id: 'leg-sun-mercury',
    fromPlanetIndex: null,
    toPlanetIndex: 0,
    titleVi: 'Vào vùng nội hệ — hướng tới Sao Thủy',
    milestones: [
      {
        id: 'm-mer-in-01',
        title: 'Inner solar wind',
        titleVi: 'Gió Mặt Trời vùng trong',
        summaryVi:
          'Plasma và từ trường Mặt Trời mạnh gần đó — nền cho hiểu sao bề mặt Sao Thủy bị xói mòn từ lâu.',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-mer-in-02',
        title: 'Mercury approach',
        titleVi: 'Tiếp cận một thế giới chết',
        summaryVi:
          'Sao Thủy không khí mỏng, nhiệt độ dao động cực đoan giữa ngày và đêm — gợi ý vì sao khó giữ nước.',
        order: 2,
        kind: 'observation',
      },
    ],
  },
  {
    id: 'leg-mercury-venus',
    fromPlanetIndex: 0,
    toPlanetIndex: 1,
    titleVi: `${planetName(0)} → ${planetName(1)}`,
    milestones: [
      {
        id: 'm-ve-01',
        title: 'Transition zone',
        titleVi: 'Vùng chuyển tiếp đá — khí',
        summaryVi:
          'Giữa hai hành tinh đá: quỹ đạo giao với vành đai tiểu hành tinh (góc nhìn học tập).',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-ve-02',
        title: 'Venus shroud',
        titleVi: 'Sao Kim trong màn mây',
        summaryVi:
          'Áp suất bề mặt và hiệu ứng nhà kính — so sánh với Trái Đất.',
        order: 2,
        kind: 'article',
      },
    ],
  },
  {
    id: 'leg-venus-earth',
    fromPlanetIndex: 1,
    toPlanetIndex: 2,
    titleVi: `${planetName(1)} → ${planetName(2)}`,
    milestones: [
      {
        id: 'm-ea-01',
        title: 'Moon formation context',
        titleVi: 'Bối cảnh Mặt Trăng',
        summaryVi:
          'Mặt Trăng ổn định thủy triều và trục tự quay — “mốc” quan trọng cho sự sống (mức giới thiệu).',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-ea-02',
        title: 'Blue marble',
        titleVi: 'Điểm xanh trong vũ trụ',
        summaryVi:
          'Nước lỏng và khí quyển — tại sao Trái Đất là điểm tham chiếu cho tìm kiếm hành tinh đất thứ hai.',
        order: 2,
        kind: 'observation',
      },
    ],
  },
  {
    id: 'leg-earth-mars',
    fromPlanetIndex: 2,
    toPlanetIndex: 3,
    titleVi: `${planetName(2)} → ${planetName(3)}`,
    milestones: [
      {
        id: 'm-ma-01',
        title: 'Mars transfer',
        titleVi: 'Chuyển quỹ tới Sao Hỏa',
        summaryVi:
          'Cửa sổ phóng Hohmann (ý niệm) — tiết kiệm nhiên liệu giữa hai hành tinh lân cận.',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-ma-02',
        title: 'Moons of Mars',
        titleVi: 'Hai vệ tinh nhỏ',
        summaryVi:
          'Phobos và Deimos — vệ tinh bất thường, gợi ý va chạm hoặc bắt giữ sau này.',
        order: 2,
        kind: 'observation',
      },
    ],
  },
  {
    id: 'leg-mars-jupiter',
    fromPlanetIndex: 3,
    toPlanetIndex: 4,
    titleVi: `${planetName(3)} → ${planetName(4)}`,
    milestones: [
      {
        id: 'm-ju-01',
        title: 'Asteroid belt',
        titleVi: 'Vành đai tiểu hành tinh',
        summaryVi:
          'Mảnh vỡ không hợp thành hành tinh — Ceres và các thiên thể lớn như mốc phân loại.',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-ju-02',
        title: 'Jupiter system',
        titleVi: 'Hệ Sao Mộc',
        summaryVi:
          'Các vệ tinh Galileo như “hệ thế giới thu nhỏ” — Europa, Ganymede, Callisto, Io.',
        order: 2,
        kind: 'observation',
      },
    ],
  },
  {
    id: 'leg-jupiter-saturn',
    fromPlanetIndex: 4,
    toPlanetIndex: 5,
    titleVi: `${planetName(4)} → ${planetName(5)}`,
    milestones: [
      {
        id: 'm-sa-01',
        title: 'Outer giants',
        titleVi: 'Đại gió khí',
        summaryVi:
          'Khí hydro/helium chi phối — nền cho hiểu vòng vành đai và vệ tinh băng.',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-sa-02',
        title: 'Saturn rings',
        titleVi: 'Vành Sao Thổ',
        summaryVi:
          'Băng và đá trong các vành mỏng — quan sát từ Cassini (ý niệm sứ mệnh).',
        order: 2,
        kind: 'observation',
      },
    ],
  },
  {
    id: 'leg-saturn-uranus',
    fromPlanetIndex: 5,
    toPlanetIndex: 6,
    titleVi: `${planetName(5)} → ${planetName(6)}`,
    milestones: [
      {
        id: 'm-ur-01',
        title: 'Ice giants',
        titleVi: 'Đại vương tinh băng',
        summaryVi:
          'Thành phần “băng” (H₂O, NH₃, CH₄) nhiều hơn — khác với Sao Mộc/Sao Thổ.',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-ur-02',
        title: 'Axial tilt',
        titleVi: 'Trục nghiêng cực đoan',
        summaryVi:
          'Sao Thiên Vương lăn “nghiêng” — gợi ý va chạm lịch sử.',
        order: 2,
        kind: 'observation',
      },
    ],
  },
  {
    id: 'leg-uranus-neptune',
    fromPlanetIndex: 6,
    toPlanetIndex: 7,
    titleVi: `${planetName(6)} → ${planetName(7)}`,
    milestones: [
      {
        id: 'm-ne-01',
        title: 'Deep space',
        titleVi: 'Rìa hệ Mặt Trời',
        summaryVi:
          'Gió Mặt Trời yếu, quỹ đạo chậm — bối cảnh cho Sao Hải Vương và vành Kuiper (giới thiệu).',
        order: 1,
        kind: 'article',
      },
      {
        id: 'm-ne-02',
        title: 'Neptune winds',
        titleVi: 'Gió mạnh nhất',
        summaryVi:
          'Đám mây methane và bão lớn — kết thúc “tám hành tinh chính” trước vùng Kuiper.',
        order: 2,
        kind: 'observation',
      },
    ],
  },
]

export function getLegArrivingAtPlanet(toPlanetIndex: number): JourneyLeg | undefined {
  return solarJourneyLegs.find((l) => l.toPlanetIndex === toPlanetIndex)
}

export function getMilestoneById(id: string): JourneyMilestone | undefined {
  for (const leg of solarJourneyLegs) {
    const m = leg.milestones.find((x) => x.id === id)
    if (m) return m
  }
  return undefined
}
