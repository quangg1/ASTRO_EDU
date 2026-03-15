import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AppHeader } from '@/components/ui/AppHeader'
import { AITutor } from '@/components/ai-tutor/AITutor'
import { ErrorBoundaryWrap } from '@/components/ui/ErrorBoundaryWrap'
import { Analytics } from '@/components/ui/Analytics'

export const metadata: Metadata = {
  title: { default: 'Galaxies Edu – Thiên văn học | Earth History | Hệ Mặt Trời', template: '%s | Galaxies Edu' },
  description: 'Học thiên văn qua khóa học và mô phỏng 3D: Lịch sử Trái Đất, Hệ Mặt Trời, Milky Way. Tutorial, khóa học chuyên sâu, cộng đồng.',
  keywords: ['astronomy', 'earth history', 'solar system', 'milky way', 'courses', 'education', '3D', 'thiên văn học'],
  openGraph: {
    title: 'Galaxies Edu – Học thiên văn qua mô phỏng 3D',
    description: 'Khóa học, tutorial và mô phỏng 3D: Lịch sử Trái Đất, Hệ Mặt Trời, Milky Way.',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0a0f17',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <Analytics />
        <AuthProvider>
          <ErrorBoundaryWrap>
            <AppHeader />
            {children}
            <AITutor />
          </ErrorBoundaryWrap>
        </AuthProvider>
      </body>
    </html>
  )
}
