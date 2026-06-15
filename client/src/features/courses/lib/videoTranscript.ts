import type { Locale } from '@/i18n/types'

export type VideoTranscriptCue = {
  startSeconds: number
  text: string
}

export const VIDEO_TRANSCRIPT_LANGS = ['vi', 'en'] as const
export type VideoTranscriptLang = (typeof VIDEO_TRANSCRIPT_LANGS)[number]

export type VideoTranscriptTracks = Partial<Record<VideoTranscriptLang, VideoTranscriptCue[]>>

/** Legacy `cues` + optional per-locale `tracks` (vi, en). */
export type VideoTranscript = {
  language?: string
  cues: VideoTranscriptCue[]
  tracks?: VideoTranscriptTracks
}

function normalizeCues(raw: VideoTranscriptCue[] | null | undefined): VideoTranscriptCue[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => ({
      startSeconds: Math.max(0, Number(c.startSeconds) || 0),
      text: String(c.text || '').trim(),
    }))
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.startSeconds - b.startSeconds)
}

function isTranscriptLang(value: string): value is VideoTranscriptLang {
  return VIDEO_TRANSCRIPT_LANGS.includes(value as VideoTranscriptLang)
}

/** Merge legacy single-track data into `tracks`. */
export function expandVideoTranscriptTracks(raw: VideoTranscript | null | undefined): VideoTranscriptTracks {
  const tracks: VideoTranscriptTracks = {}
  if (!raw) return tracks

  const legacyLang = String(raw.language || 'vi').trim()
  const legacyCues = normalizeCues(raw.cues)
  if (legacyCues.length && isTranscriptLang(legacyLang)) {
    tracks[legacyLang] = legacyCues
  }

  const rawTracks = raw.tracks
  if (rawTracks && typeof rawTracks === 'object') {
    for (const lang of VIDEO_TRANSCRIPT_LANGS) {
      const cues = normalizeCues(rawTracks[lang])
      if (cues.length) tracks[lang] = cues
    }
  }

  return tracks
}

export function normalizeVideoTranscript(raw: VideoTranscript | null | undefined): VideoTranscript | null {
  if (!raw) return null
  const tracks = expandVideoTranscriptTracks(raw)
  const available = listAvailableTranscriptLangs(raw)
  if (available.length === 0) return null

  const primary = isTranscriptLang(String(raw.language || '').trim())
    ? (String(raw.language).trim() as VideoTranscriptLang)
    : available[0]

  return {
    language: primary,
    cues: tracks[primary] ?? [],
    tracks,
  }
}

export function listAvailableTranscriptLangs(
  raw: VideoTranscript | null | undefined,
): VideoTranscriptLang[] {
  const tracks = expandVideoTranscriptTracks(raw)
  return VIDEO_TRANSCRIPT_LANGS.filter((lang) => (tracks[lang]?.length ?? 0) > 0)
}

/**
 * Pick transcript cues for app locale (or explicit override in the video panel).
 */
export function resolveTranscriptForLocale(
  raw: VideoTranscript | null | undefined,
  locale: Locale,
  overrideLang?: VideoTranscriptLang | null,
): { language: VideoTranscriptLang; cues: VideoTranscriptCue[]; available: VideoTranscriptLang[] } | null {
  const tracks = expandVideoTranscriptTracks(raw)
  const available = VIDEO_TRANSCRIPT_LANGS.filter((lang) => (tracks[lang]?.length ?? 0) > 0)
  if (available.length === 0) return null

  const pick =
    (overrideLang && tracks[overrideLang]?.length ? overrideLang : null) ||
    (tracks[locale]?.length ? locale : null) ||
    (isTranscriptLang(String(raw?.language || '')) && tracks[raw!.language as VideoTranscriptLang]?.length
      ? (raw!.language as VideoTranscriptLang)
      : null) ||
    available[0]

  return {
    language: pick,
    cues: tracks[pick] ?? [],
    available,
  }
}

/** Build payload for API — keeps legacy `cues` in sync with primary language. */
export function packVideoTranscript(
  tracks: VideoTranscriptTracks,
  primaryLang: VideoTranscriptLang = 'vi',
): VideoTranscript | null {
  const packed: VideoTranscriptTracks = {}
  for (const lang of VIDEO_TRANSCRIPT_LANGS) {
    const cues = normalizeCues(tracks[lang])
    if (cues.length) packed[lang] = cues
  }
  const available = VIDEO_TRANSCRIPT_LANGS.filter((lang) => packed[lang]?.length)
  if (available.length === 0) return null

  const language = available.includes(primaryLang) ? primaryLang : available[0]
  return {
    language,
    cues: packed[language] ?? [],
    tracks: packed,
  }
}

export function copyTranscriptTimings(
  from: VideoTranscriptCue[],
  to: VideoTranscriptCue[],
): VideoTranscriptCue[] {
  const src = normalizeCues(from)
  const dst = Array.isArray(to) ? [...to] : []
  if (!src.length) return dst
  const out: VideoTranscriptCue[] = []
  const maxLen = Math.max(src.length, dst.length)
  for (let i = 0; i < maxLen; i += 1) {
    const startSeconds = src[i]?.startSeconds ?? dst[i]?.startSeconds ?? 0
    const text = String(dst[i]?.text ?? '').trim()
    out.push({ startSeconds, text })
  }
  return out
}

/** "2:33" | "1:02:05" | "153" → seconds */
export function parseTimeInput(input: string): number | null {
  const s = String(input || '').trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Math.max(0, Number(s))
  const parts = s.split(':').map((p) => p.trim())
  if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) return null
  if (parts.length === 2) {
    const [m, sec] = parts.map(Number)
    return Math.max(0, m * 60 + sec)
  }
  if (parts.length === 3) {
    const [h, m, sec] = parts.map(Number)
    return Math.max(0, h * 3600 + m * 60 + sec)
  }
  return null
}

export function formatCueTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function findActiveCueIndex(cues: VideoTranscriptCue[], currentSeconds: number): number {
  if (!cues.length) return -1
  let active = 0
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].startSeconds <= currentSeconds + 0.05) active = i
    else break
  }
  return active
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    if (url.includes('youtube.com/watch')) {
      return new URL(url).searchParams.get('v')
    }
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split(/[?#]/)[0] ?? null
    }
    if (url.includes('youtube.com/embed/')) {
      return url.split('youtube.com/embed/')[1]?.split(/[?#]/)[0] ?? null
    }
  } catch {
    return null
  }
  return null
}

export function toYouTubeEmbedUrl(url: string, enableJsApi = false): string | null {
  const id = extractYouTubeVideoId(url)
  if (!id) {
    if (url.includes('youtube.com/embed/')) return url
    return null
  }
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  })
  if (enableJsApi) params.set('enablejsapi', '1')
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
