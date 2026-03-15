'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSimulatorStore } from '@/store/useSimulatorStore'
import { getPhylumColor, getPhylumInfo } from '@/lib/fossilPhyla'
import { searchFossils } from '@/lib/api'
import type { Fossil } from '@/types'

export function FossilPanel() {
  const [showList, setShowList] = useState(false)
  const {
    fossils,
    fossilStats,
    phylumMetadata,
    currentStage,
    showFossils,
    showPlaceLabels,
    showFossilPanel,
    fossilsLoading,
    toggleFossils,
    togglePlaceLabels,
    toggleFossilPanel,
    setFlyToTarget,
    setEarthRotationPaused,
    earthRotationPaused,
  } = useSimulatorStore()

  const handlePhylumClick = (phylum: string) => {
    const ofPhylum = fossils.filter((f) => (f.phylum || 'Unknown') === phylum)
    if (ofPhylum.length === 0) return
    let sumLat = 0,
      sumLng = 0,
      n = 0
    ofPhylum.forEach((f) => {
      const lat = f.paleolat ?? f.lat
      const lng = f.paleolng ?? f.lng
      if (lat != null && lng != null) {
        sumLat += lat
        sumLng += lng
        n++
      }
    })
    if (n > 0) {
      setFlyToTarget({
        lat: sumLat / n,
        lng: sumLng / n,
        mode: 'phylum',
        phylumFossils: ofPhylum,
      })
      setEarthRotationPaused(true)
    }
  }

  /* Khi panel đóng: chỉ hiện nút nhỏ để mở lại, không che nội dung phía sau */
  if (!showFossilPanel) {
    return (
      <button
        type="button"
        onClick={toggleFossilPanel}
        className="fixed right-4 bottom-24 glass rounded-lg px-4 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-2 shadow-lg"
        title="Mở panel Hóa thạch"
      >
        🦴 Hóa thạch
      </button>
    )
  }

  return (
    <>
      {/* Panel neo từ trên xuống để nút đóng luôn trong màn hình; header cố định, nội dung cuộn */}
      <div className="fixed right-4 top-16 w-80 min-w-[18rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] animate-fade-in flex flex-col gap-2 z-20">
        {/* Nút tiếp tục quay Trái Đất khi đang tạm dừng */}
        {earthRotationPaused && (
          <button
            type="button"
            onClick={() => {
              setEarthRotationPaused(false)
              setFlyToTarget(null)
            }}
            className="glass rounded-lg px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-2 shrink-0"
          >
            🔄 Tiếp tục quay Trái Đất
          </button>
        )}

        <div className="glass rounded-xl shadow-xl flex flex-col min-h-0 overflow-hidden flex-1">
          {/* Header luôn ở trên cùng: tiêu đề + nút Đóng rõ ràng */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-black/30 shrink-0">
            <span className="text-sm font-medium text-cyan-300 truncate">🦴 Hóa thạch</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleFossilPanel()
              }}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-white hover:text-cyan-300 hover:bg-cyan-500/30 border border-white/20 rounded-lg transition-colors touch-manipulation"
              title="Đóng panel hóa thạch"
              aria-label="Đóng panel hóa thạch"
            >
              ×
            </button>
          </div>
          <div className="p-4 overflow-y-auto min-h-0 flex-1" style={{ scrollbarGutter: 'stable' }}>
          {/* Toggle */}
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={showFossils}
              onChange={() => toggleFossils()}
              className="w-4 h-4 accent-cyan-400"
            />
            <span className="text-sm font-medium">🦴 Hiển thị hóa thạch</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={showPlaceLabels}
              onChange={() => togglePlaceLabels()}
              className="w-4 h-4 accent-cyan-400"
            />
            <span className="text-sm font-medium">📍 Hiển thị địa danh</span>
          </label>

          {/* Stats */}
          <div className="text-sm mb-4">
            {fossilsLoading ? (
              <span className="text-gray-400">Đang tải...</span>
            ) : fossilStats && fossilStats.total > 0 ? (
              <span>
                <span className="text-cyan-400 font-semibold">{fossilStats.total}</span>
                <span className="text-gray-400"> hóa thạch · </span>
                <span className="text-amber-300 font-medium">{Object.keys(fossilStats.byPhylum).length}</span>
                <span className="text-gray-400"> ngành</span>
              </span>
            ) : (
              <span className="text-gray-400">Không có hóa thạch trong thời kỳ này</span>
            )}
          </div>

          {/* Chú thích từng chủng loại – nhấn để bay tới vị trí và dừng quay Trái Đất */}
          <p className="text-xs text-gray-500 mb-2">Nhấn vào một ngành để bay tới vùng hóa thạch và dừng quay Trái Đất:</p>
          <div className="space-y-2 pr-1">
            {fossilStats && fossilStats.total > 0
              ? Object.entries(fossilStats.byPhylum)
                  .sort(([, a], [, b]) => b - a)
                  .map(([phylum, count]) => {
                    const color = getPhylumColor(phylum, phylumMetadata)
                    const info = getPhylumInfo(phylum, phylumMetadata)
                    return (
                      <button
                        key={phylum}
                        type="button"
                        onClick={() => handlePhylumClick(phylum)}
                        className="w-full text-left rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 hover:bg-white/10 hover:border-cyan-400/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="shrink-0 w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white">
                              {info.nameVi}
                            </div>
                            <div className="text-xs text-gray-400">
                              {phylum} · {count} mẫu
                            </div>
                          </div>
                          <span className="text-xs text-cyan-400 shrink-0">Đi tới →</span>
                        </div>
                        <p className="mt-1.5 ml-6 text-xs text-gray-500 leading-snug">
                          {info.description}
                        </p>
                      </button>
                    )
                  })
              : null}
          </div>

          {/* View list button */}
          {fossilStats && fossilStats.total > 0 && (
            <button
              onClick={() => setShowList(true)}
              className="w-full mt-4 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
            >
              📋 Xem danh sách chi tiết
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Fossil list modal – search chỉ trong kỷ đang xem; Đi tới = fly đến vị trí hóa thạch trên globe */}
      {showList && (
        <FossilListModal
          fossils={fossils}
          phylumMetadata={phylumMetadata}
          timeRange={getTimeRangeForStage(currentStage)}
          onClose={() => setShowList(false)}
          onFlyToFossil={(f) => {
            const lat = f.paleolat ?? f.lat
            const lng = f.paleolng ?? f.lng
            if (lat != null && lng != null) {
              setFlyToTarget({ lat, lng, mode: 'single' })
              setEarthRotationPaused(true)
              setShowList(false)
            }
          }}
        />
      )}
    </>
  )
}

