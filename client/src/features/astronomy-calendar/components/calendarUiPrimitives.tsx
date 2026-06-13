'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Eclipse, Flame, Moon, Orbit, Sparkles, Star, Sun, Telescope } from 'lucide-react'
import type { AstronomyCalendarEvent, AstronomyEventType } from '../types'
import { KIT_ICON_OPTIONS } from '../admin/studioConstants'

export function Brackets({
  c = 'var(--color-accent)',
  s = 12,
  o = 6,
}: {
  c?: string
  s?: number
  o?: number
}) {
  const b = (ex: CSSProperties): CSSProperties => ({
    position: 'absolute',
    width: s,
    height: s,
    opacity: 0.85,
    pointerEvents: 'none',
    ...ex,
  })
  return (
    <>
      <span style={b({ top: o, left: o, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span style={b({ top: o, right: o, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })} />
      <span style={b({ bottom: o, left: o, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` })} />
      <span
        style={b({ bottom: o, right: o, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` })}
      />
    </>
  )
}

/** Card dùng cosmo-dark-panel — nền trang giữ nguyên bg-ds-base của site. */
export function CosmoPanel({
  children,
  accent = 'var(--color-accent)',
  className = '',
  style,
  glow,
  variant = 'default',
}: {
  children: ReactNode
  accent?: string
  className?: string
  style?: CSSProperties
  glow?: boolean
  variant?: 'default' | 'featured'
}) {
  const panelClass =
    variant === 'featured' ? 'cosmo-dark-panel cosmo-dark-panel-amber' : 'cosmo-dark-panel'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${panelClass} ${className}`}
      style={{
        ...(glow
          ? {
              boxShadow: `0 12px 36px rgba(0, 0, 0, 0.35), 0 0 32px -8px color-mix(in srgb, ${accent} 45%, transparent)`,
              borderColor: `color-mix(in srgb, ${accent} 35%, var(--color-border))`,
            }
          : undefined),
        ...style,
      }}
    >
      <Brackets c={accent} />
      {children}
    </div>
  )
}

export type EventTypeTheme = {
  accent: string
  iconBg: string
  pill: string
  dot: string
}

const ICON_BY_KEY = Object.fromEntries(KIT_ICON_OPTIONS.map((o) => [o.key, o.Icon]))

function defaultIconKey(type: AstronomyEventType): string {
  switch (type) {
    case 'moon_phase':
      return 'moon'
    case 'meteor_shower':
      return 'sparkles'
    case 'lunar_eclipse':
      return 'eclipse'
    case 'solar_eclipse':
      return 'sun'
    case 'planet_highlight':
      return 'telescope'
    default:
      return 'star'
  }
}

export function resolveEventTheme(
  event: Pick<AstronomyCalendarEvent, 'type' | 'content'>,
): EventTypeTheme {
  const base = eventTypeTheme(event.type)
  const accent = event.content?.accentColor || base.accent
  return {
    accent,
    iconBg: `color-mix(in srgb, ${accent} 18%, transparent)`,
    pill: base.pill,
    dot: base.dot,
  }
}

export function resolveEventIconKey(
  event: Pick<AstronomyCalendarEvent, 'type' | 'content'>,
): string {
  return event.content?.iconKey || defaultIconKey(event.type)
}

export function eventTypeTheme(type: AstronomyEventType): EventTypeTheme {
  switch (type) {
    case 'meteor_shower':
      return {
        accent: '#c4b5fd',
        iconBg: 'color-mix(in srgb, #c4b5fd 22%, transparent)',
        pill: 'bg-violet-500/20 text-violet-100 border-violet-400/30',
        dot: 'bg-violet-400',
      }
    case 'moon_phase':
      return {
        accent: 'var(--color-accent)',
        iconBg: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
        pill: 'bg-sky-500/15 text-sky-100 border-sky-400/25',
        dot: 'bg-sky-400',
      }
    case 'lunar_eclipse':
      return {
        accent: '#fb7185',
        iconBg: 'color-mix(in srgb, #fb7185 18%, transparent)',
        pill: 'bg-rose-500/18 text-rose-100 border-rose-400/28',
        dot: 'bg-rose-400',
      }
    case 'solar_eclipse':
      return {
        accent: 'var(--color-brand-amber)',
        iconBg: 'color-mix(in srgb, var(--color-brand-amber) 20%, transparent)',
        pill: 'bg-amber-500/18 text-amber-100 border-amber-400/28',
        dot: 'bg-amber-400',
      }
    case 'planet_highlight':
      return {
        accent: '#22d3ee',
        iconBg: 'color-mix(in srgb, #22d3ee 18%, transparent)',
        pill: 'bg-cyan-500/18 text-cyan-100 border-cyan-400/28',
        dot: 'bg-cyan-400',
      }
    default:
      return {
        accent: 'var(--color-accent)',
        iconBg: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
        pill: 'bg-sky-500/18 text-sky-100 border-sky-400/28',
        dot: 'bg-sky-400',
      }
  }
}

export function EventTypeIcon({
  type,
  iconKey,
  accent,
  className = 'h-4 w-4',
}: {
  type: AstronomyEventType
  iconKey?: string | null
  accent?: string
  className?: string
}) {
  const theme = eventTypeTheme(type)
  const color = accent || theme.accent
  const cls = `${className} shrink-0`
  const key = iconKey || defaultIconKey(type)
  const Icon = ICON_BY_KEY[key] || Star
  return <Icon className={cls} style={{ color }} aria-hidden />
}

export function groupEventsByDate(events: AstronomyCalendarEvent[]) {
  const groups: Array<{ key: string; label: string; events: AstronomyCalendarEvent[] }> = []
  const map = new Map<string, AstronomyCalendarEvent[]>()

  for (const ev of events) {
    const d = new Date(ev.peakAt || ev.startAt)
    const key = Number.isNaN(d.getTime())
      ? 'unknown'
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }

  for (const [key, list] of map) {
    if (key === 'unknown') {
      groups.push({ key, label: 'Khác', events: list })
      continue
    }
    const d = new Date(key + 'T12:00:00')
    const label = d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    groups.push({ key, label, events: list })
  }
  return groups
}
