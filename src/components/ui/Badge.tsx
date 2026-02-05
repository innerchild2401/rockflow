'use client'

import { forwardRef } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  outline: 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'
export { Badge }
