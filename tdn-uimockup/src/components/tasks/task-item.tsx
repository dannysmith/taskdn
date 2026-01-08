import * as React from 'react'
import { Flag, CircleChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatRelativeDate, isOverdue } from '@/lib/date-utils'
import type { Task } from '@/types/data'
import { TaskStatusCheckbox } from './task-status-checkbox'

/**
 * TaskItem - Pure presentational component for a task row in list views.
 *
 * Displays: status checkbox, title (inline-editable), open-detail button,
 * and right-aligned metadata (context name, scheduled date, due date).
 *
 * This is the base visual component - no drag-and-drop awareness.
 * Wrap with SortableTaskItem or TaskListItem for DnD support.
 *
 * States:
 * - Selected: Blue background, immediate visibility of open-detail button
 * - Editing: Thin primary border, title becomes input field
 * - Done/Dropped: Strikethrough title, muted colors
 */
export interface TaskItemProps {
  task: Task
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onStartEdit: () => void
  onEndEdit: () => void
  onTitleChange: (newTitle: string) => void
  onStatusToggle: () => void
  /** Called when the open-detail chevron is clicked */
  onOpenDetail?: () => void
  /** Optional context label (project or area name) shown on the right */
  contextName?: string
  /** Whether to show the scheduled date (default: true if exists) */
  showScheduled?: boolean
  /** Whether to show the due date (default: true if exists) */
  showDue?: boolean
  className?: string
}

/**
 * Presentational component for a task list item.
 * Has no drag-and-drop awareness - wrap with SortableTaskItem for DnD support.
 */
export function TaskItem({
  task,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onEndEdit,
  onTitleChange,
  onStatusToggle,
  onOpenDetail,
  contextName,
  showScheduled = true,
  showDue = true,
  className,
}: TaskItemProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = React.useState(task.title)

  // Sync editValue with task.title when task changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    // Don't select if clicking on the checkbox or input
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('input')) return
    onSelect()
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Don't trigger edit if clicking on the checkbox
    if ((e.target as HTMLElement).closest('button')) return
    onStartEdit()
  }

  const handleInputBlur = () => {
    if (editValue.trim() !== task.title) {
      onTitleChange(editValue.trim())
    }
    onEndEdit()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation for ALL keys to prevent parent handlers from interfering
    e.stopPropagation()

    if (e.key === 'Enter') {
      e.preventDefault()
      if (editValue.trim() !== task.title) {
        onTitleChange(editValue.trim())
      }
      onEndEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(task.title) // Reset to original
      onEndEdit()
    }
  }

  const isDone = task.status === 'done'
  const isDropped = task.status === 'dropped'

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-2 py-2 rounded-lg cursor-default transition-all',
        'select-none',
        // Editing: thin primary border, no background
        isEditing && 'ring-2 ring-primary bg-transparent',
        // Selected but not editing: blue background
        isSelected && !isEditing && 'bg-primary/20 dark:bg-primary/30',
        // Not selected: subtle hover
        !isSelected && !isEditing && 'hover:bg-muted/50',
        className
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-selected={isSelected}
      data-editing={isEditing}
      data-task-id={task.id}
    >
      {/* Status checkbox */}
      <TaskStatusCheckbox status={task.status} onToggle={onStatusToggle} />

      {/* Title - editable or display */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          placeholder="Task title..."
        />
      ) : (
        <>
          {/* Title */}
          <span
            className={cn(
              'text-sm truncate min-w-0',
              (isDone || isDropped) && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </span>

          {/* Open detail button - immediately after title */}
          {onOpenDetail && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetail()
              }}
              className={cn(
                'shrink-0 p-1.5 -m-1 rounded-full text-primary/70',
                'hover:text-primary hover:bg-primary/10',
                'transition-opacity duration-100',
                // Show on hover (with delay) or when selected
                isSelected
                  ? 'opacity-100 delay-150'
                  : 'opacity-0 group-hover:opacity-100 group-hover:delay-150'
              )}
              title="Open details"
            >
              <CircleChevronRight className="size-4" />
            </button>
          )}

          {/* Spacer pushes metadata to the right */}
          <div className="flex-1 min-w-2" />

          {/* Right-aligned metadata */}
          <TaskMetadata
            contextName={contextName}
            scheduled={showScheduled ? task.scheduled : undefined}
            due={showDue ? task.due : undefined}
            isDone={isDone || isDropped}
          />
        </>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Task Metadata (right-aligned info)
// -----------------------------------------------------------------------------

interface TaskMetadataProps {
  contextName?: string
  scheduled?: string
  due?: string
  isDone: boolean
}

function TaskMetadata({
  contextName,
  scheduled,
  due,
  isDone,
}: TaskMetadataProps) {
  // Don't render anything if no metadata
  if (!contextName && !scheduled && !due) return null

  // Mute everything if task is done
  const mutedClass = isDone ? 'opacity-50' : ''

  return (
    <div className={cn('flex items-center gap-1.5 text-xs min-w-0', mutedClass)}>
      {/* Context (project/area name) - flexible width, truncates */}
      {contextName && (
        <span className="text-muted-foreground truncate min-w-0 max-w-24">
          {contextName}
        </span>
      )}

      {/* Scheduled date - shrinks to fit */}
      {scheduled && (
        <span className="text-muted-foreground whitespace-nowrap shrink-0">
          {formatRelativeDate(scheduled)}
        </span>
      )}

      {/* Due date with flag - shrinks to fit */}
      {due && (
        <span
          className={cn(
            'flex items-center gap-0.5 whitespace-nowrap shrink-0',
            isOverdue(due) && !isDone
              ? 'text-date-overdue'
              : 'text-date-due/80'
          )}
        >
          <Flag className="size-3" />
          {formatRelativeDate(due)}
        </span>
      )}
    </div>
  )
}
