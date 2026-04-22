'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchForums, fetchNews, fetchNewsCategories, type Forum, type Post } from '@/lib/communityApi'
import { NewsHeroSlider } from '@/components/community/NewsHeroSlider'
import { NewsHotRow } from '@/components/community/NewsHotRow'
import { NewsTopicChips } from '@/components/community/NewsTopicChips'

export default function CommunityPage() {
  const [forums, setForums] = useState<Forum[]>([])
  const [latest, setLatest] = useState<Post[]>([])
  const [hot, setHot] = useState<Post[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchForums(),
      fetchNews({ limit: 10, sort: 'newest' }),
      fetchNews({ limit: 10, sort: 'hot' }),
      fetchNewsCategories(),
    ])
      .then(([f, newestRes, hotRes, cats]) => {
        setForums(f)
        setLatest(newestRes.data)
        setHot(hotRes.data)
        setCategories(cats)
      })
      .finally(() => setLoading(false))
  }, [])

  const newsForum = forums.find((f) => f.slug === 'tin-thien-van' || f.isNews)
  const otherForums = forums.filter((f) => f.slug !== 'tin-thien-van' && !f.isNews)
  const totalPosts = forums.reduce((acc, forum) => acc + (forum.postCount || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#03060d] via-[#02040a] to-black">
      <div className="pt-20 px-4 pb-16 max-w-6xl mx-auto">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-[#061222] to-[#040810] p-6 md:p-8 mb-10">
          <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-cyan-200/90">
              Cosmic Community Hub
            </p>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
              Diễn đàn thiên văn cho người học nghiêm túc
            </h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-slate-300 leading-relaxed">
              Thảo luận bài học, hỏi đáp, và tin thiên văn được tổ chức rõ ràng — slider tin mới, khu vực đang hot, lọc theo chủ đề.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Chuyên mục</p>
                <p className="mt-1 text-xl font-semibold text-white">{forums.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Bài viết</p>
                <p className="mt-1 text-xl font-semibold text-white">{totalPosts}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Tin trong slider</p>
                <p className="mt-1 text-xl font-semibold text-white">{Math.min(10, latest.length)}</p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="space-y-6">
            <div className="h-[380px] rounded-3xl border border-white/10 bg-white/[0.04] animate-pulse" />
            <div className="h-48 rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse" />
          </div>
        ) : (
          <div className="space-y-10">
            {latest.length > 0 && (
              <NewsHeroSlider
                posts={latest}
                title="Mười tin mới nhất"
                subtitle="Vuốt hoặc bấm mũi tên — mở bài gốc trong tab mới"
              />
            )}

            {hot.length > 0 && <NewsHotRow posts={hot} />}

            {categories.length > 0 && <NewsTopicChips categories={categories} />}

            <section className="rounded-2xl border border-cyan-400/20 bg-[#060d18]/90 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-cyan-100 flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    🌌
                  </span>
                  Tất cả tin thiên văn
                </h2>
                <Link
                  href="/community/tin-thien-van"
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 rounded-md px-2 py-1"
                >
                  Lọc & tìm kiếm →
                </Link>
              </div>
              <div className="p-5 text-sm text-slate-400 leading-relaxed">
                Vào chuyên mục để sắp xếp theo <strong className="text-slate-300 font-medium">mới nhất</strong>,{' '}
                <strong className="text-slate-300 font-medium">đang xem</strong>,{' '}
                <strong className="text-slate-300 font-medium">tương tác</strong>, và lọc theo metadata RSS.
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#070d16]/85 overflow-hidden">
              <h2 className="px-5 py-4 border-b border-white/10 text-base font-semibold text-white flex items-center gap-2">
                <span aria-hidden>💬</span>
                Diễn đàn
              </h2>
              <div className="p-4 grid gap-3 md:grid-cols-2">
                {newsForum && (
                  <Link
                    href={`/community/${newsForum.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-cyan-300/25 bg-cyan-500/10 hover:bg-cyan-500/18 transition-colors"
                  >
                    <span className="text-2xl">{newsForum.icon || '🌌'}</span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-white">{newsForum.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-1">{newsForum.description}</p>
                      <p className="text-xs text-cyan-200/90 mt-1">{newsForum.postCount} bài</p>
                    </div>
                  </Link>
                )}
                {otherForums.map((f) => (
                  <Link
                    key={f._id}
                    href={`/community/${f.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    <span className="text-2xl">{f.icon || '💬'}</span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-white group-hover:text-cyan-100 transition-colors">{f.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-1">{f.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{f.postCount} bài</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
