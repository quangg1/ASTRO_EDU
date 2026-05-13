'use client'

import Link from 'next/link'
import { SiteLogo } from '@/components/ui/SiteLogo'

const NAV_COLS = [
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
    title: 'Tài khoản',
    links: [
      { label: 'Tìm kiếm', href: '/search' },
      { label: 'Đăng nhập', href: '/login' },
      { label: 'Đăng ký', href: '/register' },
    ],
  },
  {
    title: 'Mission control',
    links: [
      { label: 'Bảng điều khiển', href: '/dashboard' },
      { label: 'Studio', href: '/studio' },
      { label: 'Trạng thái hệ thống', href: '#' },
      { label: 'Liên hệ', href: '#' },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer
      className="relative"
      style={{
        background: 'rgba(3,6,15,0.92)',
        borderTop: '1px solid rgba(126,231,255,0.18)',
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-14 md:py-20 max-w-[1440px]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="mb-5">
              <SiteLogo className="text-xl" />
            </div>
            <p className="text-sm text-white/45 leading-[1.7] max-w-xs">
              Nền tảng học thiên văn trực tuyến hàng đầu Việt Nam — kết nối đam mê với kiến thức vũ trụ.
            </p>
            <div className="hud-mono hud-mono-sm mt-5 text-[color:var(--hud-plasma)]/70">
              v2.6 · Hanoi observatory link
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="hud-mono hud-mono-md text-[color:var(--hud-plasma)] mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 hover:text-[color:var(--hud-amber)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-7 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(126,231,255,0.12)' }}
        >
          <span className="hud-mono hud-mono-sm text-white/35 inline-flex items-center gap-2">
            <span className="hud-status-dot-cyan" aria-hidden />
            ALL SYSTEMS NOMINAL · SYNC 99.98%
          </span>
          <span className="text-xs text-white/30">
            © {new Date().getFullYear()} CosmoLearn. Tất cả quyền được bảo lưu.
          </span>
          <div className="flex gap-6">
            <Link href="#" className="hud-mono hud-mono-sm text-white/35 hover:text-white/70 transition-colors">
              Điều khoản
            </Link>
            <Link href="#" className="hud-mono hud-mono-sm text-white/35 hover:text-white/70 transition-colors">
              Bảo mật
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
