'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/store/useAuthStore'
import {
  fetchTutorialForEditor,
  updateTutorial,
  deleteTutorial,
  type Tutorial,
  type TutorialSection,
  type TutorialCategory,
} from '@/lib/tutorialsApi'
import type { LessonSection } from '@/lib/coursesApi'

const BlockEditor = dynamic(() => import('@/components/studio/BlockEditor'), { ssr: false })
const BlockPalette = dynamic(() => import('@/components/studio/BlockPalette'), { ssr: false })

const inputCls = 'w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none'

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)) }

export default function EditTutorialPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, checked } = useAuthStore()
  const [tutorial, setTutorial] = useState<Tutorial | null>(null)
  const [categories, setCategories] = useState<TutorialCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/tutorial/' + slug)
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/studio')
  }, [checked, user, router, slug])

  useEffect(() => {
    if (!slug || slug === 'new') return
    fetchTutorialForEditor(slug).then((d) => {
      if (d) {
        setTutorial(d.tutorial)
        setCategories(d.categories)
      }
      setLoading(false)
    })
  }, [slug])

  const updateTutorialState = useCallback((fn: (t: Tutorial) => Tutorial) => {
    setTutorial((prev) => (prev ? fn(prev) : prev))
  }, [])

  const updateSection = useCallback((index: number, section: LessonSection) => {
    updateTutorialState((t) => {
      const s = [...(t.sections || [])]
      s[index] = section as TutorialSection
      return { ...t, sections: s }
    })
  }, [updateTutorialState])

  const addSection = useCallback((section: LessonSection) => {
    updateTutorialState((t) => ({
      ...t,
      sections: [...(t.sections || []), section as TutorialSection],
    }))
  }, [updateTutorialState])

  const removeSection = useCallback((index: number) => {
    if (!confirm('Xóa block này?')) return
    updateTutorialState((t) => {
      const s = (t.sections || []).filter((_, i) => i !== index)
      return { ...t, sections: s }
    })
  }, [updateTutorialState])

  const moveSection = useCallback((from: number, to: number) => {
    updateTutorialState((t) => {
      const s = [...(t.sections || [])]
      if (to < 0 || to >= s.length) return t
      const [removed] = s.splice(from, 1)
      s.splice(to, 0, removed)
      return { ...t, sections: s }
    })
  }, [updateTutorialState])

  const handleSave = async () => {
    if (!tutorial) return
    setSaving(true)
    setMsg(null)
    const res = await updateTutorial(tutorial.slug, {
      title: tutorial.title,
      summary: tutorial.summary,
      categoryId: tutorial.categoryId || null,
      readTime: tutorial.readTime,
      tags: tutorial.tags,
      sections: tutorial.sections,
      relatedSlugs: tutorial.relatedSlugs,
      published: tutorial.published,
    })
    setSaving(false)
    if (res.success) {
      setMsg('Đã lưu')
      setTimeout(() => setMsg(null), 2000)
    } else {
      setMsg(res.error || 'Lỗi')
    }
  }

  const handleDelete = async () => {
    if (!tutorial || !confirm('Xóa bài viết này? Không thể hoàn tác.')) return
    const res = await deleteTutorial(tutorial.slug)
    if (res.success) router.replace('/studio/tutorial')
    else setMsg(res.error || 'Xóa thất bại')
  }

  if (!checked || !user || loading) {
    return (
      <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">
        {loading ? 'Đang tải...' : 'Không có quyền.'}
      </div>
    )
  }

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-black pt-20 px-4">
        <p className="text-gray-500">Không tìm thấy bài viết.</p>
        <Link href="/studio/tutorial" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">← Danh sách</Link>
      </div>
    )
  }

  const sections = tutorial.sections || []

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-10">
      <main className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/studio/tutorial" className="text-sm text-cyan-400 hover:text-cyan-300">← Tutorial Studio</Link>
          <div className="flex items-center gap-2">
            {msg && <span className="text-sm text-gray-400">{msg}</span>}
            <button
              type="button"
              onClick={() => updateTutorialState((t) => ({ ...t, published: !t.published }))}
              className={`text-xs px-2 py-1 rounded-full border ${tutorial.published ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}
            >
              {tutorial.published ? 'Đã xuất bản' : 'Bản nháp'}
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">
              Xóa
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0f17]/80 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tiêu đề</label>
              <input value={tutorial.title} onChange={(e) => updateTutorialState((t) => ({ ...t, title: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slug</label>
              <input value={tutorial.slug} className={`${inputCls} font-mono opacity-80`} readOnly />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tóm tắt</label>
            <textarea value={tutorial.summary} onChange={(e) => updateTutorialState((t) => ({ ...t, summary: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Thể loại</label>
              <select
                value={tutorial.categoryId || ''}
                onChange={(e) => updateTutorialState((t) => ({ ...t, categoryId: e.target.value || null }))}
                className={inputCls}
              >
                <option value="">-- Không --</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phút đọc</label>
              <input type="number" min={1} value={tutorial.readTime} onChange={(e) => updateTutorialState((t) => ({ ...t, readTime: Math.max(1, parseInt(e.target.value, 10) || 5) }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tags (cách nhau bằng dấu phẩy)</label>
              <input
                value={(tutorial.tags || []).join(', ')}
                onChange={(e) => updateTutorialState((t) => ({ ...t, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))}
                className={inputCls}
                placeholder="galaxy, astronomy"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0f17]/80 p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Nội dung (blocks)</h3>
          <div className="space-y-3">
            {sections.map((sec, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-4 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-600">#{i + 1} {sec.type}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => moveSection(i, i - 1)} disabled={i === 0} className="text-xs text-gray-500 hover:text-white disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveSection(i, i + 1)} disabled={i === sections.length - 1} className="text-xs text-gray-500 hover:text-white disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => removeSection(i)} className="text-xs text-red-500/80 hover:text-red-400">×</button>
                  </div>
                </div>
                <BlockEditor section={sec as LessonSection} onChange={(updated) => updateSection(i, updated)} />
              </div>
            ))}
            <BlockPalette onAdd={addSection} />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href={`/tutorial/${tutorial.slug}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-sm hover:bg-white/20">
            Xem bài viết
          </Link>
        </div>
      </main>
    </div>
  )
}
