export type DistributionStrategy = 'self_paced' | 'instructor_led' | 'hybrid'

export const DISTRIBUTION_STRATEGIES: DistributionStrategy[] = [
  'self_paced',
  'instructor_led',
  'hybrid',
]

export type DistributionStrategySource = {
  distributionStrategy?: string | null
  catalogEnabled?: boolean
}

export function resolveDistributionStrategy(
  course: DistributionStrategySource,
): DistributionStrategy {
  const raw = course.distributionStrategy
  if (raw === 'self_paced' || raw === 'instructor_led' || raw === 'hybrid') return raw
  return course.catalogEnabled === false ? 'instructor_led' : 'hybrid'
}

export function catalogEnabledForStrategy(strategy: DistributionStrategy): boolean {
  return strategy !== 'instructor_led'
}

export function cohortsNavEnabledForStrategy(strategy: DistributionStrategy): boolean {
  return strategy !== 'self_paced'
}

export function catalogPricingVisibleForStrategy(strategy: DistributionStrategy): boolean {
  return strategy !== 'instructor_led'
}

export function patchForDistributionStrategy(strategy: DistributionStrategy): {
  distributionStrategy: DistributionStrategy
  catalogEnabled: boolean
} {
  return {
    distributionStrategy: strategy,
    catalogEnabled: catalogEnabledForStrategy(strategy),
  }
}

export const DISTRIBUTION_STRATEGY_LABELS: Record<
  DistributionStrategy,
  { title: string; subtitle: string; hint: string }
> = {
  self_paced: {
    title: 'Tự học (Catalog)',
    subtitle: 'Ghi danh quanh năm, học theo tiến độ riêng',
    hint: 'Không dùng lớp theo kỳ — học viên vào /courses và học ngay.',
  },
  instructor_led: {
    title: 'Có giáo viên (Theo lớp)',
    subtitle: 'Chỉ mở theo cohort, có khai giảng và lịch lớp',
    hint: 'Giá và đăng ký qua từng lớp — không bán catalog tự học.',
  },
  hybrid: {
    title: 'Kết hợp (Hybrid)',
    subtitle: 'Vừa catalog tự học, vừa các lớp có GV',
    hint: 'Phù hợp khi bán gói tự học và thêm lớp coaching theo kỳ.',
  },
}

export function distributionStrategyBadge(strategy: DistributionStrategy): string {
  switch (strategy) {
    case 'self_paced':
      return 'Tự học'
    case 'instructor_led':
      return 'Theo lớp'
    default:
      return 'Hybrid'
  }
}
