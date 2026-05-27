'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GemShopDecorationCatalog } from '@/components/gem-shop/GemShopDecorationCatalog'
import {
  fetchDecorationCatalog,
  fetchGemShopBootstrap,
  loadGemWallet,
  syncGemWallet,
  type AvatarDecorationCategorySection,
  type GemShopBootstrapDTO,
} from '@/features/rewards/public'
import { useAuthStore } from '@/features/auth/public'

const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 12, o = 6 }: { c?: string; s?: number; o?: number }) {
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.65, pointerEvents: 'none', ...ex,
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

const PLANNED_ITEMS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    label: 'Avatar Frame',
    desc: 'Khung avatar độc quyền cho profile',
    cost: '120 GEM',
    tag: 'COSMETIC',
    tagColor: '#7ee7ff',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    label: 'Streak Shield',
    desc: 'Bảo vệ chuỗi học tập 1 ngày',
    cost: '50 GEM',
    tag: 'UTILITY',
    tagColor: '#6dffb0',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    label: 'Course Unlock',
    desc: 'Mở khoá 1 chương premium miễn phí',
    cost: '200 GEM',
    tag: 'PREMIUM',
    tagColor: '#f5a524',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    label: 'Rank Badge',
    desc: 'Huy hiệu thứ hạng đặc biệt trên diễn đàn',
    cost: '80 GEM',
    tag: 'COSMETIC',
    tagColor: '#7ee7ff',
  },
]

