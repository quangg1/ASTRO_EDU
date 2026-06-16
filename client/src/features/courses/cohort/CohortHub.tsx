'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Home, BookOpen, MessagesSquare } from 'lucide-react'
import { fetchCohortHome, type CohortHomeData } from '@/features/courses/api/cohortApi'
import { CohortHomePanel } from '@/features/courses/cohort/CohortHomePanel'
import { CohortSyllabusPanel } from '@/features/courses/cohort/CohortSyllabusPanel'
import { CohortDiscussionPanel } from '@/features/courses/cohort/CohortDiscussionPanel'
import { Button } from '@/design-system'

type HubTab = 'home' | 'syllabus' | 'discussion'

const TABS: { id: HubTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Trang lớp', icon: Home },
  { id: 'syllabus', label: 'Chương trình', icon: BookOpen },
  { id: 'discussion', label: 'Thảo luận', icon: MessagesSquare },
]

export function CohortHub({ courseSlug, cohortId }: { courseSlug: string; cohortId: string }) {
  const [tab, setTab] = useState<HubTab>('home')
  const [data, setData] = useState<CohortHomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadedKeyRef = useRef('')

  useEffect(() => {
    const key = `${courseSlug}:${cohortId}`
    if (loadedKeyRef.current === key) return
    loadedKeyRef.current = key
    setError(null)
    void fetchCohortHome(courseSlug, cohortId).then((res) => {
      if (res.success && res.data) {
        setData(res.data)
        setError(null)
      } else setError(res.error || 'Không tải được lớp học')
    })
  }, [courseSlug, cohortId])

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto space-y-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-ds-muted">
          Chưa vào được lớp này. Đăng ký trên trang khóa học — chọn lớp đang mở đăng ký.
        </p>
        <Link href={`/courses/${courseSlug}`}>
          <Button type="button" variant="secondary">
            Chọn lớp / đăng ký
          </Button>
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-ds-muted animate-pulse">Đang tải lớp học…</p>
      </div>
    )
  }

  const { cohort, course } = data

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/25 via-transparent to-transparent">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <header className="space-y-1">
          <Link href={`/courses/${course.slug}`} className="text-xs text-cyan-400/90 hover:text-ds-text">
            ← {course.title}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{cohort.title}</h1>
          <p className="text-sm text-ds-muted">Lớp có giáo viên · {cohort.timezone || 'Asia/Ho_Chi_Minh'}</p>
        </header>

        <nav
          className="flex gap-1 p-1 rounded-xl bg-ds-elevated/80 border border-ds-border/80 backdrop-blur-sm"
          aria-label="Các mục lớp học"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-ds-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
              <span className="hidden xs:inline sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        {tab === 'home' && <CohortHomePanel courseSlug={courseSlug} cohortId={cohortId} data={data} />}
        {tab === 'syllabus' && (
          <CohortSyllabusPanel
            courseSlug={courseSlug}
            cohortId={cohortId}
            data={data}
            completedSlugs={data.completedLessonSlugs}
          />
        )}
        {tab === 'discussion' && <CohortDiscussionPanel courseSlug={courseSlug} cohortId={cohortId} />}
      </div>
    </div>
  )
}
