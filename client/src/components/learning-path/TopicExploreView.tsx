'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Layers } from 'lucide-react'
import { fetchPublicLearningPath } from '@/lib/learningPathApi'
import type { LearningModule } from '@/data/learningPathCurriculum'
import { getTopicBySlug } from '@/data/learningTopics'
import { groupNodesByTopic } from '@/lib/topicPathMapping'

type Props = { slug: string }

function weightLabel(w: number): string {
  if (w >= 0.85) return 'Liên quan chính'
  if (w >= 0.5) return 'Liên quan'
  return 'Tham khảo'
}

export function TopicExploreView({ slug }: Props) {
  const topic = getTopicBySlug(slug)
  const [modules, setModules] = useState<LearningModule[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicLearningPath()
      .then((m) => setModules(m))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    if (!modules || !topic) return []
    return groupNodesByTopic(modules, topic.id, 0.12)
  }, [modules, topic])

  if (!topic) return null

  return (
    <div className="min-h-screen bg-[#050508] pt-16 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-cyan-400/90 hover:text-cyan-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Trang chủ
        </Link>

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/90 mb-2">Chủ đề landing</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading tracking-tight">{topic.labelVi}</h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed">{topic.descriptionVi}</p>
          <p className="text-xs text-slate-600 mt-4">
            Các <strong className="text-slate-500">chủ đề (node)</strong> trong lộ trình được gắn trọng số — hiển thị theo module, không thay thế thứ tự học đầy đủ.{' '}
            <Link href="/tutorial" className="text-cyan-500/90 hover:underline">
              Mở toàn bộ lộ trình →
            </Link>
          </p>
        </header>

        {loading ? (
          <p className="text-slate-500 text-sm">Đang tải lộ trình…</p>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-slate-400 text-sm">
              Chưa có node nào gắn chủ đề này (hoặc API chưa đồng bộ). Biên tập trong{' '}
              <Link href="/studio/learning-path" className="text-cyan-400 hover:underline">
                Learning Path Studio
              </Link>
              , hoặc chạy script sync JSON → MongoDB.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ module: mod, nodes }) => (
              <section
                key={mod.id}
                className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-[#0f0b18]/90 to-[#0a0812] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden>
                    {mod.emoji}
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Module {mod.order}
                    </p>
                    <h2 className="text-lg font-semibold text-white mt-0.5">{mod.titleVi}</h2>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mod.goalVi}</p>
                  </div>
                </div>
                <ul className="divide-y divide-white/[0.05]">
                  {nodes.map(({ node, weight }) => (
                    <li key={node.id}>
                      <Link
                        href={`/tutorial/${mod.id}/${node.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-100 group-hover:text-cyan-200 transition-colors">
                            {node.titleVi}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">{weightLabel(weight)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] tabular-nums text-slate-600">{Math.round(weight * 100)}%</span>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400/80" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
