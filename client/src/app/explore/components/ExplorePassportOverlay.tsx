'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  BookOpen,
  Check,
  Compass,
  Globe2,
  History,
  Lock,
  Sparkles,
  Stars,
  X,
} from 'lucide-react'
import {
  type ExplorePassportSummary,
  type PassportStamp,
  type PassportStampKind,
  formatPassportId,
  listStoryVisaStamps,
  passportKindLabel,
  resolvePassportStampVisual,
} from '@/features/explore/public'

type TabId = 'discovery' | 'story' | 'history' | 'sky'

const TAB_META: { id: TabId; label: string; kinds: PassportStampKind[] }[] = [
  { id: 'discovery', label: 'Khám phá', kinds: ['discovery'] },
  { id: 'story', label: 'Story', kinds: ['story'] },
  { id: 'history', label: 'Lịch sử sâu', kinds: ['dh_beat', 'dh_site'] },
  { id: 'sky', label: 'Bầu trời', kinds: ['sky'] },
]

const EMPTY_HINT: Record<TabId, string> = {
  discovery: 'Focus một thiên thể ~3 giây trong Hệ Mặt Trời để nhận stamp đầu tiên.',
  story: 'Hoàn thành story tour (Artemis, Jupiter, Saturn…) để đóng dấu visa.',
  history: 'Ở lại beat/site trong Lịch sử sâu ≥30 giây hoặc mở pin narrative.',
  sky: 'Mở La bàn chòm sao và chọn chòm / mục tiêu bầu trời.',
}

type Props = {
  open: boolean
  summary: ExplorePassportSummary
  loggedIn: boolean
  userDisplayName?: string | null
  userId?: string | null
  onClose: () => void
  onNavigate?: (href: string) => void
}

