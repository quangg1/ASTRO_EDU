import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AppChrome } from '@/components/ui/AppChrome'
import { AITutor } from '@/components/ai-tutor/AITutor'
import { ErrorBoundaryWrap } from '@/components/ui/ErrorBoundaryWrap'
import { Analytics } from '@/components/ui/Analytics'
import { PwaRegister } from '@/components/ui/PwaRegister'
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt'
import { PwaStatusBadge } from '@/components/ui/PwaStatusBadge'
import { HybridBootstrap } from '@/components/ui/HybridBootstrap'
import { ChunkLoadRecovery } from '@/components/ui/ChunkLoadRecovery'
import { LayoutChromeProvider } from '@/components/ui/LayoutChromeContext'
import { ShowcaseCatalogProvider } from '@/components/showcase/ShowcaseCatalogProvider'

export const metadata: Metadata = {
  title: { default: 'Cosmo Learn – Học thiên văn tương tác 3D', template: '%s | Cosmo Learn' },
  applicationName: 'Cosmo Learn',
  description: 'Học thiên văn qua khóa học và mô phỏng 3D: Lịch sử Trái Đất, Hệ Mặt Trời và Ngân Hà. Có lộ trình, khóa học chuyên sâu và cộng đồng.',
  keywords: ['thiên văn', 'lịch sử trái đất', 'hệ mặt trời', 'ngân hà', 'khóa học', 'giáo dục', '3D'],
  openGraph: {
    title: 'Cosmo Learn – Học thiên văn với mô phỏng 3D',
    description: 'Khóa học, lộ trình và mô phỏng 3D: Lịch sử Trái Đất, Hệ Mặt Trời và Ngân Hà.',
    type: 'website',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: getStaticAssetUrl('/images/web_icon.png'),
    shortcut: getStaticAssetUrl('/images/web_icon.png'),
    apple: getStaticAssetUrl('/images/web_icon.png'),
  },
  appleWebApp: {
    capable: true,
    title: 'Cosmo Learn',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0f17',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <ChunkLoadRecovery />
        <PwaRegister />
        <HybridBootstrap />
        <AuthProvider>
          <ShowcaseCatalogProvider>
            <LayoutChromeProvider>
              <ErrorBoundaryWrap>
                <PwaInstallPrompt />
                <PwaStatusBadge />
                <AppChrome>{children}</AppChrome>
                <Suspense fallback={null}>
                  <AITutor />
                </Suspense>
              </ErrorBoundaryWrap>
            </LayoutChromeProvider>
          </ShowcaseCatalogProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
