'use client'

import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppearance } from '@/hooks/use-appearance'
import { AppearancePicker } from '@/components/appearance-picker'
import { PALETTE_SWATCHES } from '@/hooks/use-appearance'

interface AppearanceTriggerProps {
  /** 'sidebar' = full-width sidebar row style; 'nav' = compact pill for landing nav */
  variant?: 'sidebar' | 'nav'
}

export function AppearanceTrigger({ variant = 'sidebar' }: AppearanceTriggerProps) {
  const { palette } = useAppearance()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          ref={ref}
          onClick={() => setOpen(v => !v)}
          className="pl-appearance-trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span
            className="pl-appearance-trigger__swatch"
            style={{ background: PALETTE_SWATCHES[palette] }}
          />
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', letterSpacing: '.04em' }}>
            Appearance
          </span>
          <ChevronDown size={14} className="pl-appearance-trigger__caret" />
        </button>
      ) : (
        <button
          ref={ref}
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line bg-surface text-ink-3 hover:text-ink hover:bg-surface-3 transition-colors text-sm"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: PALETTE_SWATCHES[palette], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)' }}
          />
          <span className="hidden sm:inline" style={{ fontFamily: 'var(--f-mono)', fontSize: '11.5px', letterSpacing: '.04em' }}>
            Appearance
          </span>
          <ChevronDown size={12} />
        </button>
      )}
      <AppearancePicker open={open} anchorRef={ref} onClose={() => setOpen(false)} />
    </>
  )
}
