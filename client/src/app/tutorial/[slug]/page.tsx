'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { fetchTutorial } from '@/lib/tutorialsApi'
import type { Tutorial, TutorialSection } from '@/lib/tutorialsApi'

const MathBlock = dynamic(() => import('@/components/studio/blocks/MathBlock'), { ssr: false })

function TutorialSectionRender({ sec }: { sec: TutorialSection }) {
  if (sec.type === 'text') {
    return (
      <div className="mb-6">
        {sec.title && <h3 className="text-lg font-semibold text-cyan-300 mb-2">{sec.title}</h3>}
        <div
          className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={sec.html ? { __html: sec.html } : undefined}
        >
          {!sec.html && sec.content}
        </div>
      </div>
    )
  }
  if (sec.type === 'callout') {
    const variants: Record<string, string> = {
      info: 'border-cyan-500/40 bg-cyan-500/10',
      tip: 'border-emerald-500/40 bg-emerald-500/10',
      warning: 'border-amber-500/40 bg-amber-500/10',
      danger: 'border-red-500/40 bg-red-500/10',
    }
    const c = variants[sec.calloutVariant || 'info'] || variants.info
    return (
      <div className={`rounded-xl border p-4 mb-6 ${c}`}>
        <p className="text-sm text-gray-200">{sec.content}</p>
      </div>
    )
  }
  if (sec.type === 'math' && sec.latex) {
    return (
      <div className="my-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex justify-center">
          <MathBlock latex={sec.latex} />
        </div>
        {sec.caption && (
          <p className="text-xs text-gray-500 mt-2 text-center">{sec.caption}</p>
        )}
      </div>
    )
  }
  if (sec.type === 'image' && sec.imageUrl) {
    return (
      <figure className="my-6">
        <img src={sec.imageUrl} alt={sec.caption || ''} className="rounded-xl w-full max-w-2xl" />
        {sec.caption && (
          <figcaption className="text-sm text-gray-500 mt-2">{sec.caption}</figcaption>
        )}
      </figure>
    )
  }
  if (sec.type === 'divider') {
    return <hr className="border-white/10 my-6" />
  }
  return null
}

export default function TutorialSlugPage() {
  const params = useParams()
  const slug = params.slug as string
  const [tutorial, setTutorial] = useState<Tutorial | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    fetchTutorial(slug)
      .then(setTutorial)
      .finally(() => setLoading(false))
  }, [slug])

  if (loading || !tutorial) {
    return (
      <div className="min-h-screen bg-black pt-16">
        <main className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-gray-500">Đang tải...</p>
        </main>
      </div>
    )
  }

  const sections = tutorial.sections || []

  return (
    <div className="min-h-screen bg-black">
      <main className="pt-16 px-4 pb-12 max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/tutorial" className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
            ← Tutorial
          </Link>
          {tutorial.category && (
            <Link
              href={`/tutorial?category=${encodeURIComponent(tutorial.category.slug)}`}
              className="text-xs text-gray-500 hover:text-cyan-400"
            >
              {tutorial.category.title}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-2">{tutorial.title}</h1>
          <p className="text-gray-400 text-sm mb-4">{tutorial.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{tutorial.readTime} phút đọc</span>
            {tutorial.tags?.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded bg-white/5">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <article className="prose-invert space-y-2">
          {sections.map((sec, i) => (
            <TutorialSectionRender key={i} sec={sec} />
          ))}
        </article>

        {tutorial.relatedSlugs && tutorial.relatedSlugs.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Bài liên quan</h3>
            <div className="flex flex-wrap gap-2">
              {tutorial.relatedSlugs.map((s) => (
                <Link
                  key={s}
                  href={`/tutorial/${s}`}
                  className="text-sm px-3 py-1.5 rounded-lg bg-white/5 text-cyan-400 hover:bg-cyan-500/20"
                >
                  {s.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
