'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchForums, fetchNews, type Forum, type Post } from '@/lib/communityApi'

export default function CommunityPage() {
  const [forums, setForums] = useState<Forum[]>([])
  const [news, setNews] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchForums(), fetchNews({ limit: 8 })])
      .then(([f, n]) => {
        setForums(f)
        setNews(n.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const newsForum = forums.find((f) => f.slug === 'tin-thien-van' || f.isNews)
  const otherForums = forums.filter((f) => f.slug !== 'tin-thien-van' && !f.isNews)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05070c] via-black to-[#04090f]">
      <div className="pt-20 px-4 pb-12 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Cộng đồng Cosmo Learn</h1>
          <p className="mt-2 text-gray-400">
            Chia sẻ kiến thức, đặt câu hỏi và cập nhật các tin tức thiên văn mới nhất.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Đang tải...</div>
        ) : (
          <div className="space-y-10">
            {/* Astronomy news */}
            <section className="rounded-2xl border border-cyan-500/20 bg-[#08111f]/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
                  🌌 Tin thiên văn
                </h2>
                <Link
                  href="/community/tin-thien-van"
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="p-4">
                {news.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">
                    Chưa có tin mới. Chạy <code className="bg-white/10 px-1 rounded">npm run crawl-news</code> trong
                    services/community để cập nhật.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {news.map((p) => (
                      <Link
                        key={p._id}
                        href={`/community/post/${p._id}`}
                        className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex gap-3">
                          {p.imageUrl && (
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="w-20 h-20 object-cover rounded-lg shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-white line-clamp-2">{p.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {p.sourceName} · {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-US') : ''}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Forums */}
            <section className="rounded-2xl border border-white/10 bg-[#08111f]/50 overflow-hidden">
              <h2 className="px-5 py-4 border-b border-white/10 text-lg font-semibold text-white">
                Diễn đàn
              </h2>
              <div className="p-4 grid gap-3 md:grid-cols-2">
                {newsForum && (
                  <Link
                    href={`/community/${newsForum.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                  >
                    <span className="text-2xl">{newsForum.icon || '🌌'}</span>
                    <div>
                      <h3 className="font-medium text-white">{newsForum.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-1">{newsForum.description}</p>
                      <p className="text-xs text-cyan-400 mt-1">{newsForum.postCount} bài viết</p>
                    </div>
                  </Link>
                )}
                {otherForums.map((f) => (
                  <Link
                    key={f._id}
                    href={`/community/${f.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-2xl">{f.icon || '💬'}</span>
                    <div>
                      <h3 className="font-medium text-white">{f.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-1">{f.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{f.postCount} bài viết</p>
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
