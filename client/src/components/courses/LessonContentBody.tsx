'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Lesson, LessonSection, ResourceLink } from '@/lib/coursesApi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { getStageByTime } from '@/lib/earthHistoryData'
import { FeaturedOrganisms } from '@/components/ui/FeaturedOrganisms'
import { Loading } from '@/components/ui/Loading'

type LessonTab = 'video' | 'readings' | 'resources'
const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <Loading /> })
const ModelViewer = dynamic(() => import('@/components/studio/ModelViewer'), { ssr: false, loading: () => <Loading /> })
const MathBlock = dynamic(() => import('@/components/studio/blocks/MathBlock'), { ssr: false })
const ChartBlock = dynamic(() => import('@/components/studio/blocks/ChartBlock'), { ssr: false })
const SliderBlock = dynamic(() => import('@/components/studio/blocks/SliderBlock'), { ssr: false })

function renderTextWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, idx) => {
    const key = `${idx}-${p.slice(0, 20)}`
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={key}>{p.slice(2, -2)}</strong>
    }
    return <span key={key}>{p}</span>
  })
}

function formatContent(text: string) {
  return text
    .replace(/\s●\s/g, '\n• ')
    .replace(/\s-\s/g, '\n- ')
    .replace(/\s([0-9]{1,2}\.)\s/g, '\n$1 ')
}

function isVideoSection(sec: LessonSection) {
  return sec.type === 'video' && !!sec.videoUrl
}

function getResourceLabel(link: ResourceLink, idx: number) {
  if (link.label && link.label.trim().length > 0) return link.label
  return `Tài nguyên ${idx + 1}`
}

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase' }

