import { getStaticAssetUrl } from '@/lib/apiConfig'

/** Path trên CDN / `client/public` — sync: `scripts/sync-media-to-s3.*` */
export const ONBOARDING_LAUNCH_VIDEO_PATH = '/videos/onboarding-launch.mp4'

export function getOnboardingLaunchVideoSrc(): string {
  return getStaticAssetUrl(ONBOARDING_LAUNCH_VIDEO_PATH)
}

/** Same-origin fallback khi CDN chưa có file hoặc lỗi 404. */
export function getOnboardingLaunchVideoLocalSrc(): string {
  return ONBOARDING_LAUNCH_VIDEO_PATH
}
