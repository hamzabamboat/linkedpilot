'use client'

import { createContext, useCallback, useEffect, useState } from 'react'
import {
  DEFAULTS,
  type AppearanceContextValue,
  type AppearanceState,
  type FontDisplay,
  type FontSans,
  type Palette,
  type Theme,
} from '@/hooks/use-appearance'

export const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const KEYS = {
  theme:       'pl-theme-v2',
  palette:     'pl-palette-v2',
  fontDisplay: 'pl-font-display-v2',
  fontSans:    'pl-font-sans-v2',
}

function lsGet(k: string): string | null {
  try { return localStorage.getItem(k) } catch { return null }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v) } catch {}
}

function applyToHtml(state: AppearanceState) {
  const html = document.documentElement
  html.setAttribute('data-theme', state.theme)
  html.setAttribute('data-palette', state.palette)
  html.setAttribute('data-font-display', state.fontDisplay)
  html.setAttribute('data-font-sans', state.fontSans)
  // Keep .dark class in sync for shadcn component compatibility
  if (state.theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppearanceState>(DEFAULTS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved: AppearanceState = {
      theme:       (lsGet(KEYS.theme)       as Theme)       || DEFAULTS.theme,
      palette:     (lsGet(KEYS.palette)     as Palette)     || DEFAULTS.palette,
      fontDisplay: (lsGet(KEYS.fontDisplay) as FontDisplay) || DEFAULTS.fontDisplay,
      fontSans:    (lsGet(KEYS.fontSans)    as FontSans)    || DEFAULTS.fontSans,
    }
    setState(saved)
    applyToHtml(saved)
    setMounted(true)
  }, [])

  const apply = useCallback((patch: Partial<AppearanceState>) => {
    setState(prev => {
      const next = { ...prev, ...patch }
      applyToHtml(next)
      Object.entries(patch).forEach(([k, v]) => {
        lsSet(KEYS[k as keyof typeof KEYS], v as string)
      })
      return next
    })
  }, [])

  const setTheme       = useCallback((v: Theme)       => apply({ theme: v }),       [apply])
  const setPalette     = useCallback((v: Palette)     => apply({ palette: v }),     [apply])
  const setFontDisplay = useCallback((v: FontDisplay) => apply({ fontDisplay: v }), [apply])
  const setFontSans    = useCallback((v: FontSans)    => apply({ fontSans: v }),    [apply])
  const reset          = useCallback(() => apply(DEFAULTS),                          [apply])

  if (!mounted) return <>{children}</>

  return (
    <AppearanceContext.Provider value={{ ...state, setTheme, setPalette, setFontDisplay, setFontSans, reset }}>
      {children}
    </AppearanceContext.Provider>
  )
}