interface FossilListModalProps {
  fossils: typeof useSimulatorStore.prototype.fossils
  phylumMetadata: Record<string, import('@/lib/api').PhylumInfoFromApi> | null
  /** Chỉ tìm trong kỷ này; nếu không truyền thì tìm toàn DB (legacy). */
  timeRange?: { maxMa: number; minMa: number }
  onClose: () => void
  /** Nhấn "Đi tới" trên một hóa thạch: fly đến vị trí đó trên globe và đóng modal. */
  onFlyToFossil?: (fossil: Fossil) => void
}

const SEARCH_DEBOUNCE_MS = 500

/** Khoảng thời gian (Ma) để tìm hóa thạch cho stage. Ưu tiên maxMa/minMa từ earthHistoryData (khớp ICS/PBDB). */
function getTimeRangeForStage(stage: { time: number; maxMa?: number; minMa?: number }): { maxMa: number; minMa: number } | undefined {
  if (stage.maxMa != null && stage.minMa != null) return { maxMa: stage.maxMa, minMa: stage.minMa }
  const QUATERNARY_BUFFER_MA = 2.6
  const t = stage.time
  if (t > 600) return undefined
  if (t < 1) {
    return { maxMa: t + QUATERNARY_BUFFER_MA, minMa: Math.max(0, t - QUATERNARY_BUFFER_MA) }
  }
  const buffer = Math.min(t * 0.1, 30)
  return { maxMa: t + buffer, minMa: Math.max(0, t - buffer) }
}

