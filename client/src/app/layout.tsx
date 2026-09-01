import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { AuthProvider } from '@/features/auth/public'
import { AppChrome } from '@/components/layout/AppChrome'
import { CosmoAssistantWidget, CosmoConceptQuizHost } from '@/features/agent/public'
import { ErrorBoundaryWrap } from '@/components/system/ErrorBoundaryWrap'
import { Analytics } from '@/components/system/Analytics'
import { ChunkLoadRecovery } from '@/components/system/ChunkLoadRecovery'
import { RuntimePublicConfigScript } from '@/components/system/RuntimePublicConfigScript'
import { LayoutChromeProvider } from '@/components/layout/LayoutChromeContext'
import { ShowcaseCatalogProvider } from '@/components/showcase/ShowcaseCatalogProvider'
import { ToastProvider } from '@/design-system'
import { LocaleProvider } from '@/i18n/public'

export const metadata: Metadata = {
  title: { default: 'Cosmo Learn – Học thiên văn tương tác 3D', template: '%s | Cosmo Learn' },
  applicationName: 'CosmoLearn',
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
}

export const viewport: Viewport = {
  themeColor: '#0a0b10',
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
      <body className="antialiased bg-ds-base text-ds-text">
        <RuntimePublicConfigScript />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <ChunkLoadRecovery />
        <AuthProvider>
          <LocaleProvider>
          <ShowcaseCatalogProvider>
            <LayoutChromeProvider>
              <ToastProvider>
                <ErrorBoundaryWrap>
                  <AppChrome>{children}</AppChrome>
                  <Suspense fallback={null}>
                    <CosmoAssistantWidget />
                    <CosmoConceptQuizHost />
                  </Suspense>
                </ErrorBoundaryWrap>
              </ToastProvider>
            </LayoutChromeProvider>
          </ShowcaseCatalogProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
