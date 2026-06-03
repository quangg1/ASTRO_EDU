'use client'

import { motion } from 'framer-motion'
import type { LearningModule } from '@/data/learningPathCurriculum'
import { SpaceMissionCard } from '@/components/space-premium'

const BADGES = ['Beginner', 'Explorer', 'Researcher', 'Beginner', 'Explorer', 'Advanced']

export function SpaceLpPreviewSection({ modules }: { modules: LearningModule[] }) {
  const slice = modules.slice(0, 6)

  return (
    <section id="learning-preview" className="space-premium relative py-24 md:py-32" style={{ background: 'var(--sp-bg)' }}>
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        <header className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="sp-display-thin text-[11px] text-white/40 mb-3">Lộ trình</p>
            <h2 className="sp-title-massive text-3xl sm:text-4xl md:text-5xl text-white uppercase">
              Chọn module
            </h2>
          </div>
          <p className="max-w-sm text-sm text-white/40 font-light leading-relaxed border-l border-ds-border pl-4">
            Chọn chương trình phù hợp — mỗi module là một hành trình qua nhiều chủ đề và bài học.
          </p>
        </header>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {slice.map((mod, i) => (
            <motion.div
              key={mod.id}
              variants={{
                hidden: { opacity: 0, y: 24 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
              }}
            >
              <SpaceMissionCard
                title={mod.titleVi}
                metaPrimary={`${mod.nodes.length} chủ đề`}
                metaSecondary={`Module ${mod.order}`}
                badge={BADGES[i % BADGES.length]}
                progressLabel="Vào module"
                href={`/tutorial/${mod.id}`}
                moduleId={mod.id}
                emoji={mod.emoji}
                featured={i === 0}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
