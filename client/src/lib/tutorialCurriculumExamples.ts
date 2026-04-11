/**
 * Ví dụ cố định — “Ngày và đêm” — minh họa schema Node + 3 tầng (cùng một concept).
 * Dùng trong Storybook / dev hoặc seed tham chiếu.
 */

import type { CourseDefinition } from '@/lib/tutorialCurriculumSchema'

export const EXAMPLE_COURSE_DAY_NIGHT: CourseDefinition = {
  courseId: 'astro-foundations-v1',
  title: 'Astronomy foundations',
  titleVi: 'Nền tảng thiên văn',
  version: 1,
  modules: [
    {
      id: 'mod-earth-sky',
      title: 'Earth & sky',
      titleVi: 'Trái Đất & bầu trời',
      order: 1,
      nodes: [
        {
          id: 'node-day-night',
          title: 'Day and night',
          titleVi: 'Ngày và đêm',
          description: 'Cùng một hiện tượng — ba mức hiểu.',
          order: 1,
          depthProgression: true,
          tags: ['earth', 'rotation', 'diurnal'],
          levels: {
            beginner: {
              headline: 'Trực giác',
              summary: 'Trái Đất quay → có ngày và đêm.',
              body:
                '- Mặt Trời chiếu một phía Trái Đất → phía đó là **ngày**.\n- Phía sau là **đêm**.\n- Minh họa: quả đất quay quanh trục (ảnh/video).',
            },
            explorer: {
              headline: 'Thêm ngữ cảnh',
              summary: 'Trục nghiêng và mùa liên quan thế nào.',
              body:
                '- Trục quay Trái Đất **nghiêng** so với mặt phẳng quỹ đạo.\n- Độ nghiêng + vị trí trên quỹ đạo → biến đổi độ cao Mặt Trời theo mùa (liên kết bài mùa).',
            },
            researcher: {
              headline: 'Định lượng & khung tham chiếu',
              summary: 'Góc quay, hệ quy chiếu, sai số đo thời gian.',
              body:
                '- Tốc độ góc quay sidereal vs solar day.\n- **Reference frame**: ITRS / GCRS — khi nào dùng góc giờ Mặt Trời vs sao.\n- Sai số: leap second, chiều dài ngày không đều (Equation of Time) — giới thiệu ngắn.',
            },
          },
        },
      ],
    },
  ],
}
