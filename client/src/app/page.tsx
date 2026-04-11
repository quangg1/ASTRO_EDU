'use client'

import { useEffect, useState } from 'react'
import { fetchCourses, type Course } from '@/lib/coursesApi'
import { HeroSection } from '@/components/landing/HeroSection'
import { CategoriesSection } from '@/components/landing/CategoriesSection'
import { CoursesSection } from '@/components/landing/CoursesSection'
import { StatsSection } from '@/components/landing/StatsSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { CTASection } from '@/components/landing/CTASection'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .finally(() => setLoadingCourses(false))
  }, [])

  return (
    <main className="min-h-screen bg-cosmic">
      <HeroSection />
      <CategoriesSection />
      <CoursesSection courses={courses} loading={loadingCourses} />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
