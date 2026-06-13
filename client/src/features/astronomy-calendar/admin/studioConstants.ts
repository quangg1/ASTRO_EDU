import type { LucideIcon } from 'lucide-react'
import { Eclipse, Flame, Moon, Orbit, Sparkles, Star, Sun, Telescope } from 'lucide-react'
import type { AstronomyEventType } from '../types'

export const EVENT_TYPES: AstronomyEventType[] = [
  'moon_phase',
  'meteor_shower',
  'lunar_eclipse',
  'solar_eclipse',
  'planet_highlight',
]

export const TYPE_META: Record<
  AstronomyEventType,
  { labelVi: string; hint: string; defaultIcon: string }
> = {
  moon_phase: { labelVi: 'Pha Trăng', hint: 'Trăng non, khuyết, tròn…', defaultIcon: 'moon' },
  meteor_shower: { labelVi: 'Mưa sao băng', hint: 'Perseids, Geminids…', defaultIcon: 'sparkles' },
  lunar_eclipse: { labelVi: 'Nguyệt thực', hint: 'Bán / toàn phần', defaultIcon: 'eclipse' },
  solar_eclipse: { labelVi: 'Nhật thực', hint: 'Cần kính lọc an toàn', defaultIcon: 'sun' },
  planet_highlight: { labelVi: 'Hành tinh', hint: 'Hội tụ, opposition…', defaultIcon: 'telescope' },
}

export const KIT_ICON_OPTIONS: Array<{ key: string; labelVi: string; Icon: LucideIcon }> = [
  { key: 'moon', labelVi: 'Trăng', Icon: Moon },
  { key: 'sparkles', labelVi: 'Sao băng', Icon: Sparkles },
  { key: 'eclipse', labelVi: 'Nguyệt thực', Icon: Eclipse },
  { key: 'sun', labelVi: 'Mặt Trời', Icon: Sun },
  { key: 'telescope', labelVi: 'Kính thiên văn', Icon: Telescope },
  { key: 'star', labelVi: 'Ngôi sao', Icon: Star },
  { key: 'orbit', labelVi: 'Quỹ đạo', Icon: Orbit },
  { key: 'flame', labelVi: 'Sáng / nóng', Icon: Flame },
]

export const ACCENT_PRESETS = [
  '#fbbf24',
  '#f59e0b',
  '#fb7185',
  '#f472b6',
  '#c4b5fd',
  '#a78bfa',
  '#22d3ee',
  '#38bdf8',
  '#34d399',
  '#6dffb0',
  '#94a3b8',
  '#e2e8f0',
]

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  archived: 'Lưu trữ',
}

export const STATUS_OPTIONS = ['draft', 'review', 'published', 'archived'] as const

export const EVENT_KIND_OPTIONS = [
  { value: 'observable', label: 'Quan sát' },
  { value: 'educational', label: 'Giáo dục' },
] as const
