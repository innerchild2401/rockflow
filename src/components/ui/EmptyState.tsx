export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300
        bg-zinc-50/50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/30
        ${className}
      `}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
