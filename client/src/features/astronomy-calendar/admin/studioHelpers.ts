import type { AstronomyCalendarEvent, AstronomyEventAdmin, AstronomyEventTypeKit } from '../types'
import { TYPE_META } from './studioConstants'

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function formatEventListDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function slugifyEventId(title: string, startAt: string): string {
  const d = new Date(startAt)
  const day = Number.isNaN(d.getTime())
    ? 'unknown'
    : `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `editorial-${day}-${slug || 'event'}`
}

export function emptyEventDraft(kit?: AstronomyEventTypeKit | null): Partial<AstronomyEventAdmin> {
  const now = new Date()
  const end = new Date(now.getTime() + 2 * 3600000)
  const type = kit?.type || 'moon_phase'
  return {
    eventId: '',
    status: 'draft',
    eventKind: 'observable',
    type,
    source: 'editorial',
    titleVi: '',
    summaryVi: '',
    subtitleVi: '',
    subtitleEn: '',
    descriptionVi: '',
    observationTipsVi: kit?.defaultObservationTipsVi || '',
    visibilityLabelVi: kit?.defaultVisibilityLabelVi || '',
    typeLabelVi: kit?.typeLabelVi || TYPE_META[type].labelVi,
    startAt: now.toISOString(),
    endAt: end.toISOString(),
    peakAt: now.toISOString(),
    exploreView: null,
    exploreTarget: null,
    lessonHref: null,
    quizHref: null,
    difficulty: null,
    moonPhaseHint: null,
    priority: 0,
    featured: false,
    urgencyRank: 0,
    gemRewardOverride: null,
    reviewNote: '',
  }
}

export function applyKitToDraft(
  draft: Partial<AstronomyEventAdmin>,
  kit: AstronomyEventTypeKit | null | undefined,
): Partial<AstronomyEventAdmin> {
  if (!kit) return draft
  return {
    ...draft,
    type: kit.type,
    typeLabelVi: draft.typeLabelVi?.trim() ? draft.typeLabelVi : kit.typeLabelVi,
    visibilityLabelVi: draft.visibilityLabelVi?.trim() ? draft.visibilityLabelVi : kit.defaultVisibilityLabelVi,
    observationTipsVi: draft.observationTipsVi?.trim() ? draft.observationTipsVi : kit.defaultObservationTipsVi,
  }
}

export function buildPreviewCalendarEvent(
  draft: Partial<AstronomyEventAdmin>,
  kit: AstronomyEventTypeKit | null | undefined,
): AstronomyCalendarEvent {
  const type = draft.type || kit?.type || 'moon_phase'
  const startAt = draft.startAt || new Date().toISOString()
  const endAt = draft.endAt || startAt
  const peakAt = draft.peakAt || startAt
  const lessonHref = draft.lessonHref || null
  const exploreTarget = draft.exploreTarget || null
  const exploreView = draft.exploreView || null
  const exploreHref =
    lessonHref && !exploreTarget
      ? lessonHref
      : exploreView === 'sky'
        ? `/explore?view=sky${exploreTarget ? `&target=${encodeURIComponent(exploreTarget)}` : ''}`
        : exploreView === 'solar'
          ? `/explore?view=solar${exploreTarget ? `&target=${encodeURIComponent(exploreTarget)}` : ''}`
          : '/explore'

  return {
    id: draft.eventId || 'preview',
    type,
    eventKind: draft.eventKind || 'observable',
    source: draft.source || 'editorial',
    titleVi: draft.titleVi || 'Tiêu đề sự kiện',
    summaryVi: draft.summaryVi || draft.descriptionVi || '',
    startAt,
    endAt,
    peakAt,
    isLive: false,
    exploreView,
    exploreTarget,
    exploreHref,
    lessonHref,
    quizHref: draft.quizHref || null,
    ctaLabelVi: lessonHref && !exploreTarget ? 'Đọc bài pha trăng' : 'Mở la bàn chòm sao',
    difficulty: draft.difficulty,
    moonPhaseHint: draft.moonPhaseHint,
    featured: Boolean(draft.featured),
    priority: draft.priority || 0,
    content: {
      typeLabelVi: draft.typeLabelVi || kit?.typeLabelVi || TYPE_META[type].labelVi,
      subtitleVi: draft.subtitleVi || '',
      subtitleEn: draft.subtitleEn || '',
      descriptionVi: draft.descriptionVi || draft.summaryVi || '',
      observationTipsVi: draft.observationTipsVi || kit?.defaultObservationTipsVi || '',
      visibilityLabelVi: draft.visibilityLabelVi || kit?.defaultVisibilityLabelVi || '',
      legendLabelVi: kit?.legendLabelVi,
      legendGroup: kit?.legendGroup,
      accentColor: kit?.accentColor || null,
      iconKey: kit?.iconKey || TYPE_META[type].defaultIcon,
    },
  }
}

export function kitMapFromList(kits: AstronomyEventTypeKit[]): Record<string, AstronomyEventTypeKit> {
  return Object.fromEntries(kits.map((k) => [k.type, k]))
}
