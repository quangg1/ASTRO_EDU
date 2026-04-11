'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, Users, BookOpen } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/apiConfig'
import type { Course } from '@/lib/coursesApi'

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
              <div key={i} className="bg-card/80 rounded-2xl overflow-hidden h-80 animate-pulse border border-border/50" />
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
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <motion.div
                  variants={item}
                  whileHover={{ y: -6 }}
                  className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-500 card-glow cursor-pointer"
                >
                  <div className="relative overflow-hidden h-48">
                    {course.thumbnail ? (
                      <Image
                        src={resolveMediaUrl(course.thumbnail)}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center text-4xl opacity-50">
                        🌌
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 rounded-md bg-card/80 text-xs text-foreground border border-border/50">
                        {course.level}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-heading font-semibold text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors text-[15px]">
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{course.description || 'Cosmo Learn'}</p>

                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-primary font-bold text-sm">4.9</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-3 w-3 text-primary fill-primary" />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">({course.lessonCount ?? 0} bài)</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {course.level}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {course.lessonCount ?? 0} bài
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                      {course.isPaid && (course.price ?? 0) > 0 ? (
                        <>
                          <span className="font-heading font-bold text-primary text-lg">
                            {course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('vi-VN')} ₫`}
                          </span>
                        </>
                      ) : (
                        <span className="font-heading font-bold text-primary text-lg">Miễn phí</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
