'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveMediaUrl } from '@/lib/apiConfig'
import {
  extractYouTubeVideoId,
  findActiveCueIndex,
  formatCueTime,
  normalizeVideoTranscript,
  type VideoTranscript,
} from '@/features/courses/lib/videoTranscript'
import { useT } from '@/i18n/public'

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string
          playerVars?: Record<string, string | number>
          events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void }
        },
      ) => { seekTo: (s: number, allowSeek: boolean) => void; getCurrentTime: () => number; destroy: () => void }
      PlayerState?: { PLAYING: number }
      loaded?: number
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const YT_LOADED = { promise: null as Promise<void> | null }

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (YT_LOADED.promise) return YT_LOADED.promise
  YT_LOADED.promise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (document.querySelector('script[data-yt-iframe-api]')) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.dataset.ytIframeApi = '1'
    document.head.appendChild(tag)
  })
  return YT_LOADED.promise
}

type Props = {
  videoUrl: string
  title?: string
  transcript?: VideoTranscript | null
  className?: string
}

export function VideoWithTranscriptPanel({ videoUrl, title, transcript, className = '' }: Props) {
  const { t } = useT()
  const resolvedUrl = resolveMediaUrl(videoUrl)
  const youtubeId = extractYouTubeVideoId(resolvedUrl)
  const isDirect =
    !youtubeId &&
    (resolvedUrl.endsWith('.mp4') ||
      resolvedUrl.endsWith('.webm') ||
      resolvedUrl.startsWith('/course-media') ||
      resolvedUrl.startsWith('/files/') ||
      resolvedUrl.startsWith('http'))

  const normalizedTranscript = useMemo(() => normalizeVideoTranscript(transcript), [transcript])
  const cues = normalizedTranscript?.cues ?? []
  const hasTranscript = cues.length > 0

  const videoRef = useRef<HTMLVideoElement>(null)
  const ytHostRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<{ seekTo: (s: number, a: boolean) => void; getCurrentTime: () => number; destroy: () => void } | null>(
    null,
  )

  const [currentTime, setCurrentTime] = useState(0)
  const [transcriptOpen, setTranscriptOpen] = useState(true)
  const activeIndex = hasTranscript ? findActiveCueIndex(cues, currentTime) : -1

  const langLabels: Record<string, string> = useMemo(
    () => ({
      vi: t('courses.videoLangVi'),
      en: t('courses.videoLangEn'),
      auto: t('courses.videoAuto'),
    }),
    [t],
  )

  const seekTo = useCallback(
    (seconds: number) => {
      const time = Math.max(0, seconds)
      if (videoRef.current) {
        videoRef.current.currentTime = time
        void videoRef.current.play().catch(() => {})
      }
      if (ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(time, true)
      }
      setCurrentTime(time)
    },
    [],
  )

  useEffect(() => {
    if (!youtubeId || !ytHostRef.current) return
    let poll: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    void loadYouTubeIframeApi().then(() => {
      if (cancelled || !ytHostRef.current || !window.YT?.Player) return
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = new window.YT.Player(ytHostRef.current, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            poll = setInterval(() => {
              try {
                setCurrentTime(ytPlayerRef.current?.getCurrentTime() ?? 0)
              } catch {
                /* player torn down */
              }
            }, 400)
          },
        },
      })
    })

    return () => {
      cancelled = true
      if (poll) clearInterval(poll)
      try {
        ytPlayerRef.current?.destroy()
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null
    }
  }, [youtubeId])

  const videoTitle = title || t('courses.videoFallback')
  const videoNode = youtubeId ? (
    <div ref={ytHostRef} className="aspect-video w-full bg-black" title={videoTitle} />
  ) : isDirect ? (
    <video
      ref={videoRef}
      src={resolvedUrl}
      controls
      className="aspect-video w-full bg-black"
      onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
    >
      {t('courses.videoUnsupported')}
    </video>
  ) : (
    <div className="aspect-video w-full flex items-center justify-center bg-ds-elevated/80 text-sm text-ds-subtle">
      <a href={resolvedUrl} target="_blank" rel="noreferrer" className="text-ds-accent hover:underline">
        {t('courses.videoOpen')}
      </a>
    </div>
  )

  if (!hasTranscript) {
    return <div className={className}>{videoNode}</div>
  }

  const langLabel =
    langLabels[normalizedTranscript?.language || 'vi'] ||
    normalizedTranscript?.language ||
    t('courses.videoTranscript')

  return (
    <div className={`relative border border-ds-border rounded-xl overflow-hidden bg-ds-surface ${className}`}>
      <div className="lg:pr-[min(100%,380px)]">{videoNode}</div>

      <aside
        className={`flex h-[min(420px,70vh)] flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-ds-border bg-ds-surface
          lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[min(100%,380px)]`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ds-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">{t('courses.videoTranscript')}</p>
            <p className="text-[11px] text-ds-subtle">
              {t('courses.videoLangLabel')} {langLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className="lg:hidden text-[11px] text-ds-accent"
          >
            {transcriptOpen ? t('courses.videoHide') : t('courses.videoShow')}
          </button>
        </div>

        <div
          className={`video-transcript-scroll flex-1 min-h-0 overflow-y-scroll overscroll-y-contain px-4 py-3 pr-2 space-y-4 [scrollbar-gutter:stable] ${transcriptOpen ? '' : 'hidden lg:block'}`}
        >
          {cues.map((cue, idx) => {
            const active = idx === activeIndex
            return (
              <button
                key={`${cue.startSeconds}-${idx}`}
                type="button"
                onClick={() => seekTo(cue.startSeconds)}
                className={`w-full text-left rounded-lg px-2 py-2 transition-colors ${
                  active ? 'bg-cyan-500/15 ring-1 ring-cyan-400/40' : 'hover:bg-white/5'
                }`}
              >
                <p className={`text-xs font-mono tabular-nums mb-1.5 ${active ? 'text-ds-accent' : 'text-ds-subtle'}`}>
                  {formatCueTime(cue.startSeconds)}
                </p>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${active ? 'text-white' : 'text-gray-300'}`}>
                  {cue.text}
                </p>
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
