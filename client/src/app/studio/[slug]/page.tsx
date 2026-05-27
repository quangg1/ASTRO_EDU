'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  fetchCourseForEditor,
  saveCourseFromEditor,
  uploadMedia,
  type Course,
  type CourseModule,
  type Lesson,
  type LessonSection,
  type QuizQuestion,
} from '@/lib/coursesApi'
import { useAuthStore } from '@/store/useAuthStore'

const BlockEditor = dynamic(() => import('@/components/studio/BlockEditor'), { ssr: false })
const BlockPalette = dynamic(() => import('@/components/studio/BlockPalette'), { ssr: false })
const LessonPreview = dynamic(() => import('@/components/studio/LessonPreview'), { ssr: false })
const StageTimePicker = dynamic(() => import('@/components/studio/StageTimePicker'), { ssr: false })

type EditorCourse = Course & { modules: CourseModule[]; lessons: Lesson[] }
type Tab = 'blocks' | 'quiz' | 'settings' | 'preview'

function clone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) }
function slugify(t: string) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) }
function genId() { return `m${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

function makeModule(n: number): CourseModule {
  const id = genId()
  return { _id: id, title: `Module ${n + 1}`, slug: `module-${n + 1}`, description: '', icon: '', order: n }
}

function makeLesson(n: number, moduleId?: string): Lesson {
  return { title: `New Lesson ${n + 1}`, slug: `lesson-${Date.now()}-${n}`, description: '', type: 'text', visualizationId: null, stageTime: null, videoUrl: null, coverImage: null, galleryImages: [], week: null, moduleId: moduleId || null, content: '', learningGoals: [], sections: [], quizQuestions: [], resourceLinks: [], sourcePdf: null, sourcePageCount: null, order: n }
}

function makeQuiz(): QuizQuestion { return { question: '', options: ['', '', '', ''], correctIndex: 0 } }

const ch = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const inputCls = 'w-full bg-black/50 border border-white/15 px-3 py-1.5 text-white text-sm focus:border-cyan-500/50 focus:outline-none transition-colors'

function Brackets({ c = '#7ee7ff', s = 12, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.6, pointerEvents: 'none', ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
    </>
  )
}

function UploadBtn({ accept, onUrl, label }: { accept: string; onUrl: (u: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setBusy(true); const r = await uploadMedia(f); setBusy(false)
    if (r.success && r.url) onUrl(r.url)
    if (ref.current) ref.current.value = ''
  }
  return (
    <>
      <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden" />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        style={{
          flexShrink: 0, background: 'rgba(126,231,255,0.07)', border: '1px solid rgba(126,231,255,0.2)',
          color: '#7ee7ff', padding: '6px 12px', ...mono, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase' as const,
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, ...ch(6),
        }}
      >
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
  const [tab, setTab] = useState<Tab>('blocks')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingModId, setEditingModId] = useState<string | null>(null)
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setUtcTime(`${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  useEffect(() => { if (checked && !user) router.replace(`/login?redirect=/studio/${slug}`) }, [checked, user, slug, router])

  useEffect(() => {
    if (!slug || !user) return
    fetchCourseForEditor(slug).then((c) => {
      if (c?.lessons) {
        const modules = (c.modules ?? []) as CourseModule[]
        if (modules.length === 0 && c.lessons.length > 0) {
          const weekSet = new Set(c.lessons.map((l: Lesson) => l.week ?? 1))
          const autoModules: CourseModule[] = Array.from(weekSet).sort((a, b) => a - b).map((w, i) => ({
            _id: `auto-w${w}`, title: `Module ${w}`, slug: `module-${w}`, description: '', icon: '', order: i,
          }))
          const fixedLessons = (c.lessons as Lesson[]).map((l) => ({ ...l, moduleId: l.moduleId || `auto-w${l.week ?? 1}` }))
          setCourse({ ...(c as Course), modules: autoModules, lessons: fixedLessons })
        } else {
          setCourse({ ...(c as Course), modules, lessons: c.lessons as Lesson[] })
        }
      }
      setLoading(false)
    })
  }, [slug, user])

  const lesson = useMemo(() => course?.lessons?.[si] ?? null, [course, si])
  const modules = useMemo(() => (course?.modules ?? []).sort((a, b) => a.order - b.order), [course])

  const uc = useCallback((fn: (p: EditorCourse) => EditorCourse) => setCourse((p) => p ? fn(p) : p), [])
  const ul = useCallback((fn: (l: Lesson) => Lesson) => uc((p) => { const ls = [...p.lessons]; ls[si] = fn(clone(ls[si])); return { ...p, lessons: ls } }), [si, uc])

  const addModule = () => { uc((p) => ({ ...p, modules: [...p.modules, makeModule(p.modules.length)].map((m, i) => ({ ...m, order: i })) })) }
  const renameModule = (id: string, title: string) => { uc((p) => ({ ...p, modules: p.modules.map((m) => m._id === id ? { ...m, title, slug: slugify(title) } : m) })); setEditingModId(null) }
  const deleteModule = (id: string) => {
    if (!confirm('Delete this module and unassign its lessons?')) return
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
  const delLesson = (i: number) => { if (!confirm('Delete this lesson?')) return; uc((p) => ({ ...p, lessons: p.lessons.filter((_, j) => j !== i).map((l, j) => ({ ...l, order: j })) })); setSi((v) => Math.max(0, Math.min(v, (course?.lessons.length ?? 1) - 2))) }

  const toggleCollapse = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }))

  const save = async () => {
    if (!course) return; setSaving(true); setMsg(null)
    const r = await saveCourseFromEditor(slug, {
      title: course.title, description: course.description, level: course.level,
      durationWeeks: course.durationWeeks, published: !!course.published,
      price: course.price ?? 0, currency: course.currency ?? 'VND', isPaid: !!course.isPaid,
      modules: course.modules.map((m, i) => ({ ...m, order: i })),
      lessons: course.lessons.map((l, i) => ({ ...l, order: i })),
    })
    setSaving(false); setMsg(r.success ? 'Saved!' : r.error || 'Failed')
    if (r.success) setTimeout(() => setMsg(null), 2500)
  }

  if (!checked || !user || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#03060f', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 13, letterSpacing: '0.18em', color: '#5c6886', textTransform: 'uppercase' }}>
        <span style={{ color: '#7ee7ff' }}>●</span>&nbsp;&nbsp;Loading studio…
      </div>
    )
  }
  if (!course) {
    return (
      <div style={{ minHeight: '100vh', background: '#03060f', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 13, letterSpacing: '0.18em', color: '#5c6886', textTransform: 'uppercase' }}>
        <span style={{ color: '#ff5cd4' }}>✕</span>&nbsp;&nbsp;Course not found.
      </div>
    )
  }

  const unassigned = course.lessons.filter((l) => !l.moduleId || !modules.find((m) => m._id === l.moduleId))

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', paddingTop: 72, paddingBottom: 48, fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Background atmosphere */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-8%', right: '5%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,165,36,0.055) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '45%', left: '-4%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(126,231,255,0.045) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '80px 80px', WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)', maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)' }} />
      </div>

      <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', padding: '0 16px', zIndex: 1 }}>
        {/* HUD top strip */}
        <div className="flex items-center justify-between px-4 py-2 mb-4" style={{ background: 'rgba(10,16,36,0.65)', border: '1px solid rgba(126,231,255,0.13)', borderBottom: '1px solid rgba(126,231,255,0.28)', ...ch(8) }}>
          <span style={{ ...mono, fontSize: 11.5, letterSpacing: '0.18em', color: '#7ee7ff', textTransform: 'uppercase' }}>
            // 00 · cosmolearn · studio · editor
          </span>
          <div className="flex items-center gap-5" style={{ ...mono, fontSize: 11.5, letterSpacing: '0.11em', color: '#5c6886' }}>
            <span className="hidden sm:inline">slug · <span style={{ color: '#9aa8c4' }}>{slug}</span></span>
            <span className="hidden md:inline">utc · <span style={{ color: '#9aa8c4' }}>{utcTime}</span></span>
            <span>role · <span style={{ color: '#6dffb0' }}>{user.role}</span></span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3">

          {/* ===== LEFT: Module/Lesson tree ===== */}
          <aside className="space-y-3">

            {/* Course info panel */}
            <div className="relative p-4" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.14)', ...ch(16) }}>
              <Brackets c="#7ee7ff" s={12} o={8} />
              <div style={{ ...mono, fontSize: 11, letterSpacing: '0.20em', color: '#5c6886', marginBottom: 10, textTransform: 'uppercase' }}>
                // 01 · course · overview
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Link
                  href="/studio"
                  style={{ ...mono, fontSize: 10.5, color: '#5c6886', textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#7ee7ff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#5c6886' }}
                >← Studio</Link>
                <button
                  onClick={() => uc((p) => ({ ...p, published: !p.published }))}
                  style={{
                    marginLeft: 'auto', ...mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase',
                    padding: '3px 9px', cursor: 'pointer',
                    border: `1px solid ${course.published ? 'rgba(109,255,176,0.3)' : 'rgba(245,165,36,0.3)'}`,
                    color: course.published ? '#6dffb0' : '#f5a524',
                    background: course.published ? 'rgba(109,255,176,0.07)' : 'rgba(245,165,36,0.07)',
                    ...ch(4),
                  }}
                >
                  {course.published ? '● Published' : '○ Draft'}
                </button>
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#eaf6ff', marginBottom: 4, lineHeight: 1.3 }}>{course.title}</h2>
              <div style={{ ...mono, fontSize: 10.5, color: '#5c6886', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {modules.length} modules · {course.lessons.length} lessons
              </div>
            </div>

            {/* Module tree panel */}
            <div className="relative p-3" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.12)', ...ch(14) }}>
              <Brackets c="#7ee7ff" s={10} o={6} />
              <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: '1px solid rgba(126,231,255,0.08)' }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '0.17em', color: '#5c6886', textTransform: 'uppercase' }}>// 02 · modules</span>
                <button
                  onClick={addModule}
                  style={{
                    ...mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase',
                    padding: '3px 10px', background: 'rgba(126,231,255,0.07)',
                    border: '1px solid rgba(126,231,255,0.2)', color: '#7ee7ff', cursor: 'pointer', ...ch(4),
                  }}
                >+ Module</button>
              </div>

              <div style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto', paddingRight: 2 }}>
                {modules.map((mod, mi) => {
                  const modLessons = course.lessons.filter((l) => l.moduleId === mod._id).sort((a, b) => a.order - b.order)
                  const isCollapsed = collapsed[mod._id!]
                  return (
                    <div key={mod._id} style={{ marginBottom: 3 }}>
                      <div
                        className="flex items-center gap-1 group/mod"
                        style={{ padding: '5px 7px', background: 'rgba(126,231,255,0.03)', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(126,231,255,0.06)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(126,231,255,0.03)' }}
                      >
                        <button onClick={() => toggleCollapse(mod._id!)} style={{ ...mono, fontSize: 9, color: '#5c6886', width: 14, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {isCollapsed ? '▶' : '▼'}
                        </button>
                        <span style={{ fontSize: 12 }}>{mod.icon || '📁'}</span>
                        {editingModId === mod._id ? (
                          <input
                            autoFocus
                            defaultValue={mod.title}
                            onBlur={(e) => renameModule(mod._id!, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') renameModule(mod._id!, (e.target as HTMLInputElement).value) }}
                            style={{ flex: 1, background: 'transparent', color: '#eaf6ff', fontSize: 12, border: 'none', borderBottom: '1px solid rgba(126,231,255,0.45)', outline: 'none', padding: '0 3px' }}
                          />
                        ) : (
                          <span
                            onDoubleClick={() => setEditingModId(mod._id!)}
                            style={{ flex: 1, fontSize: 12, color: '#eaf6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          >
                            {mod.title}
                          </span>
                        )}
                        <span style={{ ...mono, fontSize: 9.5, color: '#3d4f6e' }}>{modLessons.length}</span>
                        <div className="opacity-0 group-hover/mod:opacity-100 flex items-center gap-0.5 transition-opacity">
                          <button onClick={() => moveModule(mi, mi - 1)} disabled={mi === 0} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: mi === 0 ? 'not-allowed' : 'pointer', opacity: mi === 0 ? 0.2 : 1 }}>↑</button>
                          <button onClick={() => moveModule(mi, mi + 1)} disabled={mi === modules.length - 1} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: mi === modules.length - 1 ? 'not-allowed' : 'pointer', opacity: mi === modules.length - 1 ? 0.2 : 1 }}>↓</button>
                          <button onClick={() => setEditingModId(mod._id!)} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: 'pointer' }} title="Rename">✎</button>
                          <button onClick={() => deleteModule(mod._id!)} style={{ ...mono, fontSize: 10, color: 'rgba(255,92,212,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div style={{ marginLeft: 14, borderLeft: '1px solid rgba(126,231,255,0.08)', paddingLeft: 5, marginTop: 2 }}>
                          {modLessons.map((l) => {
                            const gi = course.lessons.indexOf(l)
                            const isActive = gi === si
                            return (
                              <div
                                key={l.slug}
                                onClick={() => setSi(gi)}
                                className="group"
                                style={{
                                  padding: '5px 7px', marginBottom: 2, cursor: 'pointer', transition: 'all 0.15s',
                                  background: isActive ? 'rgba(126,231,255,0.09)' : 'transparent',
                                  border: `1px solid ${isActive ? 'rgba(126,231,255,0.22)' : 'transparent'}`,
                                  ...ch(5),
                                }}
                                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(126,231,255,0.04)' }}
                                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                              >
                                <p style={{ fontSize: 12, color: isActive ? '#eaf6ff' : '#9aa8c4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{l.title}</p>
                                <p style={{ ...mono, fontSize: 10, color: '#5c6886', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l.type} · {(l.sections?.length ?? 0)} blocks</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, opacity: isActive ? 1 : 0, transition: 'opacity 0.15s' }} className="group-hover:opacity-100">
                                  <button onClick={(e) => { e.stopPropagation(); dupLesson(gi) }} style={{ ...mono, fontSize: 9.5, color: '#5c6886', background: 'none', border: 'none', cursor: 'pointer' }}>dup</button>
                                  <button onClick={(e) => { e.stopPropagation(); delLesson(gi) }} style={{ ...mono, fontSize: 9.5, color: 'rgba(255,92,212,0.5)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>×</button>
                                </div>
                              </div>
                            )
                          })}
                          <button
                            onClick={() => addLessonToModule(mod._id!)}
                            style={{ width: '100%', ...mono, fontSize: 10, letterSpacing: '0.11em', textTransform: 'uppercase', color: '#5c6886', background: 'none', border: '1px dashed rgba(126,231,255,0.1)', cursor: 'pointer', padding: '4px 0', textAlign: 'center', marginTop: 2, transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7ee7ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.28)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5c6886'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.1)' }}
                          >+ Lesson</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Unassigned lessons */}
                {unassigned.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(126,231,255,0.07)' }}>
                    <p style={{ ...mono, fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#3d4f6e', padding: '0 7px', marginBottom: 4 }}>// Unassigned</p>
                    {unassigned.map((l) => {
                      const gi = course.lessons.indexOf(l)
                      const isActive = gi === si
                      return (
                        <div
                          key={l.slug}
                          onClick={() => setSi(gi)}
                          className="group"
                          style={{
                            padding: '5px 7px', marginBottom: 2, cursor: 'pointer', transition: 'all 0.15s',
                            background: isActive ? 'rgba(126,231,255,0.09)' : 'transparent',
                            border: `1px solid ${isActive ? 'rgba(126,231,255,0.22)' : 'transparent'}`,
                            ...ch(5),
                          }}
                        >
                          <p style={{ fontSize: 12, color: isActive ? '#eaf6ff' : '#9aa8c4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
                          <div style={{ display: 'flex', marginTop: 3, opacity: isActive ? 1 : 0, transition: 'opacity 0.15s' }} className="group-hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); delLesson(gi) }} style={{ ...mono, fontSize: 9.5, color: 'rgba(255,92,212,0.5)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>×</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={addUnassignedLesson}
                style={{ width: '100%', ...mono, fontSize: 10, letterSpacing: '0.11em', textTransform: 'uppercase', color: '#5c6886', background: 'none', border: 'none', borderTop: '1px solid rgba(126,231,255,0.07)', cursor: 'pointer', padding: '7px 0', textAlign: 'center', marginTop: 5, transition: 'color 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7ee7ff' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5c6886' }}
              >+ Unassigned Lesson</button>
            </div>

            {/* Save / Student View */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link
                href={`/courses/${course.slug}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(126,231,255,0.06)', border: '1px solid rgba(126,231,255,0.18)',
                  color: '#7ee7ff', padding: '9px 0', textDecoration: 'none',
                  ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase',
                  transition: 'all 0.2s', ...ch(8),
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(126,231,255,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(126,231,255,0.1)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(126,231,255,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >Student View</Link>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  background: saving ? 'rgba(245,165,36,0.25)' : 'linear-gradient(135deg, #f5a524 0%, #e8950f 100%)',
                  color: '#1a0e00', fontWeight: 700, padding: '9px 0',
                  ...mono, fontSize: 10.5, letterSpacing: '0.15em', textTransform: 'uppercase',
                  border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 0 18px rgba(245,165,36,0.28)',
                  transition: 'all 0.2s', ...ch(8),
                }}
              >{saving ? 'Saving…' : 'Save Course'}</button>
            </div>
            {msg && (
              <div style={{ ...mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', padding: '5px', color: msg === 'Saved!' ? '#6dffb0' : '#ff5cd4' }}>
                {msg === 'Saved!' ? '● ' : '✕ '}{msg}
              </div>
            )}
          </aside>

          {/* ===== RIGHT: Editor ===== */}
          <main className="space-y-3" style={{ minWidth: 0 }}>

            {/* Course meta / settings */}
            <div className="relative p-5" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.13)', ...ch(16) }}>
              <Brackets c="#7ee7ff" s={12} o={8} />
              <div style={{ ...mono, fontSize: 11, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 14, textTransform: 'uppercase' }}>
                // 03 · course · settings
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="text-xs md:col-span-2" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Course Title
                  <input value={course.title} onChange={(e) => uc((p) => ({ ...p, title: e.target.value }))} className={`mt-1 ${inputCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
                </label>
                <label className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Level
                  <select value={course.level} onChange={(e) => uc((p) => ({ ...p, level: e.target.value }))} className={`mt-1 ${inputCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                  </select>
                </label>
                <label className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Weeks
                  <input type="number" value={course.durationWeeks ?? ''} onChange={(e) => uc((p) => ({ ...p, durationWeeks: e.target.value ? Number(e.target.value) : null }))} className={`mt-1 ${inputCls}`} />
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  <input type="checkbox" checked={!!course.isPaid} onChange={(e) => uc((p) => ({ ...p, isPaid: e.target.checked }))} style={{ accentColor: '#f5a524' }} />
                  Paid Course
                </label>
                {course.isPaid && (
                  <>
                    <label className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Price (VND / USD)
                      <input type="number" min={0} value={course.price ?? 0} onChange={(e) => uc((p) => ({ ...p, price: Math.max(0, Number(e.target.value) || 0) }))} className={`mt-1 ${inputCls}`} />
                    </label>
                    <label className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Currency
                      <select value={course.currency ?? 'VND'} onChange={(e) => uc((p) => ({ ...p, currency: e.target.value }))} className={`mt-1 ${inputCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        <option value="VND">VND</option><option value="USD">USD</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            </div>

            {lesson && (
              <>
                {/* Lesson header + tabs */}
                <div className="relative" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.13)', ...ch(14) }}>
                  <Brackets c="#7ee7ff" s={10} o={6} />
                  <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(126,231,255,0.07)' }}>
                    <div style={{ ...mono, fontSize: 11, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 10, textTransform: 'uppercase' }}>
                      // 04 · lesson · editor
                    </div>
                    <input
                      value={lesson.title}
                      onChange={(e) => ul((l) => ({ ...l, title: e.target.value }))}
                      style={{ fontSize: 19, fontWeight: 600, color: '#eaf6ff', background: 'transparent', border: 'none', outline: 'none', width: '100%', fontFamily: "'Space Grotesk', sans-serif" }}
                      placeholder="Lesson title..."
                    />
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span style={{ ...mono, fontSize: 10.5, color: '#3d4f6e', letterSpacing: '0.09em' }}>slug: {lesson.slug}</span>
                      <label style={{ ...mono, fontSize: 10.5, color: '#5c6886', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                        Module:
                        <select
                          value={lesson.moduleId ?? ''}
                          onChange={(e) => ul((l) => ({ ...l, moduleId: e.target.value || null }))}
                          style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(126,231,255,0.14)', color: '#eaf6ff', padding: '2px 6px', fontSize: 11, outline: 'none', fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          <option value="">Unassigned</option>
                          {modules.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Tab bar */}
                  <div className="flex items-center gap-1 px-4 py-2" style={{ background: 'rgba(0,0,0,0.18)' }}>
                    {(['blocks', 'quiz', 'settings', 'preview'] as const).map((t) => {
                      const isActive = tab === t
                      const isPreview = t === 'preview'
                      return (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          style={{
                            padding: '5px 13px', cursor: 'pointer',
                            ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase',
                            background: isActive ? (isPreview ? 'rgba(109,255,176,0.12)' : 'rgba(126,231,255,0.1)') : 'transparent',
                            color: isActive ? (isPreview ? '#6dffb0' : '#7ee7ff') : '#5c6886',
                            border: isActive ? `1px solid ${isPreview ? 'rgba(109,255,176,0.22)' : 'rgba(126,231,255,0.22)'}` : '1px solid transparent',
                            boxShadow: isActive ? (isPreview ? '0 0 10px rgba(109,255,176,0.1)' : '0 0 10px rgba(126,231,255,0.08)') : 'none',
                            transition: 'all 0.15s', ...ch(5),
                          }}
                        >
                          {t === 'blocks' ? `Blocks (${(lesson.sections?.length ?? 0)})` : t === 'quiz' ? `Quiz (${(lesson.quizQuestions?.length ?? 0)})` : t === 'preview' ? '▶ Preview' : 'Settings'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Blocks tab */}
                {tab === 'blocks' && (
                  <div className="space-y-2">
                    {(lesson.sections ?? []).map((sec, bi) => (
                      <div key={bi} className="relative p-4 group/block" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.09)', ...ch(10) }}>
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ ...mono, fontSize: 10, color: '#3d4f6e', letterSpacing: '0.1em' }}>{String(bi + 1).padStart(2, '0')}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                            <button onClick={() => ul((l) => { const s = [...(l.sections ?? [])]; if (bi > 0) [s[bi - 1], s[bi]] = [s[bi], s[bi - 1]]; return { ...l, sections: s } })} disabled={bi === 0} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: bi === 0 ? 'not-allowed' : 'pointer', opacity: bi === 0 ? 0.2 : 1, padding: '0 3px' }}>↑</button>
                            <button onClick={() => ul((l) => { const s = [...(l.sections ?? [])]; if (bi < s.length - 1) [s[bi], s[bi + 1]] = [s[bi + 1], s[bi]]; return { ...l, sections: s } })} disabled={bi === (lesson.sections?.length ?? 0) - 1} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: bi === (lesson.sections?.length ?? 0) - 1 ? 'not-allowed' : 'pointer', opacity: bi === (lesson.sections?.length ?? 0) - 1 ? 0.2 : 1, padding: '0 3px' }}>↓</button>
                            <button onClick={() => ul((l) => { const s = [...(l.sections ?? [])]; s.splice(bi + 1, 0, clone(s[bi])); return { ...l, sections: s } })} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px' }} title="Duplicate block">⊘</button>
                            <button onClick={() => ul((l) => { const s = [...(l.sections ?? [])]; s.splice(bi, 1); return { ...l, sections: s } })} style={{ ...mono, fontSize: 10, color: 'rgba(255,92,212,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px' }}>×</button>
                          </div>
                        </div>
                        <BlockEditor section={sec} onChange={(updated) => ul((l) => { const s = [...(l.sections ?? [])]; s[bi] = updated; return { ...l, sections: s } })} />
                      </div>
                    ))}
                    <BlockPalette onAdd={(sec) => ul((l) => ({ ...l, sections: [...(l.sections ?? []), sec] }))} />
                  </div>
                )}

                {/* Quiz tab */}
                {tab === 'quiz' && (
                  <div className="space-y-3">
                    {(lesson.quizQuestions ?? []).map((q, qi) => (
                      <div key={qi} className="relative p-4" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.1)', ...ch(12) }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.11em', color: '#7ee7ff', background: 'rgba(126,231,255,0.07)', border: '1px solid rgba(126,231,255,0.18)', padding: '2px 7px', ...ch(4) }}>Q{qi + 1}</span>
                          <input value={q.question} onChange={(e) => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = { ...qs[qi], question: e.target.value }; return { ...l, quizQuestions: qs } })} placeholder="Question text" className={`flex-1 ${inputCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
                          <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; if (qi > 0) [qs[qi - 1], qs[qi]] = [qs[qi], qs[qi - 1]]; return { ...l, quizQuestions: qs } })} disabled={qi === 0} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: qi === 0 ? 'not-allowed' : 'pointer', opacity: qi === 0 ? 0.2 : 1 }}>↑</button>
                          <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; if (qi < qs.length - 1) [qs[qi], qs[qi + 1]] = [qs[qi + 1], qs[qi]]; return { ...l, quizQuestions: qs } })} disabled={qi === (lesson.quizQuestions?.length ?? 0) - 1} style={{ ...mono, fontSize: 10, color: '#5c6886', background: 'none', border: 'none', cursor: qi === (lesson.quizQuestions?.length ?? 0) - 1 ? 'not-allowed' : 'pointer', opacity: qi === (lesson.quizQuestions?.length ?? 0) - 1 ? 0.2 : 1 }}>↓</button>
                          <button onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs.splice(qi, 1); return { ...l, quizQuestions: qs } })} style={{ ...mono, fontSize: 10, color: 'rgba(255,92,212,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-10">
                          {(q.options || []).map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input type="radio" name={`q-${si}-${qi}`} checked={q.correctIndex === oi} onChange={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = { ...qs[qi], correctIndex: oi }; return { ...l, quizQuestions: qs } })} style={{ accentColor: '#6dffb0' }} />
                              <input value={opt} onChange={(e) => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; const opts = [...(qs[qi].options || [])]; opts[oi] = e.target.value; qs[qi] = { ...qs[qi], options: opts }; return { ...l, quizQuestions: qs } })} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className={`flex-1 ${inputCls} ${q.correctIndex === oi ? '!border-emerald-500/30' : ''}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => ul((l) => { const qs = [...(l.quizQuestions ?? [])]; qs[qi] = { ...qs[qi], options: [...(qs[qi].options || []), ''] }; return { ...l, quizQuestions: qs } })}
                          style={{ marginLeft: 40, marginTop: 8, ...mono, fontSize: 10, letterSpacing: '0.11em', textTransform: 'uppercase', color: '#5c6886', background: 'none', border: '1px dashed rgba(126,231,255,0.12)', cursor: 'pointer', padding: '4px 11px', transition: 'all 0.15s', ...ch(4) }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7ee7ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.28)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5c6886'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.12)' }}
                        >+ Add Option</button>
                      </div>
                    ))}
                    <button
                      onClick={() => ul((l) => ({ ...l, quizQuestions: [...(l.quizQuestions ?? []), makeQuiz()] }))}
                      style={{ width: '100%', padding: '12px 0', ...mono, fontSize: 10.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#5c6886', background: 'rgba(6,9,26,0.5)', border: '2px dashed rgba(126,231,255,0.1)', cursor: 'pointer', transition: 'all 0.15s', ...ch(10) }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7ee7ff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.28)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#5c6886'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.1)' }}
                    >+ Add Question</button>
                  </div>
                )}

                {/* Settings tab */}
                {tab === 'settings' && (
                  <div className="relative p-5 space-y-4" style={{ background: 'rgba(6,9,26,0.88)', border: '1px solid rgba(126,231,255,0.13)', ...ch(14) }}>
                    <Brackets c="#7ee7ff" s={10} o={6} />
                    <div style={{ ...mono, fontSize: 11, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 4, textTransform: 'uppercase' }}>
                      // 05 · lesson · settings
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Slug<input value={lesson.slug} onChange={(e) => ul((l) => ({ ...l, slug: e.target.value }))} className={`mt-1 ${inputCls}`} />
                      </label>
                      <label className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Type
                        <select value={lesson.type} onChange={(e) => ul((l) => ({ ...l, type: e.target.value as Lesson['type'] }))} className={`mt-1 ${inputCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          <option value="text">Text</option><option value="visualization">Visualization</option><option value="quiz">Quiz</option>
                        </select>
                      </label>
                      <div className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        3D Earth Simulation<div className="mt-1"><StageTimePicker value={lesson.stageTime ?? null} onChange={(v) => ul((l) => ({ ...l, stageTime: v }))} /></div>
                      </div>
                      <div className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Video URL
                        <div className="flex gap-2 mt-1">
                          <input value={lesson.videoUrl ?? ''} onChange={(e) => ul((l) => ({ ...l, videoUrl: e.target.value || null }))} placeholder="YouTube or upload" className={inputCls} style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
                          <UploadBtn accept="video/*" onUrl={(u) => ul((l) => ({ ...l, videoUrl: u }))} label="Upload" />
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Cover Image
                        <div className="flex gap-2 mt-1">
                          <input value={lesson.coverImage ?? ''} onChange={(e) => ul((l) => ({ ...l, coverImage: e.target.value || null }))} placeholder="URL or upload" className={inputCls} style={{ fontFamily: "'Space Grotesk', sans-serif" }} />
                          <UploadBtn accept="image/*" onUrl={(u) => ul((l) => ({ ...l, coverImage: u }))} label="Upload" />
                        </div>
                        {lesson.coverImage && <img src={lesson.coverImage} alt="" style={{ marginTop: 8, height: 80, objectFit: 'cover', border: '1px solid rgba(126,231,255,0.14)', display: 'block', ...ch(6) }} />}
                      </div>
                      <label className="text-xs md:col-span-2" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Description
                        <textarea value={lesson.description} onChange={(e) => ul((l) => ({ ...l, description: e.target.value }))} rows={2} className={`mt-1 ${inputCls}`} style={{ fontFamily: "'Space Grotesk', sans-serif", resize: 'vertical' }} />
                      </label>
                      <label className="text-xs md:col-span-2" style={{ color: '#9aa8c4', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Learning Goals (one per line)
                        <textarea rows={3} value={(lesson.learningGoals ?? []).join('\n')} onChange={(e) => ul((l) => ({ ...l, learningGoals: e.target.value.split('\n').filter(Boolean) }))} className={`mt-1 ${inputCls}`} placeholder="Each line = one goal" style={{ fontFamily: "'Space Grotesk', sans-serif", resize: 'vertical' }} />
                      </label>
                    </div>
                  </div>
                )}

                {/* Preview tab */}
                {tab === 'preview' && (
                  <div className="relative" style={{ border: '1px solid rgba(109,255,176,0.18)', background: 'rgba(2,10,5,0.9)', ...ch(14), overflow: 'hidden' }}>
                    <div className="px-5 py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(109,255,176,0.1)', background: 'rgba(109,255,176,0.035)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 7px #6dffb0' }} className="animate-pulse" />
                      <span style={{ ...mono, fontSize: 11, letterSpacing: '0.17em', textTransform: 'uppercase', color: '#6dffb0' }}>Live Preview</span>
                      <span style={{ ...mono, fontSize: 10.5, color: '#3d4f6e', marginLeft: 6 }}>// student will see this</span>
                    </div>
                    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
                      <LessonPreview lesson={lesson} />
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
