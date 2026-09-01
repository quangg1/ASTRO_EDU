'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { useEarthHistoryStore } from '@/features/content3d/earth/stores/earthHistoryStore'
import { FeaturedOrganisms } from './FeaturedOrganisms'
import type {
  ClimateInfo,
  EarthStage,
  LifeInfo,
  Lifeform,
  MajorEvent,
} from '@/features/content3d/earth/lib/earthHistoryTypes'
import { formatGeologicLabelVi } from '@/features/content3d/narrative/lib/geologicTimeVi'

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  volcanic: { label: 'Núi lửa', icon: '🌋' },
  impact: { label: 'Va chạm', icon: '☄' },
  climate: { label: 'Khí hậu', icon: '🌡️' },
  biological: { label: 'Sinh học', icon: '🧬' },
  tectonic: { label: 'Kiến tạo', icon: '🌐' },
  extinction: { label: 'Tuyệt chủng', icon: '💀' },
  evolution: { label: 'Tiến hoá', icon: '🦎' },
}

type Severity = 'catastrophic' | 'major' | 'minor'

const EVENT_SEVERITY: Record<string, Severity> = {
  extinction: 'catastrophic',
  impact: 'major',
  volcanic: 'major',
  tectonic: 'major',
  climate: 'major',
  biological: 'minor',
  evolution: 'minor',
}

const TODAY = {
  o2: 21,
  co2: 415,
  dayHours: 24,
  tempC: 15,
}

/* ------------------------------------------------------------------------- */
/* Panel                                                                     */
/* ------------------------------------------------------------------------- */

type InfoPanelLayout = 'overlay' | 'dock'

export function InfoPanel({ layout = 'overlay' }: { layout?: InfoPanelLayout }) {
  const stage = useEarthHistoryStore((s) => s.currentStage)
  const showInfoPanel = useEarthHistoryStore((s) => s.showInfoPanel)
  const toggleInfoPanel = useEarthHistoryStore((s) => s.toggleInfoPanel)

  if (!showInfoPanel) {
    return (
      <button
        type="button"
        onClick={toggleInfoPanel}
        className={clsx(
          'rounded-ds-control border border-ds-border bg-ds-overlay px-3 py-2 text-xs text-ds-text shadow-lg backdrop-blur-md hover:border-ds-border-strong',
          layout === 'dock' ? 'w-full shrink-0 text-center' : 'fixed right-3 top-20 z-20',
        )}
        aria-label="Mở panel thông tin"
      >
        ⓘ Mở thông tin
      </button>
    )
  }

  const accent = stage.atmosphereColor || '#22d3ee'

  const shell = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-card border border-ds-border bg-ds-overlay shadow-xl backdrop-blur-md">
      <HeroCard stage={stage} onClose={toggleInfoPanel} />

      <div
        className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-y-contain px-3.5 pb-4"
        style={{ scrollbarGutter: 'stable' }}
      >
        <AtmosphereSection stage={stage} />
        {hasClimate(stage.climate) && <ClimateSection climate={stage.climate!} />}
        {hasLife(stage.life) && <LifeSection life={stage.life!} />}
        {stage.majorEvents && stage.majorEvents.length > 0 && <EventsSection events={stage.majorEvents} />}

        <Section title="Hoá thạch tiêu biểu" icon="🦴">
          <FeaturedOrganisms stageId={stage.id} variant="compact" />
        </Section>
      </div>
    </div>
  )

  if (layout === 'dock') {
    return (
      <aside
        className="relative z-0 flex h-full min-h-0 w-full min-w-0 flex-col gap-2.5"
        style={{ ['--beat-accent' as string]: accent }}
      >
        {shell}
      </aside>
    )
  }

  return (
    <aside
      className="fixed right-3 top-16 bottom-24 z-20 flex w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col gap-2.5 animate-slide-right"
      style={{ ['--beat-accent' as string]: accent }}
    >
      {shell}
    </aside>
  )
}

/* ------------------------------------------------------------------------- */
/* Hero card — TIME + stage name + description + Wikipedia                   */
/* ------------------------------------------------------------------------- */

