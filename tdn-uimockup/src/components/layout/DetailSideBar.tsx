import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * DetailSideBar - Sliding right panel for task detail editing.
 *
 * Animates open/closed from the right side of the screen. When a user clicks
 * on a task anywhere in the app (list, kanban, calendar), this panel slides
 * open to show TaskDetailPanel with full editing capabilities.
 *
 * The panel width is responsive - capped at 90vw on mobile to prevent overflow.
 * Uses a CSS transition for smooth open/close animation.
 *
 * Usage:
 * - Rendered once at the app root level (in App.tsx)
 * - Controlled by task-detail-store (Zustand) - openTaskId determines visibility
 * - Contains TaskDetailPanel as its child
 */
interface DetailSideBarProps {
  isOpen: boolean
  children: ReactNode
  width?: number
}

export function DetailSideBar({
  isOpen,
  children,
  width = 400,
}: DetailSideBarProps) {
  // Use min() to prevent overflow on mobile - cap at 90vw
  const responsiveWidth = `min(${width}px, 90vw)`

  return (
    <aside
      className={cn(
        'bg-sidebar border-l flex-shrink-0 overflow-hidden',
        'transition-[width,opacity] duration-150 ease-out',
        isOpen ? 'opacity-100' : 'w-0 opacity-0'
      )}
      style={{ width: isOpen ? responsiveWidth : 0 }}
    >
      <div className="h-full" style={{ width: responsiveWidth }}>
        {children}
      </div>
    </aside>
  )
}
