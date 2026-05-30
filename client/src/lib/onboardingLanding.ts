import type { OnboardingIntentId } from '@/features/onboarding/public'

export type OnboardingLandingParams = {
  fromOnboarding: boolean
  topics: string[]
  depth: string
  tour: boolean
  welcome: boolean
  focus: string | null
  pinNewbie: boolean
  sortOverride: 'newest' | 'top' | 'hot' | null
}

export function parseOnboardingLanding(searchParams: URLSearchParams | null): OnboardingLandingParams {
  const sp = searchParams ?? new URLSearchParams()
  const sort = sp.get('sort')
  return {
    fromOnboarding: sp.get('from') === 'onboarding',
    topics: sp.get('topics')?.split(',').map((t) => t.trim()).filter(Boolean) ?? [],
    depth: sp.get('depth') || 'beginner',
    tour: sp.get('tour') !== '0',
    welcome: sp.get('welcome') === '1',
    focus: sp.get('focus'),
    pinNewbie: sp.get('pin') === 'newbie',
    sortOverride:
      sort === 'hot' || sort === 'top' || sort === 'newest' ? sort : null,
  }
}

export const ONBOARDING_LAUNCH_LINES: Record<
  OnboardingIntentId,
  { loading: string[]; done: string }
> = {
  learn_path: {
    loading: [
      'Đang thiết lập quỹ đạo học tập…',
      'Đang lọc lộ trình theo chủ đề…',
      'Đang chọn chặng xuất phát…',
    ],
    done: 'Sẵn sàng vào lộ trình!',
  },
  explore_3d: {
    loading: [
      'Đang mở cửa sổ 3D…',
      'Đang căn quỹ đạo hành tinh…',
      'Đang nạp catalog Explore…',
    ],
    done: 'Bay vào hệ Mặt Trời!',
  },
  stargazing: {
    loading: [
      'Đang dựng bản đồ 4.673 thiên hà…',
      'Đang căn về Dải Ngân Hà…',
      'Đang tải dữ liệu vũ trụ cục bộ…',
    ],
    done: 'Bản đồ cosmos sẵn sàng!',
  },
  community: {
    loading: [
      'Đang mở không gian cộng đồng…',
      'Đang ghép chủ đề bạn chọn…',
      'Đang tải bài thảo luận…',
    ],
    done: 'Chào mừng đến diễn đàn!',
  },
  mixed: {
    loading: [
      'Đang dựng dashboard cá nhân…',
      'Đang xếp widget gợi ý…',
      'Đang đồng bộ mục tiêu học tập…',
    ],
    done: 'Trang chủ của bạn đã sẵn sàng!',
  },
}

export function lessonHrefWithDepth(
  moduleId: string,
  nodeId: string,
  lessonId: string,
  depth: string,
  fromOnboarding = true,
) {
  const qs = new URLSearchParams()
  if (fromOnboarding) qs.set('from', 'onboarding')
  if (depth) qs.set('depth', depth)
  const q = qs.toString()
  return `/tutorial/${moduleId}/${nodeId}/${lessonId}${q ? `?${q}` : ''}`
}
