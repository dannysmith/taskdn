import * as React from 'react'
import { Flag, Calendar, X, CircleChevronRight, Hourglass } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatRelativeDate, isOverdue } from '@/lib/date-utils'
import type { Task, TaskStatus } from '@/types/data'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { TaskStatusPill } from '@/components/tasks/task-status-pill'
import { TaskStatusCheckbox } from '@/components/tasks/task-status-checkbox'

/**
 * TaskCard - Visual card representation of a task.
 *
 * Used in multiple contexts throughout the app:
 * - Kanban boards (KanbanColumn) - default size with full metadata
 * - Month calendar (MonthDayCell) - compact size, just checkbox + title
 * - Week calendar (DayColumn) - default size
 *
 * Two size variants:
 * - "default" - Full card with status pill, dates, context, and edit button
 * - "compact" - Minimal card with just checkbox + title (for tight spaces)
 *
 * Four visual variants based on task state:
 * - "default" - Normal card background
 * - "overdue" - Red-tinted for past-due tasks
 * - "deferred" - Muted/dashed border for deferred tasks
 * - "done" - Green-tinted for completed tasks
 *
 * Supports inline title editing via double-click or Enter key when selected.
 * Uses container queries for responsive behavior at different card widths.
 */
export type TaskCardVariant = 'default' | 'overdue' | 'deferred' | 'done'
export type TaskCardSize = 'default' | 'compact'

export interface TaskCardProps {
  task: Task
  /** Visual variant for the card */
  variant?: TaskCardVariant
  /** Size variant - compact shows only checkbox + title */
  size?: TaskCardSize
  /** Project name (if task belongs to a project) */
  projectName?: string
  /** Area name (direct or inherited from project) */
  areaName?: string
  /** Click handler for the card (e.g., select) */
  onClick?: () => void
  /** Click handler for edit icon (opens detail panel) */
  onEditClick?: () => void
  /** Click handler for project name */
  onProjectClick?: () => void
  /** Click handler for area name */
  onAreaClick?: () => void
  /** Called when status is changed */
  onStatusChange?: (newStatus: TaskStatus) => void
  /** Called when title is edited */
  onTitleChange?: (newTitle: string) => void
  /** Called when scheduled date is changed */
  onScheduledChange?: (date: string | undefined) => void
  /** Called when due date is changed */
  onDueChange?: (date: string | undefined) => void
  /** Whether the card is selected */
  isSelected?: boolean
  /** Start in editing mode (for newly created tasks) */
  autoFocusEdit?: boolean
  className?: string
}

