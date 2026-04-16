'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useTutorContextStore } from '@/store/useTutorContextStore'
import {
  fetchCourse,
  enrollCourse,
  updateLessonProgress,
  type Course,
  type Lesson,
} from '@/lib/coursesApi'
import { createPayment } from '@/lib/paymentApi'
import { getStageByTime } from '@/lib/earthHistoryData'
import { FeaturedOrganisms } from '@/components/ui/FeaturedOrganisms'
import { Loading } from '@/components/ui/Loading'
import { LessonContentBody } from '@/components/courses/LessonContentBody'
import { QuizLessonBlock } from '@/components/courses/QuizLessonBlock'
import { trackEvent } from '@/lib/analytics'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <Loading /> })
const SolarSystemScene = dynamic(() => import('@/components/3d/SolarSystemScene'), { ssr: false, loading: () => <Loading /> })
const MilkyWayScene = dynamic(() => import('@/components/3d/MilkyWayScene'), { ssr: false, loading: () => <Loading /> })

function ModuleSidebar({
  courseModules,
  lessonsByModule,
  progressBySlug,
  selectedLesson,
  onSelectLesson,
}: {
  courseModules: import('@/lib/coursesApi').CourseModule[]
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
          <div key={g.key} className="rounded-xl border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors ${
                hasActive ? 'bg-cyan-500/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-cyan-400 font-semibold">Module {g.index + 1}</span>
                  {doneCount === g.lessons.length && g.lessons.length > 0 && (
                    <span className="text-[10px] text-emerald-400">&#x2713;</span>
                  )}
                </div>
                <p className="text-sm font-medium text-white mt-0.5 truncate">{g.label}</p>
                {g.description && !isOpen && (
                  <p className="text-[11px] text-gray-600 mt-0.5 truncate">{g.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-600">{doneCount}/{g.lessons.length}</span>
                <span className="text-gray-500 text-xs">{isOpen ? '\u25B2' : '\u25BC'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-white/5 px-2 py-1.5 space-y-0.5 bg-black/20">
                {g.lessons.map((lesson) => {
                  const done = progressBySlug.get(lesson.slug)
                  const active = selectedLesson?.slug === lesson.slug
                  const chip =
                    lesson.type === 'visualization' ? '3D'
                    : lesson.type === 'quiz'
                      ? lesson.slug === 'midterm' ? 'Midterm' : lesson.slug === 'final' ? 'Final' : 'Quiz'
                    : lesson.videoUrl ? 'Video' : 'Reading'

                  return (
                    <button
                      key={lesson.slug}
                      type="button"
                      onClick={() => onSelectLesson(lesson)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                        active ? 'bg-cyan-600/30 text-cyan-100' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                        done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'border-cyan-500 text-cyan-400' : 'border-gray-700'
                      }`}>
                        {done ? '\u2713' : ''}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{lesson.title}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{chip}</p>
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
    const preferredLessonSlug = initialLessonSlug || course.lessons?.[0]?.slug
    const lesson = course.lessons?.find((item) => item.slug === preferredLessonSlug) ?? null
    setSelectedLesson(lesson)
  }, [course, initialLessonSlug])

  useEffect(() => {
    if (!refreshAfterEnroll || !course || course.enrollment) return
    fetchCourse(slug).then((freshCourse) => {
      if (freshCourse) setCourse(freshCourse)
    })
  }, [refreshAfterEnroll, course, slug])

  useEffect(() => {
    if (!course) return
    setCourseContext({
      courseSlug: course.slug,
      courseTitle: course.title,
      lessons: (course.lessons ?? []).map((l) => ({
        slug: l.slug,
        title: l.title,
        type: l.type,
        stageTime: l.stageTime,
      })),
      currentLessonSlug: selectedLesson?.slug ?? null,
    })
    return () => setCourseContext(null)
  }, [course, selectedLesson?.slug, setCourseContext])

  useEffect(() => {
    setEnableMobile3D(false)
  }, [selectedLesson?.slug])

  useEffect(() => {
    if (checked && !user && course) {
      router.replace('/login?redirect=/courses/' + slug)
    }
  }, [checked, user, course, slug, router])

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setShowMobileLessons(false)
    router.replace(`/courses/${slug}?lesson=${encodeURIComponent(lesson.slug)}`, { scroll: false })
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
    if (res.requiresPayment && res.courseId && res.courseSlug && (res.amount ?? 0) > 0) {
      trackEvent('checkout_started', {
        course_slug: res.courseSlug,
        amount: res.amount ?? 0,
        currency: res.currency || course.currency || 'VND',
      })
      const pay = await createPayment({
        courseId: res.courseId,
        courseSlug: res.courseSlug,
        amount: res.amount!,
        currency: res.currency,
      })
      setEnrolling(false)
      if (pay.success && pay.paymentUrl) {
        window.location.href = pay.paymentUrl
        return
      }
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
    const updated = await fetchCourse(course.slug)
    if (updated) setCourse(updated)
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black">
        <main className="pt-16 flex items-center justify-center min-h-[50vh]">
          <p className="text-gray-500">Loading course...</p>
        </main>
      </div>
    )
  }

  const isEnrolled = course.enrollment != null
  const lessons = course.lessons ?? []
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
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f] flex flex-col">
      <main className="pt-14 flex-1 flex flex-col md:flex-row gap-0 md:gap-3">
        <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#070c14]">
          <div className="p-4 border-b border-white/10">
            <Link href="/courses" className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
              ← Courses
            </Link>
            <h1 className="font-bold text-white text-lg mb-2">{course.title}</h1>
            <p className="text-sm text-gray-400 mb-4 line-clamp-3">{course.description}</p>
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Progress</span>
                <span>{completedCount}/{lessons.length} lessons</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            {!isEnrolled && user && (
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-50"
              >
                {enrolling
                  ? 'Enrolling...'
                  : course.isPaid && (course.price ?? 0) > 0
                    ? `Mua khóa học ${course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('en-US')} ₫`}`
                    : 'Ghi danh'}
              </button>
            )}
            {!user && <p className="text-sm text-gray-500">Đăng nhập để ghi danh khóa học này.</p>}
            <button
              type="button"
              onClick={() => setShowMobileLessons((v) => !v)}
              className="md:hidden mt-3 w-full min-h-11 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-200"
            >
              {showMobileLessons ? 'Ẩn danh sách bài học' : 'Hiện danh sách bài học'}
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

        <div className="flex-1 min-h-0 flex flex-col bg-[#060a12] border-l border-white/5">
          {selectedLesson ? (
            <>
              <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 text-sm text-gray-400 bg-[#0a1220]">
                <Link href="/courses" className="hover:text-cyan-400">Courses</Link>
                <span>/</span>
                <span className="text-white">{course.title}</span>
                <span>/</span>
                <span className="text-cyan-300 truncate">{selectedLesson.title}</span>
              </div>
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 bg-[#0b1018]">
                <h2 className="font-semibold text-white text-lg">{selectedLesson.title}</h2>
                {isEnrolled && (
                  <button
                    type="button"
                    onClick={() => markComplete(selectedLesson.slug, !progressBySlug.get(selectedLesson.slug))}
                    className="text-sm px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 hover:bg-cyan-600/30 hover:text-cyan-300"
                  >
                    {progressBySlug.get(selectedLesson.slug) ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {!isEnrolled && course.isPaid && (course.price ?? 0) > 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 max-w-md">
                      <p className="text-amber-200 font-medium mb-2">Nội dung khóa học trả phí</p>
                      <p className="text-sm text-gray-400 mb-6">Mua khóa học để mở toàn bộ bài học và theo dõi tiến độ.</p>
                      <button
                        type="button"
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="px-6 py-3 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500 disabled:opacity-50"
                      >
                        {enrolling ? 'Đang xử lý...' : `Mua ngay ${course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('en-US')} ₫`}`}
                      </button>
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
                      <div className="px-6 py-8 border-b border-white/10 bg-[#0a111f]">
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
                          const stage = stageTime != null ? getStageByTime(stageTime) : undefined
                          return (
                            <>
                              {stage && (
                                <>
                                  <p className="text-sm text-gray-400 px-4 py-2 border-b border-white/10 shrink-0">
                                    {stage.timeDisplay} · {stage.description}
                                  </p>
                                  <div className="px-4 py-3 border-b border-white/10 shrink-0">
                                    <FeaturedOrganisms stageId={stage.id} variant="full" />
                                  </div>
                                </>
                              )}
                              <div className="flex-1 min-h-[360px]">
                                <EarthScene overrideStage={stage} />
                              </div>
                            </>
                          )
                        })()}
                        {selectedLesson.visualizationId === 'solar-system' && (
                          <SolarSystemScene onPlanetSelect={() => {}} />
                        )}
                        {selectedLesson.visualizationId === 'milky-way' && (
                          <div className="flex-1 min-h-[360px]">
                            <MilkyWayScene />
                          </div>
                        )}
                        {!['earth-history', 'solar-system', 'milky-way'].includes(selectedLesson.visualizationId || '') && (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            Simulation: {selectedLesson.visualizationId || 'Not configured'}
                          </div>
                        )}
                      </>
                    )}
                    {nextLesson && (
                      <div className="p-4 border-t border-white/10 shrink-0">
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
                  <>
                    {selectedLesson.quizQuestions && selectedLesson.quizQuestions.length > 0 ? (
                      <>
                        {selectedLesson.content && <p className="px-6 pt-6 text-sm text-gray-400 max-w-3xl">{selectedLesson.content}</p>}
                        <QuizLessonBlock
                          questions={selectedLesson.quizQuestions}
                          onComplete={() => isEnrolled && markComplete(selectedLesson.slug, true)}
                        />
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
                    ) : (
                      <div className="p-6 text-gray-400">Quiz lesson (no questions yet).</div>
                    )}
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-2xl space-y-4 rounded-2xl border border-cyan-500/20 bg-[#08111f] p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-white">{course.title}</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{course.description}</p>
                <p className="text-gray-500 text-xs">
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