export function LessonContentBody({ lesson }: { lesson: Lesson }) {
  const [tab, setTab] = useState<LessonTab>(lesson.videoUrl ? 'video' : 'readings')

  useEffect(() => {
    setTab(lesson.videoUrl ? 'video' : 'readings')
  }, [lesson.slug, lesson.videoUrl])

  const sections = (lesson.sections ?? []) as LessonSection[]
  const videoSections = useMemo(() => sections.filter(isVideoSection), [sections])
  const readingSections = useMemo(() => sections.filter((s) => !isVideoSection(s)), [sections])
  const learningGoals = lesson.learningGoals && lesson.learningGoals.length > 0
  const gallery = lesson.galleryImages ?? []
  const resources = lesson.resourceLinks ?? []

  const showVideoTab = !!lesson.videoUrl || videoSections.length > 0

  return (
    <div className="p-6 space-y-5 w-full" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Cover image */}
      {lesson.coverImage && (
        <section className="hud-chamfer-md overflow-hidden border" style={{ borderColor: 'rgba(126,231,255,0.18)', background: '#08111f' }}>
          <div className="relative w-full h-56 md:h-72">
            <img src={lesson.coverImage} alt={lesson.title} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #03060f 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="text-xl md:text-2xl font-semibold" style={{ color: '#eaf6ff' }}>{lesson.title}</h2>
              {lesson.description && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: '#9aa8c4' }}>{lesson.description}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="hud-chamfer border p-4" style={{ borderColor: 'rgba(126,231,255,0.12)', background: '#0a0f17' }}>
          <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 12 }}>// gallery · {gallery.length} images</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.map((img, idx) => (
              <img
                key={`${img}-${idx}`}
                src={img}
                alt={`${lesson.title} gallery ${idx + 1}`}
                className="w-full h-24 md:h-28 object-cover hud-chamfer-sm border"
                style={{ borderColor: 'rgba(126,231,255,0.1)' }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Video section */}
      {showVideoTab && (
        <div className="space-y-4">
          {lesson.videoUrl && (
            <section className="hud-chamfer-md overflow-hidden border" style={{ borderColor: 'rgba(126,231,255,0.15)', background: 'rgba(0,0,0,0.6)' }}>
              <div className="border-b px-4 py-2.5 flex items-center gap-2" style={{ borderColor: 'rgba(126,231,255,0.08)' }}>
                <span style={{ ...MONO, fontSize: 9, color: '#5c6886' }}>// video · lecture</span>
              </div>
              <div className="w-full aspect-video">
                {lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be') ? (
                  <iframe
                    className="w-full h-full"
                    src={resolveMediaUrl(lesson.videoUrl)}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video className="w-full h-full" controls src={resolveMediaUrl(lesson.videoUrl)}>
                    Video not supported.
                  </video>
                )}
              </div>
            </section>
          )}

          {videoSections.map((sec, idx) => (
            <section key={`${sec.title ?? 'video'}-${idx}`} className="hud-chamfer border p-4 space-y-3" style={{ borderColor: 'rgba(126,231,255,0.12)', background: '#0a0f17' }}>
              <div>
                <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 4 }}>// video · {idx + 1}</div>
                <h3 className="font-medium" style={{ color: '#eaf6ff' }}>{sec.title || `Video ${idx + 1}`}</h3>
              </div>
              {sec.content && <p className="text-sm" style={{ color: '#9aa8c4' }}>{sec.content}</p>}
              <div className="w-full aspect-video hud-chamfer-sm overflow-hidden border" style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(126,231,255,0.1)' }}>
                {sec.videoUrl && (sec.videoUrl.includes('youtube.com') || sec.videoUrl.includes('youtu.be')) ? (
                  <iframe className="w-full h-full" src={resolveMediaUrl(sec.videoUrl)} title={sec.title || 'Video'} allowFullScreen />
                ) : (
                  <video className="w-full h-full" controls src={resolveMediaUrl(sec.videoUrl)}>Video not supported.</video>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Readings content */}
      <>
        {/* PDF source */}
        {(lesson.sourcePdf || lesson.sourcePageCount != null) && (
          <section className="hud-chamfer border p-4" style={{ borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 6 }}>// source · pdf</div>
            <p className="text-sm" style={{ color: '#9aa8c4' }}>
              {lesson.sourcePdf ? `File: ${lesson.sourcePdf}` : 'File: không xác định'}
              {lesson.sourcePageCount != null ? ` · ${lesson.sourcePageCount} trang` : ''}
            </p>
          </section>
        )}

        {/* Learning goals */}
        {learningGoals && (
          <section className="hud-chamfer-md border p-5" style={{ borderColor: 'rgba(126,231,255,0.2)', background: 'rgba(126,231,255,0.04)' }}>
            <div style={{ ...MONO, fontSize: 9, color: '#7ee7ff', marginBottom: 10 }}>// mục tiêu · learning objectives</div>
            <ul className="space-y-2">
              {lesson.learningGoals?.map((goal, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: '#eaf6ff' }}>
                  <span style={{ color: '#7ee7ff', marginTop: 2, flexShrink: 0 }}>▸</span>
                  {goal}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3D stage simulation */}
        {lesson.stageTime != null && (
          <section className="hud-chamfer-md border overflow-hidden" style={{ borderColor: 'rgba(126,231,255,0.18)', background: '#08111f' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(126,231,255,0.08)' }}>
              <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 4 }}>// simulation · 3d</div>
              <p className="text-sm font-medium" style={{ color: '#7ee7ff' }}>Mô phỏng 3D trong bài học</p>
              <p className="text-xs mt-1" style={{ color: '#9aa8c4' }}>
                {(() => {
                  const stage = getStageByTime(lesson.stageTime ?? 0)
                  return stage ? `${stage.timeDisplay} · ${stage.description}` : `Mốc ${lesson.stageTime} Ma`
                })()}
              </p>
            </div>
            {(() => {
              const stage = getStageByTime(lesson.stageTime ?? 0)
              return (
                <>
                  {stage && (
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(126,231,255,0.08)' }}>
                      <FeaturedOrganisms stageId={stage.id} variant="compact" />
                    </div>
                  )}
                  <div style={{ height: 380 }}>
                    <EarthScene overrideStage={stage} />
                  </div>
                </>
              )
            })()}
          </section>
        )}

        {/* Reading sections */}
        {readingSections.length > 0 ? (
          <div className="space-y-5">
            {readingSections.map((sec, i) => (
              <section key={`${sec.title ?? 'sec'}-${i}`} className="space-y-3 hud-chamfer border p-5" style={{ borderColor: 'rgba(126,231,255,0.1)', background: '#0a0f17' }}>
                {sec.title && (
                  <div className="border-b pb-2.5" style={{ borderColor: 'rgba(126,231,255,0.08)' }}>
                    <div style={{ ...MONO, fontSize: 9, color: '#5c6886', marginBottom: 4 }}>// section · {i + 1}</div>
                    <h3 className="text-base md:text-lg font-semibold" style={{ color: '#eaf6ff' }}>{sec.title}</h3>
                  </div>
                )}

                {sec.type === 'text' && sec.content && (
                  <div className="space-y-3">
                    {sec.summary && (
                      <p className="text-sm md:text-[15px] leading-7 font-medium" style={{ color: 'rgba(126,231,255,0.9)' }}>
                        {sec.summary}
                      </p>
                    )}
                    {sec.bullets && sec.bullets.length > 0 && (
                      <ul className="space-y-1.5">
                        {sec.bullets.map((b, bi) => (
                          <li key={`${bi}-${b.slice(0, 20)}`} className="flex items-start gap-2 text-sm md:text-[15px] leading-7" style={{ color: '#eaf6ff' }}>
                            <span style={{ color: '#7ee7ff', flexShrink: 0, marginTop: 2 }}>▸</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <details className="hud-chamfer-sm border overflow-hidden" style={{ borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                      <summary className="cursor-pointer px-3 py-2.5 text-sm transition-colors" style={{ color: '#7ee7ff' }}>
                        // xem chi tiết slide
                      </summary>
                      <div className="px-3 pb-3 pt-1 text-sm md:text-[15px] leading-7 whitespace-pre-wrap" style={{ color: '#9aa8c4' }}>
                        {renderTextWithBold(formatContent(sec.content))}
                      </div>
                    </details>
                  </div>
                )}

                {sec.type === 'image' && sec.imageUrl && (
                  <figure className="my-3">
                    <img
                      src={resolveMediaUrl(sec.imageUrl)}
                      alt={sec.title || 'Hình minh họa'}
                      className="block mx-auto hud-chamfer-sm w-auto max-w-full max-h-[460px] object-contain border"
                      style={{
                        borderColor: 'rgba(126,231,255,0.12)',
                        maxWidth: `${Math.min(100, Math.max(20, Number.isFinite(sec.imageWidthPct) ? Number(sec.imageWidthPct) : 100))}%`,
                      }}
                    />
                    {sec.content && (
                      <figcaption className="text-xs mt-2 text-center" style={{ ...MONO, fontSize: 10, color: '#5c6886' }}>{sec.content}</figcaption>
                    )}
                  </figure>
                )}

                {sec.type === '3d' && sec.modelUrl && (
                  <div className="my-3 h-[400px] hud-chamfer-md border overflow-hidden" style={{ borderColor: 'rgba(126,231,255,0.18)', background: 'rgba(0,0,0,0.5)' }}>
                    <ModelViewer url={resolveMediaUrl(sec.modelUrl)} />
                  </div>
                )}

                {sec.type === 'richtext' && (sec.html || sec.content) && (
                  <div
                    className="prose prose-invert prose-sm max-w-none leading-relaxed [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-cyan-400 [&_blockquote]:border-l-cyan-500/40 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_img]:mx-auto [&_img]:block [&_img]:w-auto [&_img]:max-w-full"
                    style={{ color: '#9aa8c4' }}
                    dangerouslySetInnerHTML={{ __html: sec.html || sec.content || '' }}
                  />
                )}

                {sec.type === 'code' && sec.code && (
                  <div className="hud-chamfer-sm border overflow-hidden my-3" style={{ borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(0,0,0,0.6)' }}>
                    <div className="px-3 py-1.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(126,231,255,0.08)' }}>
                      <span style={{ ...MONO, fontSize: 9, color: '#5c6886' }}>{sec.language || 'code'}</span>
                    </div>
                    <pre className="p-4 text-sm font-mono overflow-x-auto leading-relaxed" style={{ color: '#eaf6ff' }}><code>{sec.code}</code></pre>
                  </div>
                )}

                {sec.type === 'callout' && sec.content && (
                  <div
                    className="hud-chamfer-sm border p-4 my-3"
                    style={
                      sec.calloutVariant === 'tip'
                        ? { borderColor: 'rgba(109,255,176,0.35)', background: 'rgba(109,255,176,0.06)' }
                        : sec.calloutVariant === 'warning'
                          ? { borderColor: 'rgba(245,165,36,0.35)', background: 'rgba(245,165,36,0.06)' }
                          : sec.calloutVariant === 'danger'
                            ? { borderColor: 'rgba(255,80,80,0.35)', background: 'rgba(255,80,80,0.06)' }
                            : { borderColor: 'rgba(126,231,255,0.3)', background: 'rgba(126,231,255,0.05)' }
                    }
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#eaf6ff' }}>{sec.content}</p>
                  </div>
                )}

                {sec.type === 'embed' && sec.embedUrl && (
                  <div className="aspect-video hud-chamfer-sm overflow-hidden border my-3" style={{ borderColor: 'rgba(126,231,255,0.1)' }}>
                    <iframe src={sec.embedUrl} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />
                  </div>
                )}

                {sec.type === 'divider' && (
                  <div className="flex items-center gap-4 py-2 my-3">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(126,231,255,0.2), transparent)' }} />
                    <span style={{ ...MONO, fontSize: 9, color: '#5c6886' }}>· · ·</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(126,231,255,0.2), transparent)' }} />
                  </div>
                )}

                {sec.type === 'math' && sec.latex && (
                  <div className="my-3 hud-chamfer-sm border flex justify-center p-6" style={{ borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
                    <MathBlock latex={sec.latex} displayMode />
                  </div>
                )}

                {sec.type === 'chart' && (
                  <div className="my-3 hud-chamfer-sm overflow-hidden border p-4" style={{ borderColor: 'rgba(126,231,255,0.15)', background: 'rgba(0,0,0,0.3)' }}>
                    <ChartBlock section={sec} update={() => {}} />
                  </div>
                )}

                {sec.type === 'slider' && (
                  <div className="my-3">
                    <SliderBlock section={sec} update={() => {}} />
                  </div>
                )}

                {sec.type === 'observable' && sec.notebookUrl && (
                  <div className="aspect-video hud-chamfer-sm overflow-hidden border my-3" style={{ borderColor: 'rgba(126,231,255,0.1)' }}>
                    <iframe
                      src={sec.notebookUrl.replace('observablehq.com/', 'observablehq.com/embed/')}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#5c6886' }}>// chưa có nội dung đọc cho bài này</div>
        )}
      </>

      {/* Resources */}
      {resources.length > 0 && (
        <details className="hud-chamfer border overflow-hidden" style={{ borderColor: 'rgba(126,231,255,0.12)', background: '#0a0f17' }}>
          <summary className="px-5 py-3 text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2" style={{ color: '#eaf6ff' }}>
            <span style={{ ...MONO, fontSize: 9, color: '#5c6886' }}>// resources</span>
            <span className="ml-auto" style={{ ...MONO, fontSize: 9, color: '#7ee7ff' }}>{resources.length}</span>
          </summary>
          <div className="px-5 pb-4 space-y-2 border-t" style={{ borderColor: 'rgba(126,231,255,0.06)' }}>
            {resources.map((link, idx) => (
              <a
                key={`${link.url}-${idx}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 hud-chamfer-sm border px-3 py-2.5 text-sm transition-all mt-2"
                style={{ borderColor: 'rgba(126,231,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#eaf6ff' }}
              >
                <span style={{ ...MONO, fontSize: 9, color: '#7ee7ff', flexShrink: 0, marginTop: 2 }}>[{link.kind}]</span>
                <div className="min-w-0">
                  <div style={{ color: '#eaf6ff' }}>{getResourceLabel(link, idx)}</div>
                  <div className="truncate mt-0.5" style={{ ...MONO, fontSize: 9, color: '#5c6886' }}>{link.url}</div>
                </div>
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
