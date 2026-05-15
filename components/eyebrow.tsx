import { cn } from '@/lib/utils'

interface EyebrowProps {
  children: React.ReactNode
  dot?: boolean
  invert?: boolean
  className?: string
}

export function Eyebrow({ children, dot = false, invert = false, className }: EyebrowProps) {
  return (
    <span className={cn('pl-eyebrow', invert && 'pl-eyebrow--invert', className)}>
      {dot && <span className="pl-eyebrow__dot" />}
      {children}
    </span>
  )
}
