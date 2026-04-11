'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Rocket, ArrowRight, Sparkles } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-16 md:py-28 relative overflow-hidden bg-cosmic">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="absolute inset-0 star-field opacity-30" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-secondary/10 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-8"
          >
            <Rocket className="h-7 w-7 text-primary" />
          </motion.div>

          <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-foreground">
            Sẵn sàng khám phá <span className="text-gradient-gold">vũ trụ</span>?
          </h2>

          <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Tham gia cộng đồng hơn 50,000 người yêu thiên văn. Bắt đầu hành trình khám phá vũ trụ ngay hôm nay.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-10 py-4 rounded-xl font-semibold text-base hover:brightness-110 transition-all glow-gold"
              >
                <Sparkles className="h-4 w-4" />
                Đăng ký miễn phí
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.span>
            </Link>
            <Link href="/courses">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block border border-border/50 text-foreground px-10 py-4 rounded-xl font-semibold text-base hover:bg-muted/30 transition-all"
              >
                Tìm hiểu thêm
              </motion.span>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/60 mt-6">Không cần thẻ tín dụng • Truy cập 20+ khóa học miễn phí</p>
        </motion.div>
      </div>
    </section>
  )
}
