import { viText } from '@/messages/vi'

export type NavGroup = 'learning' | 'community' | 'rewards' | 'account'
export type NavSurface = 'headerDesktop' | 'headerMobileMenu' | 'mobileBottom' | 'dashboardSidebar'
export type NavLabelKey = keyof typeof viText.nav

export type NavItemConfig = {
  id: string
  href: string
  labelKey: NavLabelKey
  labelOverride?: string
  badge?: string
  group: NavGroup
  surfaces: NavSurface[]
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', href: '/', labelKey: 'home', group: 'learning', surfaces: ['mobileBottom'] },
  { id: 'dashboard', href: '/dashboard', labelKey: 'dashboard', group: 'learning', surfaces: ['headerDesktop', 'headerMobileMenu', 'dashboardSidebar'] },
  { id: 'community', href: '/community', labelKey: 'community', group: 'community', surfaces: ['headerDesktop', 'headerMobileMenu', 'mobileBottom', 'dashboardSidebar'] },
  { id: 'profile', href: '/profile', labelKey: 'profile', group: 'account', surfaces: ['headerMobileMenu'] },
  { id: 'myLearning', href: '/my-courses', labelKey: 'myLearning', group: 'learning', surfaces: ['headerMobileMenu', 'dashboardSidebar'] },
  { id: 'courses', href: '/courses', labelKey: 'courses', group: 'learning', surfaces: ['headerMobileMenu', 'mobileBottom', 'dashboardSidebar'] },
  { id: 'learningPath', href: '/tutorial', labelKey: 'learningPath', group: 'learning', surfaces: ['headerMobileMenu', 'mobileBottom', 'dashboardSidebar'] },
  { id: 'explore', href: '/explore', labelKey: 'explore', group: 'learning', surfaces: ['headerMobileMenu', 'dashboardSidebar'] },
  { id: 'search', href: '/search', labelKey: 'search', group: 'community', surfaces: ['headerMobileMenu', 'dashboardSidebar'] },
  { id: 'gem', href: '/gem', labelKey: 'more', labelOverride: 'Gem', group: 'rewards', surfaces: ['dashboardSidebar'] },
  {
    id: 'gemShop',
    href: '/gem-shop',
    labelKey: 'more',
    labelOverride: 'Cửa hàng Gem',
    badge: 'SẮP RA MẮT',
    group: 'rewards',
    surfaces: ['dashboardSidebar'],
  },
]

export function navItemsForSurface(surface: NavSurface): NavItemConfig[] {
  return NAV_ITEMS.filter((item) => item.surfaces.includes(surface))
}

export function navLabel(item: NavItemConfig): string {
  if (item.labelOverride) return item.labelOverride
  return viText.nav[item.labelKey]
}

