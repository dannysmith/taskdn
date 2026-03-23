import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { format, isToday, isWeekend } from 'date-fns'
import { CalendarArrowUp, Flag, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { getCalendarTaskDragId } from '@/types/calendar-order'
import { SortableTaskCard } from './DraggableTaskCard'
import type { TaskCardVariant } from '@/components/cards/TaskCard'

/**
 * DayColumn - Single day column in the week calendar.
 *
 * Taller than MonthDayCell, designed to show more task detail. Shows:
 * - Day header (sticky) with day name and date number
 * - Full TaskCards for scheduled tasks with metadata
 * - "+" button to create new task
 * - Bottom section with tasks DUE on this day (not necessarily scheduled here)
 *
 * The "due on this day" section helps users see deadlines even when the
 * task is scheduled for an earlier day. Acts as a droppable zone for DnD.
 */
interface TaskContext {
  projectName?: string
  areaName?: string
  projectId?: string
  areaId?: string
}

interface DayColumnProps {
  date: Date
  tasks: Task[]
  /** Tasks that are due on this day (shown as links at bottom) */
  tasksDueOnDay?: Task[]
  /** Function to get context (project/area names and IDs) for a task */
  getTaskContext?: (task: Task) => TaskContext
  /** Function to get the visual variant for a task */
  getTaskVariant?: (task: Task) => TaskCardVariant
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskScheduledChange: (taskId: string, date: string | undefined) => void
  onTaskDueChange: (taskId: string, date: string | undefined) => void
  onTaskOpenDetail?: (taskId: string) => void
  onNavigateToProject?: (projectId: string) => void
  onNavigateToArea?: (areaId: string) => void
  /** Called when a task is right-clicked */
  onTaskContextMenu?: (task: Task) => void
  /** Called when + button is clicked to create a task */
  onCreateTask?: () => void
  /** Called when the "move incomplete to today" button is clicked (only shown for today) */
  onMoveIncompleteToToday?: () => void
  /** ID of task currently being edited (for auto-focus) */
  editingTaskId?: string | null
  /** Whether this column is being dragged over */
  isDropTarget?: boolean
}

/**
 * A single day column in the week calendar.
 * Acts as a droppable container for tasks.
 */
export function DayColumn({
  date,
  tasks,
  tasksDueOnDay = [],
  getTaskContext,
  getTaskVariant,
  onTaskStatusChange,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskOpenDetail,
  onNavigateToProject,
  onNavigateToArea,
  onTaskContextMenu,
  onCreateTask,
  onMoveIncompleteToToday,
  editingTaskId,
  isDropTarget = false,
}: DayColumnProps) {
  const { t } = useTranslation()
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
        '@container flex flex-col min-h-(--week-day-min-height) border-e border-border/50 last:border-e-0',
        isWeekendDay && 'bg-muted/20',
        (isOver || isDropTarget) && 'bg-primary/5'
      )}
    >
      {/* Day header */}
      <div
        className={cn(
          'sticky top-0 z-10 px-2 py-2 border-b border-border/50 bg-background',
          isWeekendDay && 'bg-muted/20'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {format(date, 'EEE')}
          </span>
          <div className="flex items-center gap-1">
            {isCurrentDay && onMoveIncompleteToToday && (
              <Tooltip>
                <TooltipTrigger
                  onClick={onMoveIncompleteToToday}
                  aria-label={t('commands.moveIncompleteToToday.label')}
                  className="size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <CalendarArrowUp className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  {t('commands.moveIncompleteToToday.label')}
                </TooltipContent>
              </Tooltip>
            )}
            <span
              className={cn(
                'size-6 flex items-center justify-center text-sm font-semibold tabular-nums rounded-full',
                isCurrentDay
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent'
              )}
            >
              {format(date, 'd')}
            </span>
          </div>
        </div>
      </div>

      {/* Tasks container */}
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto flex flex-col">
        <SortableContext
          items={tasks.map(t => getCalendarTaskDragId(dateString, t.id))}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => {
            const context = getTaskContext?.(task) ?? {}
            const variant = getTaskVariant?.(task)
            return (
              <SortableTaskCard
                key={task.id}
                task={task}
                date={dateString}
                variant={variant}
                projectName={context.projectName}
                areaName={context.areaName}
                onStatusChange={newStatus =>
                  onTaskStatusChange(task.id, newStatus)
                }
                onTitleChange={newTitle => onTaskTitleChange(task.id, newTitle)}
                onScheduledChange={date => onTaskScheduledChange(task.id, date)}
                onDueChange={date => onTaskDueChange(task.id, date)}
                onEditClick={
                  onTaskOpenDetail ? () => onTaskOpenDetail(task.id) : undefined
                }
                onProjectClick={
                  context.projectId && onNavigateToProject
                    ? () => {
                        const id = context.projectId
                        if (id) onNavigateToProject(id)
                      }
                    : undefined
                }
                onAreaClick={
                  context.areaId && onNavigateToArea
                    ? () => {
                        const id = context.areaId
                        if (id) onNavigateToArea(id)
                      }
                    : undefined
                }
                onContextMenu={
                  onTaskContextMenu ? () => onTaskContextMenu(task) : undefined
                }
                autoFocusEdit={task.id === editingTaskId}
              />
            )
          })}
        </SortableContext>

        {/* Drop zone - always present to catch drops, visible styling when empty or hovering */}
        <div
          className={cn(
            'flex-1 min-h-[60px] rounded-lg border-2 border-dashed transition-colors border-transparent',
            (isOver || isDropTarget) && 'border-primary/30 bg-primary/5'
          )}
        />

        {/* Add task button */}
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className="mt-auto flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {/* Due tasks section - pinned to bottom */}
      {tasksDueOnDay.length > 0 && (
        <div className="mt-auto p-1.5 pt-2 border-t border-border/30 space-y-0.5">
          {tasksDueOnDay.map(task => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskOpenDetail?.(task.id)}
              className="flex items-center gap-1 w-full text-start text-xs text-date-due hover:text-date-overdue transition-colors"
            >
              <Flag className="size-3 shrink-0" />
              <span className="truncate">{task.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
