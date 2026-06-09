'use client'

import { useMemo } from 'react'
import { SpaceAccordionPillars, type SpacePillar } from '@/components/space-premium'
import { useT } from '@/i18n/public'

export function SpacePillarsSection() {
  const { t } = useT()

  const pillars: SpacePillar[] = useMemo(
    () => [
      {
        id: 'path',
        title: t('landing.pillarPathTitle'),
        body: t('landing.pillarPathBody'),
        href: '/tutorial',
        ctaLabel: t('landing.pillarsOpenPath'),
      },
      {
        id: 'explore',
        title: t('landing.pillarExploreTitle'),
        body: t('landing.pillarExploreBody'),
        href: '/explore',
        ctaLabel: t('landing.pillarsEnterExplore'),
      },
      {
        id: 'courses',
        title: t('landing.pillarCoursesTitle'),
        body: t('landing.pillarCoursesBody'),
        href: '/courses',
        ctaLabel: t('landing.pillarCoursesCta'),
      },
      {
        id: 'learn',
        title: t('landing.pillarLearnTitle'),
        body: t('landing.pillarLearnBody'),
        href: '/tutorial',
        ctaLabel: t('landing.pillarLearnCta'),
      },
    ],
    [t],
  )

  return (
    <div id="pillars" className="space-premium" style={{ background: 'var(--sp-bg)' }}>
      <SpaceAccordionPillars sectionTitle={t('landing.pillarsAbout')} pillars={pillars} defaultActiveId="learn" />
    </div>
  )
}
