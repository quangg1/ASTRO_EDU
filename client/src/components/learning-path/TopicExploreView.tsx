'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronRight, Layers, Rocket } from 'lucide-react'
import { fetchPublicLearningPath } from '@/features/learning-path/public'
import type { LearningModule } from '@/data/learningPathCurriculum'
import { getTopicBySlug } from '@/data/learningTopics'
import { groupNodesByTopic } from '@/lib/topicPathMapping'
import { parseOnboardingLanding, lessonHrefWithDepth } from '@/lib/onboardingLanding'
import { OnboardingWelcomeBanner } from '@/components/onboarding/OnboardingWelcomeBanner'
import { fetchOnboardingStatus } from '@/features/onboarding/public'

type Props = { slug: string }

function weightLabel(w: number): string {
  if (w >= 0.85) return 'Liên quan chính'
  if (w >= 0.5) return 'Liên quan'
  return 'Tham khảo'
}

export function TopicExploreView({ slug }: Props) {
  const searchParams = useSearchParams()
  const landing = parseOnboardingLanding(searchParams)
  const topic = getTopicBySlug(slug)
  const [modules, setModules] = useState<LearningModule[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [starterHref, setStarterHref] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicLearningPath()
      .then((m) => setModules(m))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!landing.fromOnboarding) return
    void fetchOnboardingStatus().then((s) => {
      const lesson = s?.profile?.recommendations?.find((r) => r.kind === 'lesson')
      if (lesson?.href) setStarterHref(lesson.href)
    })
  }, [landing.fromOnboarding])

  const grouped = useMemo(() => {
    if (!modules || !topic) return []
    return groupNodesByTopic(modules, topic.id, 0.12)
  }, [modules, topic])

  const firstNode = grouped[0]?.nodes[0]

  if (!topic) return null

  return (
    <div className="min-h-screen bg-ds-base pt-16 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ds-accent hover:text-ds-text mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Trang chủ
        </Link>

        {landing.fromOnboarding ? (
          <OnboardingWelcomeBanner
            dismissKey={`onboarding-topic-${slug}`}
            title={`Lộ trình được lọc theo «${topic.labelVi}»`}
            description={`Mức gợi ý: ${landing.depth === 'researcher' ? 'Sâu' : landing.depth === 'explorer' ? 'Cơ chế' : 'Cơ bản'}. Các node liên quan chủ đề được ưu tiên — mở toàn bộ lộ trình bất cứ lúc nào.`}
          />
        ) : null}

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/90 mb-2">Chủ đề landing</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ds-text font-heading tracking-tight">{topic.labelVi}</h1>
          <p className="text-ds-muted mt-3 text-sm leading-relaxed">{topic.descriptionVi}</p>
          <p className="text-xs text-ds-subtle mt-4">
            Các <strong className="text-ds-subtle">chủ đề (node)</strong> trong lộ trình được gắn trọng số — hiển thị theo module, không thay thế thứ tự học đầy đủ.{' '}
            <Link href="/tutorial" className="text-ds-accent hover:underline">
              Mở toàn bộ lộ trình →
            </Link>
          </p>
        </header>

        {landing.fromOnboarding && firstNode ? (
          <div
            className="mb-8 p-4 border border-cyan-500/30 bg-cyan-500/5"
            style={{
              clipPath:
                'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
              <Rocket className="w-3 h-3" /> Chặng xuất phát
            </p>
            <p className="text-sm text-ds-text font-medium">{firstNode.node.titleVi}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link
                href={`/tutorial/${grouped[0].module.id}/${firstNode.node.id}?from=onboarding&depth=${landing.depth}`}
                className="text-xs font-medium text-ds-accent hover:text-white"
              >
                Mở node →
              </Link>
              {starterHref ? (
                <Link href={starterHref} className="text-xs font-medium text-amber-300 hover:text-amber-100">
                  Bài starter ({landing.depth}) →
                </Link>
              ) : firstNode.node.depths?.[landing.depth as keyof typeof firstNode.node.depths]?.[0] ? (
                <Link
                  href={lessonHrefWithDepth(
                    grouped[0].module.id,
                    firstNode.node.id,
                    firstNode.node.depths[landing.depth as 'beginner' | 'explorer' | 'researcher']![0].id,
                    landing.depth,
                  )}
                  className="text-xs font-medium text-amber-300 hover:text-amber-100"
                >
                  Bài đầu ({landing.depth}) →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="text-ds-subtle text-sm">Đang tải lộ trình…</p>
        ) : grouped.length === 0 ? (
          <div className="rounded-ds-card border border-ds-border bg-white/[0.03] p-8 text-center">
            <p className="text-ds-muted text-sm">
              Chưa có node nào gắn chủ đề này (hoặc API chưa đồng bộ). Biên tập trong{' '}
              <Link href="/studio/learning-path" className="text-ds-accent hover:underline">
                Learning Path Studio
              </Link>
              , hoặc chạy script sync JSON → MongoDB.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ module: mod, nodes }, sectionIdx) => (
              <section
                key={mod.id}
                className="rounded-ds-card border overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                style={{
                  borderColor: landing.fromOnboarding && sectionIdx === 0 ? 'rgba(126,231,255,0.35)' : 'rgba(139,92,246,0.2)',
                  opacity: landing.fromOnboarding && sectionIdx > 1 ? 0.72 : 1,
                  background: 'linear-gradient(to bottom, rgba(15,11,24,0.9), rgba(10,8,18,1))',
                }}
              >
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden>
                    {mod.emoji}
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ds-subtle flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Module {mod.order}
                      {landing.fromOnboarding && sectionIdx === 0 ? (
                        <span className="text-cyan-400 ml-2">· Ưu tiên</span>
                      ) : null}
                    </p>
                    <h2 className="text-lg font-semibold text-ds-text mt-0.5">{mod.titleVi}</h2>
                    <p className="text-xs text-ds-subtle mt-1 line-clamp-2">{mod.goalVi}</p>
                  </div>
                </div>
                <ul className="divide-y divide-white/[0.05]">
                  {nodes.map(({ node, weight }, nodeIdx) => (
                    <li key={node.id}>
                      <Link
                        href={`/tutorial/${mod.id}/${node.id}${landing.fromOnboarding ? `?from=onboarding&depth=${landing.depth}` : ''}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ds-surface/50 transition-colors group"
                        style={{
                          background:
                            landing.fromOnboarding && sectionIdx === 0 && nodeIdx === 0
                              ? 'rgba(126,231,255,0.06)'
                              : undefined,
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-100 group-hover:text-ds-accent transition-colors">
                            {node.titleVi}
                          </span>
                          <span className="block text-[11px] text-ds-subtle mt-0.5">{weightLabel(weight)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] tabular-nums text-ds-subtle">{Math.round(weight * 100)}%</span>
                          <ChevronRight className="w-4 h-4 text-ds-subtle group-hover:text-ds-accent" />
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
