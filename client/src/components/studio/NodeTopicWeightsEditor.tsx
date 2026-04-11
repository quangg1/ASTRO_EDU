'use client'

import type { TopicWeight } from '@/data/learningPathCurriculum'
import { LEARNING_TOPICS } from '@/data/learningTopics'

type Props = {
  topicWeights: TopicWeight[] | undefined
  onChange: (next: TopicWeight[]) => void
}

export function NodeTopicWeightsEditor({ topicWeights, onChange }: Props) {
  const list = topicWeights ?? []

  const setWeight = (topicId: string, weight: number) => {
    const w = Math.max(0, Math.min(1, weight))
    const others = list.filter((x) => x.topicId !== topicId)
    /** Chỉ coi là “tắt” khi gần 0 — đừng dùng <= 0.01 vì sẽ xóa cả mức 1% */
    if (w < 0.002) {
      onChange(others)
      return
    }
    onChange([...others, { topicId, weight: w }].sort((a, b) => a.topicId.localeCompare(b.topicId)))
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-200/70 font-semibold">Map chủ đề landing</p>
      <p className="text-[11px] text-slate-500 leading-snug">
        <strong className="text-slate-400">Mỗi thanh độc lập (0–100%):</strong> mức <em>liên quan</em> của
        <strong> node này</strong> với <strong>từng</strong> chủ đề landing — không phải chia 100% cho cả 8 ô (có thể
        nhiều chủ đề cùng cao). 0% = không hiện trong /topics/ đó. Lưu bằng <strong>Lưu toàn bộ</strong> phía trên.
      </p>
      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {LEARNING_TOPICS.map((t) => {
          const cur = list.find((x) => x.topicId === t.id)?.weight ?? 0
          return (
            <label key={t.id} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-[38%] shrink-0 truncate" title={t.labelVi}>
                {t.labelVi}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(cur * 100)}
                onChange={(e) => setWeight(t.id, Number(e.target.value) / 100)}
                className="flex-1 accent-amber-500"
              />
              <span className="w-8 text-right tabular-nums text-slate-500">{Math.round(cur * 100)}%</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
