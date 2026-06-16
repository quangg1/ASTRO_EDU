export type DistributionStrategy = 'self_paced' | 'instructor_led'

export const DISTRIBUTION_STRATEGIES: DistributionStrategy[] = ['self_paced', 'instructor_led']

export type DistributionStrategySource = {
  distributionStrategy?: string | null
  catalogEnabled?: boolean
}

export function resolveDistributionStrategy(
  course: DistributionStrategySource,
): DistributionStrategy {
  const raw = course.distributionStrategy
  if (raw === 'self_paced' || raw === 'instructor_led') return raw
  if (raw === 'hybrid') return 'self_paced'
  return course.catalogEnabled === false ? 'instructor_led' : 'self_paced'
}

export function catalogEnabledForStrategy(strategy: DistributionStrategy): boolean {
  return strategy !== 'instructor_led'
}

export function cohortsNavEnabledForStrategy(strategy: DistributionStrategy): boolean {
  return strategy === 'instructor_led'
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
    hint: 'Học viên mua hoặc ghi danh miễn phí trên trang khóa — không có lớp theo kỳ.',
  },
  instructor_led: {
    title: 'Có giáo viên (Theo lớp)',
    subtitle: 'Chỉ mở theo cohort, có khai giảng và lịch lớp',
    hint: 'Học viên chọn lớp trên trang khóa — giá và đăng ký theo từng kỳ, không bán catalog.',
  },
}

export function distributionStrategyBadge(strategy: DistributionStrategy): string {
  return strategy === 'instructor_led' ? 'Theo lớp' : 'Tự học'
}
