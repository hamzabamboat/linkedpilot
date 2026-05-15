'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sun, Moon, X } from 'lucide-react'
import { useAppearance } from '@/hooks/use-appearance'
import {
  PALETTES,
  FONTS_DISPLAY,
  FONTS_SANS,
  type Palette,
  type FontDisplay,
  type FontSans,
  type Theme,
} from '@/hooks/use-appearance'

interface AppearancePickerProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

export function AppearancePicker({ open, anchorRef, onClose }: AppearancePickerProps) {
  const { theme, palette, fontDisplay, fontSans, setTheme, setPalette, setFontDisplay, setFontSans, reset } = useAppearance()
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!open || !anchorRef.current || !panelRef.current) return
    const anchor = anchorRef.current.getBoundingClientRect()
    const panel  = panelRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 10

    let top  = anchor.bottom + gap
    let left = Math.min(anchor.right - panel.width, vw - panel.width - 12)
    left = Math.max(12, left)
    if (top + panel.height > vh - 12) top = Math.max(12, anchor.top - panel.height - gap)
    setStyle({ top, left })
  }, [open, anchorRef])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, anchorRef])

  if (typeof window === 'undefined') return null

  const panel = (
    <div
      ref={panelRef}
      className={`pl-appearance ${open ? 'is-open' : ''}`}
      style={{ position: 'fixed', ...style }}
      role="dialog"
      aria-label="Appearance settings"
    >
      {/* Header */}
      <div className="pl-appearance__head">
        <h4>Appearance <em>— make it yours.</em></h4>
        <button onClick={onClose} className="flex items-center justify-center w-6 h-6 rounded hover:bg-surface-3 text-ink-3 hover:text-ink transition-colors" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {/* Theme */}
      <div className="pl-appearance__sec">
        <div className="pl-appearance__lbl">
          <span>// Theme</span>
          <em>{theme === 'light' ? 'Light' : 'Dark'}</em>
        </div>
        <div className="pl-appearance__seg">
          {(['light', 'dark'] as Theme[]).map(t => (
            <button key={t} onClick={() => setTheme(t)} className={t === theme ? 'is-on' : ''}>
              {t === 'light'
                ? <><Sun size={13} />&nbsp;Light</>
                : <><Moon size={13} />&nbsp;Dark</>
              }
            </button>
          ))}
        </div>
      </div>

      {/* Palette */}
      <div className="pl-appearance__sec">
        <div className="pl-appearance__lbl">
          <span>// Accent</span>
          <em>{PALETTES.find(p => p.k === palette)?.label}</em>
        </div>
        <div className="pl-appearance__palette">
          {PALETTES.map(p => (
            <button key={p.k} onClick={() => setPalette(p.k as Palette)} title={p.label} className={p.k === palette ? 'is-on' : ''}>
              <span style={{ background: p.sw }} />
            </button>
          ))}
        </div>
      </div>

      {/* Display font */}
      <div className="pl-appearance__sec">
        <div className="pl-appearance__lbl">
          <span>// Display font</span>
          <em>{FONTS_DISPLAY.find(f => f.k === fontDisplay)?.label}</em>
        </div>
        <div className="pl-appearance__fonts">
          {FONTS_DISPLAY.map(f => (
            <button key={f.k} onClick={() => setFontDisplay(f.k as FontDisplay)} className={f.k === fontDisplay ? 'is-on' : ''}>
              <span className="font-sample" style={{ fontFamily: f.css }}>Voice</span>
              <span className="font-name">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body font */}
      <div className="pl-appearance__sec">
        <div className="pl-appearance__lbl">
          <span>// Body font</span>
          <em>{FONTS_SANS.find(f => f.k === fontSans)?.label}</em>
        </div>
        <div className="pl-appearance__fonts pl-appearance__fonts--sans">
          {FONTS_SANS.map(f => (
            <button key={f.k} onClick={() => setFontSans(f.k as FontSans)} className={f.k === fontSans ? 'is-on' : ''}>
              <span className="font-sample" style={{ fontFamily: f.css }}>Aa</span>
              <span className="font-name">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pl-appearance__foot">
        <span>// saved to this browser</span>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
