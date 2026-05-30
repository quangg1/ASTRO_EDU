'use client'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[40vh] w-full grid place-items-center p-6">
      <div className="max-w-xl w-full rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-100">
        <p className="font-semibold">Đã xảy ra lỗi giao diện.</p>
        <p className="mt-2 text-red-200/90">{error?.message || 'Lỗi không xác định'}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-1.5 text-xs hover:bg-red-500/30"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}

