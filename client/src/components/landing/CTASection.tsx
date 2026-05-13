'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { CornerBrackets } from './CornerBrackets'
import { SectionEyebrow } from './SectionEyebrow'

export function CTASection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="hud-chamfer-xl relative mx-auto max-w-4xl px-8 py-16 md:px-16 md:py-20 text-center"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,165,36,0.08), transparent 70%), rgba(6,9,26,0.85)',
            border: '1px solid rgba(126,231,255,0.25)',
            boxShadow: '0 0 60px rgba(126,231,255,0.06), inset 0 0 60px rgba(245,165,36,0.04)',
          }}
        >
          <CornerBrackets corners={['tr', 'bl']} />

          <SectionEyebrow text="// ready for launch" align="center" className="mb-5" />

          <h2
            className="hud-em font-heading text-4xl md:text-6xl lg:text-[clamp(48px,6vw,80px)] font-medium text-white mb-6 leading-[1] tracking-[-0.03em]"
            dangerouslySetInnerHTML={{ __html: 'Bắt đầu hành trình <em>của bạn</em>' }}
          />

          <p className="text-white/55 text-[16px] mb-10 max-w-md mx-auto leading-[1.6]">
            Tham gia cùng 50,000+ người yêu thiên văn. Miễn phí để bắt đầu hành trình khám phá vũ trụ.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
            <Link
              href="/register"
              className="hud-chamfer group inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold transition-all"
              style={{
                background: 'var(--hud-amber)',
                color: '#1a0e00',
                boxShadow: '0 0 28px rgba(245,165,36,0.4)',
              }}
            >
              <Sparkles className="h-4 w-4" />
              Đăng ký miễn phí
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/courses"
              className="hud-chamfer inline-flex items-center justify-center px-8 py-4 text-sm font-semibold text-white transition-all"
              style={{
                background: 'rgba(126,231,255,0.06)',
                border: '1px solid rgba(126,231,255,0.3)',
              }}
            >
              Tìm hiểu thêm
            </Link>
          </div>

          <p className="hud-mono hud-mono-sm text-white/40">
            không cần thẻ tín dụng · hủy bất kỳ lúc nào · 50,000+ học viên tin tưởng
          </p>
        </motion.div>
      </div>
    </section>
  )
}
