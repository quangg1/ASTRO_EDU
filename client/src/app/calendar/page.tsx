import { Suspense } from 'react'
import { AstronomyCalendarPage } from '@/features/astronomy-calendar/public'

function CalendarFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24">
      <div className="cosmo-dark-panel h-[28rem] animate-pulse rounded-2xl" />
    </div>
  )
}

export default function CalendarRoutePage() {
  return (
    <Suspense fallback={<CalendarFallback />}>
      <AstronomyCalendarPage />
    </Suspense>
  )
}
