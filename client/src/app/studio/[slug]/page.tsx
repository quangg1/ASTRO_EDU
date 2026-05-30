'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  fetchCourseForEditor,
  saveCourseFromEditor,
  uploadMedia,
  type UploadMediaContext,
  type Course,
  type CourseEditorPayload,
  type CourseModule,
  type Lesson,
  type LessonSection,
  type QuizQuestion,
} from '@/features/courses/public'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import { useBlockEditorActions } from '@/components/studio/hooks/useBlockEditorActions'
import { CourseStorefrontEditor } from '@/components/studio/CourseStorefrontEditor'
import { CohortStudioNavLink } from '@/components/studio/CohortStudioNavLink'
import {
  catalogPricingVisibleForStrategy,
  resolveDistributionStrategy,
} from '@/features/courses/lib/distributionStrategy'
import { ModuleMaterialsEditor } from '@/components/studio/ModuleMaterialsEditor'
import { courseRequiresPayment } from '@/components/courses/courseCatalogMeta'
import {
  loadStudioEditorDraft,
  saveStudioEditorDraft,
  studioDraftIsDirty,
} from '@/features/courses/lib/studioEditorDraft'
import { LessonTypeIcon, lessonTypeIconKey } from '@/features/courses/cohort/LessonTypeIcon'
import { emptyMcqQuestion, mcqAnswerIndex, mcqOptionTexts, patchMcqOption, setMcqAnswer } from '@/shared/types/quizQuestion'

const BlockEditor = dynamic(() => import('@/components/studio/BlockEditor'), { ssr: false })
const BlockPalette = dynamic(() => import('@/components/studio/BlockPalette'), { ssr: false })
const LessonPreview = dynamic(() => import('@/components/studio/LessonPreview'), { ssr: false })
const StageTimePicker = dynamic(() => import('@/components/studio/StageTimePicker'), { ssr: false })

type EditorCourse = CourseEditorPayload
type Tab = 'blocks' | 'quiz' | 'settings' | 'preview'