export default function GemShopPage() {
  const { user } = useAuthStore()
  const userId = user?.id ?? null
  const [balance, setBalance] = useState(0)
  const [utcTime, setUtcTime] = useState('')
  const [bootstrap, setBootstrap] = useState<GemShopBootstrapDTO | null>(null)
  const [categories, setCategories] = useState<AvatarDecorationCategorySection[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
    setBalance(loadGemWallet(userId).balance)
    const refresh = () => setBalance(loadGemWallet(userId).balance)
    void syncGemWallet(userId).then((next) => setBalance(next.balance))
    window.addEventListener('gem-wallet-changed', refresh)
    return () => window.removeEventListener('gem-wallet-changed', refresh)
  }, [userId])

  useEffect(() => {
    let cancelled = false
    setLoadingCatalog(true)
    setCatalogError('')
    Promise.allSettled([fetchGemShopBootstrap(), fetchDecorationCatalog()])
      .then((results) => {
        if (cancelled) return
        const [bootstrapRes, catalogRes] = results
        if (bootstrapRes.status === 'fulfilled') setBootstrap(bootstrapRes.value)
        if (catalogRes.status === 'fulfilled') {
          setCategories(catalogRes.value.categories || [])
          setCatalogError('')
        } else {
          setCatalogError(catalogRes.reason instanceof Error ? catalogRes.reason.message : 'Không tải được catalog Gem Shop.')
          setCategories([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      setUtcTime(`${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* HUD header strip */}
      <div
        className="relative flex items-center justify-between px-4 py-2.5 mb-5"
        style={{
          background: 'rgba(10,16,36,0.6)',
          border: '1px solid rgba(126,231,255,0.14)',
          borderBottom: '1px solid rgba(126,231,255,0.25)',
          ...chamfer(10),
        }}
      >
        <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: '#7ee7ff', textTransform: 'uppercase' }}>
          // 05 · gem · exchange
        </span>
        <div className="flex items-center gap-5" style={{ ...mono, fontSize: 10, letterSpacing: '0.12em', color: '#5c6886' }}>
          <span>Wallet · <span style={{ color: '#f5a524' }}>{balance} GEM</span></span>
          <span style={{ color: categories.length > 0 ? '#6dffb0' : '#ff5cd4' }}>
            {categories.length > 0 ? '● LIVE' : '● LAUNCHING SOON'}
          </span>
          <span className="hidden sm:inline">UTC · <span style={{ color: '#9aa8c4' }}>{utcTime}</span></span>
        </div>
      </div>

      {/* Hero panel */}
      <div
        className="relative p-8 mb-4"
        style={{
          background: 'rgba(6,9,26,0.72)',
          border: '1px solid rgba(126,231,255,0.13)',
          ...chamfer(22),
        }}
      >
        <Brackets c="#7ee7ff" s={16} o={10} />

        {/* Eyebrow */}
        <div style={{ ...mono, fontSize: 10, letterSpacing: '0.20em', color: '#5c6886', marginBottom: 18, textTransform: 'uppercase' }}>
          // 01 · storefront · gem exchange
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 500, lineHeight: 1.0, letterSpacing: '-0.03em', color: '#eaf6ff', marginBottom: 12 }}>
              Đổi Gem lấy{' '}
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>quyền lợi</em>
              <br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>thực sự.</em>
            </h1>
            <p style={{ fontSize: 15, color: '#9aa8c4', lineHeight: 1.65, maxWidth: 500 }}>
              Cửa hàng Gem đang trong quá trình xây dựng. Tích lũy GEM ngay hôm nay
              để sẵn sàng đổi thưởng khi hệ thống khai trương.
            </p>
          </div>

          {/* Status badge */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center text-center px-8 py-5"
            style={{
              background: categories.length > 0 ? 'rgba(109,255,176,0.07)' : 'rgba(255,92,212,0.05)',
              border: categories.length > 0 ? '1px solid rgba(109,255,176,0.25)' : '1px solid rgba(255,92,212,0.22)',
              ...chamfer(14),
            }}
          >
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.22em', color: '#5c6886', marginBottom: 8, textTransform: 'uppercase' }}>
              — Trạng thái hệ thống
            </div>
            <div style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: categories.length > 0 ? '#6dffb0' : '#ff5cd4', fontWeight: 600 }}>
              {categories.length > 0 ? '● LIVE DECORATIONS' : '● COMING SOON'}
            </div>
            <div style={{ ...mono, fontSize: 9, color: '#5c6886', marginTop: 6, letterSpacing: '0.1em' }}>
              {bootstrap?.seasonalEndsAt ? `SEASON ENDS · ${new Date(bootstrap.seasonalEndsAt).toLocaleDateString('vi-VN')}` : 'Q3 / 2025'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(126,231,255,0.3) 0%, rgba(126,231,255,0.03) 80%)', margin: '24px 0 0' }} />
      </div>

      {/* Planned items grid */}
      <div className="mb-4">
        {/* Section header */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 6, textTransform: 'uppercase' }}>
              // 02 · catalog · planned items
            </div>
            <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 500, letterSpacing: '-0.02em', color: '#eaf6ff' }}>
              Cửa hàng{' '}
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>trang trí</em>
            </h2>
          </div>
          <span style={{ ...mono, fontSize: 9, letterSpacing: '0.16em', color: '#3d4f6e', textTransform: 'uppercase' }}>
            {loadingCatalog ? 'SYNCING...' : `${String(categories.reduce((sum, c) => sum + (c.items?.length || 0), 0)).padStart(2, '0')} Items · Live`}
          </span>
        </div>
        {loadingCatalog ? (
          <div style={{ ...mono, fontSize: 11, color: '#5c6886', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ● loading catalog...
          </div>
        ) : categories.length > 0 ? (
          <GemShopDecorationCatalog
            categories={categories}
            avatarUrl={user?.avatar || null}
            displayName={user?.displayName || user?.email || 'Learner'}
            email={user?.email || null}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANNED_ITEMS.map((item, i) => (
              <div
                key={i}
                className="relative flex items-start gap-4 p-5"
                style={{
                  background: 'rgba(6,9,26,0.72)',
                  border: '1px solid rgba(126,231,255,0.1)',
                  opacity: 0.75,
                  cursor: 'not-allowed',
                  ...chamfer(12),
                }}
              >
                <span
                  style={{
                    position: 'absolute', top: 10, left: 10,
                    width: 6, height: 6, borderRadius: '50%',
                    background: item.tagColor,
                    boxShadow: `0 0 6px ${item.tagColor}`,
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    flexShrink: 0,
                    width: 46, height: 46,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.tagColor,
                    background: `${item.tagColor}12`,
                    border: `1px solid ${item.tagColor}30`,
                    ...chamfer(8),
                  }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#eaf6ff' }}>{item.label}</span>
                    <span
                      style={{
                        ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: item.tagColor, background: `${item.tagColor}14`,
                        border: `1px solid ${item.tagColor}30`,
                        padding: '1px 7px',
                        ...chamfer(4),
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#9aa8c4', lineHeight: 1.5, marginBottom: 10 }}>{item.desc}</p>
                  <div
                    style={{
                      ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                      color: '#5c6886',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'rgba(126,231,255,0.04)',
                      border: '1px solid rgba(126,231,255,0.08)',
                      padding: '3px 10px',
                      ...chamfer(5),
                    }}
                  >
                    🔒 {item.cost}
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 9, color: '#3d4f6e', letterSpacing: '0.1em', flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        )}
        {!!catalogError && (
          <p className="mt-3 text-xs text-amber-300">{catalogError}</p>
        )}
      </div>

      {/* Bottom CTA panel */}
      <div
        className="relative p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        style={{
          background: 'rgba(6,9,26,0.72)',
          border: '1px solid rgba(126,231,255,0.13)',
          ...chamfer(18),
        }}
      >
        <Brackets c="#f5a524" s={12} o={8} />

        <div>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: '#5c6886', marginBottom: 8, textTransform: 'uppercase' }}>
            // 03 · wallet · current balance
          </div>
          <p style={{ fontSize: 14, color: '#9aa8c4', lineHeight: 1.6 }}>
            Bạn đang có{' '}
            <span style={{ color: '#f5a524', fontWeight: 600, fontSize: 16 }}>{balance} GEM</span>
            {' '}trong ví. Tiếp tục hoàn thành bài học và nhiệm vụ để tích lũy thêm.
          </p>
        </div>

        <Link
          href="/gem"
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(126,231,255,0.06)',
            color: '#7ee7ff',
            padding: '12px 22px',
            ...mono,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            border: '1px solid rgba(126,231,255,0.22)',
            boxShadow: '0 0 20px rgba(126,231,255,0.06)',
            transition: 'box-shadow 0.2s, border-color 0.2s',
            ...chamfer(10),
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Quay lại ví Gem
        </Link>
      </div>

    </div>
  )
}
