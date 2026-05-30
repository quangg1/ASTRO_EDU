'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { CommunityAskButton } from '@/components/community/learning/CommunityAskButton'
import { LessonRelatedQuestions } from '@/components/community/learning/LessonRelatedQuestions'
import { useTutorContextStore } from '@/features/courses/public'
import {
  fetchCourse,
  enrollCourse,
  updateLessonProgress,
  type Course,
  type Lesson,
} from '@/features/courses/public'
import { earthHistoryData, findStageByTime, useCourseStageFossils } from '@/features/content3d/earth/public'
import { FeaturedOrganisms } from '@/features/content3d/earth/ui/FeaturedOrganisms'
import { Loading } from '@/components/ui/Loading'
import { LessonContentBody } from '@/components/courses/LessonContentBody'
import { trackEvent } from '@/lib/analytics'
import { trackCourseBehavior } from '@/features/courses/lib/courseBehavior'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <Loading /> })

function HudBrackets() {
  return (
    <>
      <span className="absolute pointer-events-none" style={{ top: 6, left: 6, width: 12, height: 12, borderTop: '1px solid #7ee7ff', borderLeft: '1px solid #7ee7ff', opacity: 0.5 }} />
      <span className="absolute pointer-events-none" style={{ top: 6, right: 6, width: 12, height: 12, borderTop: '1px solid #7ee7ff', borderRight: '1px solid #7ee7ff', opacity: 0.5 }} />
      <span className="absolute pointer-events-none" style={{ bottom: 6, left: 6, width: 12, height: 12, borderBottom: '1px solid #7ee7ff', borderLeft: '1px solid #7ee7ff', opacity: 0.5 }} />
      <span className="absolute pointer-events-none" style={{ bottom: 6, right: 6, width: 12, height: 12, borderBottom: '1px solid #7ee7ff', borderRight: '1px solid #7ee7ff', opacity: 0.5 }} />
    </>
  )
}

