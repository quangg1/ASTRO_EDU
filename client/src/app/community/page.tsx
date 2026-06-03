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
    <div className="relative z-10 pt-2 px-4 pb-24 max-w-6xl mx-auto">

        {/* ── Page Head HUD Frame ── */}
        <section className="relative mb-10">
          <div className="cosmo-dark-panel relative overflow-hidden rounded-2xl p-6 md:p-8">
            <div
              className="pointer-events-none absolute inset-3 cosmo-dark-panel rounded-2xl"
              style={{ border: '1px dashed rgba(126,231,255,0.1)' }}
              aria-hidden
            />
            <CornerBrackets />

            {/* Eyebrow */}
            <span
              className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl inline-flex items-center gap-2 px-3 py-1.5 mb-5"
              style={{
                background: 'rgba(126,231,255,0.08)',
                border: '1px solid rgba(126,231,255,0.3)',
                color: 'var(--color-accent)',
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
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span>SCOPE · <span style={{ color: 'var(--color-accent)' }}>COMMUNITY</span></span>
              <span style={{ color: 'var(--color-border)' }}>—</span>
              <span>CHANNELS · <span style={{ color: 'var(--color-accent)' }}>{forums.length}</span></span>
              <span style={{ color: 'var(--color-border)' }}>—</span>
              <span>POSTS · <span style={{ color: 'var(--color-accent)' }}>{totalPosts}</span></span>
              <span style={{ color: 'var(--color-border)' }}>—</span>
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
                  className="cosmo-dark-panel rounded-xl px-4 py-3"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="hud-mono hud-mono-sm text-ds-subtle">
                      {stat.label.toUpperCase()}
                    </span>
                    <span className="hud-mono hud-mono-sm text-ds-subtle">
                      {stat.code}
                    </span>
                  </div>
                  <p
                    className="text-4xl font-light tabular-nums text-ds-amber"
                    style={{ fontFamily: 'var(--font-mono)' }}
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
              className="h-[380px] cosmo-dark-panel rounded-2xl animate-pulse"
              style={{ background: 'var(--color-accent-soft)', border: '1px solid rgba(126,231,255,0.1)' }}
            />
            <div
              className="h-48 cosmo-dark-panel rounded-xl animate-pulse"
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
                    className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl inline-flex items-center gap-2 px-3 py-1.5"
                    style={{ background: 'var(--color-brand-amber)', color: '#1a0e00' }}
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
                    className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl inline-flex items-center gap-2 px-3 py-1.5"
                    style={{
                      background: 'rgba(126,231,255,0.1)',
                      border: '1px solid rgba(126,231,255,0.3)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    <span className="hud-status-dot-cyan" style={{ width: 8, height: 8 }} aria-hidden />
                    // 02 · ĐANG ĐƯỢC XEM
                  </span>
                  <Link
                    href="/community/tin-thien-van"
                    className="hud-mono hud-mono-sm transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
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
                    className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl inline-flex items-center gap-2 px-3 py-1.5"
                    style={{
                      background: 'rgba(126,231,255,0.1)',
                      border: '1px solid rgba(126,231,255,0.3)',
                      color: 'var(--color-accent)',
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
            <section className="cosmo-dark-panel relative overflow-hidden rounded-2xl">
              <CornerBrackets corners={['tl', 'br']} />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-5">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5" style={{ color: 'var(--color-accent)' }} aria-hidden>≡</span>
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1">Tất cả tin thiên văn</h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Vào chuyên mục để sắp xếp theo{' '}
                      <strong className="text-white font-medium">mới nhất</strong>,{' '}
                      <strong className="text-white font-medium">đang xem</strong>,{' '}
                      <strong className="text-white font-medium">tương tác</strong>, và lọc theo metadata RSS.
                    </p>
                  </div>
                </div>
                <Link
                  href="/community/tin-thien-van"
                  className="shrink-0 cosmo-dark-panel rounded-xl hud-mono hud-mono-md px-5 py-2.5 transition-all hover:shadow-[0_0_16px_var(--color-accent-soft)]"
                  style={{
                    background: 'rgba(126,231,255,0.08)',
                    border: '1px solid var(--color-border-accent, var(--color-border))',
                    color: 'var(--color-accent)',
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
                  className="hud-mono hud-mono-md cosmo-dark-panel rounded-xl inline-flex items-center gap-2 px-3 py-1.5"
                  style={{
                    background: 'rgba(126,231,255,0.1)',
                    border: '1px solid rgba(126,231,255,0.3)',
                    color: 'var(--color-accent)',
                  }}
                >
                  <span className="hud-status-dot-cyan" style={{ width: 8, height: 8 }} aria-hidden />
                  // 04 · DIỄN ĐÀN
                </span>
                <h2 className="hud-em text-xl font-medium text-white">
                  Forum <em>channels</em>
                  <span className="hud-mono hud-mono-sm ml-2" style={{ color: 'var(--color-text-muted)' }}>
                    / {forums.length} chuyên mục
                  </span>
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {newsForum && (
                  <Link
                    href={`/community/${newsForum.slug}`}
                    className="group relative flex items-center gap-4 p-5 cosmo-dark-panel rounded-xl transition-all hover:shadow-[0_0_24px_rgba(245,165,36,0.2)]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(245,165,36,0.1) 0%, var(--color-panel-solid) 100%)',
                      border: '1px solid rgba(245,165,36,0.35)',
                    }}
                  >
                    <CornerBrackets />
                    <div className="self-stretch w-1 rounded-full shrink-0" style={{ background: 'var(--color-brand-amber)' }} aria-hidden />
                    <div
                      className="flex items-center justify-center w-11 h-11 shrink-0 cosmo-dark-panel rounded-xl text-xl"
                      style={{ background: 'rgba(245,165,36,0.15)', border: '1px solid rgba(245,165,36,0.3)' }}
                    >
                      {newsForum.icon || '📡'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white mb-0.5">{newsForum.title}</h3>
                      <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
                        {newsForum.description}
                      </p>
                      <span
                        className="hud-mono hud-mono-sm inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 cosmo-dark-panel rounded-xl"
                        style={{
                          background: 'rgba(245,165,36,0.15)',
                          border: '1px solid rgba(245,165,36,0.3)',
                          color: 'var(--color-brand-amber)',
                        }}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-brand-amber)' }} aria-hidden />
                        {newsForum.postCount} BÀI
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-lg transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5"
                      style={{ color: 'var(--color-brand-amber)' }}
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
                    className="group relative flex items-center gap-4 p-5 cosmo-dark-panel rounded-xl transition-all hover:shadow-[0_0_20px_rgba(126,231,255,0.1)] hover:border-cyan-400/30 hover:bg-[var(--color-panel-glass)]"
                    style={{
                      background: 'var(--color-panel-glass)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <CornerBrackets />
                    <div className="self-stretch w-1 rounded-full shrink-0" style={{ background: 'rgba(126,231,255,0.3)' }} aria-hidden />
                    <div
                      className="flex items-center justify-center w-11 h-11 shrink-0 cosmo-dark-panel rounded-xl text-xl"
                      style={{ background: 'rgba(126,231,255,0.08)', border: '1px solid var(--color-border)' }}
                    >
                      {f.icon || '💬'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white mb-0.5 group-hover:text-ds-text transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
                        {f.description}
                      </p>
                      <span
                        className="hud-mono hud-mono-sm inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 cosmo-dark-panel rounded-xl"
                        style={{
                          background: 'rgba(126,231,255,0.08)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} aria-hidden />
                        {f.postCount} BÀI
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-lg transition-all group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:text-ds-text"
                      style={{ color: 'var(--color-text-subtle)' }}
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
  )
}
