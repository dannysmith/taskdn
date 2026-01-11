import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/lib/tauri-bindings'
import {
  taskStatusConfig,
  taskPrimaryStatuses,
  taskSecondaryStatuses,
} from '@/config/status'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

/**
 * TaskStatusPill - Colored status badge with optional dropdown to change status.
 *
 * Used in TaskCard footer and TaskDetailPanel metadata. Shows the current status
 * as a colored pill. When onStatusChange is provided, clicking opens a dropdown
 * to select a new status.
 *
 * Statuses are split into primary (inbox, ready, in-progress, blocked, done)
 * and secondary (icebox, dropped) with a separator in the dropdown.
 *
 * Uses responsive text sizing via container queries (2xs → xs).
 */
export interface TaskStatusPillProps {
  status: TaskStatus
  onStatusChange?: (newStatus: TaskStatus) => void
  className?: string
  /** Controlled open state (optional - uses internal state if not provided) */
  open?: boolean
  /** Callback when open state changes (required if open is controlled) */
  onOpenChange?: (open: boolean) => void
}

export function TaskStatusPill({
  status,
  onStatusChange,
  className,
  open: controlledOpen,
  onOpenChange,
}: TaskStatusPillProps) {
  const config = taskStatusConfig[status]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!onStatusChange) {
    return (
      <span
        className={cn(
          'px-1.5 @6xs:px-2 py-0.5 rounded-full text-2xs @6xs:text-xs font-medium shrink-0',
          config.color,
          className
        )}
      >
        {config.label}
      </span>
    )
  }

  return (
    <DropdownMenu open={controlledOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        onClick={handleClick}
        className={cn(
          'px-1.5 @6xs:px-2 py-0.5 rounded-full text-2xs @6xs:text-xs font-medium shrink-0 inline-flex items-center gap-0.5 @6xs:gap-1 transition-opacity hover:opacity-80',
          config.color,
          className
        )}
      >
        {config.label}
        <ChevronDown className="size-2.5 @6xs:size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={value => onStatusChange(value as TaskStatus)}
        >
          {taskPrimaryStatuses.map(s => (
            <DropdownMenuRadioItem
              key={s}
              value={s}
              onClick={e => e.stopPropagation()}
              className="cursor-pointer"
            >
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-medium',
                  taskStatusConfig[s].color
                )}
              >
                {taskStatusConfig[s].label}
              </span>
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          {taskSecondaryStatuses.map(s => (
            <DropdownMenuRadioItem
              key={s}
              value={s}
              onClick={e => e.stopPropagation()}
              className="cursor-pointer"
            >
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-medium',
                  taskStatusConfig[s].color
                )}
              >
                {taskStatusConfig[s].label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
