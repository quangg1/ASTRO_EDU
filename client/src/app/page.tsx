import { LandingPageChrome } from '@/components/landing/LandingPageChrome'
import { SpaceHeroSection } from '@/components/landing/SpaceHeroSection'
import { SpacePillarsSection } from '@/components/landing/SpacePillarsSection'
import { SpaceLpPreviewSection } from '@/components/landing/SpaceLpPreviewSection'
import { CoursesSection } from '@/components/landing/CoursesSection'
import { StatsSection } from '@/components/landing/StatsSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { CTASection } from '@/components/landing/CTASection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { fetchPublicCoursesServer, fetchLearningPathModulesServer } from '@/lib/server/coursesServer'

export default async function HomePage() {
  const [courses, modules] = await Promise.all([
    fetchPublicCoursesServer(),
    fetchLearningPathModulesServer(),
  ])
  return (
    <main className="min-h-screen space-premium relative isolate" style={{ background: 'var(--sp-bg)' }}>
      <LandingPageChrome />
      <SpaceHeroSection />
      <SpacePillarsSection />
      <SpaceLpPreviewSection modules={modules} />
      <div id="courses" className="relative bg-ds-base border-t border-white/[0.06]">
        <CoursesSection courses={courses} loading={false} />
      </div>
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
