'use client'

import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { getIconicOrganismsForStage, type IconicOrganism } from '@/lib/iconicOrganisms'
import { Organism3DViewer } from './Organism3DViewer'

interface FeaturedOrganismsProps {
  stageId: number
  /** Compact: ít padding, chữ nhỏ (dùng trong panel). Full: card rộng (dùng trong course). */
  variant?: 'compact' | 'full'
}

function matchOrganism(org: IconicOrganism, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return (
    org.name.toLowerCase().includes(q) ||
    org.nameVi.toLowerCase().includes(q) ||
    org.description.toLowerCase().includes(q)
  )
}

function OrganismCard({
  org,
  variant,
  onView3D,
}: {
  org: IconicOrganism
  variant: 'compact' | 'full'
  onView3D: (org: IconicOrganism) => void
}) {
  const isCompact = variant === 'compact'
  const hasModel = Boolean(org.modelUrl)
  const card = (
    <>
      {org.imageUrl ? (
        <img
          src={org.imageUrl}
          alt=""
          className={isCompact ? 'w-10 h-10 rounded object-cover shrink-0' : 'w-14 h-14 rounded-lg object-cover shrink-0'}
        />
      ) : (
        <div
          className={
            isCompact
              ? 'w-10 h-10 rounded bg-cyan-500/20 flex items-center justify-center text-lg shrink-0'
              : 'w-14 h-14 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xl shrink-0'
          }
        >
          {hasModel ? '🦴' : '🦴'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={isCompact ? 'text-sm font-medium text-white' : 'font-semibold text-white'}>
          {org.nameVi}
        </div>
        {!isCompact && org.name !== org.nameVi && (
          <div className="text-xs text-gray-500">{org.name}</div>
        )}
        <p className={isCompact ? 'text-xs text-gray-400 mt-0.5 line-clamp-2' : 'text-sm text-gray-400 mt-1'}>
          {org.description}
        </p>
        {hasModel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onView3D(org)
            }}
            className={isCompact ? 'mt-1 text-xs text-cyan-400 hover:text-cyan-300' : 'mt-2 text-sm text-cyan-400 hover:text-cyan-300'}
          >
            Xem 3D →
          </button>
        )}
      </div>
    </>
  )
  return (
    <div
      className={
        isCompact
          ? 'flex gap-2 p-2 rounded-lg bg-white/5 border border-white/10'
          : 'flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10'
      }
    >
      {card}
    </div>
  )
}

export function FeaturedOrganisms({ stageId, variant = 'compact' }: FeaturedOrganismsProps) {
  const allOrganisms = getIconicOrganismsForStage(stageId)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewerOrganism, setViewerOrganism] = useState<IconicOrganism | null>(null)

  const filteredOrganisms = useMemo(() => {
    return allOrganisms.filter((org) => matchOrganism(org, searchQuery))
  }, [allOrganisms, searchQuery])

  useEffect(() => {
    setViewerOrganism(null)
  }, [stageId])

  useEffect(() => {
    allOrganisms.forEach((org) => {
      if (org.modelUrl) useGLTF.preload(org.modelUrl)
    })
  }, [stageId, allOrganisms])

  if (allOrganisms.length === 0) return null

  const showSearch = allOrganisms.length >= 2
  const isCompact = variant === 'compact'

  return (
    <div className="space-y-2">
      {viewerOrganism != null && (
        <Organism3DViewer
          organism={viewerOrganism}
          onClose={() => setViewerOrganism(null)}
        />
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-cyan-400 font-semibold text-sm">
          Sinh vật tiêu biểu
        </h4>
        {showSearch && (
          <input
            type="search"
            placeholder="Tìm sinh vật..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={
              isCompact
                ? 'flex-1 min-w-[120px] max-w-[180px] px-2 py-1 text-sm rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400'
                : 'flex-1 min-w-[160px] max-w-[240px] px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400'
            }
            aria-label="Tìm kiếm sinh vật theo tên hoặc mô tả"
          />
        )}
      </div>
      {showSearch && searchQuery.trim() && (
        <p className="text-xs text-gray-500">
          {filteredOrganisms.length} kết quả
        </p>
      )}
      <div className="space-y-2">
        {filteredOrganisms.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-2">
            Không có sinh vật nào trùng với &quot;{searchQuery}&quot;
          </p>
        ) : (
          filteredOrganisms.map((org, i) => (
            <OrganismCard
              key={`${org.name}-${i}`}
              org={org}
              variant={variant}
              onView3D={setViewerOrganism}
            />
          ))
        )}
      </div>
    </div>
  )
}
