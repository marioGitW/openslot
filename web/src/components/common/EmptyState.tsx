import type { ReactNode } from 'react'

interface EmptyStateProps {
  children: ReactNode
  /** e.g. a button that clears filters */
  action?: ReactNode
}

export function EmptyState({ children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
      <p className="text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}
