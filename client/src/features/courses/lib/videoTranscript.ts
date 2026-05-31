export type VideoTranscriptCue = {
  startSeconds: number
  text: string
}

export type VideoTranscript = {
  language?: string
  cues: VideoTranscriptCue[]
}

export function normalizeVideoTranscript(raw: VideoTranscript | null | undefined): VideoTranscript | null {
  if (!raw || !Array.isArray(raw.cues)) return null
  const cues = raw.cues
    .map((c) => ({
      startSeconds: Math.max(0, Number(c.startSeconds) || 0),
      text: String(c.text || '').trim(),
    }))
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.startSeconds - b.startSeconds)
  if (cues.length === 0) return null
  return {
    language: String(raw.language || 'vi').trim() || 'vi',
    cues,
  }
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