function HeroCard({ stage, onClose }: { stage: EarthStage; onClose: () => void }) {
  const isExtinction = !!stage.isExtinction
  return (
    <header
      className="relative px-4 pt-4 pb-3.5 border-b border-ds-border"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in oklab, var(--beat-accent) 14%, transparent), transparent)',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 w-7 h-7 rounded-full text-ds-muted hover:text-ds-text hover:bg-white/10 flex items-center justify-center text-base"
        aria-label="Ẩn panel thông tin"
      >
        ×
      </button>

      <div className="flex items-baseline justify-between gap-3 pr-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ds-subtle">Thời điểm</p>
          <p
            className={clsx('text-3xl font-bold font-mono tabular-nums leading-tight', isExtinction && 'text-red-300')}
            style={isExtinction ? undefined : { color: 'var(--beat-accent)' }}
          >
            {formatTimeDisplay(stage.time)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ds-subtle">Ngày dài</p>
          <p className="text-sm font-mono text-ds-text tabular-nums">
            <span className="text-base font-semibold" style={{ color: 'var(--beat-accent)' }}>
              {stage.dayLength.toFixed(1)}
            </span>
            <span className="ml-1 text-ds-subtle text-[11px]">giờ</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <span className="text-2xl leading-none mt-0.5" aria-hidden>
          {stage.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className={clsx('text-lg font-semibold leading-snug', isExtinction && 'text-red-200')}
            style={isExtinction ? undefined : { color: 'var(--beat-accent)' }}
          >
            {stage.name}
          </h2>
          <p className="text-xs text-ds-muted mt-0.5">
            {stage.timeDisplay}
            {formatGeologicLabelVi(stage) ? (
              <span className="text-ds-subtle"> · {formatGeologicLabelVi(stage)}</span>
            ) : null}
          </p>
        </div>
      </div>

      {isExtinction && (
        <div className="mt-3 flex items-center gap-2 rounded-ds-control border border-red-500/40 bg-red-950/30 px-2.5 py-1.5">
          <span className="text-base">💀</span>
          <span className="text-xs font-medium text-red-200">Sự kiện tuyệt chủng hàng loạt</span>
        </div>
      )}

      <p className="mt-3 text-[13px] text-ds-text leading-relaxed whitespace-pre-line">{stage.description}</p>

      {stage.resources?.wikipediaUrl && (
        <a
          href={stage.resources.wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
          style={{ color: 'var(--beat-accent)' }}
        >
          Đọc thêm trên Wikipedia
          <span aria-hidden>→</span>
        </a>
      )}
    </header>
  )
}

/* ------------------------------------------------------------------------- */
/* Atmosphere                                                                */
/* ------------------------------------------------------------------------- */

function AtmosphereSection({ stage }: { stage: EarthStage }) {
  return (
    <Section title="Khí quyển" icon="🌬️">
      <Gauge
        label="Oxy (O₂)"
        value={stage.o2}
        unit="%"
        min={0}
        max={35}
        comparisonValue={TODAY.o2}
        comparisonLabel="Hiện tại"
        valueFormatter={(v) => v.toFixed(1)}
        tone={o2Tone(stage.o2)}
      />
      <Gauge
        label="Carbon dioxide (CO₂)"
        value={stage.co2}
        unit="ppm"
        min={0}
        max={6000}
        comparisonValue={TODAY.co2}
        comparisonLabel="Hiện tại"
        valueFormatter={(v) => v.toFixed(0)}
        tone={co2Tone(stage.co2)}
      />
      {stage.moonDistance != null && (
        <FactRow
          label="Khoảng cách Mặt Trăng"
          value={`${formatNumber(stage.moonDistance)} km`}
          hint={
            stage.moonDistance < 384400
              ? 'Gần hơn hiện tại'
              : stage.moonDistance > 384400
                ? 'Xa hơn hiện tại'
                : 'Bằng hiện tại'
          }
        />
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------------- */
/* Climate                                                                   */
/* ------------------------------------------------------------------------- */

function ClimateSection({ climate }: { climate: ClimateInfo }) {
  return (
    <Section title="Khí hậu" icon="🌡️">
      {climate.globalTemp != null && (
        <Gauge
          label="Nhiệt độ trung bình"
          value={climate.globalTemp}
          unit="°C"
          min={-10}
          max={30}
          comparisonValue={TODAY.tempC}
          comparisonLabel="Hiện tại"
          valueFormatter={(v) => v.toFixed(1)}
          semanticLabel={tempLabel(climate.globalTemp)}
          tone={tempTone(climate.globalTemp)}
        />
      )}
      {climate.seaLevel != null && (
        <Gauge
          label="Mực nước biển"
          value={climate.seaLevel}
          unit="m"
          min={-150}
          max={250}
          comparisonValue={0}
          comparisonLabel="Hôm nay"
          valueFormatter={formatSeaLevel}
          semanticLabel={seaLevelLabel(climate.seaLevel)}
          tone="ocean"
        />
      )}
      {climate.iceCoverage != null && climate.iceCoverage > 0 && (
        <Gauge
          label="Băng phủ"
          value={climate.iceCoverage}
          unit="%"
          min={0}
          max={100}
          valueFormatter={(v) => v.toFixed(0)}
          semanticLabel={iceLabel(climate.iceCoverage)}
          tone="ice"
        />
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------------- */
/* Life                                                                      */
/* ------------------------------------------------------------------------- */

function LifeSection({ life }: { life: LifeInfo }) {
  const lifeforms = life.dominantLifeforms ?? []
  return (
    <Section title="Sự sống" icon="🌱" accent="emerald">
      <div className="grid grid-cols-2 gap-2 text-xs">
        {life.complexity && (
          <FactPill
            label="Độ phức tạp"
            value={prettyComplexity(life.complexity)}
            tone="emerald"
          />
        )}
        {life.biodiversityIndex != null && (
          <FactPill
            label="Đa dạng"
            value={`${life.biodiversityIndex}/100`}
            tone="emerald"
          />
        )}
        {life.landLife && <FactPill label="Sự sống" value="trên cạn" tone="emerald" />}
        {life.aerialLife && <FactPill label="Sự sống" value="trên không" tone="emerald" />}
      </div>

      {lifeforms.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ds-subtle mb-2">
            Sinh vật thống trị
          </p>
          <ul className="grid grid-cols-3 gap-2">
            {lifeforms.slice(0, 9).map((lf, i) => (
              <LifeformCard key={`${lf.name}-${i}`} lifeform={lf} />
            ))}
          </ul>
          {lifeforms.length > 9 && (
            <p className="mt-2 text-[11px] text-ds-subtle">+{lifeforms.length - 9} loài khác</p>
          )}
        </div>
      )}
    </Section>
  )
}

function LifeformCard({ lifeform }: { lifeform: Lifeform }) {
  const fallbackEmoji = guessLifeformEmoji(lifeform)
  return (
    <li className="rounded-ds-control border border-ds-border bg-ds-surface overflow-hidden flex flex-col">
      <div className="aspect-square w-full bg-ds-elevated/80 flex items-center justify-center overflow-hidden">
        {lifeform.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={lifeform.imageUrl}
            alt={lifeform.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget
              img.style.display = 'none'
              img.parentElement?.classList.add('lifeform-img-fallback')
            }}
          />
        ) : (
          <span className="text-2xl" aria-hidden>
            {fallbackEmoji}
          </span>
        )}
      </div>
      <p
        className="px-1.5 py-1 text-[11px] text-ds-text leading-tight text-center line-clamp-2"
        title={lifeform.name}
      >
        {lifeform.name}
      </p>
    </li>
  )
}

/* ------------------------------------------------------------------------- */
/* Events                                                                    */
/* ------------------------------------------------------------------------- */

function EventsSection({ events }: { events: MajorEvent[] }) {
  return (
    <Section title="Sự kiện lớn" icon="⚡">
      <ul className="space-y-2">
        {events.map((event, i) => (
          <EventCard key={`${event.name}-${i}`} event={event} />
        ))}
      </ul>
    </Section>
  )
}

function EventCard({ event }: { event: MajorEvent }) {
  const meta = event.type ? EVENT_TYPE_LABELS[event.type] : undefined
  const severity: Severity = event.type ? EVENT_SEVERITY[event.type] ?? 'minor' : 'minor'
  const cardCls = clsx(
    'rounded-ds-control border px-2.5 py-2',
    severity === 'catastrophic' && 'border-red-500/50 bg-red-950/30',
    severity === 'major' && 'border-amber-500/40 bg-amber-950/20',
    severity === 'minor' && 'border-ds-border bg-ds-surface',
  )
  return (
    <li className={cardCls}>
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5" aria-hidden>
          {meta?.icon ?? '•'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-ds-text">{event.name}</span>
            {meta && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider border',
                  severity === 'catastrophic' && 'border-red-400/50 text-red-200 bg-red-500/15',
                  severity === 'major' && 'border-amber-400/50 text-amber-200 bg-amber-500/10',
                  severity === 'minor' && 'border-ds-border text-ds-muted bg-ds-surface/50',
                )}
              >
                {meta.label}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-[11.5px] text-ds-muted mt-1 leading-relaxed">{event.description}</p>
          )}
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------------- */
/* Reusable Section + Gauge primitives (file-local)                          */
/* ------------------------------------------------------------------------- */

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string
  icon: string
  accent?: 'beat' | 'emerald'
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  const titleColor =
    accent === 'emerald'
      ? 'text-emerald-300'
      : undefined /* default uses var(--beat-accent) via style */
  return (
    <section className="rounded-ds-control border border-ds-border bg-ds-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span className="text-sm" aria-hidden>
          {icon}
        </span>
        <span
          className={clsx('flex-1 text-[11px] font-semibold uppercase tracking-[0.16em]', titleColor)}
          style={accent === 'emerald' ? undefined : { color: 'var(--beat-accent)' }}
        >
          {title}
        </span>
        <span className={clsx('text-ds-subtle text-[10px] transition-transform', open ? 'rotate-90' : '')}>
          ▶
        </span>
      </button>
      {open && <div className="px-2.5 pb-2.5 space-y-2.5">{children}</div>}
    </section>
  )
}

type GaugeTone = 'beat' | 'ok' | 'warn' | 'danger' | 'ocean' | 'ice'

function Gauge({
  label,
  value,
  min,
  max,
  unit,
  comparisonValue,
  comparisonLabel,
  valueFormatter,
  semanticLabel,
  tone = 'beat',
}: {
  label: string
  value: number
  min: number
  max: number
  unit?: string
  comparisonValue?: number
  comparisonLabel?: string
  valueFormatter?: (v: number) => string
  semanticLabel?: string
  tone?: GaugeTone
}) {
  const clamped = Math.max(min, Math.min(max, value))
  const pct = ((clamped - min) / (max - min)) * 100
  const cmpPct =
    comparisonValue != null
      ? ((Math.max(min, Math.min(max, comparisonValue)) - min) / (max - min)) * 100
      : null

  const fill = toneToFill(tone)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] text-ds-muted">{label}</span>
        <span className="text-sm font-mono tabular-nums text-ds-text">
          <span className={clsx('font-semibold', toneToText(tone))}>
            {valueFormatter ? valueFormatter(value) : value}
          </span>
          {unit && <span className="ml-1 text-[11px] text-ds-subtle">{unit}</span>}
        </span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-ds-elevated/80 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: fill }}
        />
        {cmpPct != null && (
          <div
            className="absolute top-[-3px] bottom-[-3px] w-px bg-ds-text/70"
            style={{ left: `${cmpPct}%` }}
            aria-hidden
          />
        )}
      </div>
      {(semanticLabel || (comparisonValue != null && comparisonLabel)) && (
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-ds-subtle">
          <span>{semanticLabel ?? ''}</span>
          {comparisonValue != null && comparisonLabel && (
            <span>
              {comparisonLabel}:{' '}
              <span className="text-ds-muted tabular-nums">
                {valueFormatter ? valueFormatter(comparisonValue) : comparisonValue}
                {unit ? ` ${unit}` : ''}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function FactRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-ds-muted">{label}</span>
      <span className="text-ds-text font-mono tabular-nums">
        {value}
        {hint && <span className="ml-1 text-[10px] text-ds-subtle">· {hint}</span>}
      </span>
    </div>
  )
}

function FactPill({
  label,
  value,
  tone = 'beat',
}: {
  label: string
  value: string
  tone?: 'beat' | 'emerald'
}) {
  return (
    <div
      className={clsx(
        'rounded-ds-control border px-2 py-1.5',
        tone === 'emerald'
          ? 'border-emerald-500/30 bg-emerald-950/25'
          : 'border-ds-border bg-ds-surface',
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-ds-subtle">{label}</p>
      <p className={clsx('text-[12px] font-medium mt-0.5', tone === 'emerald' && 'text-emerald-200')}>
        {value}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Pure helpers                                                              */
/* ------------------------------------------------------------------------- */

function hasClimate(c: ClimateInfo | undefined): c is ClimateInfo {
  if (!c) return false
  return c.globalTemp != null || c.seaLevel != null || c.iceCoverage != null
}

function hasLife(l: LifeInfo | undefined): l is LifeInfo {
  if (!l) return false
  return !!l.exists || (l.dominantLifeforms?.length ?? 0) > 0
}

function formatTimeDisplay(time: number): string {
  if (time === 0) return 'Hôm nay'
  if (time < 0.001) return `${(time * 1_000_000).toFixed(0)} năm`
  if (time < 1) return `${(time * 1000).toFixed(0)} nghìn`
  if (time >= 1000) return `${(time / 1000).toFixed(2)} tỷ năm`
  return `${time.toFixed(0)} triệu năm`
}

function formatSeaLevel(m: number): string {
  if (m === 0) return '0 m'
  if (m > 0) return `+${m.toFixed(0)} m`
  return `${m.toFixed(0)} m`
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

function o2Tone(o2: number): GaugeTone {
  if (o2 < 5) return 'danger'
  if (o2 < 15) return 'warn'
  return 'ok'
}

function co2Tone(co2: number): GaugeTone {
  if (co2 > 5000) return 'danger'
  if (co2 > 1000) return 'warn'
  return 'ok'
}

function tempTone(t: number): GaugeTone {
  if (t < 0) return 'ice'
  if (t > 25) return 'danger'
  return 'beat'
}

function tempLabel(t: number): string {
  if (t < -2) return 'Băng giá toàn cầu'
  if (t < 10) return 'Lạnh'
  if (t < 18) return 'Ôn hoà'
  if (t < 25) return 'Ấm'
  return 'Nóng bất thường'
}

function seaLevelLabel(m: number): string {
  if (m < -50) return 'Thấp bất thường'
  if (m < 0) return 'Thấp hơn hiện tại'
  if (m < 50) return 'Gần hiện tại'
  if (m < 150) return 'Cao'
  return 'Rất cao — biển tràn lục địa'
}

function iceLabel(p: number): string {
  if (p < 5) return 'Gần như không'
  if (p < 20) return 'Cực ít'
  if (p < 50) return 'Vừa phải'
  if (p < 80) return 'Phủ rộng'
  return 'Trái Đất quả cầu tuyết'
}

function prettyComplexity(c: string): string {
  return c
    .replace(/_/g, ' ')
    .replace(/^\w/, (s) => s.toUpperCase())
}

function guessLifeformEmoji(lf: Lifeform): string {
  const hay = `${lf.name} ${lf.type ?? ''}`.toLowerCase()
  if (/dinosaur|khủng long|t-rex|raptor|sauropod|theropod/.test(hay)) return '🦖'
  if (/mammal|thú|elephant|wolf|sói|primate|khỉ|human|người/.test(hay)) return '🦣'
  if (/bird|chim|raptor|avian/.test(hay)) return '🦅'
  if (/fish|cá|shark/.test(hay)) return '🐟'
  if (/trilobit|cua|crustacean/.test(hay)) return '🦀'
  if (/insect|côn trùng|bee|ong/.test(hay)) return '🪲'
  if (/plant|cây|tree|fern|moss/.test(hay)) return '🌿'
  if (/algae|tảo|cyanobacter|stromatolite/.test(hay)) return '🟢'
  if (/bacteria|vi khuẩn|microbe/.test(hay)) return '🦠'
  if (/reptile|bò sát|lizard|snake/.test(hay)) return '🦎'
  if (/amphibian|ếch|frog/.test(hay)) return '🐸'
  if (/jellyfish|sứa|cnidarian/.test(hay)) return '🪼'
  return '🧬'
}

function toneToFill(tone: GaugeTone): string {
  switch (tone) {
    case 'danger':
      return 'linear-gradient(90deg, rgba(248,113,113,0.95), rgba(244,63,94,0.95))'
    case 'warn':
      return 'linear-gradient(90deg, rgba(251,191,36,0.95), rgba(249,115,22,0.95))'
    case 'ok':
      return 'linear-gradient(90deg, rgba(74,222,128,0.95), rgba(34,197,94,0.95))'
    case 'ocean':
      return 'linear-gradient(90deg, rgba(56,189,248,0.95), rgba(14,165,233,0.95))'
    case 'ice':
      return 'linear-gradient(90deg, rgba(186,230,253,0.95), rgba(125,211,252,0.95))'
    case 'beat':
    default:
      return 'linear-gradient(90deg, color-mix(in oklab, var(--beat-accent) 90%, white 0%), var(--beat-accent))'
  }
}

function toneToText(tone: GaugeTone): string {
  switch (tone) {
    case 'danger':
      return 'text-red-300'
    case 'warn':
      return 'text-amber-300'
    case 'ok':
      return 'text-emerald-300'
    case 'ocean':
      return 'text-sky-300'
    case 'ice':
      return 'text-sky-200'
    case 'beat':
    default:
      return ''
  }
}
