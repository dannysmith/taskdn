import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { format, isToday, isWeekend } from 'date-fns'
import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/data'
import { getCalendarTaskDragId } from '@/types/calendar-order'
import { SortableTaskCard } from './draggable-task-card'
import type { TaskCardVariant } from '@/components/cards/task-card'

/**
 * MonthDayCell - Single day cell in the month calendar grid.
 *
 * Compact cell designed to fit many in a row. Shows:
 * - Date number (highlighted if today)
 * - Compact TaskCards for scheduled tasks
 * - Hidden "+" button on hover to create new task
 *
 * Acts as a droppable zone for drag-and-drop scheduling.
 * Uses container queries for responsive sizing within the grid.
 */
interface MonthDayCellProps {
  date: Date
  tasks: Task[]
  /** Whether this day is in the currently displayed month */
  isCurrentMonth: boolean
  /** Function to get the visual variant for a task */
  getTaskVariant?: (task: Task) => TaskCardVariant
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskOpenDetail?: (taskId: string) => void
  /** Called when + button is clicked to create a task */
  onCreateTask?: () => void
  /** ID of task currently being edited (for auto-focus) */
  editingTaskId?: string | null
  /** Whether this cell is being dragged over */
  isDropTarget?: boolean
}

/**
 * A single day cell in the month calendar.
 * Acts as a droppable container for compact task cards.
 */
export function MonthDayCell({
  date,
  tasks,
  isCurrentMonth,
  getTaskVariant,
  onTaskStatusChange,
  onTaskOpenDetail,
  onCreateTask,
  editingTaskId,
  isDropTarget = false,
}: MonthDayCellProps) {
  const dateString = format(date, 'yyyy-MM-dd')
  const isCurrentDay = isToday(date)
  const isWeekendDay = isWeekend(date)

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateString}`,
    data: {
      type: 'day',
      date: dateString,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        '@container flex flex-col min-h-[100px] border-r border-border/30 last:border-r-0',
        !isCurrentMonth && 'bg-muted/30 opacity-50',
        isWeekendDay && isCurrentMonth && 'bg-muted/10',
        (isOver || isDropTarget) && 'bg-primary/5'
      )}
    >
      {/* Day header */}
      <div className="group/header px-1 py-0.5 @4xs:px-1.5 @4xs:py-1 flex justify-between items-center">
        {/* Add task button - shown on hover */}
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className="opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 -m-0.5 text-muted-foreground hover:text-foreground rounded"
          >
            <Plus className="size-3" />
          </button>
        )}
        {!onCreateTask && <div />}
        {/* Date number - consistent size container */}
        <span
          className={cn(
            'size-5 @4xs:size-6 flex items-center justify-center text-2xs @4xs:text-xs tabular-nums rounded-full',
            isCurrentDay
              ? 'bg-primary text-primary-foreground font-semibold'
              : isCurrentMonth
                ? 'text-foreground font-medium bg-transparent'
                : 'text-muted-foreground bg-transparent'
          )}
        >
          {format(date, 'd')}
        </span>
      </div>

      {/* Tasks container */}
      <div className="flex-1 px-1 pb-1 space-y-0.5 overflow-y-auto">
        <SortableContext
          items={tasks.map((t) => getCalendarTaskDragId(dateString, t.id))}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => {
            const variant = getTaskVariant?.(task)
            return (
              <SortableTaskCard
                key={task.id}
                task={task}
                date={dateString}
                variant={variant}
                size="compact"
                onStatusChange={(newStatus) =>
                  onTaskStatusChange(task.id, newStatus)
                }
                onEditClick={
                  onTaskOpenDetail ? () => onTaskOpenDetail(task.id) : undefined
                }
                autoFocusEdit={task.id === editingTaskId}
              />
            )
          })}
        </SortableContext>

        {/* Empty state / drop zone indicator */}
        {tasks.length === 0 && (
          <div
            className={cn(
              'h-full min-h-10 rounded border border-dashed border-transparent transition-colors',
              (isOver || isDropTarget) && 'border-primary/30'
            )}
          />
        )}
      </div>
    </div>
  )
}