function clone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) }
function slugify(t: string) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) }
function genId() { return `m${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

function makeModule(n: number): CourseModule {
  const id = genId()
  return { _id: id, title: `Chương ${n + 1}`, slug: `chuong-${n + 1}`, description: '', icon: '', order: n, materials: [] }
}

function makeLesson(n: number, moduleId?: string): Lesson {
  return { title: `New Lesson ${n + 1}`, slug: `lesson-${Date.now()}-${n}`, description: '', type: 'text', visualizationId: null, stageTime: null, videoUrl: null, coverImage: null, galleryImages: [], week: null, moduleId: moduleId || null, content: '', learningGoals: [], sections: [], quizQuestions: [], quizSettings: { revealMode: 'after_submit', timeLimitMinutes: null, maxAttempts: null }, resourceLinks: [], sourcePdf: null, sourcePageCount: null, order: n }
}

function makeQuiz(): QuizQuestion {
  return emptyMcqQuestion('course')
}

function normalizeEditorCourse(c: CourseEditorPayload): EditorCourse {
  const distributionStrategy = resolveDistributionStrategy(c)
  return {
    ...c,
    id: String(c.id ?? c.slug),
    published: c.published ?? false,
    distributionStrategy,
    catalogEnabled: c.catalogEnabled !== false,
    modules: (c.modules ?? []) as CourseModule[],
    lessons: c.lessons ?? [],
  }
}

function courseUploadEntityId(course: EditorCourse): string {
  return String(course.id || course.slug)
}

function UploadBtn({
  accept,
  onUrl,
  onError,
  label,
  uploadContext,
}: {
  accept: string
  onUrl: (u: string) => void
  onError?: (message: string) => void
  label: string
  uploadContext?: UploadMediaContext
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true)
    try {
      const r = await uploadMedia(f, uploadContext)
      if (r.success && r.url) onUrl(r.url)
      else onError?.(r.error || 'Tải tệp thất bại')
    } catch {
      onError?.('Tải tệp thất bại — kiểm tra kết nối API')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  return (
    <>
      <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden" />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-ds-border text-gray-300 hover:bg-ds-accent-soft hover:border-ds-accent-strong transition-colors disabled:opacity-50">
        {busy ? '...' : label}
      </button>
    </>
  )
}

export default function StudioEditorPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [course, setCourse] = useState<EditorCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [si, setSi] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [baselineSnapshot, setBaselineSnapshot] = useState('')
  const [undoSnapshot, setUndoSnapshot] = useState<{ label: string; course: EditorCourse } | null>(null)
  const [tab, setTab] = useState<Tab>('blocks')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingModId, setEditingModId] = useState<string | null>(null)
  const [materialsModId, setMaterialsModId] = useState<string | null>(null)
  const editorLoadKeyRef = useRef('')

  useEffect(() => {
    if (checked && !user) router.replace(`/login?redirect=/studio/${slug}`)
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user?.id, slug, router])

  useEffect(() => {
    if (!slug || !user?.id) return
    const loadKey = `${slug}:${user.id}`
    if (editorLoadKeyRef.current === loadKey) return

    const draft = loadStudioEditorDraft(slug)
    if (draft) {
      editorLoadKeyRef.current = loadKey
      setCourse(normalizeEditorCourse(draft.course))
      setBaselineSnapshot(draft.baseline)
      setLoading(false)
      if (studioDraftIsDirty(draft)) return
    }

    editorLoadKeyRef.current = loadKey
    let cancelled = false
    if (!draft) setLoading(true)
    fetchCourseForEditor(slug).then((c) => {
      if (cancelled || !c?.lessons) {
        if (!cancelled) setLoading(false)
        return
      }
      const base = normalizeEditorCourse(c)
      const modules = base.modules
      let nextCourse: EditorCourse
      if (modules.length === 0 && base.lessons.length > 0) {
        const defaultId = 'chuong-1'
        const autoModules: CourseModule[] = [
          {
            _id: defaultId,
            title: 'Chương 1',
            slug: 'chuong-1',
            description: '',
            icon: '',
            order: 0,
          },
        ]
        const fixedLessons = base.lessons.map((l) => ({ ...l, moduleId: l.moduleId || defaultId }))
        nextCourse = { ...base, modules: autoModules, lessons: fixedLessons }
      } else {
        nextCourse = base
      }
      setCourse(nextCourse)
      const snap = JSON.stringify(nextCourse)
      setBaselineSnapshot(snap)
      saveStudioEditorDraft(slug, nextCourse, snap)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [slug, user?.id])

  useEffect(() => {
    if (!slug || !course) return
    const t = window.setTimeout(() => {
      saveStudioEditorDraft(slug, course, baselineSnapshot)
    }, 400)
    return () => clearTimeout(t)
  }, [slug, course, baselineSnapshot])

  const lesson = useMemo(() => course?.lessons?.[si] ?? null, [course, si])
  const isDirty = useMemo(() => {
    if (!course || !baselineSnapshot) return false
    return JSON.stringify(course) !== baselineSnapshot
  }, [course, baselineSnapshot])
  const confirmLeaveIfDirty = useCallback(() => {
    if (!isDirty || saving) return true
    return window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?')
  }, [isDirty, saving])
  const modules = useMemo(() => (course?.modules ?? []).sort((a, b) => a.order - b.order), [course])

  const uc = useCallback((fn: (p: EditorCourse) => EditorCourse) => setCourse((p) => p ? fn(p) : p), [])
  const ul = useCallback((fn: (l: Lesson) => Lesson) => uc((p) => { const ls = [...p.lessons]; ls[si] = fn(clone(ls[si])); return { ...p, lessons: ls } }), [si, uc])

  const lessonSections = lesson?.sections ?? []
  const blockActions = useBlockEditorActions(lessonSections, (next) => ul((l) => ({ ...l, sections: next })))

  const addModule = () => { uc((p) => ({ ...p, modules: [...p.modules, makeModule(p.modules.length)].map((m, i) => ({ ...m, order: i })) })) }
  const renameModule = (id: string, title: string) => { uc((p) => ({ ...p, modules: p.modules.map((m) => m._id === id ? { ...m, title, slug: slugify(title) } : m) })); setEditingModId(null) }
  const deleteModule = (id: string) => {
    if (!confirm('Xóa chương này và bỏ gán bài?')) return
    if (materialsModId === id) setMaterialsModId(null)
    if (course) setUndoSnapshot({ label: 'Đã xóa chương.', course: clone(course) })
    uc((p) => ({
      ...p,
      modules: p.modules.filter((m) => m._id !== id).map((m, i) => ({ ...m, order: i })),
      lessons: p.lessons.map((l) => l.moduleId === id ? { ...l, moduleId: null } : l),
    }))
  }
  const moveModule = (from: number, to: number) => {
    if (to < 0 || !course || to >= course.modules.length) return
    uc((p) => { const a = [...p.modules]; const [it] = a.splice(from, 1); a.splice(to, 0, it); return { ...p, modules: a.map((m, i) => ({ ...m, order: i })) } })
  }

  const addLessonToModule = (moduleId: string) => {
    uc((p) => ({ ...p, lessons: [...p.lessons, makeLesson(p.lessons.length, moduleId)].map((l, i) => ({ ...l, order: i })) }))
    if (course) setSi(course.lessons.length)
  }
  const addUnassignedLesson = () => {
    uc((p) => ({ ...p, lessons: [...p.lessons, makeLesson(p.lessons.length)].map((l, i) => ({ ...l, order: i })) }))
    if (course) setSi(course.lessons.length)
  }
  const dupLesson = (i: number) => { uc((p) => { const s = clone(p.lessons[i]); s.title += ' (copy)'; s.slug = `${slugify(s.title)}-${Date.now()}`; const a = [...p.lessons]; a.splice(i + 1, 0, s); return { ...p, lessons: a.map((l, j) => ({ ...l, order: j })) } }); setSi(i + 1) }
  const delLesson = (i: number) => { if (!confirm('Delete this lesson?')) return; if (course) setUndoSnapshot({ label: 'Đã xóa bài học.', course: clone(course) }); uc((p) => ({ ...p, lessons: p.lessons.filter((_, j) => j !== i).map((l, j) => ({ ...l, order: j })) })); setSi((v) => Math.max(0, Math.min(v, (course?.lessons.length ?? 1) - 2))) }

  const toggleCollapse = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }))

  const save = async () => {
    if (!course) return; setSaving(true); setMsg(null)
    const r = await saveCourseFromEditor(slug, {
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail ?? null,
      level: course.level,
      durationWeeks: course.durationWeeks,
      published: !!course.published,
      price: course.price ?? 0,
      currency: course.currency ?? 'VND',
      isPaid: !!course.isPaid,
      crossSellTutorialHref: course.crossSellTutorialHref ?? '/tutorial',
      crossSellTutorialLabelVi: course.crossSellTutorialLabelVi ?? '',
      crossSellTutorialBodyVi: course.crossSellTutorialBodyVi ?? '',
      catalogEnabled: course.catalogEnabled !== false,
      distributionStrategy: resolveDistributionStrategy(course),
      modules: course.modules.map((m, i) => ({ ...m, order: i })),
      lessons: course.lessons.map((l, i) => ({ ...l, order: i })),
    })
    setSaving(false); setMsg(r.success ? 'Saved!' : r.error || 'Failed')
    if (r.success && course) {
      const snap = JSON.stringify(course)
      setBaselineSnapshot(snap)
      saveStudioEditorDraft(slug, course, snap)
      setTimeout(() => setMsg(null), 2500)
    }
  }

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty || saving) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty, saving])

  if (!checked || !user) return <div className="min-h-screen bg-ds-base pt-24 text-center text-ds-subtle">Loading studio...</div>
  if (loading && !course) return <div className="min-h-screen bg-ds-base pt-24 text-center text-ds-subtle">Loading studio...</div>
  if (!course) return <div className="min-h-screen bg-ds-base pt-24 text-center text-ds-subtle">Course not found.</div>

  const uploadEntityId = courseUploadEntityId(course)
  const uploadErr = (message: string) => setMsg(message)

  const pubCls = course.published ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  const unassigned = course.lessons.filter((l) => !l.moduleId || !modules.find((m) => m._id === l.moduleId))
  const strategy = resolveDistributionStrategy(course)
  const showTopBarPricing = catalogPricingVisibleForStrategy(strategy)

  return (
    <div className="min-h-screen bg-ds-base pt-16 pb-10">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-ds-accent-soft blur-[180px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[150px]" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* ===== LEFT: Module/Lesson tree ===== */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-3">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/studio"
                onClick={(e) => {
                  if (confirmLeaveIfDirty()) return
                  e.preventDefault()
                }}
                className="text-xs text-ds-subtle hover:text-ds-accent"
              >
                &larr; Studio
              </Link>
              <button
                type="button"
                title={course.published ? 'Đang công khai — bấm để chuyển nháp' : 'Đang nháp — bấm để xuất bản'}
                onClick={() => uc((p) => ({ ...p, published: !p.published }))}
                className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${pubCls}`}
              >
                {course.published ? 'Đã xuất bản' : 'Bản nháp'}
              </button>
            </div>
            <p className={`text-[11px] ${isDirty ? 'text-amber-300' : 'text-emerald-300'}`}>{isDirty ? 'Chưa lưu' : 'Đã lưu'}</p>
            <h2 className="text-sm font-semibold text-white truncate">{course.title}</h2>
            <p className="text-[11px] text-ds-subtle mt-0.5">{modules.length} chương &middot; {course.lessons.length} bài</p>
            <CohortStudioNavLink slug={slug} course={course} />
          </div>

          <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-2 space-y-1">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-ds-subtle">Chương</span>
              <button onClick={addModule} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">+ Chương</button>
            </div>
            <div className="space-y-0.5 max-h-[calc(100vh-300px)] overflow-auto pr-1">
              {modules.map((mod, mi) => {
                const modLessons = course.lessons.filter((l) => l.moduleId === mod._id).sort((a, b) => a.order - b.order)
                const isCollapsed = collapsed[mod._id!]
                return (
                  <div key={mod._id}>
                    {/* Module header */}
                    <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-white/3 hover:bg-white/5 transition-colors group/mod">
                      <button onClick={() => toggleCollapse(mod._id!)} className="text-[10px] text-ds-subtle w-4 text-center">
                        {isCollapsed ? '\u25B6' : '\u25BC'}
                      </button>
                      <span className="text-sm">{mod.icon || '\uD83D\uDCC1'}</span>
                      {editingModId === mod._id ? (
                        <input
                          autoFocus
                          defaultValue={mod.title}
                          onBlur={(e) => renameModule(mod._id!, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renameModule(mod._id!, (e.target as HTMLInputElement).value) }}
                          className="flex-1 bg-transparent text-xs text-white border-b border-ds-accent-strong focus:outline-none px-1"
                        />
                      ) : (
                        <span className="flex-1 text-xs text-white truncate cursor-pointer" onDoubleClick={() => setEditingModId(mod._id!)}>
                          {mod.title}
                        </span>
                      )}
                      <span className="text-[10px] text-ds-subtle">{modLessons.length}</span>
                      {(mod.materials?.length ?? 0) > 0 && (
                        <span className="text-[9px] min-w-[1rem] text-center px-1 rounded-full bg-cyan-500/20 text-cyan-200" title="Số tài liệu">
                          {mod.materials!.length}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setMaterialsModId(mod._id!)
                            setEditingModId(null)
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            materialsModId === mod._id
                              ? 'text-cyan-200 bg-cyan-500/20 border border-cyan-500/30'
                              : 'text-ds-muted hover:text-ds-accent border border-transparent'
                          }`}
                          title="Tài liệu chương (PDF, liên kết)"
                        >
                          Tài liệu
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/mod:opacity-100 transition-opacity">
                          <button onClick={() => moveModule(mi, mi - 1)} disabled={mi === 0} className="text-[10px] text-ds-subtle hover:text-white disabled:opacity-20">&uarr;</button>
                          <button onClick={() => moveModule(mi, mi + 1)} disabled={mi === modules.length - 1} className="text-[10px] text-ds-subtle hover:text-white disabled:opacity-20">&darr;</button>
                          <button onClick={() => setEditingModId(mod._id!)} className="text-[10px] text-ds-subtle hover:text-ds-accent" title="Đổi tên">&#x270E;</button>
                          <button onClick={() => deleteModule(mod._id!)} className="text-[10px] text-red-500/50 hover:text-red-400">&times;</button>
                        </div>
                      </div>
                    </div>
                    {/* Lessons in module */}
                    {!isCollapsed && (
                      <div className="ml-4 border-l border-white/5 pl-1 space-y-0.5 mt-0.5">
                        {modLessons.map((l) => {
                          const gi = course.lessons.indexOf(l)
                          return (
                            <div
                              key={l.slug}
                              onClick={() => setSi(gi)}
                              className={`group rounded-md px-2 py-1.5 cursor-pointer transition-all flex gap-2 ${gi === si ? 'bg-ds-accent-soft border border-ds-accent-strong' : 'border border-transparent hover:bg-white/5'}`}
                            >
                              <LessonTypeIcon type={lessonTypeIconKey(l)} size="xs" className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-white truncate">{l.title}</p>
                                <p className="text-[10px] text-ds-subtle">{(l.sections?.length ?? 0)} khối</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-0.5 ${gi === si ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                <button onClick={(e) => { e.stopPropagation(); dupLesson(gi) }} className="text-[10px] text-ds-subtle hover:text-ds-accent">dup</button>
                                <button onClick={(e) => { e.stopPropagation(); delLesson(gi) }} className="text-[10px] text-red-500/50 hover:text-red-400 ml-auto">&times;</button>
                              </div>
                            </div>
                          )
                        })}
                        <button onClick={() => addLessonToModule(mod._id!)} className="w-full text-[10px] text-ds-subtle hover:text-ds-accent py-1 text-center border border-dashed border-ds-border rounded-md hover:border-ds-accent-strong transition-colors">
                          + Lesson
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Unassigned lessons */}
              {unassigned.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-ds-subtle px-2 mb-1">Unassigned</p>
                  {unassigned.map((l) => {
                    const gi = course.lessons.indexOf(l)
                    return (
                      <div
                        key={l.slug}
                        onClick={() => setSi(gi)}
                        className={`group rounded-md px-2 py-1.5 cursor-pointer transition-all ${gi === si ? 'bg-ds-accent-soft border border-ds-accent-strong' : 'border border-transparent hover:bg-white/5'}`}
                      >
                        <p className="text-[11px] text-white truncate">{l.title}</p>
                        <div className={`flex items-center gap-1 mt-0.5 ${gi === si ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                          <button onClick={(e) => { e.stopPropagation(); delLesson(gi) }} className="text-[10px] text-red-500/50 hover:text-red-400 ml-auto">&times;</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <button onClick={addUnassignedLesson} className="w-full text-[10px] text-ds-subtle hover:text-ds-accent py-1.5 text-center border-t border-white/5 mt-1">
              + Unassigned Lesson
            </button>
          </div>

          {materialsModId && (() => {
            const mod = modules.find((m) => m._id === materialsModId)
            if (!mod) return null
            return (
              <ModuleMaterialsEditor
                moduleTitle={mod.title}
                moduleSlug={mod.slug}
                materials={mod.materials ?? []}
                courseSlug={course.slug}
                uploadEntityId={uploadEntityId}
                onError={uploadErr}
                onClose={() => setMaterialsModId(null)}
                onChange={(materials) => uc((p) => ({
                  ...p,
                  modules: p.modules.map((m) => (m._id === materialsModId ? { ...m, materials } : m)),
                }))}
              />
            )
          })()}

          <div className="flex gap-2">
            <Link
              href={`/courses/${course.slug}?preview=1`}
              onClick={(e) => {
                if (!confirmLeaveIfDirty()) e.preventDefault()
              }}
              className="flex-1 text-center text-[11px] py-2 rounded-xl border border-ds-border text-ds-muted hover:bg-white/5 transition-colors"
              title="Xem trang khóa như học viên (mở cùng cửa sổ để giữ đăng nhập)"
            >
              Xem như HV
            </Link>
            <button onClick={save} disabled={saving} className="flex-1 text-center text-[11px] py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60 font-medium transition-colors">
              {saving ? 'Saving...' : 'Save Course'}
            </button>
          </div>
          {msg && <p className={`text-xs text-center ${msg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
          {undoSnapshot ? (
            <button
              type="button"
              onClick={() => {
                setCourse(clone(undoSnapshot.course))
                setUndoSnapshot(null)
                setMsg('Đã hoàn tác thao tác xóa.')
              }}
              className="w-full text-[11px] py-2 rounded-xl border border-amber-400/35 text-amber-200 hover:bg-amber-500/10"
            >
              {undoSnapshot.label} Nhấn để hoàn tác
            </button>
          ) : null}
        </aside>

        {/* ===== RIGHT: Editor ===== */}
        <main className="space-y-4">
          <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="text-xs text-ds-muted md:col-span-2">Course Title<input value={course.title} onChange={(e) => uc((p) => ({ ...p, title: e.target.value }))} className={`mt-1 studio-field`} /></label>
              <label className="text-xs text-ds-muted">Level
                <select value={course.level} onChange={(e) => uc((p) => ({ ...p, level: e.target.value }))} className={`mt-1 studio-field`}>
                  <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="text-xs text-ds-muted">Weeks<input type="number" value={course.durationWeeks ?? ''} onChange={(e) => uc((p) => ({ ...p, durationWeeks: e.target.value ? Number(e.target.value) : null }))} className={`mt-1 studio-field`} /></label>
              {showTopBarPricing ? (
                <>
                  <label className="text-xs text-ds-muted flex items-center gap-2">
                    <input type="checkbox" checked={!!course.isPaid} onChange={(e) => uc((p) => ({ ...p, isPaid: e.target.checked }))} />
                    Paid course (catalog)
                  </label>
                  {course.isPaid && (
                    <>
                      <label className="text-xs text-ds-muted">Price (VND / USD)<input type="number" min={0} value={course.price ?? 0} onChange={(e) => uc((p) => ({ ...p, price: Math.max(0, Number(e.target.value) || 0) }))} className={`mt-1 studio-field`} /></label>
                      <label className="text-xs text-ds-muted">Currency
                        <select value={course.currency ?? 'VND'} onChange={(e) => uc((p) => ({ ...p, currency: e.target.value }))} className={`mt-1 studio-field`}>
                          <option value="VND">VND</option><option value="USD">USD</option>
                        </select>
                      </label>
                    </>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-ds-subtle md:col-span-2 leading-relaxed">
                  Giá catalog ẩn — khóa theo lớp. Cấu hình phí khi tạo cohort trong{' '}
                  <span className="text-purple-200">Lớp học theo kỳ</span>.
                </p>
              )}
            </div>
          </div>

          <CourseStorefrontEditor
            courseId={course.id}
            lessonCount={course.lessons.length}
            course={{
              slug: course.slug,
              title: course.title,
              description: course.description,
              thumbnail: course.thumbnail,
              level: course.level,
              lessonCount: course.lessons.length,
              durationWeeks: course.durationWeeks,
              isPaid: course.isPaid,
              price: course.price,
              currency: course.currency,
              requiresPayment: courseRequiresPayment(course),
              catalogEnabled: course.catalogEnabled !== false,
              distributionStrategy: resolveDistributionStrategy(course),
              published: !!course.published,
            }}
            onChange={(patch) => uc((p) => ({ ...p, ...patch }))}
          />

          <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-300">Trang khóa học công khai</p>
            <p className="text-[10px] text-ds-subtle leading-relaxed">
              CTA gợi ý học lộ trình — hiển thị trên <span className="text-ds-subtle">/courses/&lt;slug&gt;</span>.
            </p>
            <label className="text-xs text-ds-muted block">
              Liên kết
              <input
                value={course.crossSellTutorialHref ?? ''}
                onChange={(e) => uc((p) => ({ ...p, crossSellTutorialHref: e.target.value || '/tutorial' }))}
                className={`mt-1 studio-field`}
                placeholder="/tutorial"
              />
            </label>
            <label className="text-xs text-ds-muted block">
              Tiêu đề (VI)
              <input
                value={course.crossSellTutorialLabelVi ?? ''}
                onChange={(e) => uc((p) => ({ ...p, crossSellTutorialLabelVi: e.target.value }))}
                className={`mt-1 studio-field`}
                placeholder="Học thêm miễn phí · Lộ trình"
              />
            </label>
            <label className="text-xs text-ds-muted block">
              Mô tả ngắn (VI)
              <textarea
                value={course.crossSellTutorialBodyVi ?? ''}
                onChange={(e) => uc((p) => ({ ...p, crossSellTutorialBodyVi: e.target.value }))}
                rows={3}
                className={`mt-1 studio-field`}
                placeholder="Gợi ý học lộ trình song song..."
              />
            </label>
          </div>

          {lesson && (
            <>
              <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-white/5">
                  <input value={lesson.title} onChange={(e) => ul((l) => ({ ...l, title: e.target.value }))} className="text-lg font-semibold text-white bg-transparent border-none focus:outline-none w-full placeholder-gray-600" placeholder="Lesson title..." />
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[11px] text-ds-subtle">slug: {lesson.slug}</p>
                    <label className="text-[11px] text-ds-subtle flex items-center gap-1">
                      Chương:
                      <select
                        value={lesson.moduleId ?? ''}
                        onChange={(e) => ul((l) => ({ ...l, moduleId: e.target.value || null }))}
                        className="bg-transparent border border-ds-border rounded px-1 py-0.5 text-[11px] text-gray-300 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {modules.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 px-4 py-1.5 bg-black/20">
                  {(['blocks', 'quiz', 'settings', 'preview'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? (t === 'preview' ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-500/20' : 'bg-cyan-600/90 text-white shadow-lg shadow-cyan-500/20') : 'text-ds-subtle hover:text-white hover:bg-white/5'}`}>
                      {t === 'blocks' ? `Blocks (${(lesson.sections?.length ?? 0)})` : t === 'quiz' ? `Quiz (${(lesson.quizQuestions?.length ?? 0)})` : t === 'preview' ? '\u25B6 Preview' : 'Settings'}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'blocks' && (
                <div className="space-y-3">
                  {blockActions.hasClipboard ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => blockActions.pasteAfter((lesson.sections?.length ?? 1) - 1)}
                        className="text-xs text-ds-accent hover:text-white border border-ds-accent-strong rounded-lg px-2.5 py-1"
                      >
                        Paste copied block
                      </button>
                    </div>
                  ) : null}
                  {(lesson.sections ?? []).map((sec, bi) => (
                    <div key={bi} className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4 space-y-3 group/block relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-700 w-5 text-right">{bi + 1}</span>
                          <div className="h-3 w-px bg-white/10" />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                          <button type="button" onClick={() => blockActions.moveUp(bi)} disabled={bi === 0} className="text-[10px] text-ds-subtle hover:text-white disabled:opacity-20 px-1">&uarr;</button>
                          <button type="button" onClick={() => blockActions.moveDown(bi)} disabled={bi === (lesson.sections?.length ?? 0) - 1} className="text-[10px] text-ds-subtle hover:text-white disabled:opacity-20 px-1">&darr;</button>
                          <button type="button" onClick={() => blockActions.copyAt(bi)} className="text-[10px] text-ds-subtle hover:text-ds-accent px-1" title="Copy block to clipboard">Cp</button>
                          <button type="button" onClick={() => blockActions.duplicateAt(bi)} className="text-[10px] text-ds-subtle hover:text-ds-accent px-1" title="Duplicate block">&#x2398;</button>
                          <button type="button" onClick={() => blockActions.removeAt(bi)} className="text-[10px] text-red-500/50 hover:text-red-400 px-1">&times;</button>
                        </div>
                      </div>
                      <BlockEditor
                        section={sec}
                        onChange={(updated) => blockActions.updateAt(bi, updated)}
                        uploadContext={{
                          purpose: 'course-block',
                          entityId: uploadEntityId,
                          slug: course.slug,
                          lessonSlug: lesson.slug,
                          variant:
                            sec.type === 'image' || sec.type === 'gif'
                              ? `image-${bi}`
                              : sec.type === 'video'
                                ? `video-${bi}`
                                : sec.type === '3d'
                                  ? `model-${bi}`
                                  : `block-${bi}`,
                        }}
                      />
                    </div>
                  ))}
                  <BlockPalette onAdd={(sec) => blockActions.append(sec)} />
                </div>
              )}

              {tab === 'quiz' && (
                <div className="space-y-3">
                  {(lesson.quizQuestions ?? []).map((q, qi) => {
                    const answerIdx = mcqAnswerIndex(q)
                    const optionTexts = mcqOptionTexts(q)
                    return (
                    <div key={q.id || qi} className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ds-accent bg-ds-accent-soft px-2 py-0.5 rounded">Q{qi + 1}</span>
                        <input value={q.question} onChange={(e) => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = { ...qs[qi], question: e.target.value }; return { ...l, quizQuestions: qs } })} placeholder="Question text" className={`flex-1 studio-field`} />
                        <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; if (qi > 0) [qs[qi - 1], qs[qi]] = [qs[qi], qs[qi - 1]]; return { ...l, quizQuestions: qs } })} disabled={qi === 0} className="text-xs text-ds-subtle hover:text-white disabled:opacity-20">&uarr;</button>
                        <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; if (qi < qs.length - 1) [qs[qi], qs[qi + 1]] = [qs[qi + 1], qs[qi]]; return { ...l, quizQuestions: qs } })} disabled={qi === (lesson.quizQuestions?.length ?? 0) - 1} className="text-xs text-ds-subtle hover:text-white disabled:opacity-20">&darr;</button>
                        <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs.splice(qi, 1); return { ...l, quizQuestions: qs } })} className="text-xs text-red-500/50 hover:text-red-400">&times;</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-10">
                        {optionTexts.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`q-${si}-${qi}`} checked={answerIdx === oi} onChange={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = setMcqAnswer(qs[qi], oi); return { ...l, quizQuestions: qs } })} className="accent-cyan-500" />
                            <input value={opt} onChange={(e) => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = patchMcqOption(qs[qi], oi, e.target.value); return { ...l, quizQuestions: qs } })} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className={`flex-1 studio-field ${answerIdx === oi ? '!border-emerald-500/30' : ''}`} />
                          </div>
                        ))}
                      </div>
                      <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = patchMcqOption(qs[qi], (qs[qi].options?.length ?? 0), ''); return { ...l, quizQuestions: qs } })} className="ml-10 text-[11px] text-ds-subtle hover:text-ds-accent border border-dashed border-ds-border rounded-lg px-3 py-1 hover:border-ds-accent-strong transition-colors">+ Add option</button>
                    </div>
                  )})}
                  <button onClick={() => ul((l) => ({ ...l, quizQuestions: [...(l.quizQuestions ?? []), makeQuiz()] }))} className="w-full py-3 rounded-xl border-2 border-dashed border-ds-border-strong text-ds-subtle hover:border-ds-accent-strong hover:text-ds-accent transition-all text-sm">+ Add Question</button>
                </div>
              )}

              {tab === 'settings' && (
                <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-xs text-ds-muted">Slug<input value={lesson.slug} onChange={(e) => ul((l) => ({ ...l, slug: e.target.value }))} className={`mt-1 studio-field`} /></label>
                    <label className="text-xs text-ds-muted">Type
                      <select value={lesson.type} onChange={(e) => ul((l) => ({ ...l, type: e.target.value as Lesson['type'] }))} className={`mt-1 studio-field`}>
                        <option value="text">Text</option><option value="visualization">Visualization</option><option value="quiz">Quiz</option><option value="assignment">Assignment</option><option value="live_session">Live session</option>
                      </select>
                    </label>
                    <p className="text-[11px] text-ds-subtle md:col-span-2 rounded-lg border border-ds-border/60 bg-white/[0.03] px-3 py-2">
                      Lịch theo tuần được đặt ở <strong className="text-white/90">Cohort → Ánh xạ Chương → Tuần</strong>, không
                      gán trong Studio.
                    </p>
                    {lesson.type === 'quiz' && (
                      <>
                        <label className="text-xs text-ds-muted">Reveal đáp án
                          <select
                            value={lesson.quizSettings?.revealMode ?? 'after_submit'}
                            onChange={(e) => ul((l) => ({
                              ...l,
                              quizSettings: { ...(l.quizSettings ?? { revealMode: 'after_submit' }), revealMode: e.target.value as 'after_submit' | 'after_each_question' | 'never' },
                            }))}
                            className="mt-1 studio-field"
                          >
                            <option value="after_submit">Sau khi nộp bài</option>
                            <option value="after_each_question">Sau từng câu (xác nhận)</option>
                            <option value="never">Không hiện đáp án</option>
                          </select>
                        </label>
                        <label className="text-xs text-ds-muted">Giới hạn phút
                          <input type="number" min={0} value={lesson.quizSettings?.timeLimitMinutes ?? ''} onChange={(e) => ul((l) => ({
                            ...l,
                            quizSettings: { ...(l.quizSettings ?? { revealMode: 'after_submit' }), timeLimitMinutes: e.target.value ? Number(e.target.value) : null },
                          }))} className="mt-1 studio-field" />
                        </label>
                        <label className="text-xs text-ds-muted">Số lần làm tối đa
                          <input type="number" min={1} value={lesson.quizSettings?.maxAttempts ?? ''} onChange={(e) => ul((l) => ({
                            ...l,
                            quizSettings: { ...(l.quizSettings ?? { revealMode: 'after_submit' }), maxAttempts: e.target.value ? Number(e.target.value) : null },
                          }))} className="mt-1 studio-field" />
                        </label>
                        <label className="text-xs text-ds-muted flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!lesson.quizSettings?.shuffleOptions}
                            onChange={(e) => ul((l) => ({
                              ...l,
                              quizSettings: { ...(l.quizSettings ?? { revealMode: 'after_submit' }), shuffleOptions: e.target.checked },
                            }))}
                          />
                          Xáo trộn đáp án
                        </label>
                        <label className="text-xs text-ds-muted">Điểm đạt (%)
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={lesson.quizSettings?.passingScorePct ?? ''}
                            onChange={(e) => ul((l) => ({
                              ...l,
                              quizSettings: {
                                ...(l.quizSettings ?? { revealMode: 'after_submit' }),
                                passingScorePct: e.target.value ? Number(e.target.value) : null,
                              },
                            }))}
                            className="mt-1 studio-field"
                          />
                        </label>
                      </>
                    )}
                    {lesson.type === 'assignment' && (
                      <>
                        <label className="text-xs text-ds-muted md:col-span-2">Đề bài (brief)
                          <textarea
                            value={lesson.content || ''}
                            onChange={(e) => ul((l) => ({ ...l, content: e.target.value }))}
                            rows={4}
                            className="mt-1 studio-field"
                            placeholder="Yêu cầu nộp bài, rubric ngắn..."
                          />
                        </label>
                        <label className="text-xs text-ds-muted">Số file tối đa
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={lesson.assignmentSettings?.maxFiles ?? 5}
                            onChange={(e) => ul((l) => ({
                              ...l,
                              assignmentSettings: {
                                ...(l.assignmentSettings ?? {}),
                                maxFiles: Number(e.target.value) || 5,
                              },
                            }))}
                            className="mt-1 studio-field"
                          />
                        </label>
                      </>
                    )}
                    {lesson.type === 'live_session' && (
                      <label className="text-xs text-ds-muted md:col-span-2">Link học online
                        <input value={lesson.meetingUrl ?? ''} onChange={(e) => ul((l) => ({ ...l, meetingUrl: e.target.value || null }))} className="mt-1 studio-field" placeholder="https://zoom.us/..." />
                      </label>
                    )}
                    <div className="text-xs text-ds-muted">3D Earth Simulation<div className="mt-1"><StageTimePicker value={lesson.stageTime ?? null} onChange={(v) => ul((l) => ({ ...l, stageTime: v }))} /></div></div>
                    <div className="text-xs text-ds-muted">Video URL<div className="flex gap-2 mt-1"><input value={lesson.videoUrl ?? ''} onChange={(e) => ul((l) => ({ ...l, videoUrl: e.target.value || null }))} placeholder="YouTube or upload" className="studio-field" /><UploadBtn accept="video/*" onUrl={(u) => ul((l) => ({ ...l, videoUrl: u }))} onError={uploadErr} label="Upload" uploadContext={{ purpose: 'course-lesson', entityId: uploadEntityId, slug: course.slug, lessonSlug: lesson.slug, variant: 'video' }} /></div></div>
                    <div className="text-xs text-ds-muted">Cover Image<div className="flex gap-2 mt-1"><input value={lesson.coverImage ?? ''} onChange={(e) => ul((l) => ({ ...l, coverImage: e.target.value || null }))} placeholder="URL or upload" className="studio-field" /><UploadBtn accept="image/*" onUrl={(u) => ul((l) => ({ ...l, coverImage: u }))} onError={uploadErr} label="Upload" uploadContext={{ purpose: 'course-lesson', entityId: uploadEntityId, slug: course.slug, lessonSlug: lesson.slug, variant: 'cover' }} /></div>{lesson.coverImage && <img src={lesson.coverImage} alt="" className="mt-2 h-20 rounded-lg object-cover border border-ds-border" />}</div>
                    <label className="text-xs text-ds-muted md:col-span-2">Description<textarea value={lesson.description} onChange={(e) => ul((l) => ({ ...l, description: e.target.value }))} rows={2} className={`mt-1 studio-field`} /></label>
                    <label className="text-xs text-ds-muted md:col-span-2">Learning Goals (one per line)<textarea rows={3} value={(lesson.learningGoals ?? []).join('\n')} onChange={(e) => ul((l) => ({ ...l, learningGoals: e.target.value.split('\n').filter(Boolean) }))} className={`mt-1 studio-field`} placeholder="Each line = one goal" /></label>
                  </div>
                </div>
              )}

              {tab === 'preview' && (
                <div className="rounded-2xl border border-emerald-500/20 bg-ds-surface overflow-hidden">
                  <div className="px-4 py-2 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-emerald-300">Live Preview</span>
                    <span className="text-[10px] text-ds-subtle ml-2">Student will see this</span>
                  </div>
                  <div className="p-5 max-w-4xl mx-auto">
                    <LessonPreview lesson={lesson} />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
