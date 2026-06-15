'use client'

import { useMemo, useState } from 'react'
import {
  copyTranscriptTimings,
  expandVideoTranscriptTracks,
  formatCueTime,
  packVideoTranscript,
  parseTimeInput,
  type VideoTranscript,
  type VideoTranscriptCue,
  type VideoTranscriptLang,
  VIDEO_TRANSCRIPT_LANGS,
} from '@/features/courses/lib/videoTranscript'

type Props = {
  value: VideoTranscript | null | undefined
  onChange: (next: VideoTranscript | null) => void
}

const LANG_LABEL: Record<VideoTranscriptLang, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
}

function emptyCueRow(): VideoTranscriptCue {
  return { startSeconds: 0, text: '' }
}

export function VideoTranscriptEditor({ value, onChange }: Props) {
  const tracks = useMemo(() => expandVideoTranscriptTracks(value), [value])
  const hasAnyTrack = VIDEO_TRANSCRIPT_LANGS.some((lang) => (tracks[lang]?.length ?? 0) > 0)
  const initialTab: VideoTranscriptLang =
    value?.language === 'en' || value?.language === 'vi' ? value.language : 'vi'
  const [activeLang, setActiveLang] = useState<VideoTranscriptLang>(initialTab)

  const cues = tracks[activeLang] ?? []

  const patchTracks = (nextTracks: typeof tracks, primaryLang = activeLang) => {
    onChange(packVideoTranscript(nextTracks, primaryLang))
  }

  const patchCues = (nextCues: VideoTranscriptCue[]) => {
    patchTracks({ ...tracks, [activeLang]: nextCues })
  }

  const startEditor = (lang: VideoTranscriptLang) => {
    setActiveLang(lang)
    patchTracks({ ...tracks, [lang]: [emptyCueRow()] }, lang)
  }

  const otherLang = (lang: VideoTranscriptLang): VideoTranscriptLang => (lang === 'vi' ? 'en' : 'vi')

  return (
    <div className="rounded-lg border border-ds-border bg-black/25 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-200">Bản chép lời (nhiều ngôn ngữ)</p>
          <p className="text-[11px] text-ds-subtle mt-0.5">
            Thêm transcript Tiếng Việt và English — học viên thấy bản khớp ngôn ngữ app (có thể đổi trong
            video).
          </p>
        </div>
        {!hasAnyTrack ? (
          <div className="flex flex-wrap gap-1.5">
            {VIDEO_TRANSCRIPT_LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => startEditor(lang)}
                className="rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-900/40"
              >
                + {LANG_LABEL[lang]}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md border border-rose-400/30 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-950/30"
          >
            Xóa tất cả transcript
          </button>
        )}
      </div>

      {hasAnyTrack ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-ds-border overflow-hidden">
              {VIDEO_TRANSCRIPT_LANGS.map((lang) => {
                const count = tracks[lang]?.length ?? 0
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1.5 text-[11px] transition-colors ${
                      activeLang === lang
                        ? 'bg-cyan-600/80 text-white'
                        : 'text-ds-subtle hover:bg-white/5'
                    }`}
                  >
                    {LANG_LABEL[lang]}
                    {count > 0 ? ` (${count})` : ''}
                  </button>
                )
              })}
            </div>
            {(tracks[activeLang]?.length ?? 0) === 0 ? (
              <button
                type="button"
                onClick={() => patchCues([emptyCueRow()])}
                className="text-[11px] text-cyan-300 hover:underline"
              >
                Bắt đầu soạn {LANG_LABEL[activeLang]}
              </button>
            ) : null}
            {activeLang === 'en' && (tracks.vi?.length ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() =>
                  patchCues(copyTranscriptTimings(tracks.vi ?? [], tracks.en ?? [emptyCueRow()]))
                }
                className="text-[11px] text-ds-subtle hover:text-cyan-200"
              >
                Copy mốc thời gian từ Tiếng Việt
              </button>
            ) : null}
            {activeLang === 'vi' && (tracks.en?.length ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() =>
                  patchCues(copyTranscriptTimings(tracks.en ?? [], tracks.vi ?? [emptyCueRow()]))
                }
                className="text-[11px] text-ds-subtle hover:text-cyan-200"
              >
                Copy mốc thời gian từ English
              </button>
            ) : null}
          </div>

          {(tracks[activeLang]?.length ?? 0) > 0 ? (
            <>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {cues.map((cue, idx) => (
                  <div
                    key={`cue-${activeLang}-${idx}`}
                    className="grid grid-cols-[88px_1fr_auto] gap-2 items-start rounded-md border border-ds-border/80 bg-black/30 p-2"
                  >
                    <label className="block text-[10px] text-ds-muted">
                      Thời điểm
                      <input
                        defaultValue={formatCueTime(cue.startSeconds)}
                        onBlur={(e) => {
                          const sec = parseTimeInput(e.target.value)
                          if (sec == null) {
                            e.target.value = formatCueTime(cue.startSeconds)
                            return
                          }
                          const next = [...cues]
                          next[idx] = { ...next[idx], startSeconds: sec }
                          patchCues(next.sort((a, b) => a.startSeconds - b.startSeconds))
                        }}
                        placeholder="2:33"
                        className="studio-field mt-1 font-mono text-xs"
                      />
                    </label>
                    <label className="block text-[10px] text-ds-muted">
                      Nội dung ({LANG_LABEL[activeLang]})
                      <textarea
                        value={cue.text}
                        onChange={(e) => {
                          const next = [...cues]
                          next[idx] = { ...next[idx], text: e.target.value }
                          patchCues(next)
                        }}
                        rows={3}
                        placeholder={
                          activeLang === 'en'
                            ? 'Spoken line at this timestamp…'
                            : 'Đoạn thoại tại mốc thời gian này…'
                        }
                        className="studio-field mt-1 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => patchCues(cues.filter((_, i) => i !== idx))}
                      className="mt-5 rounded border border-rose-400/30 px-2 py-1 text-[10px] text-rose-300"
                      title="Xóa đoạn"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const last = cues[cues.length - 1]
                  patchCues([...cues, { startSeconds: (last?.startSeconds ?? 0) + 30, text: '' }])
                }}
                className="w-full rounded-md border border-dashed border-ds-border-strong py-2 text-[11px] text-ds-subtle hover:border-cyan-500/40 hover:text-cyan-200"
              >
                + Thêm đoạn ({LANG_LABEL[activeLang]})
              </button>
            </>
          ) : (
            <p className="text-[11px] text-ds-subtle">
              Chưa có transcript {LANG_LABEL[activeLang]}. Bấm &quot;Bắt đầu soạn&quot; hoặc chuyển tab
              ngôn ngữ khác.
            </p>
          )}

          {(tracks[otherLang(activeLang)]?.length ?? 0) === 0 ? (
            <button
              type="button"
              onClick={() => startEditor(otherLang(activeLang))}
              className="text-[11px] text-ds-accent hover:underline"
            >
              + Thêm bản {LANG_LABEL[otherLang(activeLang)]}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
