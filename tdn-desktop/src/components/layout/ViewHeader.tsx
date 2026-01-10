import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * ViewHeader - Top header bar for all main content views.
 *
 * Displays the view title on the left, optional contextual information in the
 * middle (badges, status pills), and optional actions on the right (view toggles).
 *
 * This is a simplified version for Task 1 (Foundation). It will be extended
 * in Task 3 to include:
 * - Project status counts (via ProjectStatusBadges)
 * - Project status pill (via ProjectStatusPill)
 * - View mode toggle integration with view-mode-store
 *
 * Usage:
 * - Every view component renders this at the top of its content area
 * - Pass children for the center area (badges, status)
 * - Pass actions for the right area (view toggle)
 */
interface ViewHeaderProps {
  title: string
  /** Optional content for the center area (status badges, pills) */
  children?: ReactNode
  /** Optional actions for the right area (view toggles, buttons) */
  actions?: ReactNode
  className?: string
}

export function ViewHeader({
  title,
  children,
  actions,
  className,
}: ViewHeaderProps) {
  return (
    <header
      className={cn(
        '@container flex h-14 shrink-0 items-center gap-2 px-3 @sm:gap-3 @sm:px-4',
        className
      )}
    >
      <h1 className="shrink-0 truncate text-lg font-semibold @sm:text-xl">
        {title}
      </h1>
      {children && <div className="shrink-0">{children}</div>}
      {actions && <div className="ms-auto shrink-0">{actions}</div>}
    </header>
  )
}
