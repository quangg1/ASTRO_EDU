'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Nguyễn Thị Mai',
    role: 'Sinh viên Vật Lý — ĐH KHTN',
    content: 'Cosmo Learn đã thay đổi cách mình nhìn bầu trời đêm. Các khóa học rất chi tiết, hình ảnh minh họa tuyệt đẹp và dễ hiểu!',
    avatar: 'M',
    rating: 5,
    gradient: 'from-amber-500/20 to-orange-500/5',
  },
  {
    name: 'Trần Văn Đức',
    role: 'Kỹ sư phần mềm — FPT',
    content: 'Mình đam mê thiên văn từ nhỏ nhưng không biết bắt đầu từ đâu. Cosmo Learn là câu trả lời hoàn hảo với lộ trình rõ ràng.',
    avatar: 'Đ',
    rating: 5,
    gradient: 'from-violet-500/20 to-purple-500/5',
  },
  {
    name: 'Lê Hoàng An',
    role: 'Giáo viên Vật Lý — THPT chuyên',
    content: 'Nội dung cập nhật theo nghiên cứu mới nhất, giảng viên chuyên nghiệp. Mình đã giới thiệu cho cả lớp học sinh.',
    avatar: 'A',
    rating: 5,
    gradient: 'from-cyan-500/20 to-blue-500/5',
  },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } }

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-28 bg-gradient-cosmos relative overflow-hidden">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4 block">Phản hồi từ cộng đồng</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-5 text-foreground">
            Học viên <span className="text-gradient-gold">nói gì</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Hàng ngàn học viên đã khám phá niềm đam mê thiên văn cùng chúng tôi
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={item}
              whileHover={{ y: -4 }}
              className={`group relative bg-gradient-to-br ${t.gradient} border border-border/40 rounded-2xl p-7 transition-all duration-300 card-glow`}
            >
              <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/10" />

              <div className="flex gap-0.5 mb-5">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                ))}
              </div>

              <p className="text-foreground/90 mb-7 leading-relaxed text-[15px]">&quot;{t.content}&quot;</p>

              <div className="flex items-center gap-3 pt-5 border-t border-border/30">
                <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-heading font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
