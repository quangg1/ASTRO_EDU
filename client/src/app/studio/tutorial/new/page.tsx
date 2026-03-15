'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createTutorial } from '@/lib/tutorialsApi'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

export default function NewTutorialPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slug || slug === slugify(title)) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Nhập tiêu đề'); return }
    const s = slug.trim() || slugify(title)
    if (!s) { setError('Slug không hợp lệ'); return }
    setSaving(true)
    const res = await createTutorial({
      title: title.trim(),
      slug: s,
      summary: summary.trim() || '',
      readTime: 5,
      tags: [],
      sections: [],
      published: false,
    })
    setSaving(false)
    if (res.success) {
      router.replace(`/studio/tutorial/${s}`)
      return
    }
    setError(res.error || 'Tạo thất bại')
  }

  if (!checked || !user) {
    return (
      <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">
        Đang kiểm tra...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-10">
      <main className="max-w-2xl mx-auto">
        <Link href="/studio/tutorial" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">← Tutorial Studio</Link>
        <h1 className="text-xl font-bold text-white mb-6">Tạo tutorial mới</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
              placeholder="VD: Thiên hà là gì?"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Slug (URL)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none font-mono"
              placeholder="thien-ha-la-gi"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tóm tắt (tùy chọn)</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
              placeholder="Mô tả ngắn về bài viết"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? 'Đang tạo...' : 'Tạo và mở editor'}
            </button>
            <Link href="/studio/tutorial" className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 text-sm hover:bg-white/20">
              Hủy
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
