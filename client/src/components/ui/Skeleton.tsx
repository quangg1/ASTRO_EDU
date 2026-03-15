'use client'

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
      <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
      <div className="h-3 bg-white/10 rounded w-full mb-2" />
      <div className="h-3 bg-white/10 rounded w-2/3 mb-3" />
      <div className="h-3 bg-white/10 rounded w-1/3" />
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-white/10 rounded animate-pulse" style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}
