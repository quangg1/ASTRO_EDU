'use client'

import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { SiteLogo } from '@/components/ui/SiteLogo'

export function LandingFooter() {
  return (
    <footer className="relative border-t border-border/30 pt-12 md:pt-20 pb-10 md:pb-8 bg-cosmic">
      <div className="absolute inset-0 star-field opacity-10" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid md:grid-cols-5 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="mb-5">
              <SiteLogo className="text-xl" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Nền tảng học thiên văn trực tuyến hàng đầu Việt Nam, kết nối đam mê với kiến thức vũ trụ.
            </p>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary/60" />
                <span>hello@cosmolearn.vn</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary/60" />
                <span>1900 xxxx</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary/60" />
                <span>TP. Hồ Chí Minh, Việt Nam</span>
              </div>
            </div>
          </div>

          {[
            {
              title: 'Khám phá',
              links: [
                { label: 'Tất cả khóa học', href: '/courses' },
                { label: 'Tutorial', href: '/tutorial' },
                { label: 'Khám phá 3D', href: '/explore' },
                { label: 'Cộng đồng', href: '/community' },
              ],
            },
            {
              title: 'Hỗ trợ',
              links: [
                { label: 'Tìm kiếm', href: '/search' },
                { label: 'Đăng nhập', href: '/login' },
                { label: 'Đăng ký', href: '/register' },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-foreground mb-5 text-sm">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="section-divider mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/60">
          <span>© {new Date().getFullYear()} Cosmo Learn. Tất cả quyền được bảo lưu.</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Điều khoản</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Bảo mật</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