function DiscoveryCard({
  stamp,
  compact,
  onNavigate,
}: {
  stamp: PassportStamp
  compact?: boolean
  onNavigate?: (href: string) => void
}) {
  const visual = resolvePassportStampVisual(stamp)
  return (
    <button
      type="button"
      disabled={!stamp.exploreHref}
      onClick={() => stamp.exploreHref && onNavigate?.(stamp.exploreHref)}
      className={clsx(
        'group relative overflow-hidden rounded-2xl border text-left transition',
        compact ? 'aspect-[4/3]' : 'aspect-[16/10]',
        stamp.exploreHref
          ? 'border-white/10 hover:border-ds-accent-strong/50 hover:shadow-[0_0_24px_rgba(99,102,241,0.25)]'
          : 'border-white/[0.06] opacity-80',
      )}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
        style={{
          backgroundImage: visual.imageUrl
            ? `url(${visual.imageUrl})`
            : visual.gradient,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05060c] via-[#05060c]/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">
          {stamp.subtitle || passportKindLabel(stamp.kind)}
        </p>
        <p className={clsx('mt-0.5 font-semibold text-white', compact ? 'text-[11px] leading-snug' : 'text-sm')}>
          {stamp.label}
        </p>
        {!compact ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-ds-accent" style={{ boxShadow: `0 0 8px ${visual.accent}` }} />
          </div>
        ) : null}
        {!compact ? (
          <p className="mt-1 text-[9px] font-medium text-ds-accent">Đã khám phá</p>
        ) : null}
      </div>
    </button>
  )
}

function StampChip({ stamp, onNavigate }: { stamp: PassportStamp; onNavigate?: (href: string) => void }) {
  const visual = resolvePassportStampVisual(stamp)
  return (
    <button
      type="button"
      disabled={!stamp.exploreHref}
      onClick={() => stamp.exploreHref && onNavigate?.(stamp.exploreHref)}
      className={clsx(
        'flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
        stamp.exploreHref
          ? 'border-white/10 bg-white/[0.04] hover:border-ds-accent-strong/40 hover:bg-ds-accent-soft/30'
          : 'border-white/[0.06] bg-white/[0.02]',
      )}
    >
      <span
        className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-cover bg-center"
        style={{
          backgroundImage: visual.imageUrl ? `url(${visual.imageUrl})` : visual.gradient,
        }}
      />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-white">{stamp.label}</span>
        <span className="block truncate text-[9px] text-white/40">{passportKindLabel(stamp.kind)}</span>
      </span>
    </button>
  )
}

export function ExplorePassportOverlay({
  open,
  summary,
  loggedIn,
  userDisplayName,
  userId,
  onClose,
  onNavigate,
}: Props) {
  const [tab, setTab] = useState<TabId>('discovery')

  const discoveryStamps = useMemo(
    () => summary.stamps.filter((s) => s.kind === 'discovery'),
    [summary.stamps],
  )
  const recentDiscoveries = useMemo(() => discoveryStamps.slice(-6).reverse(), [discoveryStamps])

  const earnedStoryIds = useMemo(
    () => new Set(summary.stamps.filter((s) => s.kind === 'story').map((s) => s.id.replace(/^story:/, ''))),
    [summary.stamps],
  )
  const storyVisa = useMemo(() => listStoryVisaStamps(earnedStoryIds), [earnedStoryIds])

  const activeTab = TAB_META.find((t) => t.id === tab)!
  const tabStamps = useMemo(
    () => summary.stamps.filter((s) => activeTab.kinds.includes(s.kind)),
    [summary.stamps, activeTab.kinds],
  )

  const historyCount = summary.counts.dh_beat + summary.counts.dh_site
  const passportId = formatPassportId(summary.counts.total, userId)
  const displayName = userDisplayName?.trim() || 'Thám hiểm viên'

  if (!open) return null

  return (
    <div className="pointer-events-auto fixed inset-0 z-[35] flex items-end justify-center bg-[#03050a]/75 p-3 backdrop-blur-md sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-labelledby="explore-passport-title"
        className="flex max-h-[min(92vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-[linear-gradient(165deg,rgba(12,14,24,0.98)_0%,rgba(6,8,16,0.99)_55%,rgba(10,8,22,0.98)_100%)] shadow-[0_32px_100px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <header className="shrink-0 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ds-accent">
                <Compass className="h-3 w-3" strokeWidth={1.75} />
                Sổ thám hiểm 3D
              </p>
              <h2 id="explore-passport-title" className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-bold text-white sm:text-[1.65rem]">
                Hộ chiếu khám phá
              </h2>
              <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/50">
                Kỷ vật hành trình — model 3D, story tour, lịch sử sâu và la bàn sao.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Đóng sổ thám hiểm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_17.5rem]">
          <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
            <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(120deg,rgba(49,46,129,0.35)_0%,rgba(15,23,42,0.6)_45%,rgba(6,8,16,0.9)_100%)] p-4 sm:p-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-[linear-gradient(145deg,rgba(139,92,246,0.35),rgba(59,130,246,0.2))] shadow-[0_0_30px_rgba(139,92,246,0.25)]">
                  <Globe2 className="h-8 w-8 text-violet-200" strokeWidth={1.25} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-violet-200">
                    Passport ID · {passportId}
                  </span>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-white">{displayName}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                    Hệ Mặt Trời nội · Vành Orion · Dải Milky Way — được phép khám phá anomaly cấp {Math.min(12, 1 + Math.floor(summary.counts.total / 8))} và bề mặt hành tinh.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { value: summary.counts.discovery, label: 'Model 3D', hint: summary.discoveryCatalogHint ? `/ ~${summary.discoveryCatalogHint}` : '' },
                  { value: summary.counts.story, label: 'Story tour', hint: `/ ${summary.storyCatalogTotal}` },
                  { value: historyCount, label: 'Lịch sử sâu', hint: 'beat · site' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 text-center backdrop-blur-sm"
                  >
                    <p className="font-[family-name:var(--font-heading)] text-xl font-bold tabular-nums text-white">
                      {stat.value}
                      {stat.hint ? (
                        <span className="text-sm font-normal text-white/35">{stat.hint}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/45">{stat.label}</p>
                  </div>
                ))}
              </div>
              {!loggedIn ? (
                <p className="mt-3 text-[10px] text-amber-200/75">Đăng nhập để đồng bộ stamp lên server.</p>
              ) : null}
            </section>

            {recentDiscoveries.length > 0 ? (
              <section className="mt-5">
                <div className="mb-3 flex items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Khám phá gần đây</h3>
                    <p className="text-[11px] text-white/40">Những thiên thể bạn vừa mở trong 3D</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('discovery')}
                    className="text-[10px] font-medium text-ds-accent hover:underline"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {recentDiscoveries.map((stamp) => (
                    <DiscoveryCard key={stamp.id} stamp={stamp} compact onNavigate={onNavigate} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-5">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TAB_META.map((t) => {
                  const count = summary.stamps.filter((s) => t.kinds.includes(s.kind)).length
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-[10px] font-medium transition',
                        tab === t.id
                          ? 'border-ds-accent-strong/50 bg-ds-accent-soft/80 text-ds-accent'
                          : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/75',
                      )}
                    >
                      {t.label}
                      <span className="ml-1 tabular-nums text-white/35">{count}</span>
                    </button>
                  )
                })}
              </div>

              {tabStamps.length > 0 ? (
                tab === 'discovery' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tabStamps.map((stamp) => (
                      <DiscoveryCard key={stamp.id} stamp={stamp} onNavigate={onNavigate} />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tabStamps.map((stamp) => (
                      <StampChip key={stamp.id} stamp={stamp} onNavigate={onNavigate} />
                    ))}
                  </div>
                )
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[11px] text-white/40">
                  {EMPTY_HINT[tab]}
                </p>
              )}
            </section>
          </div>

          <aside className="flex min-h-0 flex-col border-t border-white/[0.07] bg-black/20 lg:border-l lg:border-t-0">
            <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Visa stamps</h3>
                <span className="text-[10px] tabular-nums text-white/40">
                  {storyVisa.filter((s) => s.earned).length} / {storyVisa.length}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-white/35">Story tour đã hoàn thành</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-2 gap-2.5">
                {storyVisa.map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    disabled={!story.earned || !story.exploreHref}
                    onClick={() => story.exploreHref && onNavigate?.(story.exploreHref)}
                    className={clsx(
                      'relative flex flex-col items-center rounded-2xl border px-2 py-3 text-center transition',
                      story.earned
                        ? 'border-violet-400/35 bg-[linear-gradient(160deg,rgba(76,29,149,0.45),rgba(30,27,75,0.6))] shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:brightness-110'
                        : 'border-white/[0.06] bg-white/[0.02] opacity-70',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-11 w-11 items-center justify-center rounded-full border',
                        story.earned
                          ? 'border-violet-300/40 bg-violet-500/25 text-violet-100'
                          : 'border-white/10 bg-white/[0.04] text-white/25',
                      )}
                    >
                      {story.earned ? (
                        <BookOpen className="h-5 w-5" strokeWidth={1.5} />
                      ) : (
                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                      )}
                    </span>
                    {story.earned ? (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-[9px] font-semibold leading-snug text-white">{story.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[8px] text-white/40">
                      {story.earned ? story.subtitle : 'Chưa mở'}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">Huy hiệu khác</p>
                {[
                  { icon: Stars, label: 'La bàn sao', count: summary.counts.sky, color: 'text-sky-300' },
                  { icon: History, label: 'Beat lịch sử', count: summary.counts.dh_beat, color: 'text-amber-200' },
                  { icon: Sparkles, label: 'Tổng stamp', count: summary.counts.total, color: 'text-ds-accent' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
                  >
                    <span className="inline-flex items-center gap-2 text-[10px] text-white/60">
                      <row.icon className={clsx('h-3.5 w-3.5', row.color)} strokeWidth={1.75} />
                      {row.label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-white">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
