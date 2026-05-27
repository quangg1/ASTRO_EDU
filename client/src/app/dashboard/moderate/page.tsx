'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { canModerate } from '@/lib/roles'

/* ─── Design helpers ─── */
const chamfer = (cut = 14) => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

function Brackets({ c = '#7ee7ff', s = 14, o = 6, amber }: { c?: string; s?: number; o?: number; amber?: boolean }) {
  const accent = amber ? '#f5a524' : c
  const b = (ex: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: s, height: s, opacity: 0.75, pointerEvents: 'none', transition: 'all 0.2s', ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${accent}`, borderLeft: `1.5px solid ${accent}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${accent}`, borderRight: `1.5px solid ${accent}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${accent}`, borderLeft: `1.5px solid ${accent}` })} />
      <span style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${accent}`, borderRight: `1.5px solid ${accent}` })} />
    </>
  )
}

export default function ModerateHubPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/dashboard/moderate')
      return
    }
    if (!canModerate(user)) {
      router.replace('/dashboard')
    }
  }, [checked, user, router])

  if (!checked || !user || !canModerate(user)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" style={{ color: '#5c6886', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
        Đang tải…
      </div>
    )
  }

  return (
    <div style={{ color: '#eaf6ff', fontFamily: 'Space Grotesk, sans-serif' }}>

      {/* ── Zone 1: Page Head ── */}
      <header style={{ marginBottom: 24 }}>
        <div>
          {/* Eyebrow pill */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px',
            background: 'rgba(126,231,255,0.08)',
            border: '1px solid rgba(126,231,255,0.3)',
            color: '#7ee7ff',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 14,
            ...chamfer(8),
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#7ee7ff',
              boxShadow: '0 0 6px #7ee7ff',
              animation: 'pulseDot 1.6s infinite',
            }} />
            Điều hành viên cộng đồng
          </span>

          <h1 style={{ fontSize: 'clamp(30px,3.5vw,48px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 12px' }}>
            Kiểm duyệt{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#f5a524' }}>diễn đàn</em>
          </h1>

          <p style={{ fontSize: 14, color: '#9aa8c4', maxWidth: 540, lineHeight: 1.65, margin: 0 }}>
            Bạn có thể <b style={{ color: '#eaf6ff', fontWeight: 500 }}>ghim</b> hoặc <b style={{ color: '#eaf6ff', fontWeight: 500 }}>gỡ</b> bài viết không phù hợp trên các diễn đàn công khai.
            Mở một bài viết để thấy các nút{' '}
            <span style={{
              display: 'inline-block', padding: '1px 7px',
              background: 'rgba(245,165,36,0.12)', border: '1px solid rgba(245,165,36,0.4)',
              color: '#f5a524', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              ...chamfer(5),
            }}>Ghim</span>
            {' '}và{' '}
            <span style={{
              display: 'inline-block', padding: '1px 7px',
              background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.35)',
              color: '#ff9090', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              ...chamfer(5),
            }}>Xóa bài</span>
            {' '}khi cần.
          </p>
        </div>
      </header>

      {/* ── Zone 2: Runtime Info Strip ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 28px',
        padding: '10px 18px',
        background: 'rgba(6,9,26,0.7)',
        border: '1px solid rgba(126,231,255,0.12)',
        borderBottom: '2px solid rgba(126,231,255,0.08)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: '#5c6886',
        marginBottom: 24,
        ...chamfer(10),
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 6px #6dffb0', animation: 'pulseDot 1.6s infinite' }} />
          <span style={{ color: '#9aa8c4' }}>moderation channel</span>
          <span style={{ color: '#6dffb0' }}>· online</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7ee7ff', boxShadow: '0 0 5px #7ee7ff' }} />
          <span>phạm vi ·</span>
          <span style={{ color: '#7ee7ff' }}>diễn đàn công khai</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f5a524', boxShadow: '0 0 5px #f5a524' }} />
          <span>hành động hôm nay ·</span>
          <span style={{ color: '#f5a524' }}>00</span>
        </span>
        <span style={{ marginLeft: 'auto', color: '#3a4460' }}>// last sync · just now</span>
      </div>

      {/* ── Zone 3: Forum Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>

        {/* Card: Tin thiên văn (amber) */}
        <Link
          href="/community/tin-thien-van"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div
            className="forum-card"
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg,rgba(18,10,2,0.97) 0%,rgba(24,14,3,0.92) 100%)',
              border: '1px solid rgba(245,165,36,0.28)',
              boxShadow: 'inset 0 0 24px rgba(245,165,36,0.04)',
              padding: '20px 22px 18px',
              cursor: 'pointer', transition: 'all 0.2s',
              ...chamfer(16),
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.transform = 'translateY(-2px)'
              el.style.borderColor = 'rgba(245,165,36,0.6)'
              el.style.boxShadow = 'inset 0 0 24px rgba(245,165,36,0.06), 0 0 28px rgba(245,165,36,0.18)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.transform = 'none'
              el.style.borderColor = 'rgba(245,165,36,0.28)'
              el.style.boxShadow = 'inset 0 0 24px rgba(245,165,36,0.04)'
            }}
          >
            <Brackets amber />

            {/* Hash ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                {/* Icon box */}
                <div style={{
                  width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(245,165,36,0.15)', border: '1px solid rgba(245,165,36,0.35)',
                  ...chamfer(8),
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5a524" strokeWidth="1.6" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px',
                  background: 'rgba(109,255,176,0.12)', border: '1px solid rgba(109,255,176,0.4)',
                  color: '#6dffb0', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  ...chamfer(5),
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 5px #6dffb0', animation: 'pulseDot 1.6s infinite' }} />
                  Đang hoạt động
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3a4460', letterSpacing: '0.12em' }}>// forum · 01</span>
              </div>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#eaf6ff', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Tin thiên văn
            </h3>
            <p style={{ fontSize: 13, color: '#9aa8c4', margin: '0 0 16px', lineHeight: 1.5 }}>
              Diễn đàn tin và cập nhật — kiểm duyệt bài đăng tại đây.
            </p>

            <div style={{ borderTop: '1px dashed rgba(245,165,36,0.2)', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5c6886' }}>
                cần duyệt ·{' '}
                <span style={{ color: '#f5a524' }}>00</span>
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#f5a524', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                Mở diễn đàn →
              </span>
            </div>
          </div>
        </Link>

        {/* Card: Tất cả diễn đàn (plasma cyan) */}
        <Link
          href="/community"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div
            style={{
              position: 'relative',
              background: 'rgba(6,9,26,0.92)',
              border: '1px solid rgba(126,231,255,0.18)',
              boxShadow: 'inset 0 0 24px rgba(126,231,255,0.04)',
              padding: '20px 22px 18px',
              cursor: 'pointer', transition: 'all 0.2s',
              ...chamfer(16),
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.transform = 'translateY(-2px)'
              el.style.borderColor = 'rgba(126,231,255,0.5)'
              el.style.boxShadow = 'inset 0 0 24px rgba(126,231,255,0.06), 0 0 24px rgba(126,231,255,0.14)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.transform = 'none'
              el.style.borderColor = 'rgba(126,231,255,0.18)'
              el.style.boxShadow = 'inset 0 0 24px rgba(126,231,255,0.04)'
            }}
          >
            <Brackets />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(126,231,255,0.08)', border: '1px solid rgba(126,231,255,0.25)',
                ...chamfer(8),
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7ee7ff" strokeWidth="1.6" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px',
                  background: 'rgba(109,255,176,0.12)', border: '1px solid rgba(109,255,176,0.4)',
                  color: '#6dffb0', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  ...chamfer(5),
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6dffb0', boxShadow: '0 0 5px #6dffb0', animation: 'pulseDot 1.6s infinite' }} />
                  Đang hoạt động
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3a4460', letterSpacing: '0.12em' }}>// forum · 02</span>
              </div>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#eaf6ff', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Tất cả diễn đàn
            </h3>
            <p style={{ fontSize: 13, color: '#9aa8c4', margin: '0 0 16px', lineHeight: 1.5 }}>
              Chọn khu vực khác nếu cần duyệt bài ngoài mục tin.
            </p>

            <div style={{ borderTop: '1px dashed rgba(126,231,255,0.15)', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5c6886' }}>
                khu vực ·{' '}
                <span style={{ color: '#7ee7ff' }}>nhiều</span>
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#7ee7ff', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                duyệt theo khu vực →
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Zone 4: Tips Panel ── */}
      <div style={{
        position: 'relative',
        background: 'rgba(6,9,26,0.7)',
        border: '1px solid rgba(126,231,255,0.12)',
        padding: '20px 24px',
        ...chamfer(14),
      }}>
        {/* Only top-left + bottom-right brackets */}
        <span style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderTop: '1.5px solid rgba(126,231,255,0.5)', borderLeft: '1.5px solid rgba(126,231,255,0.5)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 6, right: 6, width: 14, height: 14, borderBottom: '1.5px solid rgba(126,231,255,0.5)', borderRight: '1.5px solid rgba(126,231,255,0.5)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 1, background: 'rgba(126,231,255,0.4)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9aa8c4' }}>
              Gợi ý thao tác
            </span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3a4460' }}>
            // hai hành động khả dụng từ giao diện này
          </span>
        </div>

        {/* Tip rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* Pin tip */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: '46px 1fr auto', alignItems: 'center', gap: 14,
              padding: '12px 16px',
              background: 'rgba(245,165,36,0.04)', border: '1px solid rgba(245,165,36,0.12)',
              transition: 'all 0.2s',
              ...chamfer(10),
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,165,36,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,165,36,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,165,36,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,165,36,0.12)' }}
          >
            <div style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(245,165,36,0.12)', border: '1px solid rgba(245,165,36,0.3)',
              ...chamfer(7),
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f5a524" strokeWidth="1.8" aria-hidden>
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
            </div>
            <div>
              <span style={{ color: '#f5a524', fontWeight: 600 }}>Ghim</span>
              <span style={{ color: '#9aa8c4', fontSize: 13 }}> — đưa bài quan trọng lên đầu danh sách trong diễn đàn đó.</span>
            </div>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '2px 8px', background: 'rgba(245,165,36,0.1)', border: '1px solid rgba(245,165,36,0.25)',
              color: '#f5a524', whiteSpace: 'nowrap',
              ...chamfer(5),
            }}>
              action · pin
            </span>
          </div>

          {/* Delete tip */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: '46px 1fr auto', alignItems: 'center', gap: 14,
              padding: '12px 16px',
              background: 'rgba(255,80,80,0.03)', border: '1px solid rgba(255,80,80,0.1)',
              transition: 'all 0.2s',
              ...chamfer(10),
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.1)' }}
          >
            <div style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)',
              ...chamfer(7),
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff9090" strokeWidth="1.8" aria-hidden>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <span style={{ color: '#ff9090', fontWeight: 600 }}>Xóa bài</span>
              <span style={{ color: '#9aa8c4', fontSize: 13 }}> — chỉ khi vi phạm nội quy; hành động <strong style={{ color: '#eaf6ff' }}>không thể hoàn tác</strong> qua giao diện này.</span>
            </div>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '2px 8px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)',
              color: '#ff9090', whiteSpace: 'nowrap',
              ...chamfer(5),
            }}>
              action · delete
            </span>
          </div>
        </div>
      </div>

      {/* pulseDot keyframe */}
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}
