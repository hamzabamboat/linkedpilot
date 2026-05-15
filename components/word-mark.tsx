import Image from 'next/image'
import { cn } from '@/lib/utils'

interface WordMarkProps {
  /** show the icon logo mark */
  icon?: boolean
  /** show "Persona" + italic serif "Link." wordmark */
  wordmark?: boolean
  iconSize?: number
  className?: string
}

export function WordMark({ icon = true, wordmark = true, iconSize = 34, className }: WordMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {icon && (
        <span
          className="inline-flex items-center justify-center overflow-hidden relative flex-shrink-0"
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: 'var(--r-sm)',
            background: '#ffffff',
            border: '1px solid var(--line)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.6), 0 1px 2px rgba(10,16,36,.06), 0 4px 12px -4px rgba(43,77,255,.18)',
          }}
        >
          <Image
            src="/logo-icon.png"
            alt="PersonaLink"
            width={iconSize}
            height={iconSize}
            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
          />
        </span>
      )}
      {wordmark && (
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontWeight: 500,
            fontSize: 17,
            letterSpacing: '-0.025em',
            color: 'var(--ink)',
          }}
        >
          Persona
          <em
            style={{
              fontFamily: 'var(--f-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--pl-accent)',
              marginLeft: 1,
              letterSpacing: '-0.005em',
            }}
          >
            Link.
          </em>
        </span>
      )}
    </span>
  )
}
