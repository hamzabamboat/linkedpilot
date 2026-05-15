'use client'

import { useContext } from 'react'
import { AppearanceContext } from '@/components/appearance-provider'

export type Theme = 'light' | 'dark'
export type Palette = 'electric' | 'indigo' | 'plum' | 'rose' | 'ember' | 'forest' | 'steel' | 'midnight'
export type FontDisplay = 'cormorant' | 'instrument' | 'playfair' | 'fraunces'
export type FontSans = 'dm' | 'geist' | 'inter'

export interface AppearanceState {
  theme: Theme
  palette: Palette
  fontDisplay: FontDisplay
  fontSans: FontSans
}

export interface AppearanceContextValue extends AppearanceState {
  setTheme: (v: Theme) => void
  setPalette: (v: Palette) => void
  setFontDisplay: (v: FontDisplay) => void
  setFontSans: (v: FontSans) => void
  reset: () => void
}

export const PALETTE_SWATCHES: Record<Palette, string> = {
  electric: '#2b4dff',
  indigo:   '#6366f1',
  plum:     '#9333ea',
  rose:     '#e11d48',
  ember:    '#ea580c',
  forest:   '#15803d',
  steel:    '#475569',
  midnight: '#1e3a8a',
}

export const PALETTES: { k: Palette; label: string; sw: string }[] = [
  { k: 'electric', label: 'Electric', sw: '#2b4dff' },
  { k: 'indigo',   label: 'Indigo',   sw: '#6366f1' },
  { k: 'plum',     label: 'Plum',     sw: '#9333ea' },
  { k: 'rose',     label: 'Rose',     sw: '#e11d48' },
  { k: 'ember',    label: 'Ember',    sw: '#ea580c' },
  { k: 'forest',   label: 'Forest',   sw: '#15803d' },
  { k: 'steel',    label: 'Steel',    sw: '#475569' },
  { k: 'midnight', label: 'Midnight', sw: '#1e3a8a' },
]

export const FONTS_DISPLAY: { k: FontDisplay; label: string; css: string }[] = [
  { k: 'cormorant',  label: 'Cormorant',   css: '"Cormorant Garamond",serif' },
  { k: 'instrument', label: 'Instrument',  css: '"Instrument Serif",serif' },
  { k: 'playfair',   label: 'Playfair',    css: '"Playfair Display",serif' },
  { k: 'fraunces',   label: 'Fraunces',    css: '"Fraunces",serif' },
]

export const FONTS_SANS: { k: FontSans; label: string; css: string }[] = [
  { k: 'dm',    label: 'DM Sans', css: '"DM Sans",sans-serif' },
  { k: 'geist', label: 'Geist',   css: '"Geist",sans-serif' },
  { k: 'inter', label: 'Inter',   css: '"Inter",sans-serif' },
]

export const DEFAULTS: AppearanceState = {
  theme:       'light',
  palette:     'electric',
  fontDisplay: 'cormorant',
  fontSans:    'dm',
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider')
  return ctx
}
