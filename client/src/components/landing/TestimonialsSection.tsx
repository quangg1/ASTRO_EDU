'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { SectionEyebrow } from './SectionEyebrow'

const AVATAR_GRADIENTS = {
  a: 'linear-gradient(135deg, #ffd27a 0%, #f5a524 100%)',
  b: 'linear-gradient(135deg, #7ee7ff 0%, #4dd2ff 100%)',
  c: 'linear-gradient(135deg, #ff5cd4 0%, #b04bff 100%)',
} as const

const testimonials = [
  {
    name: 'Nguyễn Thị Mai',
    role: 'Sinh viên năm 3 · ĐH BKHN',
    content:
      'Cosmo Learn đã thay đổi cách mình nhìn bầu trời đêm. Các khóa học rất chi tiết, hình ảnh minh họa tuyệt đẹp và dễ hiểu!',
    avatar: 'M',
    rating: 5,
    grad: AVATAR_GRADIENTS.a,
  },
  {
    name: 'Trần Văn Đức',
    role: 'Kỹ sư phần mềm · FPT',
    content:
      'Mình đam mê thiên văn từ nhỏ nhưng không biết bắt đầu từ đâu. Cosmo Learn là câu trả lời hoàn hảo với lộ trình rõ ràng.',
    avatar: 'Đ',
    rating: 5,
    grad: AVATAR_GRADIENTS.b,
  },
  {
    name: 'Lê Hoàng An',
    role: 'Giáo viên Vật lý · THPT chuyên',
    content:
      'Nội dung cập nhật theo nghiên cứu mới nhất, giảng viên chuyên nghiệp. Mình đã giới thiệu cho cả lớp học sinh.',
    avatar: 'A',
    rating: 5,
    grad: AVATAR_GRADIENTS.c,
  },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.14 } } }
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1440px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 flex flex-col items-center gap-4"
        >
          <SectionEyebrow text="// 03 · voices from orbit" align="center" />
          <h2
            className="hud-em font-heading text-4xl md:text-5xl lg:text-[clamp(42px,5vw,68px)] font-medium text-white tracking-[-0.03em] leading-[1]"
            dangerouslySetInnerHTML={{ __html: 'Học viên <em>nói gì</em>' }}
          />
          <p className="text-white/50 max-w-md text-[15px] leading-[1.6]">
            Hàng ngàn học viên đã khám phá niềm đam mê thiên văn cùng chúng tôi.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={item}
              whileHover={{ y: -4 }}
              className="hud-chamfer-md flex flex-col p-7 transition-all duration-300"
              style={{
                background: 'rgba(6,9,26,0.7)',
                border: '1px solid rgba(126,231,255,0.16)',
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-[color:var(--hud-amber)] text-[color:var(--hud-amber)]"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-white/75 leading-[1.65] text-[15px] flex-1 mb-6">
                &ldquo;{t.content}&rdquo;
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-3 pt-5"
                style={{ borderTop: '1px solid rgba(126,231,255,0.12)' }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: t.grad }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="font-heading font-semibold text-white text-sm">{t.name}</div>
                  <div className="hud-mono hud-mono-sm text-white/45 mt-1">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
