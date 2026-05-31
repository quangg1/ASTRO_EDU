'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchForums, fetchNews, fetchNewsCategories, type Forum, type Post } from '@/features/community/public'
import { NewsHeroSlider } from '@/components/community/NewsHeroSlider'
import { NewsHotRow } from '@/components/community/NewsHotRow'
import { NewsTopicChips } from '@/components/community/NewsTopicChips'
import { CornerBrackets } from '@/components/landing/CornerBrackets'

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
    <div className="min-h-screen relative" style={{ background: 'var(--hud-bg)' }}>
      {/* Atmosphere layers */}
      <div className="hud-grid-overlay" aria-hidden />
      <div className="hud-scan" aria-hidden />
      <span className="hud-edge-label left hidden lg:block" aria-hidden>
        CosmoLearn · Community · v2.6
      </span>
      <span className="hud-edge-label right hidden lg:block" aria-hidden>
        Lat 21.0285° N — Lon 105.8542° E
      </span>

      <div className="relative z-10 pt-20 px-4 pb-24 max-w-6xl mx-auto">

        {/* ── Page Head HUD Frame ── */}
        <section className="relative mb-10">
          <div
            className="relative hud-chamfer-lg overflow-hidden p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(10,16,36,0.85) 0%, rgba(3,6,15,0.7) 100%)',
              border: '1px solid rgba(126,231,255,0.2)',
              boxShadow: '0 0 60px rgba(126,231,255,0.06), inset 0 0 40px rgba(126,231,255,0.04)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-3 hud-chamfer-md"
              style={{ border: '1px dashed rgba(126,231,255,0.1)' }}
              aria-hidden
            />
            <CornerBrackets />

            {/* Eyebrow */}
            <span
              className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3 py-1.5 mb-5"
              style={{
                background: 'rgba(126,231,255,0.08)',
                border: '1px solid rgba(126,231,255,0.3)',
                color: 'var(--hud-plasma)',
              }}
            >
              <span className="hud-status-dot-cyan" aria-hidden />
              Cosmic Community Hub
            </span>

            <h1
              className="hud-em font-heading text-3xl md:text-4xl font-medium leading-tight tracking-tight text-white mb-4"
              dangerouslySetInnerHTML={{ __html: 'Diễn đàn <em>thiên văn</em> cho người học nghiêm túc' }}
            />

            {/* Readout strip */}
            <div
              className="hud-mono hud-mono-sm flex flex-wrap items-center gap-x-4 gap-y-1 mb-6"
              style={{ color: 'var(--hud-ink-2)' }}
            >
              <span>SCOPE · <span style={{ color: 'var(--hud-plasma)' }}>COMMUNITY</span></span>
              <span style={{ color: 'var(--hud-line)' }}>—</span>
              <span>CHANNELS · <span style={{ color: 'var(--hud-plasma)' }}>{forums.length}</span></span>
              <span style={{ color: 'var(--hud-line)' }}>—</span>
              <span>POSTS · <span style={{ color: 'var(--hud-plasma)' }}>{totalPosts}</span></span>
              <span style={{ color: 'var(--hud-line)' }}>—</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: '#6dffb0', boxShadow: '0 0 6px #6dffb0' }}
                  aria-hidden
                />
                SIGNAL · <span style={{ color: '#6dffb0' }}>LIVE</span>
              </span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Chuyên mục', value: forums.length, code: '// 001' },
                { label: 'Bài viết', value: totalPosts, code: '// 002' },
                { label: 'Tin trong slider', value: Math.min(10, latest.length), code: '// 003' },
              ].map((stat) => (
                <div
                  key={stat.code}
                  className="relative hud-chamfer-sm px-4 py-3"
                  style={{
                    background: 'rgba(6,9,26,0.6)',
                    border: '1px solid rgba(126,231,255,0.15)',
                  }}
                >
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: 'rgba(126,231,255,0.5)' }} aria-hidden />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: 'rgba(126,231,255,0.5)' }} aria-hidden />
                  <div className="flex items-start justify-between mb-1">
                    <span className="hud-mono hud-mono-sm" style={{ color: 'var(--hud-ink-3)' }}>
                      {stat.label.toUpperCase()}
                    </span>
                    <span className="hud-mono hud-mono-sm" style={{ color: 'var(--hud-ink-3)' }}>
                      {stat.code}
                    </span>
                  </div>
                  <p
                    className="text-4xl font-light tabular-nums"
                    style={{
                      color: 'var(--hud-amber)',
                      fontFamily: 'var(--font-mono)',
                      textShadow: '0 0 20px rgba(245,165,36,0.4)',
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-6">
            <div
              className="h-[380px] hud-chamfer-md animate-pulse"
              style={{ background: 'rgba(126,231,255,0.05)', border: '1px solid rgba(126,231,255,0.1)' }}
            />
            <div
              className="h-48 hud-chamfer-sm animate-pulse"
              style={{ background: 'rgba(126,231,255,0.04)', border: '1px solid rgba(126,231,255,0.08)' }}
            />
          </div>
        ) : (
          <div className="space-y-10">

            {/* Section 01 — Slider */}
            {latest.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3 py-1.5"
                    style={{ background: 'var(--hud-amber)', color: '#1a0e00' }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }} aria-hidden />
                    // 01 · TIN MỚI NHẤT
                  </span>
                </div>
                <NewsHeroSlider
                  posts={latest}
                  title="Tin mới nhất"
                  subtitle="Vuốt hoặc bấm mũi tên — mở bài gốc trong tab mới"
                />
              </div>
            )}

            {/* Section 02 — Trending */}
            {hot.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3 py-1.5"
                    style={{
                      background: 'rgba(126,231,255,0.1)',
                      border: '1px solid rgba(126,231,255,0.3)',
                      color: 'var(--hud-plasma)',
                    }}
                  >
                    <span className="hud-status-dot-cyan" style={{ width: 8, height: 8 }} aria-hidden />
                    // 02 · ĐANG ĐƯỢC XEM
                  </span>
                  <Link
                    href="/community/tin-thien-van"
                    className="hud-mono hud-mono-sm transition-colors"
                    style={{ color: 'var(--hud-ink-2)' }}
                  >
                    XEM TẤT CẢ →
                  </Link>
                </div>
                <NewsHotRow posts={hot} />
              </div>
            )}

            {/* Section 03 — Topics */}
            {categories.length > 0 && (
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3 py-1.5"
                    style={{
                      background: 'rgba(126,231,255,0.1)',
                      border: '1px solid rgba(126,231,255,0.3)',
                      color: 'var(--hud-plasma)',
                    }}
                  >
                    <span className="hud-status-dot-cyan" style={{ width: 8, height: 8 }} aria-hidden />
                    // 03 · CHỦ ĐỀ
                  </span>
                  <h2
                    className="hud-em text-xl font-medium text-white"
                    dangerouslySetInnerHTML={{ __html: 'Khám phá theo <em>tag</em>' }}
                  />
                </div>
                <NewsTopicChips categories={categories} />
              </div>
            )}

            {/* CTA — Tất cả tin thiên văn */}
            <section
              className="relative hud-chamfer-md overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(6,9,26,0.9) 0%, rgba(3,6,15,0.85) 100%)',
                border: '1px solid rgba(126,231,255,0.2)',
                boxShadow: '0 0 30px rgba(126,231,255,0.06)',
              }}
            >
              <CornerBrackets corners={['tl', 'br']} />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-5">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5" style={{ color: 'var(--hud-plasma)' }} aria-hidden>≡</span>
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1">Tất cả tin thiên văn</h2>
                    <p className="text-sm" style={{ color: 'var(--hud-ink-2)' }}>
                      Vào chuyên mục để sắp xếp theo{' '}
                      <strong className="text-white font-medium">mới nhất</strong>,{' '}
                      <strong className="text-white font-medium">đang xem</strong>,{' '}
                      <strong className="text-white font-medium">tương tác</strong>, và lọc theo metadata RSS.
                    </p>
                  </div>
                </div>
                <Link
                  href="/community/tin-thien-van"
                  className="shrink-0 hud-chamfer-sm hud-mono hud-mono-md px-5 py-2.5 transition-all hover:shadow-[0_0_16px_rgba(126,231,255,0.25)]"
                  style={{
                    background: 'rgba(126,231,255,0.08)',
                    border: '1px solid rgba(126,231,255,0.35)',
                    color: 'var(--hud-plasma)',
                  }}
                >
                  LỌC & TÌM KIẾM →
                </Link>
              </div>
            </section>

            {/* Section 04 — Forum grid */}
            <section>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span
                  className="hud-mono hud-mono-md hud-chamfer-sm inline-flex items-center gap-2 px-3 py-1.5"
                  style={{
                    background: 'rgba(126,231,255,0.1)',
                    border: '1px solid rgba(126,231,255,0.3)',
                    color: 'var(--hud-plasma)',
                  }}
                >
                  <span className="hud-status-dot-cyan" style={{ width: 8, height: 8 }} aria-hidden />
                  // 04 · DIỄN ĐÀN
                </span>
                <h2 className="hud-em text-xl font-medium text-white">
                  Forum <em>channels</em>
                  <span className="hud-mono hud-mono-sm ml-2" style={{ color: 'var(--hud-ink-2)' }}>
                    / {forums.length} chuyên mục
                  </span>
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {newsForum && (
                  <Link
                    href={`/community/${newsForum.slug}`}
                    className="group relative flex items-center gap-4 p-5 hud-chamfer-sm transition-all hover:shadow-[0_0_24px_rgba(245,165,36,0.2)]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,165,36,0.1) 0%, rgba(6,9,26,0.9) 100%)',
                      border: '1px solid rgba(245,165,36,0.35)',
                    }}
                  >
                    <CornerBrackets />
                    <div className="self-stretch w-1 rounded-full shrink-0" style={{ background: 'var(--hud-amber)' }} aria-hidden />
                    <div
                      className="flex items-center justify-center w-11 h-11 shrink-0 hud-chamfer-sm text-xl"
                      style={{ background: 'rgba(245,165,36,0.15)', border: '1px solid rgba(245,165,36,0.3)' }}
                    >
                      {newsForum.icon || '📡'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white mb-0.5">{newsForum.title}</h3>
                      <p className="text-sm line-clamp-1" style={{ color: 'var(--hud-ink-2)' }}>
                        {newsForum.description}
                      </p>
                      <span
                        className="hud-mono hud-mono-sm inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 hud-chamfer-sm"
                        style={{
                          background: 'rgba(245,165,36,0.15)',
                          border: '1px solid rgba(245,165,36,0.3)',
                          color: 'var(--hud-amber)',
                        }}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--hud-amber)' }} aria-hidden />
                        {newsForum.postCount} BÀI
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-lg transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5"
                      style={{ color: 'var(--hud-amber)' }}
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                )}

                {otherForums.map((f) => (
                  <Link
                    key={f._id}
                    href={`/community/${f.slug}`}
                    className="group relative flex items-center gap-4 p-5 hud-chamfer-sm transition-all hover:shadow-[0_0_20px_rgba(126,231,255,0.1)] hover:border-cyan-400/30 hover:bg-[rgba(10,16,36,0.9)]"
                    style={{
                      background: 'rgba(6,9,26,0.8)',
                      border: '1px solid rgba(126,231,255,0.12)',
                    }}
                  >
                    <CornerBrackets />
                    <div className="self-stretch w-1 rounded-full shrink-0" style={{ background: 'rgba(126,231,255,0.3)' }} aria-hidden />
                    <div
                      className="flex items-center justify-center w-11 h-11 shrink-0 hud-chamfer-sm text-xl"
                      style={{ background: 'rgba(126,231,255,0.08)', border: '1px solid rgba(126,231,255,0.2)' }}
                    >
                      {f.icon || '💬'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white mb-0.5 group-hover:text-cyan-100 transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-sm line-clamp-1" style={{ color: 'var(--hud-ink-2)' }}>
                        {f.description}
                      </p>
                      <span
                        className="hud-mono hud-mono-sm inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 hud-chamfer-sm"
                        style={{
                          background: 'rgba(126,231,255,0.08)',
                          border: '1px solid rgba(126,231,255,0.2)',
                          color: 'var(--hud-plasma)',
                        }}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--hud-plasma)' }} aria-hidden />
                        {f.postCount} BÀI
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-lg transition-all group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:text-cyan-300"
                      style={{ color: 'var(--hud-ink-3)' }}
                      aria-hidden
                    >
                      →
                    </span>
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
