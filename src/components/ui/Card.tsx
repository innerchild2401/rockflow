'use client'

import { forwardRef } from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

const Card = forwardRef<HTMLDivElement, CardProps>(
  (p, ref) => {
    const { className = '', padding = 'md', children, ...props } = p
    return (
      <div
        ref={ref}
        className={`rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${paddingMap[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export function CardHeader({ title, description, children, className = '' }: { title: string; description?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`border-b border-zinc-200 dark:border-zinc-700 ${description || children ? 'pb-4' : 'pb-0'} ${className}`}>
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      {children}
    </div>
  )
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`pt-4 ${className}`}>{children}</div>
}

export { Card }
