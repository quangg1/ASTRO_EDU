'use client'

import type { VideoTranscript, VideoTranscriptCue } from '@/features/courses/lib/videoTranscript'
import { formatCueTime, parseTimeInput } from '@/features/courses/lib/videoTranscript'

type Props = {
  value: VideoTranscript | null | undefined
  onChange: (next: VideoTranscript | null) => void
}

function emptyTranscript(): VideoTranscript {
  return { language: 'vi', cues: [{ startSeconds: 0, text: '' }] }
}

export function VideoTranscriptEditor({ value, onChange }: Props) {
  // Giữ nguyên cues đang soạn (kể cả text rỗng) — normalize chỉ dùng khi render cho học viên.
  const transcript = value && Array.isArray(value.cues) ? value : null
  const cues = transcript?.cues ?? []

  const patch = (nextCues: VideoTranscriptCue[], language = transcript?.language ?? 'vi') => {
    onChange({ language, cues: nextCues })
  }

  const ensureEditor = () => {
    if (!transcript || cues.length === 0) {
      onChange(emptyTranscript())
    }
  }

  return (
    <div className="rounded-lg border border-ds-border bg-black/25 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-200">Bản chép lời (timeline)</p>
          <p className="text-[11px] text-ds-subtle mt-0.5">
            Mỗi đoạn gắn mốc thời gian — học viên đọc bên cạnh video, không cần kéo sub overlay.
          </p>
        </div>
        {!transcript ? (
          <button
            type="button"
            onClick={() => onChange(emptyTranscript())}
            className="rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-900/40"
          >
            + Thêm bản chép
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md border border-rose-400/30 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-950/30"
          >
            Xóa bản chép
          </button>
        )}
      </div>

      {transcript ? (
        <>
          <label className="block text-[11px] text-ds-muted">
            Ngôn ngữ
            <select
              value={transcript.language || 'vi'}
              onChange={(e) => patch(cues, e.target.value)}
              className="studio-field mt-1 w-auto min-w-[180px]"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
              <option value="auto">Tự động / mixed</option>
            </select>
          </label>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {cues.map((cue, idx) => (
              <div key={`cue-${idx}`} className="grid grid-cols-[88px_1fr_auto] gap-2 items-start rounded-md border border-ds-border/80 bg-black/30 p-2">
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
                      patch(next.sort((a, b) => a.startSeconds - b.startSeconds))
                    }}
                    placeholder="2:33"
                    className="studio-field mt-1 font-mono text-xs"
                  />
                </label>
                <label className="block text-[10px] text-ds-muted">
                  Nội dung
                  <textarea
                    value={cue.text}
                    onChange={(e) => {
                      const next = [...cues]
                      next[idx] = { ...next[idx], text: e.target.value }
                      patch(next)
                    }}
                    rows={3}
                    placeholder="Đoạn thoại tại mốc thời gian này…"
                    className="studio-field mt-1 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => patch(cues.filter((_, i) => i !== idx))}
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
              ensureEditor()
              const last = cues[cues.length - 1]
              patch([...cues, { startSeconds: (last?.startSeconds ?? 0) + 30, text: '' }])
            }}
            className="w-full rounded-md border border-dashed border-ds-border-strong py-2 text-[11px] text-ds-subtle hover:border-cyan-500/40 hover:text-cyan-200"
          >
            + Thêm đoạn transcript
          </button>
        </>
      ) : null}
    </div>
  )
}
