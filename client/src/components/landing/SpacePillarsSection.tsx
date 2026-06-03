'use client'

import { SpaceAccordionPillars, type SpacePillar } from '@/components/space-premium'

const PILLARS: SpacePillar[] = [
  {
    id: 'path',
    title: 'Lộ trình 6 module',
    body: 'Từ quy mô vũ trụ đến vũ trụ học — mỗi chủ đề có ba tầng Beginner, Explorer, Researcher. Tiến độ lưu theo từng bài học.',
    href: '/tutorial',
    ctaLabel: 'Mở lộ trình',
  },
  {
    id: 'explore',
    title: 'Khám phá 3D tương tác',
    body: 'Bay quanh Hệ Mặt Trời, đọc bảng tri thức, làm quiz ngữ cảnh và nhận gem khi khám phá thiên thể mới.',
    href: '/explore',
    ctaLabel: 'Vào Explore',
  },
  {
    id: 'courses',
    title: 'Khóa học & cohort',
    body: 'Khóa có giảng viên, bài tập và lịch khai giảng — song song với lộ trình tự học miễn phí.',
    href: '/courses',
    ctaLabel: 'Xem khóa học',
  },
  {
    id: 'learn',
    title: 'Chương trình học không gian',
    body: 'Chúng tôi giúp bạn hiểu mọi thứ cần thiết để đọc bầu trời, dùng kính thiên văn và nối kiến thức với mô phỏng 3D.',
    href: '/tutorial',
    ctaLabel: 'Bắt đầu học',
  },
]

export function SpacePillarsSection() {
  return (
    <div id="pillars" className="space-premium" style={{ background: 'var(--sp-bg)' }}>
      <SpaceAccordionPillars sectionTitle="Về Cosmo Learn" pillars={PILLARS} defaultActiveId="learn" />
    </div>
  )
}
