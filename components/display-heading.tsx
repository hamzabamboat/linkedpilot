import { cn } from '@/lib/utils'

interface DisplayHeadingProps {
  /** The sans-weight portion of the headline */
  text: string
  /** The serif-italic accent portion (appended after text) */
  accent?: string
  as?: 'h1' | 'h2' | 'h3' | 'div'
  /** 'display' = large hero size, 'h' = section heading size */
  size?: 'display' | 'h'
  className?: string
}

export function DisplayHeading({
  text,
  accent,
  as: Tag = 'h2',
  size = 'h',
  className,
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(
        size === 'display' ? 'display' : 'h-display',
        className
      )}
      style={{ fontFamily: 'var(--f-sans)', fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1.02, color: 'var(--ink)', textWrap: 'balance' } as React.CSSProperties}
    >
      {text}
      {accent && (
        <>
          {' '}
          <span className="serif" style={{ fontFamily: 'var(--f-display)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            <em style={{ fontStyle: 'italic', color: 'var(--serif-ink)' }}>{accent}</em>
          </span>
        </>
      )}
    </Tag>
  )
}
