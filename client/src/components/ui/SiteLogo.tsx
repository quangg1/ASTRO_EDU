'use client'

import Link from 'next/link'
import Image from 'next/image'
import { getStaticAssetUrl } from '@/lib/apiConfig'

const WEB_ICON = getStaticAssetUrl('/images/web_icon.png')

/** Giống Redesign LogoMark: icon → amber/gold bằng CSS filter */
const ICON_GOLD_FILTER =
  'brightness(0) saturate(100%) invert(72%) sepia(68%) saturate(700%) hue-rotate(358deg) brightness(105%) contrast(100%)'

type SiteLogoProps = { className?: string; href?: string }

export function SiteLogo({ className = '', href = '/' }: SiteLogoProps) {
  return (
    <Link
      href={href}
      className={`font-logo-brand inline-flex select-none items-center gap-px text-xl md:text-2xl hover:opacity-95 transition-opacity ${className}`}
      aria-label="Cosmo Learn - Trang chủ"
    >
      <span className="text-white font-extrabold tracking-tight [letter-spacing:-0.03em] leading-none">
        Cosm
      </span>
      <span
        className="inline-flex shrink-0 items-center justify-center relative mb-px"
        style={{ width: '1.05em', height: '1.05em' }}
      >
        <Image
          src={WEB_ICON}
          alt=""
          width={32}
          height={32}
          className="h-full w-full object-contain"
          style={{ filter: ICON_GOLD_FILTER }}
          unoptimized={WEB_ICON.startsWith('http')}
        />
      </span>
      <span
        className="font-extrabold tracking-tight [letter-spacing:-0.03em] leading-none bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(135deg, #F5A623 0%, #FF8C00 100%)',
        }}
      >
        Learn
      </span>
    </Link>
  )
}
