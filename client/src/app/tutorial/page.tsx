'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  fetchTutorialCategories,
  fetchTutorials,
  type TutorialCategory,
  type Tutorial,
} from '@/lib/tutorialsApi'
import { SkeletonList } from '@/components/ui/Skeleton'

export default function TutorialPage() {
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category')
  const [categories, setCategories] = useState<TutorialCategory[]>([])
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTutorialCategories().then(setCategories)
  }, [])

  useEffect(() => {
    if (categorySlug && categories.length) {
      const cat = categories.find((c) => c.slug === categorySlug)
      setActiveCategory(cat?._id || null)
    } else if (!categorySlug) {
      setActiveCategory(null)
    }
  }, [categorySlug, categories])

  useEffect(() => {
    setLoading(true)
    fetchTutorials(activeCategory || undefined)
      .then(setTutorials)
      .finally(() => setLoading(false))
  }, [activeCategory])

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-16 px-4 pb-12 max-w-5xl mx-auto">
        <section className="mt-8 mb-8">
          <h1 className="text-2xl font-bold text-cyan-400 mb-2">Tutorial</h1>
          <p className="text-gray-400 text-sm">
            Thuật ngữ khoa học, thông tin cơ bản về thiên văn học và vũ trụ. Tra cứu miễn phí.
          </p>
        </section>

        {/* Categories (GfG-style sidebar) */}
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-48 shrink-0">
            <nav className="rounded-xl border border-white/10 bg-[#0a0f17] p-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  !activeCategory ? 'bg-cyan-600/30 text-cyan-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setActiveCategory(c._id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    activeCategory === c._id
                      ? 'bg-cyan-600/30 text-cyan-300'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {c.icon && <span>{c.icon}</span>}
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <SkeletonList count={6} />
            ) : tutorials.length === 0 ? (
              <p className="text-gray-500">Chưa có bài viết nào trong mục này.</p>
            ) : (
              <div className="grid gap-4">
                {tutorials.map((t) => (
                  <Link
                    key={t._id}
                    href={`/tutorial/${t.slug}`}
                    className="block glass rounded-xl p-5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-white mb-1">{t.title}</h2>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">{t.summary}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-cyan-400/80">{t.readTime} phút đọc</span>
                          {t.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-gray-600 text-sm shrink-0">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
