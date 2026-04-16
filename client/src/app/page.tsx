import { HeroSection } from '@/components/landing/HeroSection'
import { CategoriesSection } from '@/components/landing/CategoriesSection'
import { CoursesSection } from '@/components/landing/CoursesSection'
import { StatsSection } from '@/components/landing/StatsSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { CTASection } from '@/components/landing/CTASection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { fetchPublicCoursesServer } from '@/lib/server/coursesServer'

export default async function HomePage() {
  const courses = await fetchPublicCoursesServer()
  return (
    <main className="min-h-screen bg-cosmic">
      <HeroSection />
      <CategoriesSection />
      <CoursesSection courses={courses} loading={false} />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
