'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-2xl p-3 shadow-lg mb-6">
        <img src="/icons/icon-128x128.png" alt="PersonaLink" className="w-16 h-16" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        You&apos;re offline
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        No internet connection. Some features may be unavailable but you can still view your cached posts and profile.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[#0B458B] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#083672] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
