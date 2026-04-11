import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-xl mx-auto mt-10 rounded-2xl border border-white/10 bg-[#0a0f17] p-6 text-center">
        <h1 className="text-xl font-bold text-white mb-2">You are offline</h1>
        <p className="text-sm text-gray-400 mb-5">
          Please check your connection and try again.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center px-4 rounded-xl bg-cyan-600 text-white text-sm hover:bg-cyan-500"
        >
          Back to Home
        </Link>
      </main>
    </div>
  )
}
