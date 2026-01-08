import { ChevronRight, Plus, PlusCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * SectionHeader - Collapsible header for grouping tasks in list views.
 *
 * Used by SectionTaskGroup for sections like "Scheduled for Today", "Overdue",
 * "Became Available Today", and "Loose Tasks". Provides:
 * - Expand/collapse toggle (chevron rotates when expanded)
 * - Optional icon before title
 * - Task count badge on the right
 * - Optional "+ Task" and "+ Heading" action buttons
 *
 * Click anywhere on the header to expand/collapse. Action buttons stop
 * propagation so they don't trigger collapse.
 */
interface SectionHeaderProps {
  title: string
  /** Optional icon to display before the title */
  icon?: React.ReactNode
  taskCount?: number
  isExpanded: boolean
  onToggleExpand: () => void
  /** If provided, shows a "+ Task" button */
  onAddTask?: () => void
  /** If provided, shows a "+ Heading" button */
  onAddHeading?: () => void
  className?: string
}

/**
 * A collapsible section header for grouping tasks.
 * Used for static sections like "Scheduled for Today" or "Overdue".
 * Click to expand/collapse.
 */
export function SectionHeader({
  title,
  icon,
  taskCount,
  isExpanded,
  onToggleExpand,
  onAddTask,
  onAddHeading,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 py-2 px-1 cursor-pointer select-none',
        'border-b border-border/60',
        'hover:bg-muted/30 transition-colors',
        className
      )}
      onClick={onToggleExpand}
    >
      {/* Expand/collapse chevron */}
      <ChevronRight
        className={cn(
          'size-4 text-muted-foreground shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-90'
        )}
      />

      {/* Optional icon */}
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}

      {/* Section title - flex-1 so it takes available space and truncates */}
      <span className="font-semibold text-sm truncate flex-1 min-w-0">{title}</span>

      {/* Action buttons - stay fixed size */}
      {(onAddTask || onAddHeading) && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onAddHeading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAddHeading()
              }}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-muted transition-colors'
              )}
              title="Add heading"
            >
              <PlusCircle className="size-3" />
              <span className="sr-only">Heading</span>
            </button>
          )}
          {onAddTask && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAddTask()
              }}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-muted transition-colors'
              )}
              title="Add task"
            >
              <Plus className="size-3" />
              <span className="sr-only">Task</span>
            </button>
          )}
        </div>
      )}

      {/* Task count badge */}
      {taskCount !== undefined && taskCount > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {taskCount}
        </span>
      )}
    </div>
  )
}
