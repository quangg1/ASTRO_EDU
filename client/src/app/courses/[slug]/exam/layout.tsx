import type { ReactNode } from 'react'
import { LayoutChromeBoundary } from '@/components/layout/LayoutChromeBoundary'

/** Bài kiểm tra: ẩn header/nav để tập trung; ExamRunner tự có thanh nộp bài. */
export default function CourseExamLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutChromeBoundary options={{ showHeader: false, showMobileNav: false, showStarfield: false }}>
      {children}
    </LayoutChromeBoundary>
  )
}
