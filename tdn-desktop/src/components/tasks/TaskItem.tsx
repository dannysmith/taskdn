import * as React from 'react'
import { Flag } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatRelativeDate, isOverdue } from '@/lib/date-utils'
import type { Task } from '@/lib/tauri-bindings'
import { TaskStatusCheckbox } from './task-status-checkbox'

/**
 * TaskItem - Pure presentational component for a task row in list views.
 *
 * Displays: status checkbox, title (inline-editable), open-detail button,
 * and right-aligned metadata (context name, scheduled date, due date).
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
  /**
   * Called when edit is confirmed with Enter.
   * Used to distinguish Enter (confirm) from Escape (cancel) in the parent.
   */
  onConfirmEdit?: () => void
  /** Called on right-click to show context menu */
  onContextMenu?: (e: React.MouseEvent) => void
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
  onConfirmEdit,
  onContextMenu,
  contextName,
  showScheduled = true,
  showDue = true,
  className,
}: TaskItemProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = React.useState(task.title)
  // Track when we're canceling an edit (Escape) so blur handler doesn't save
  const cancelingRef = React.useRef(false)
  // Track when edit was ended by keyboard (Enter/Escape) so blur doesn't double-trigger
  const endedByKeyboardRef = React.useRef(false)

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
      // Reset keyboard-end tracking for new edit session
      endedByKeyboardRef.current = false
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

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onContextMenu) return
    e.preventDefault()
    e.stopPropagation()
    // Note: We intentionally do NOT call onSelect() here.
    // The context menu uses contextMenuTarget (set by showTaskContextMenu)
    // which is independent of the selection state. Calling onSelect() here
    // causes React state updates to interleave with Tauri's menu building,
    // which can cause hangs on macOS. The right-clicked task is already
    // passed directly to showTaskContextMenu, so selection isn't needed.
    onContextMenu(e)
  }

  const handleInputBlur = () => {
    // Skip if already handled by keyboard (Enter/Escape)
    if (endedByKeyboardRef.current) {
      endedByKeyboardRef.current = false
      return
    }
    // Don't save if we're canceling (Escape was pressed)
    if (!cancelingRef.current && editValue.trim() !== task.title) {
      onTitleChange(editValue.trim())
    }
    // Blur without Escape = confirm (treat click-away as saving, not canceling)
    if (!cancelingRef.current) {
      onConfirmEdit?.()
    }
    cancelingRef.current = false
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
      // Notify parent that edit was confirmed (used for newly created tasks)
      onConfirmEdit?.()
      // Select this task when confirming edit - ensures newly created tasks
      // become selected after pressing Enter to confirm the title
      onSelect()
      // Mark as handled by keyboard so blur doesn't double-trigger
      endedByKeyboardRef.current = true
      onEndEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelingRef.current = true
      setEditValue(task.title) // Reset to original
      // Mark as handled by keyboard so blur doesn't double-trigger
      endedByKeyboardRef.current = true
      onEndEdit()
    }
  }

  const isDone = task.status === 'done'
  const isDropped = task.status === 'dropped'

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-2 py-2 rounded-lg cursor-default',
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
      onContextMenu={handleContextMenu}
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
          onChange={e => setEditValue(e.target.value)}
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

          {/* Spacer pushes metadata to the right */}
          <div className="flex-1 min-w-2" />

          {/* Right-aligned metadata */}
          <TaskMetadata
            contextName={contextName}
            scheduled={
              showScheduled ? (task.scheduled ?? undefined) : undefined
            }
            due={showDue ? (task.due ?? undefined) : undefined}
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
    <div
      className={cn('flex items-center gap-1.5 text-xs min-w-0', mutedClass)}
    >
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
            isOverdue(due) && !isDone ? 'text-date-overdue' : 'text-date-due/80'
          )}
        >
          <Flag className="size-3" />
          {formatRelativeDate(due)}
        </span>
      )}
    </div>
  )
}
