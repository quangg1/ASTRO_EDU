/** Per-module accent + art for Space mission cards (recognition at a glance). */

export type ModuleVisualId =
  | 'intro-scale'
  | 'sky-motion'
  | 'light-observation'
  | 'solar-system'
  | 'stars-evolution'
  | 'universe-cosmology'

export type ModuleVisualMeta = {
  accent: string
  accentRgb: string
  glow: string
  label: string
}

/** accent = semantic.css `--color-module-*`; accentRgb/glow giữ cho SVG gradient. */
const META: Record<ModuleVisualId, ModuleVisualMeta> = {
  'intro-scale': {
    accent: 'var(--color-module-intro-scale)',
    accentRgb: '167,139,250',
    glow: 'rgba(167,139,250,0.35)',
    label: 'Quy mô vũ trụ',
  },
  'sky-motion': {
    accent: 'var(--color-module-sky-motion)',
    accentRgb: '56,189,248',
    glow: 'rgba(56,189,248,0.35)',
    label: 'Bầu trời',
  },
  'light-observation': {
    accent: 'var(--color-module-light-observation)',
    accentRgb: '245,165,36',
    glow: 'rgba(245,165,36,0.35)',
    label: 'Quan sát',
  },
  'solar-system': {
    accent: 'var(--color-module-solar-system)',
    accentRgb: '251,146,60',
    glow: 'rgba(251,146,60,0.4)',
    label: 'Hệ Mặt Trời',
  },
  'stars-evolution': {
    accent: 'var(--color-module-stars-evolution)',
    accentRgb: '244,114,182',
    glow: 'rgba(244,114,182,0.35)',
    label: 'Sao',
  },
  'universe-cosmology': {
    accent: 'var(--color-module-universe-cosmology)',
    accentRgb: '129,140,248',
    glow: 'rgba(129,140,248,0.35)',
    label: 'Vũ trụ học',
  },
}

export function resolveModuleVisual(moduleId: string): ModuleVisualMeta {
  const key = moduleId as ModuleVisualId
  return META[key] ?? META['intro-scale']
}

type ArtProps = { moduleId: string; emoji?: string }

export function ModuleVisualArt({ moduleId, emoji }: ArtProps) {
  const meta = resolveModuleVisual(moduleId)
  const id = moduleId as ModuleVisualId

  return (
    <div
      className="absolute -right-1 top-4 flex h-[140px] w-[140px] items-center justify-center"
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full opacity-90"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${meta.glow}, transparent 68%)`,
        }}
      />
      <svg viewBox="0 0 120 120" className="relative h-full w-full drop-shadow-lg">
        {id === 'intro-scale' && <IntroScaleArt color={meta.accent} />}
        {id === 'sky-motion' && <SkyMotionArt color={meta.accent} />}
        {id === 'light-observation' && <TelescopeArt color={meta.accent} />}
        {id === 'solar-system' && <SolarSystemArt color={meta.accent} />}
        {id === 'stars-evolution' && <StarEvolutionArt color={meta.accent} />}
        {id === 'universe-cosmology' && <CosmologyArt color={meta.accent} />}
        {!META[id as ModuleVisualId] && <IntroScaleArt color={meta.accent} />}
      </svg>
      {emoji ? (
        <span className="absolute bottom-2 right-2 text-3xl opacity-90 select-none">{emoji}</span>
      ) : null}
    </div>
  )
}

function IntroScaleArt({ color }: { color: string }) {
  return (
    <>
      <circle cx="60" cy="60" r="42" fill="none" stroke={color} strokeWidth="1.2" opacity="0.35" />
      <circle cx="60" cy="60" r="28" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="60" r="8" fill={color} opacity="0.9" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const r = (deg * Math.PI) / 180
        const x = 60 + Math.cos(r) * 38
        const y = 60 + Math.sin(r) * 38
        return <circle key={deg} cx={x} cy={y} r="3" fill={color} opacity="0.75" />
      })}
    </>
  )
}

function SkyMotionArt({ color }: { color: string }) {
  return (
    <>
      <circle cx="62" cy="62" r="22" fill="#1e3a5f" stroke={color} strokeWidth="1.5" />
      <path d="M 20 70 Q 60 30 100 70" fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" />
      <circle cx="88" cy="38" r="7" fill="#c4c4c4" stroke={color} strokeWidth="1" />
      <circle cx="88" cy="38" r="9" fill="none" stroke={color} strokeWidth="0.8" opacity="0.4" />
    </>
  )
}

function TelescopeArt({ color }: { color: string }) {
  return (
    <>
      <path
        d="M 28 78 L 52 52 L 92 42 L 98 48 L 58 58 L 38 82 Z"
        fill="#1a1a22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="94" cy="44" r="10" fill="none" stroke={color} strokeWidth="2" />
      <line x1="38" y1="82" x2="32" y2="92" stroke={color} strokeWidth="2" />
      <line x1="48" y1="80" x2="44" y2="92" stroke={color} strokeWidth="2" />
    </>
  )
}

function SolarSystemArt({ color }: { color: string }) {
  return (
    <>
      <circle cx="60" cy="60" r="14" fill="#fbbf24" opacity="0.95" />
      <circle cx="60" cy="60" r="20" fill="none" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <ellipse cx="60" cy="60" rx="38" ry="12" fill="none" stroke="#e4d191" strokeWidth="2.5" opacity="0.7" transform="rotate(-20 60 60)" />
      <circle cx="95" cy="52" r="9" fill="#c88b3a" />
      <circle cx="28" cy="72" r="5" fill="#4a90d9" />
    </>
  )
}

function StarEvolutionArt({ color }: { color: string }) {
  return (
    <>
      <path
        d="M 60 18 L 66 48 L 96 48 L 72 66 L 80 96 L 60 78 L 40 96 L 48 66 L 24 48 L 54 48 Z"
        fill={color}
        opacity="0.85"
      />
      <circle cx="60" cy="60" r="6" fill="#fff" opacity="0.9" />
    </>
  )
}

function CosmologyArt({ color }: { color: string }) {
  return (
    <>
      <path
        d="M 60 35 C 85 35 95 55 90 70 C 85 88 65 95 45 88 C 25 80 22 58 35 45 C 45 32 55 35 60 35 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.85"
      />
      <path
        d="M 60 42 C 78 42 86 56 82 68 C 78 80 64 84 50 78 C 36 72 34 56 44 48 C 52 40 58 42 60 42 Z"
        fill={color}
        opacity="0.25"
      />
      {[38, 52, 72, 86].map((x, i) => (
        <circle key={i} cx={x} cy={48 + i * 8} r="1.5" fill="#fff" opacity="0.7" />
      ))}
    </>
  )
}
