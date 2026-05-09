'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const dismissed = localStorage.getItem('pwaPromptDismissed')
    if (dismissed) return

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    if (ios) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShowPrompt(true), 5000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwaPromptDismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start gap-3">
          <div className="bg-white rounded-xl p-1.5 shadow-sm shrink-0">
            <img src="/icons/icon-72x72.png" alt="PersonaLink" className="w-10 h-10" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Add PersonaLink to home screen
            </h3>
            {isIOS ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                Tap <span className="font-medium">Share</span> then <span className="font-medium">Add to Home Screen</span> for the best experience
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                Install the app for faster access and a better mobile experience
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-[#0B458B] text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-[#083672] transition-colors"
                >
                  Install app
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 transition-colors"
              >
                {isIOS ? 'Got it' : 'Not now'}
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
