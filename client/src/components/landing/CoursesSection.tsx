'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CourseCatalogCard, CourseCatalogCardSkeleton } from '@/components/courses/CourseCatalogCard'
import type { Course } from '@/features/courses/api/coursesApi'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } } }

export function CoursesSection({ courses, loading }: { courses: Course[]; loading: boolean }) {
  const featured = courses.slice(0, 4)

  return (
    <section id="courses" className="py-16 md:py-28 bg-gradient-cosmos relative overflow-hidden">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4"
        >
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-secondary font-medium mb-4 block">Được yêu thích nhất</span>
            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4 text-foreground">
              Khóa học <span className="text-gradient-nebula">nổi bật</span>
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Những khóa học được yêu thích nhất bởi cộng đồng thiên văn học
            </p>
          </div>
          <Link href="/courses" className="text-primary hover:text-primary/80 font-medium text-sm transition-colors flex items-center gap-1">
            Xem tất cả khóa học →
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <CourseCatalogCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-muted-foreground">Chưa có khóa học. Bạn có thể khám phá Tutorial.</p>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {featured.map((course) => (
              <motion.div key={course.id} variants={item} whileHover={{ y: -4 }}>
                <CourseCatalogCard
                  href={`/courses/${course.slug}`}
                  course={{
                    slug: course.slug,
                    title: course.title,
                    description: course.description,
                    thumbnail: course.thumbnail,
                    level: course.level,
                    lessonCount: course.lessonCount,
                    durationWeeks: course.durationWeeks,
                    isPaid: course.isPaid,
                    requiresPayment: course.requiresPayment,
                    price: course.price,
                    currency: course.currency,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