export function TaskCard({
  task,
  variant = 'default',
  size = 'default',
  projectName,
  areaName,
  onClick,
  onEditClick,
  onProjectClick,
  onAreaClick,
  onStatusChange,
  onTitleChange,
  onScheduledChange,
  onDueChange,
  isSelected,
  autoFocusEdit = false,
  className,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = React.useState(autoFocusEdit)
  const [editValue, setEditValue] = React.useState(task.title)
  const [scheduledOpen, setScheduledOpen] = React.useState(false)
  const [dueOpen, setDueOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const isDone = task.status === 'done'
  const isDropped = task.status === 'dropped'
  const isCompleted = isDone || isDropped

  // Sync edit value when task changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
      // Auto-size the textarea
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isEditing])

  const handleContextClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (projectName && onProjectClick) {
      onProjectClick()
    } else if (areaName && onAreaClick) {
      onAreaClick()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onTitleChange && !isEditing) {
      setIsEditing(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isSelected && !isEditing && onTitleChange) {
      e.preventDefault()
      setIsEditing(true)
    }
  }

  const handleInputBlur = () => {
    if (editValue.trim() && editValue.trim() !== task.title) {
      onTitleChange?.(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    e.stopPropagation()
    // Enter without shift submits, Shift+Enter creates newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editValue.trim() && editValue.trim() !== task.title) {
        onTitleChange?.(editValue.trim())
      }
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(task.title)
      setIsEditing(false)
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handleScheduledSelect = (date: Date | undefined) => {
    onScheduledChange?.(date ? date.toISOString().split('T')[0] : undefined)
    setScheduledOpen(false)
  }

  const handleDueSelect = (date: Date | undefined) => {
    onDueChange?.(date ? date.toISOString().split('T')[0] : undefined)
    setDueOpen(false)
  }

  const contextName = projectName || areaName
  const hasContextClick =
    (projectName && onProjectClick) || (areaName && onAreaClick)

  // Parse dates for calendar
  const scheduledDate = task.scheduled ? new Date(task.scheduled) : undefined
  const dueDate = task.due ? new Date(task.due) : undefined

  // Toggle status between done and ready
  const handleStatusToggle = () => {
    if (task.status === 'done') {
      onStatusChange?.('ready')
    } else {
      onStatusChange?.('done')
    }
  }

  // Compact variant - just checkbox + title, click opens detail
  if (size === 'compact') {
    return (
      <div
        onClick={onEditClick}
        className={cn(
          'group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all cursor-pointer',
          'hover:shadow-sm hover:shadow-black/5',
          // Variant styles (same as default)
          variant === 'default' &&
            'bg-card border-border/50 hover:border-border',
          variant === 'overdue' &&
            'bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800',
          variant === 'deferred' &&
            'bg-muted/50 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50',
          variant === 'done' &&
            'bg-green-50/50 dark:bg-green-950/20 border-green-200/30 dark:border-green-900/30 hover:border-green-300/50 dark:hover:border-green-800/50',
          className
        )}
      >
        <TaskStatusCheckbox
          status={task.status}
          onToggle={handleStatusToggle}
        />
        <span
          className={cn(
            'flex-1 text-xs font-medium truncate',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </span>
      </div>
    )
  }

  // Default size - full card with container query responsive behavior
  return (
    <div
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={cn(
        '@container group rounded-xl border p-2.5 @6xs:p-3.5 transition-all outline-none',
        'hover:shadow-md hover:shadow-black/5',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Variant styles
        variant === 'default' && 'bg-card border-border/50 hover:border-border',
        variant === 'overdue' &&
          'bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800',
        variant === 'deferred' &&
          'bg-muted/50 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50',
        variant === 'done' &&
          'bg-green-50/50 dark:bg-green-950/20 border-green-200/30 dark:border-green-900/30 hover:border-green-300/50 dark:hover:border-green-800/50',
        onClick && 'cursor-pointer',
        isSelected && 'ring-2 ring-primary border-primary',
        isEditing && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Title row */}
      <div className="flex items-start gap-1.5 @6xs:gap-2">
        {/* Deferred indicator */}
        {variant === 'deferred' && !isEditing && (
          <Hourglass className="size-3 @6xs:size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={handleTextareaInput}
            onBlur={handleInputBlur}
            onKeyDown={handleTextareaKeyDown}
            className="flex-1 text-xs @6xs:text-sm font-medium bg-transparent outline-none resize-none overflow-hidden leading-snug"
            placeholder="Task title..."
            rows={1}
          />
        ) : (
          <>
            <span
              className={cn(
                'flex-1 text-xs @6xs:text-sm font-medium leading-snug',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>
            {onEditClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditClick()
                }}
                className={cn(
                  'shrink-0 p-1 @6xs:p-1.5 -m-1 rounded-full text-primary/70',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:text-primary hover:bg-primary/10',
                  isSelected && 'opacity-100'
                )}
                title="Open details"
              >
                <CircleChevronRight className="size-3.5 @6xs:size-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer: status pill + dates + context - stacks vertically on narrow, horizontal on wider */}
      <div
        className={cn(
          'mt-2 @6xs:mt-3 flex flex-col @5xs:flex-row @5xs:flex-wrap @5xs:items-center gap-1.5 @5xs:gap-x-3 @5xs:gap-y-1.5 text-2xs @6xs:text-xs',
          isCompleted && 'opacity-60'
        )}
      >
        {/* Status pill dropdown */}
        <TaskStatusPill status={task.status} onStatusChange={onStatusChange} />

        {/* Dates - stack with other metadata when narrow */}
        <DatePickerButton
          date={scheduledDate}
          icon={<Calendar className="size-2.5 @6xs:size-3" />}
          open={scheduledOpen}
          onOpenChange={setScheduledOpen}
          onSelect={handleScheduledSelect}
          canEdit={!!onScheduledChange}
          label="Scheduled"
        />

        <DatePickerButton
          date={dueDate}
          icon={<Flag className="size-2.5 @6xs:size-3" />}
          open={dueOpen}
          onOpenChange={setDueOpen}
          onSelect={handleDueSelect}
          canEdit={!!onDueChange}
          label="Due"
          isOverdue={dueDate ? isOverdue(task.due!) && !isCompleted : false}
        />

        {/* Context (project or area) */}
        {contextName && (
          <button
            type="button"
            onClick={handleContextClick}
            className={cn(
              'truncate max-w-full text-muted-foreground text-start',
              hasContextClick && 'hover:text-foreground hover:underline'
            )}
          >
            {contextName}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * DatePickerButton - Inline date picker for task cards.
 *
 * Shows a date icon + formatted date that opens a calendar popover on click.
 * When no date is set but canEdit is true, shows a muted icon to add a date.
 * Includes a "Clear date" button inside the popover to remove the date.
 */
interface DatePickerButtonProps {
  date: Date | undefined
  icon: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (date: Date | undefined) => void
  canEdit: boolean
  label: string
  isOverdue?: boolean
}

function DatePickerButton({
  date,
  icon,
  open,
  onOpenChange,
  onSelect,
  canEdit,
  label,
  isOverdue = false,
}: DatePickerButtonProps) {
  if (!date && !canEdit) return null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(undefined)
  }

  if (!date) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          onClick={handleClick}
          className="flex items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {icon}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarPicker
            mode="single"
            selected={date}
            onSelect={onSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1 transition-colors',
          canEdit && 'hover:text-foreground',
          isOverdue
            ? 'text-date-overdue'
            : label === 'Due'
              ? 'text-date-due/70'
              : 'text-muted-foreground'
        )}
      >
        {icon}
        {formatRelativeDate(date.toISOString())}
      </PopoverTrigger>
      {canEdit && (
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col">
            <CalendarPicker
              mode="single"
              selected={date}
              onSelect={onSelect}
              initialFocus
            />
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={handleClear}
              >
                <X className="size-3 me-2" />
                Clear {label.toLowerCase()} date
              </Button>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