function FossilListModal({ fossils, phylumMetadata, timeRange, onClose, onFlyToFossil }: FossilListModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Fossil[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Tìm trong mẫu hiện tại (nhanh, chỉ trong thời kỳ đang xem)
  const filteredFossils = useMemo(() => {
    if (!searchQuery.trim()) return fossils
    const q = searchQuery.trim().toLowerCase()
    return fossils.filter((f) => {
      const phylum = f.phylum || 'Unknown'
      const info = getPhylumInfo(phylum, phylumMetadata)
      return (
        (f.name && f.name.toLowerCase().includes(q)) ||
        (info.nameVi && info.nameVi.toLowerCase().includes(q)) ||
        (phylum && phylum.toLowerCase().includes(q)) ||
        (f.environment && f.environment.toLowerCase().includes(q)) ||
        (f.paleoRegionName && f.paleoRegionName.toLowerCase().includes(q))
      )
    })
  }, [fossils, searchQuery, phylumMetadata])

  // Khi gõ 2+ ký tự: gọi API tìm trong kỷ đang xem (timeRange) hoặc toàn DB nếu không có timeRange
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults(null)
      return
    }
    const t = setTimeout(() => {
      setSearchLoading(true)
      searchFossils(q, timeRange)
        .then((data) => {
          setSearchResults(data)
        })
        .finally(() => {
          setSearchLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery, timeRange])

  const isServerSearch = searchQuery.trim().length >= 2
  const listToShow: Fossil[] = isServerSearch && searchResults !== null ? searchResults : filteredFossils
  const grouped = useMemo(() => {
    return listToShow.reduce((acc, f) => {
      const phylum = f.phylum || 'Unknown'
      if (!acc[phylum]) acc[phylum] = []
      acc[phylum].push(f)
      return acc
    }, {} as Record<string, Fossil[]>)
  }, [listToShow])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-cyan-400/30">
          <h3 className="text-lg font-bold text-cyan-400">
            🦴 Hóa thạch thời kỳ này
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Search – chỉ trong danh sách chi tiết; từ 2 ký tự trở lên tìm toàn DB */}
        <div className="px-4 pt-3 pb-2 border-b border-white/10">
          <input
            type="search"
            placeholder="Tìm theo tên trong kỷ này..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
            aria-label="Tìm kiếm hóa thạch"
          />
          {searchLoading && (
            <p className="text-xs text-cyan-400 mt-1.5">Đang tìm...</p>
          )}
          {!searchLoading && searchQuery.trim() && (
            <p className="text-xs text-gray-500 mt-1.5">
              {isServerSearch
                ? `Trong kỷ này: ${listToShow.length} kết quả`
                : `${listToShow.length} kết quả (trong mẫu)`}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchLoading ? (
            <div className="text-center py-8 text-gray-400">Đang tải kết quả...</div>
          ) : listToShow.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🦴</div>
              <p className="text-gray-400">
                {searchQuery.trim() ? `Không có kết quả cho "${searchQuery}"` : 'Không có hóa thạch trong thời kỳ này'}
              </p>
              {!searchQuery.trim() && (
                <p className="text-sm text-gray-500 mt-2">
                  Hóa thạch chỉ xuất hiện từ kỷ Cambrian (~540 Ma)
                </p>
              )}
            </div>
          ) : (
            Object.entries(grouped).sort().map(([phylum, items]) => {
              const color = getPhylumColor(phylum, phylumMetadata)
              const info = getPhylumInfo(phylum, phylumMetadata)
              return (
                <div key={phylum} className="mb-4">
                  <h4 className="font-bold mb-1 text-white">
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: color }} />
                    {info.nameVi}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">{info.description}</p>
                  <p className="text-xs text-gray-400 mb-2">{phylum} · {items.length} mẫu</p>
                  <div className="space-y-1">
                    {items.slice(0, isServerSearch ? 50 : 15).map((fossil, i) => {
                      const hasCoords = (fossil.paleolat ?? fossil.lat) != null && (fossil.paleolng ?? fossil.lng) != null
                      return (
                        <div
                          key={i}
                          className="bg-white/5 rounded px-3 py-2 hover:bg-white/10 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{fossil.name}</div>
                            <div className="text-xs text-gray-400">
                              {fossil.maxMa?.toFixed(1)} Ma | {fossil.environment || 'Unknown'}
                              {fossil.paleoRegionName && fossil.paleoRegionName !== 'Không xác định' && (
                                <> · <span className="text-cyan-300/90">{fossil.paleoRegionName}</span></>
                              )}
                            </div>
                          </div>
                          {hasCoords && onFlyToFossil && (
                            <button
                              type="button"
                              onClick={() => onFlyToFossil(fossil)}
                              className="shrink-0 text-xs text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
                            >
                              Đi tới →
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {items.length > (isServerSearch ? 50 : 15) && (
                      <div className="text-xs text-gray-500 px-3">
                        ... và {items.length - (isServerSearch ? 50 : 15)} loài khác
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
