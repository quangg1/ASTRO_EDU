'use client'

export function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cyan-400 text-lg">Đang tải Earth History Simulator...</p>
      </div>
    </div>
  )
}
