import * as React from 'react'
import { Check, X, Snowflake, Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/data'

/**
 * TaskStatusCheckbox - Visual status indicator styled like Things 3.
 *
 * Used everywhere a task appears (lists, cards, detail panel). Shows the
 * task's status via color and icon:
 * - ready: Empty grey square (default state)
 * - done: Green filled with checkmark
 * - in-progress: Amber border with inner dot
 * - blocked: Red filled with X
 * - icebox: Light blue border with snowflake
 * - inbox: Blue border with inbox icon
 * - dropped: Light red filled with X
 *
 * Clicking toggles between done/ready (the most common action).
 * For other status changes, use TaskStatusPill dropdown.
 */
interface TaskStatusCheckboxProps {
  status: TaskStatus
  onToggle: () => void
  className?: string
}

/**
 * A checkbox-like component that displays task status visually.
 * Clicking toggles between "ready" and "done".
 *
 * Visual states (rounded square shape, like Things 3):
 * - ready: empty grey square
 * - done: filled green with checkmark
 * - in-progress: amber border with dot
 * - blocked: dark red with X
 * - icebox: light blue border with snowflake
 * - inbox: blue border with inbox icon
 * - dropped: light red with X
 */
export function TaskStatusCheckbox({
  status,
  onToggle,
  className,
}: TaskStatusCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onToggle()
    }
  }

  // Rounded square shape like Things 3
  const baseClasses = cn(
    'relative flex items-center justify-center size-4 rounded-[4px] shrink-0',
    'transition-all duration-150 cursor-pointer',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    className
  )

  const iconClasses = 'size-2.5'

  // Determine visual representation based on status
  switch (status) {
    case 'done':
      return (
        <button
          type="button"
          className={cn(baseClasses, 'bg-primary text-primary-foreground')}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as incomplete"
        >
          <Check className={iconClasses} strokeWidth={2.5} />
        </button>
      )

    case 'in-progress':
      return (
        <button
          type="button"
          className={cn(baseClasses, 'border-2 border-status-in-progress')}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as complete"
        >
          {/* Filled inner dot */}
          <div className="size-1.5 rounded-[2px] bg-status-in-progress" />
        </button>
      )

    case 'blocked':
      return (
        <button
          type="button"
          className={cn(baseClasses, 'bg-status-blocked text-white')}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as complete"
        >
          <X className={iconClasses} strokeWidth={2.5} />
        </button>
      )

    case 'icebox':
      return (
        <button
          type="button"
          className={cn(
            baseClasses,
            'border-2 border-status-icebox text-status-icebox'
          )}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as complete"
        >
          <Snowflake className="size-2" strokeWidth={2} />
        </button>
      )

    case 'inbox':
      return (
        <button
          type="button"
          className={cn(
            baseClasses,
            'border-2 border-status-inbox text-status-inbox'
          )}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as complete"
        >
          <Inbox className="size-2" strokeWidth={2} />
        </button>
      )

    case 'dropped':
      return (
        <button
          type="button"
          className={cn(baseClasses, 'bg-status-dropped text-white')}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as complete"
        >
          <X className={iconClasses} strokeWidth={2.5} />
        </button>
      )

    case 'ready':
    default:
      return (
        <button
          type="button"
          className={cn(
            baseClasses,
            'border-2 border-muted-foreground/40 hover:border-primary/60',
            'group'
          )}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Mark as complete"
        >
          {/* Show faint checkmark on hover */}
          <Check
            className={cn(
              iconClasses,
              'text-muted-foreground/0 group-hover:text-primary/40 transition-colors'
            )}
            strokeWidth={2.5}
          />
        </button>
      )
  }
}
