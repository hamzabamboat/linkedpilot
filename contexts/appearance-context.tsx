'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

const KEYS = {
  theme:       'pl-theme-v2',
  palette:     'pl-palette-v2',
  fontDisplay: 'pl-font-display-v2',
  fontSans:    'pl-font-sans-v2',
}

const DEFAULTS = {
  theme:       'light',
  palette:     'electric',
  fontDisplay: 'cormorant',
  fontSans:    'dm',
}

interface AppearanceState {
  theme:       string
  palette:     string
  fontDisplay: string
  fontSans:    string
}

interface AppearanceContextValue extends AppearanceState {
  setTheme:       (v: string) => void
  setPalette:     (v: string) => void
  setFontDisplay: (v: string) => void
  setFontSans:    (v: string) => void
  reset:          () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function lsGet(k: string): string | null {
  try { return localStorage.getItem(k) } catch { return null }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v) } catch {}
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppearanceState>(DEFAULTS)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const loaded: AppearanceState = {
      theme:       lsGet(KEYS.theme)       || DEFAULTS.theme,
      palette:     lsGet(KEYS.palette)     || DEFAULTS.palette,
      fontDisplay: lsGet(KEYS.fontDisplay) || DEFAULTS.fontDisplay,
      fontSans:    lsGet(KEYS.fontSans)    || DEFAULTS.fontSans,
    }
    setState(loaded)
  }, [])

  // Apply data-* attrs to <html> whenever state changes
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme       = state.theme
    root.dataset.palette     = state.palette
    root.dataset.fontDisplay = state.fontDisplay
    root.dataset.fontSans    = state.fontSans
    // Keep next-themes .dark class in sync for shadcn components
    root.classList.toggle('dark', state.theme === 'dark')
  }, [state])

  const apply = (key: keyof AppearanceState, value: string) => {
    setState(prev => ({ ...prev, [key]: value }))
    lsSet(KEYS[key], value)
  }

  const value: AppearanceContextValue = {
    ...state,
    setTheme:       (v) => apply('theme', v),
    setPalette:     (v) => apply('palette', v),
    setFontDisplay: (v) => apply('fontDisplay', v),
    setFontSans:    (v) => apply('fontSans', v),
    reset:          () => {
      setState(DEFAULTS)
      Object.entries(KEYS).forEach(([k, storageKey]) => lsSet(storageKey, DEFAULTS[k as keyof AppearanceState]))
    },
  }

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider')
  return ctx
}
