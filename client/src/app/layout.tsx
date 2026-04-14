import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AppHeader } from '@/components/ui/AppHeader'
import { AppShell } from '@/components/ui/AppShell'
import { AITutor } from '@/components/ai-tutor/AITutor'
import { ErrorBoundaryWrap } from '@/components/ui/ErrorBoundaryWrap'
import { Analytics } from '@/components/ui/Analytics'
import { PwaRegister } from '@/components/ui/PwaRegister'
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt'
import { PwaStatusBadge } from '@/components/ui/PwaStatusBadge'
import { HybridBootstrap } from '@/components/ui/HybridBootstrap'
import { ChunkLoadRecovery } from '@/components/ui/ChunkLoadRecovery'

export const metadata: Metadata = {
  title: { default: 'Cosmo Learn – Astronomy | Earth History | Solar System', template: '%s | Cosmo Learn' },
  applicationName: 'Cosmo Learn',
  description: 'Learn astronomy through courses and 3D simulations: Earth History, the Solar System, and the Milky Way. Tutorials, in-depth courses, and community.',
  keywords: ['astronomy', 'earth history', 'solar system', 'milky way', 'courses', 'education', '3D'],
  openGraph: {
    title: 'Cosmo Learn – Learn astronomy with 3D simulations',
    description: 'Courses, tutorials, and 3D simulations: Earth History, the Solar System, and the Milky Way.',
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
    <html lang="en">
      <body className="antialiased">
        <Analytics />
        <ChunkLoadRecovery />
        <PwaRegister />
        <HybridBootstrap />
        <AuthProvider>
          <ErrorBoundaryWrap>
            <AppHeader />
            <PwaInstallPrompt />
            <PwaStatusBadge />
            <AppShell>{children}</AppShell>
            <Suspense fallback={null}>
              <AITutor />
            </Suspense>
          </ErrorBoundaryWrap>
        </AuthProvider>
      </body>
    </html>
  )
}