function ModuleSidebar({
  courseModules,
  lessonsByModule,
  progressBySlug,
  selectedLesson,
  onSelectLesson,
}: {
  courseModules: import('@/features/courses/api/coursesApi').CourseModule[]
  lessonsByModule: Record<string, Lesson[]>
  progressBySlug: Map<string, boolean>
  selectedLesson: Lesson | null
  onSelectLesson: (lesson: Lesson) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (selectedLesson?.moduleId) init[selectedLesson.moduleId] = true
    return init
  })

  useEffect(() => {
    if (!selectedLesson?.moduleId) return
    setExpanded((prev) => ({ ...prev, [selectedLesson.moduleId!]: true }))
  }, [selectedLesson?.moduleId])

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  const groups = courseModules.length > 0
    ? courseModules.map((m, mi) => ({
        key: m._id || m.slug,
        label: m.title,
        description: m.description || '',
        icon: m.icon || '',
        index: mi,
        lessons: lessonsByModule[m._id || m.slug] ?? [],
      })).concat(
        (lessonsByModule._unassigned?.length ?? 0) > 0
          ? [{ key: '_unassigned', label: 'Other', description: '', icon: '', index: courseModules.length, lessons: lessonsByModule._unassigned }]
          : []
      )
    : Object.entries(lessonsByModule)
        .sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)))
        .map(([k, ls], i) => ({
          key: k,
          label: k === 'none' ? 'Lessons' : `Module ${k.replace('w-', '')}`,
          description: '',
          icon: '',
          index: i,
          lessons: ls,
        }))

  return (
    <nav className="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto">
      {groups.map((g) => {
        const isOpen = !!expanded[g.key]
        const doneCount = g.lessons.filter((l) => progressBySlug.get(l.slug)).length
        const hasActive = g.lessons.some((l) => l.slug === selectedLesson?.slug)

        return (
          <div
            key={g.key}
            className="hud-chamfer overflow-hidden border"
            style={{ borderColor: hasActive ? 'rgba(126,231,255,0.3)' : 'rgba(126,231,255,0.08)' }}
          >
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="w-full text-left px-3.5 py-3 flex items-center gap-3 transition-all"
              style={{ background: hasActive ? 'rgba(126,231,255,0.06)' : 'transparent' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: hasActive ? '#7ee7ff' : '#5c6886', textTransform: 'uppercase' }}>
                    // {String(g.index + 1).padStart(2, '0')}
                  </span>
                  {doneCount === g.lessons.length && g.lessons.length > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6dffb0' }}>✓ done</span>
                  )}
                </div>
                <p className="text-sm font-medium mt-0.5 truncate" style={{ color: hasActive ? '#eaf6ff' : '#9aa8c4' }}>{g.label}</p>
                {g.description && !isOpen && (
                  <p className="truncate mt-0.5" style={{ fontSize: 11, color: '#5c6886' }}>{g.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5c6886' }}>{doneCount}/{g.lessons.length}</span>
                <span style={{ color: '#5c6886', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t px-2 py-1.5 space-y-0.5" style={{ borderColor: 'rgba(126,231,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
                {g.lessons.map((lesson) => {
                  const done = progressBySlug.get(lesson.slug)
                  const active = selectedLesson?.slug === lesson.slug
                  const chip =
                    lesson.type === 'visualization' ? '3D'
                    : lesson.type === 'quiz'
                      ? lesson.slug === 'midterm' ? 'Midterm' : lesson.slug === 'final' ? 'Final' : 'Quiz'
                    : lesson.type === 'assignment' ? 'Bài tập'
                    : lesson.type === 'live_session' ? 'Live'
                    : lesson.videoUrl ? 'Video' : 'Reading'

                  return (
                    <button
                      key={lesson.slug}
                      type="button"
                      onClick={() => onSelectLesson(lesson)}
                      className="hud-chamfer-sm w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2 border"
                      style={{
                        borderColor: active ? 'rgba(126,231,255,0.28)' : 'transparent',
                        background: active ? 'rgba(126,231,255,0.08)' : 'transparent',
                        boxShadow: active ? '0 0 14px -4px rgba(126,231,255,0.25)' : 'none',
                      }}
                    >
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 16, height: 16, fontSize: 9,
                          clipPath: 'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)',
                          background: done ? 'rgba(109,255,176,0.15)' : 'transparent',
                          border: `1px solid ${done ? 'rgba(109,255,176,0.55)' : active ? '#7ee7ff' : '#2a3450'}`,
                          color: done ? '#6dffb0' : 'transparent',
                        }}
                      >
                        {done ? '✓' : ''}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ color: active ? '#eaf6ff' : done ? '#9aa8c4' : '#7c8db0' }}>{lesson.title}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#5c6886', marginTop: 2, textTransform: 'uppercase' }}>{chip}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function CoursePageClient({
  slug,
  initialCourse,
  initialLessonSlug,
  refreshAfterEnroll,
}: {
  slug: string
  initialCourse: Course | null
  initialLessonSlug?: string
  refreshAfterEnroll?: boolean
}) {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const setCourseContext = useTutorContextStore((s) => s.setCourseContext)
  const [course, setCourse] = useState<Course | null>(initialCourse)
  const [enrolling, setEnrolling] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showMobileLessons, setShowMobileLessons] = useState(false)
  const [reducedMode, setReducedMode] = useState(false)
  const [enableMobile3D, setEnableMobile3D] = useState(false)

  const lessons = useMemo(
    () => (course?.lessons ?? []).filter((l): l is Lesson => 'content' in l),
    [course?.lessons],
  )

  const activeCohortId = useMemo(() => {
    const ctx = course?.deliveryContext
    if (ctx?.mode === 'cohort' && ctx.cohortId) return ctx.cohortId
    return null
  }, [course?.deliveryContext])

  const earthLessonStage = useMemo(() => {
    if (selectedLesson?.visualizationId !== 'earth-history') return null
    const t = selectedLesson.stageTime
    if (t == null) return undefined
    return findStageByTime(earthHistoryData, t)
  }, [selectedLesson])

  const earthLessonFossils = useCourseStageFossils(earthLessonStage ?? null)

  useEffect(() => {
    setCourse(initialCourse)
  }, [initialCourse])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)')
    const apply = () => setReducedMode(mediaQuery.matches)
    apply()
    mediaQuery.addEventListener('change', apply)
    return () => mediaQuery.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!course) return
    const preferredLessonSlug = initialLessonSlug || lessons[0]?.slug
    const lesson = lessons.find((item) => item.slug === preferredLessonSlug) ?? null
    setSelectedLesson(lesson)
  }, [course, initialLessonSlug, lessons])

  useEffect(() => {
    if (!slug || !checked) return
    let cancelled = false
    const needRefresh =
      refreshAfterEnroll ||
      !!user ||
      Boolean(
        initialCourse?.paywalledLessonBodies && initialCourse.isPaid && (initialCourse.price ?? 0) > 0,
      )
    if (!needRefresh) return
    fetchCourse(slug).then((freshCourse) => {
      if (!cancelled && freshCourse) setCourse(freshCourse)
    })
    return () => {
      cancelled = true
    }
  }, [
    slug,
    checked,
    user?.id,
    refreshAfterEnroll,
    initialCourse?.paywalledLessonBodies,
    initialCourse?.isPaid,
    initialCourse?.price,
  ])

  useEffect(() => {
    if (!course) return
    setCourseContext({
      courseSlug: course.slug,
      courseTitle: course.title,
      lessons: lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        type: l.type,
        stageTime: l.stageTime,
      })),
      currentLessonSlug: selectedLesson?.slug ?? null,
    })
    return () => setCourseContext(null)
  }, [course, lessons, selectedLesson?.slug, setCourseContext])

  useEffect(() => {
    setEnableMobile3D(false)
  }, [selectedLesson?.slug])

  useEffect(() => {
    if (!selectedLesson || !user || !course) return
    if (!['text', 'visualization', 'live_session'].includes(selectedLesson.type)) return
    trackCourseBehavior({
      eventName: 'course_lesson_opened',
      courseSlug: course.slug,
      lessonSlug: selectedLesson.slug,
      cohortId: activeCohortId,
    })
    const start = Date.now()
    return () => {
      const sec = Math.round((Date.now() - start) / 1000)
      if (sec >= 5) {
        trackCourseBehavior({
          eventName: 'course_lesson_dwell',
          courseSlug: course.slug,
          lessonSlug: selectedLesson.slug,
          cohortId: activeCohortId,
          durationSec: sec,
        })
      }
    }
  }, [selectedLesson?.slug, selectedLesson?.type, user?.id, course?.slug, activeCohortId])

  useEffect(() => {
    if (!checked || user || !course) return
    const fallbackSlug =
      (initialLessonSlug && lessons.some((l) => l.slug === initialLessonSlug) && initialLessonSlug) ||
      selectedLesson?.slug ||
      lessons[0]?.slug
    if (!fallbackSlug) return
    router.replace(
      `/login?redirect=${encodeURIComponent(`/courses/${slug}/learn/${fallbackSlug}`)}`,
    )
  }, [checked, user, course, slug, router, initialLessonSlug, lessons, selectedLesson?.slug])

  const handleSelectLesson = (lesson: Lesson) => {
    setShowMobileLessons(false)
    if (course && user) {
      if (lesson.type === 'quiz') {
        trackCourseBehavior({
          eventName: 'course_quiz_entered',
          courseSlug: course.slug,
          lessonSlug: lesson.slug,
          cohortId: activeCohortId,
        })
      } else if (lesson.type === 'assignment') {
        trackCourseBehavior({
          eventName: 'course_assignment_viewed',
          courseSlug: course.slug,
          lessonSlug: lesson.slug,
          cohortId: activeCohortId,
        })
      }
    }
    if (lesson.type === 'quiz') {
      if (activeCohortId) {
        router.push(
          `/courses/${slug}/cohort/${activeCohortId}/exam/${encodeURIComponent(lesson.slug)}`,
        )
      } else {
        router.push(`/courses/${slug}/exam/${encodeURIComponent(lesson.slug)}`)
      }
      return
    }
    if (lesson.type === 'assignment') {
      if (activeCohortId) {
        router.push(
          `/courses/${slug}/cohort/${activeCohortId}/assignment/${encodeURIComponent(lesson.slug)}`,
        )
      } else {
        router.push(`/courses/${slug}/assignment/${encodeURIComponent(lesson.slug)}`)
      }
      return
    }
    setSelectedLesson(lesson)
    router.replace(`/courses/${slug}/learn/${encodeURIComponent(lesson.slug)}`, { scroll: false })
  }

  const handleEnroll = async () => {
    if (!user || !course) return
    setEnrolling(true)
    const res = await enrollCourse(course.slug)
    if (res.success) {
      const updated = await fetchCourse(course.slug)
      if (updated) setCourse(updated)
      setEnrolling(false)
      return
    }
    if (res.requiresPayment && res.courseSlug && (res.amount ?? 0) > 0) {
      trackEvent('checkout_started', {
        course_slug: res.courseSlug,
        amount: res.amount ?? 0,
        currency: res.currency || course.currency || 'VND',
        surface: 'learn_enroll',
      })
      setEnrolling(false)
      router.push(`/courses/${res.courseSlug}/checkout`)
      return
    }
    setEnrolling(false)
    if (!res.success) {
      const updated = await fetchCourse(course.slug)
      if (updated) setCourse(updated)
    }
  }

  const markComplete = async (lessonSlug: string, completed: boolean) => {
    if (!course || !user) return
    await updateLessonProgress(course.slug, lessonSlug, completed)
    if (completed) {
      trackCourseBehavior({
        eventName: 'course_lesson_completed',
        courseSlug: course.slug,
        lessonSlug,
        cohortId: activeCohortId,
      })
    }
    const updated = await fetchCourse(course.slug)
    if (updated) setCourse(updated)
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black">
        <main className="pt-16 flex items-center justify-center min-h-[50vh]">
          <p className="text-ds-subtle">Loading course...</p>
        </main>
      </div>
    )
  }

  const isEnrolled = course.enrollment != null
  const courseModules = (course.modules ?? []).sort((a, b) => a.order - b.order)
  const lessonsByModule = courseModules.length > 0
    ? (() => {
        const map: Record<string, Lesson[]> = {}
        courseModules.forEach((m) => { map[m._id || m.slug] = [] })
        map._unassigned = []
        lessons.forEach((l) => {
          const key = l.moduleId && map[l.moduleId] ? l.moduleId : '_unassigned'
          map[key].push(l)
        })
        Object.values(map).forEach((arr) => arr.sort((a, b) => a.order - b.order))
        return map
      })()
    : lessons.reduce((acc: Record<string, Lesson[]>, l) => {
        const key = l.week != null ? `w-${l.week}` : 'none'
        if (!acc[key]) acc[key] = []
        acc[key].push(l)
        acc[key].sort((a, b) => a.order - b.order)
        return acc
      }, {})

  const progressBySlug = new Map((course.enrollment?.progress ?? []).map((p) => [p.lessonSlug, p.completed]))
  const completedCount = lessons.filter((l) => progressBySlug.get(l.slug)).length
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0
  const currentIndex = selectedLesson ? lessons.findIndex((l) => l.slug === selectedLesson.slug) : -1
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#030509' }}>
      <main className="pt-14 flex-1 flex flex-col md:flex-row gap-0">
        <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r" style={{ borderColor: 'rgba(126,231,255,0.08)', background: '#06091a' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(126,231,255,0.08)' }}>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 mb-3 transition-colors"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4dd2ff' }}
            >
              ← courses
            </Link>
            <div className="relative mb-3">
              <div className="hud-chamfer-md border p-4" style={{ borderColor: 'rgba(126,231,255,0.18)', background: '#0a1024' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886', marginBottom: 6 }}>
                  // mission · course
                </div>
                <h1 className="font-semibold leading-snug" style={{ color: '#eaf6ff', fontSize: 15 }}>{course.title}</h1>
                <p className="line-clamp-3 leading-relaxed mt-1.5" style={{ fontSize: 12, color: '#9aa8c4' }}>{course.description}</p>
              </div>
              <HudBrackets />
            </div>
            <div className="hud-chamfer border p-3 mb-4" style={{ borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886' }}>// progress</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7ee7ff' }}>{completedCount}/{lessons.length}</span>
              </div>
              <div className="hud-chamfer-sm overflow-hidden" style={{ height: 3, background: 'rgba(126,231,255,0.08)' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #4dd2ff, #7ee7ff)' }} />
              </div>
              <div className="text-right mt-1.5">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5c6886' }}>{progressPercent}% complete</span>
              </div>
            </div>
            {!isEnrolled && user && (
              course.isPaid && (course.price ?? 0) > 0 ? (
                <Link
                  href={`/courses/${slug}/checkout`}
                  className="block w-full py-2.5 hud-chamfer-sm font-semibold text-sm text-center transition-all"
                  style={{ background: '#f5a524', color: '#1a0e00', boxShadow: '0 0 20px rgba(245,165,36,0.3)' }}
                >
                  Mua khóa học ·{' '}
                  {course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('vi-VN')} ₫`}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full py-2.5 hud-chamfer-sm font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: '#f5a524', color: '#1a0e00', boxShadow: enrolling ? 'none' : '0 0 20px rgba(245,165,36,0.3)' }}
                >
                  {enrolling ? '// processing...' : 'Ghi danh ngay →'}
                </button>
              )
            )}
            {!user && (
              <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: '#5c6886' }}>
                // đăng nhập để ghi danh
              </p>
            )}
            <CommunityAskButton
              className="mt-3 w-full"
              variant="outline"
              context={{
                pathSource: 'course',
                courseSlug: course.slug,
                courseId: course.id,
                courseTitle: course.title,
                ...(selectedLesson
                  ? { lessonSlug: selectedLesson.slug, lessonTitle: selectedLesson.title }
                  : {}),
              }}
            />
            <button
              type="button"
              onClick={() => setShowMobileLessons((v) => !v)}
              className="md:hidden mt-3 w-full min-h-11 hud-chamfer-sm border text-sm transition-all"
              style={{
                borderColor: 'rgba(126,231,255,0.2)',
                color: '#9aa8c4',
                background: 'transparent',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {showMobileLessons ? '// ẩn danh sách bài học' : '// hiện danh sách bài học'}
            </button>
          </div>
          <div className={showMobileLessons ? 'block md:block' : 'hidden md:block'}>
            <ModuleSidebar
              courseModules={courseModules}
              lessonsByModule={lessonsByModule}
              progressBySlug={progressBySlug}
              selectedLesson={selectedLesson}
              onSelectLesson={handleSelectLesson}
            />
          </div>
        </aside>

        <div className="flex-1 min-h-0 flex flex-col border-l" style={{ background: '#030509', borderColor: 'rgba(126,231,255,0.05)' }}>
          {selectedLesson ? (
            <>
              <div className="px-5 py-2.5 border-b flex items-center gap-2 flex-wrap text-sm" style={{ borderColor: 'rgba(126,231,255,0.08)', background: '#06091a' }}>
                <Link href="/courses" className="hover:text-[#7ee7ff] transition-colors" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5c6886' }}>courses</Link>
                <span style={{ color: '#5c6886' }}>/</span>
                <Link href={`/courses/${slug}`} className="truncate max-w-[40vw] hover:text-[#7ee7ff] transition-colors" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: '#9aa8c4' }}>
                  {course.title}
                </Link>
                <span style={{ color: '#5c6886' }}>/</span>
                <span className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: '#7ee7ff' }}>{selectedLesson.title}</span>
              </div>
              <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'rgba(126,231,255,0.08)', background: '#06091a' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c6886', marginBottom: 4 }}>
                    // lesson · {selectedLesson.type}
                  </div>
                  <h2 className="font-semibold text-lg leading-tight" style={{ color: '#eaf6ff' }}>{selectedLesson.title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CommunityAskButton
                    variant="compact"
                    context={{
                      pathSource: 'course',
                      courseSlug: course.slug,
                      courseId: course.id,
                      courseTitle: course.title,
                      lessonSlug: selectedLesson.slug,
                      lessonTitle: selectedLesson.title,
                    }}
                  />
                  {isEnrolled && (
                    <button
                      type="button"
                      onClick={() => markComplete(selectedLesson.slug, !progressBySlug.get(selectedLesson.slug))}
                      className="text-sm px-4 py-2 hud-chamfer-sm border transition-all"
                      style={
                        progressBySlug.get(selectedLesson.slug)
                          ? { borderColor: 'rgba(109,255,176,0.4)', background: 'rgba(109,255,176,0.07)', color: '#6dffb0' }
                          : { borderColor: 'rgba(126,231,255,0.2)', background: 'transparent', color: '#9aa8c4' }
                      }
                    >
                      {progressBySlug.get(selectedLesson.slug) ? '✓ Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {!isEnrolled && course.isPaid && (course.price ?? 0) > 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 max-w-md">
                      <p className="text-amber-200 font-medium mb-2">Nội dung khóa học trả phí</p>
                      <p className="text-sm text-ds-muted mb-6">Mua khóa học để mở toàn bộ bài học và theo dõi tiến độ.</p>
                      <Link
                        href={`/courses/${slug}/checkout`}
                        className="inline-flex px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500"
                      >
                        Mua ngay ·{' '}
                        {course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('vi-VN')} ₫`}
                      </Link>
                      <p className="mt-4 text-xs text-ds-subtle">
                        <Link href={`/courses/${slug}`} className="text-ds-accent hover:underline">
                          ← Về trang khóa học
                        </Link>
                      </p>
                    </div>
                  </div>
                ) : selectedLesson.type === 'text' ? (
                  <>
                    <LessonContentBody lesson={selectedLesson} />
                    {nextLesson && (
                      <div className="px-6 pb-6">
                        <button
                          type="button"
                          onClick={() => handleSelectLesson(nextLesson)}
                          className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
                        >
                          Bài tiếp theo: {nextLesson.title} →
                        </button>
                      </div>
                    )}
                  </>
                ) : selectedLesson.type === 'visualization' ? (
                  <div className="w-full h-full min-h-[400px] relative flex flex-col">
                    {reducedMode && !enableMobile3D && (
                      <div className="px-6 py-8 border-b border-ds-border bg-ds-surface">
                        <p className="text-sm text-gray-300 mb-3">Mô phỏng 3D có thể nặng trên thiết bị di động.</p>
                        <button
                          type="button"
                          onClick={() => setEnableMobile3D(true)}
                          className="min-h-11 px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
                        >
                          Tải mô phỏng 3D
                        </button>
                      </div>
                    )}
                    {(!reducedMode || enableMobile3D) && (
                      <>
                        {selectedLesson.visualizationId === 'earth-history' && (() => {
                          const stageTime = selectedLesson.stageTime
                          const stage = stageTime != null ? findStageByTime(earthHistoryData, stageTime) : undefined
                          return (
                            <>
                              {stage && (
                                <>
                                  <p className="text-sm text-ds-muted px-4 py-2 border-b border-ds-border shrink-0">
                                    {stage.timeDisplay} · {stage.description}
                                  </p>
                                  <div className="px-4 py-3 border-b border-ds-border shrink-0">
                                    <FeaturedOrganisms stageId={stage.id} variant="full" />
                                  </div>
                                </>
                              )}
                              <div className="flex-1 min-h-[360px]">
                                <EarthScene overrideStage={stage} overrideFossils={earthLessonFossils} />
                              </div>
                            </>
                          )
                        })()}
                        {(selectedLesson.visualizationId === 'solar-system' ||
                          selectedLesson.visualizationId === 'milky-way') && (
                          <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center gap-4 px-6 py-10 text-center border border-ds-border rounded-xl bg-ds-surface mx-4 my-4">
                            <p className="text-sm font-medium text-ds-text max-w-md">
                              {selectedLesson.visualizationId === 'milky-way'
                                ? 'Chế độ Ngân hà (galaxy) chạy trên trang Explore — có camera, catalog và tối ưu hiệu năng riêng.'
                                : 'Hệ Mặt Trời đầy đủ (quỹ đạo, thực thể NASA, camera) chạy trên trang Explore — không còn scene legacy trong khóa học.'}
                            </p>
                            <p className="text-xs text-ds-muted max-w-md">
                              Trải nghiệm 3D đầy đủ (camera, catalog, hiệu năng) được tối ưu trên trang Explore. Hãy mở Explore để xem cùng giao diện với chế độ khám phá chính của ứng dụng.
                            </p>
                            <Link
                              href="/explore"
                              className="inline-flex items-center justify-center rounded-xl bg-ds-accent px-5 py-2.5 text-sm font-semibold text-ds-accent-fg hover:opacity-90 transition-opacity"
                            >
                              Mở Explore →
                            </Link>
                          </div>
                        )}
                        {!['earth-history', 'solar-system', 'milky-way'].includes(selectedLesson.visualizationId || '') && (
                          <div className="absolute inset-0 flex items-center justify-center text-ds-subtle">
                            Simulation: {selectedLesson.visualizationId || 'Not configured'}
                          </div>
                        )}
                      </>
                    )}
                    {nextLesson && (
                      <div className="p-4 border-t border-ds-border shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectLesson(nextLesson)}
                          className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
                        >
                          Bài tiếp theo: {nextLesson.title} →
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedLesson.type === 'quiz' ? (
                  <div className="p-8 max-w-lg space-y-4">
                    <p className="text-ds-muted text-sm">Bài kiểm tra mở trên trang riêng với bảng câu hỏi và đồng hồ.</p>
                    <Link
                      href={
                        activeCohortId
                          ? `/courses/${slug}/cohort/${activeCohortId}/exam/${encodeURIComponent(selectedLesson.slug)}`
                          : `/courses/${slug}/exam/${encodeURIComponent(selectedLesson.slug)}`
                      }
                      className="inline-flex px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
                    >
                      Vào bài kiểm tra →
                    </Link>
                  </div>
                ) : selectedLesson.type === 'assignment' ? (
                  <div className="p-8 max-w-lg space-y-4">
                    <p className="text-ds-muted text-sm">Nộp bài tập trên trang riêng (nhiều file).</p>
                    <Link
                      href={
                        activeCohortId
                          ? `/courses/${slug}/cohort/${activeCohortId}/assignment/${encodeURIComponent(selectedLesson.slug)}`
                          : `/courses/${slug}/assignment/${encodeURIComponent(selectedLesson.slug)}`
                      }
                      className="inline-flex px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
                    >
                      Mở bài tập →
                    </Link>
                  </div>
                ) : null}
              </div>
              <LessonRelatedQuestions
                className="shrink-0 mx-5 my-4 p-4 md:p-5"
                context={{
                  pathSource: 'course',
                  courseSlug: course.slug,
                  courseId: course.id,
                  courseTitle: course.title,
                  lessonSlug: selectedLesson.slug,
                  lessonTitle: selectedLesson.title,
                }}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-2xl space-y-4 rounded-2xl border border-ds-accent-strong bg-ds-elevated p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-white">{course.title}</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{course.description}</p>
                <p className="text-ds-subtle text-xs">
                  {course.durationWeeks != null && `${course.durationWeeks} tuần · `}
                  {lessons.length} bài học
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const firstLesson = lessons[0]
                    if (firstLesson) handleSelectLesson(firstLesson)
                  }}
                  className="mt-4 px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500"
                >
                  Bắt đầu học
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
