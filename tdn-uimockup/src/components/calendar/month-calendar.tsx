import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
  isSameMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/data'
import {
  parseCalendarTaskDragId,
  type CalendarTaskDragData,
  type DayDropData,
} from '@/types/calendar-order'
import { useCalendarOrder } from '@/hooks/use-calendar-order'
import { Button } from '@/components/ui/button'
import type { TaskCardVariant } from '@/components/cards/task-card'
import { MonthDayCell } from './month-day-cell'
import { TaskCardDragPreview } from './draggable-task-card'

/**
 * MonthCalendar - Full month grid view with drag-and-drop scheduling.
 *
 * Used in CalendarView. Shows a traditional month calendar where:
 * - Each day cell displays tasks scheduled for that day (compact TaskCards)
 * - Tasks can be dragged between days to reschedule
 * - Tasks can be reordered within a day
 * - Click + on a day to create a new task scheduled for that date
 *
 * Shows overflow days from adjacent months (grayed out). Weekend days have
 * subtle shading. Today is highlighted with a primary-colored date badge.
 *
 * Order persistence uses useCalendarOrder hook to maintain display order
 * separate from task entity data.
 */

interface DragState {
  taskId: string
  task: Task
  sourceDate: string
  currentOverDate: string | null
}

// -----------------------------------------------------------------------------
// MonthCalendar Component
// -----------------------------------------------------------------------------

interface MonthCalendarProps {
  tasks: Task[]
  /** Get task by ID */
  getTaskById: (taskId: string) => Task | undefined
  /** Called when a task's scheduled date is changed via drag-drop */
  onTaskScheduleChange: (taskId: string, newDate: string | undefined) => void
  /** Called when a task's status is changed */
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  /** Called when a task should be opened in detail view */
  onTaskOpenDetail?: (taskId: string) => void
  /** Called when + button is clicked to create a task. Returns the new task ID. */
  onCreateTask?: (scheduledDate: string) => string | void
  className?: string
}

/**
 * A month calendar view with drag-and-drop task scheduling.
 * Shows compact task cards that can be dragged between days.
 */
export function MonthCalendar({
  tasks,
  getTaskById,
  onTaskScheduleChange,
  onTaskStatusChange,
  onTaskOpenDetail,
  onCreateTask,
  className,
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date())
  const [dragState, setDragState] = React.useState<DragState | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)

  // Handle creating a task for a day
  const handleCreateTask = React.useCallback(
    (dateKey: string) => {
      if (!onCreateTask) return
      const newTaskId = onCreateTask(dateKey)
      if (newTaskId) {
        setEditingTaskId(newTaskId)
      }
    },
    [onCreateTask]
  )

  // Handle status change and clear editing state
  const handleStatusChange = React.useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      onTaskStatusChange(taskId, newStatus)
      if (taskId === editingTaskId) {
        setEditingTaskId(null)
      }
    },
    [onTaskStatusChange, editingTaskId]
  )

  // Generate all days to display (includes overflow from prev/next months)
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Date strings for all displayed days
  const dateStrings = React.useMemo(
    () => calendarDays.map((d) => format(d, 'yyyy-MM-dd')),
    [calendarDays]
  )

  // Group tasks by their display date (scheduled or deferUntil)
  const tasksByDate = React.useMemo(() => {
    const map = new Map<string, Task[]>()

    // Initialize all days
    for (const dateStr of dateStrings) {
      map.set(dateStr, [])
    }

    for (const task of tasks) {
      // Skip dropped tasks, but keep done tasks
      if (task.status === 'dropped') continue

      // Determine which date to show this task on
      let displayDate: Date | null = null

      if (task.scheduled) {
        displayDate = new Date(task.scheduled)
      } else if (task.deferUntil) {
        displayDate = new Date(task.deferUntil)
      }

      if (!displayDate) continue

      const dateKey = format(displayDate, 'yyyy-MM-dd')
      if (map.has(dateKey)) {
        const existing = map.get(dateKey) ?? []
        map.set(dateKey, [...existing, task])
      }
    }

    return map
  }, [tasks, dateStrings])

  // Determine task card variant based on task state
  const getTaskVariant = React.useCallback((task: Task): TaskCardVariant => {
    if (task.status === 'done') {
      return 'done'
    }

    if (task.deferUntil && !task.scheduled) {
      return 'deferred'
    }

    if (task.scheduled && task.due) {
      const dueDate = startOfDay(new Date(task.due))
      const today = startOfDay(new Date())
      if (isBefore(dueDate, today) || isToday(dueDate)) {
        return 'overdue'
      }
    }

    return 'default'
  }, [])

  // Get tasks for a specific date (callback for order hook)
  const getTasksForDate = React.useCallback(
    (date: string): Task[] => tasksByDate.get(date) ?? [],
    [tasksByDate]
  )

  // Calendar order management
  const { getOrderedTasks, reorderTasksInDay, moveTaskToDay, getInsertIndex } =
    useCalendarOrder({
      tasks,
      dates: dateStrings,
      getTasksForDate,
    })

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Drop animation
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as CalendarTaskDragData | undefined
    if (data?.type === 'calendar-task') {
      const task = getTaskById(data.taskId)
      if (task) {
        setDragState({
          taskId: data.taskId,
          task,
          sourceDate: data.sourceDate,
          currentOverDate: null,
        })
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!dragState) return

    const { over } = event
    if (!over) {
      setDragState((prev) => (prev ? { ...prev, currentOverDate: null } : null))
      return
    }

    const overData = over.data.current as
      | DayDropData
      | CalendarTaskDragData
      | undefined
    if (!overData) return

    let overDate: string | null = null
    if (overData.type === 'day') {
      overDate = overData.date
    } else if (overData.type === 'calendar-task') {
      overDate = overData.sourceDate
    }

    if (overDate !== dragState.currentOverDate) {
      setDragState((prev) =>
        prev ? { ...prev, currentOverDate: overDate } : null
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!dragState) return

    const { active, over } = event
    if (!over) {
      setDragState(null)
      return
    }

    const overData = over.data.current as
      | DayDropData
      | CalendarTaskDragData
      | undefined
    if (!overData) {
      setDragState(null)
      return
    }

    const activeId = active.id as string
    const parsedActive = parseCalendarTaskDragId(activeId)
    if (!parsedActive) {
      setDragState(null)
      return
    }

    const { taskId: activeTaskId } = parsedActive
    const sourceDate = dragState.sourceDate

    if (overData.type === 'day') {
      const targetDate = overData.date

      if (targetDate !== sourceDate) {
        moveTaskToDay(activeTaskId, sourceDate, targetDate)
        onTaskScheduleChange(activeTaskId, targetDate)
      }
    } else if (overData.type === 'calendar-task') {
      const targetDate = overData.sourceDate
      const overTaskId = overData.taskId

      if (targetDate === sourceDate) {
        if (activeTaskId !== overTaskId) {
          reorderTasksInDay(sourceDate, activeTaskId, overTaskId)
        }
      } else {
        const insertIndex = getInsertIndex(targetDate, overTaskId)
        moveTaskToDay(activeTaskId, sourceDate, targetDate, insertIndex)
        onTaskScheduleChange(activeTaskId, targetDate)
      }
    }

    setDragState(null)
  }

  const handleDragCancel = () => {
    setDragState(null)
  }

  // Month/year display
  const monthYear = format(currentMonth, 'MMMM yyyy')

  // Group days into weeks for grid
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold">{monthYear}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 border border-border rounded-lg overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase text-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 overflow-y-auto">
            {weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="grid grid-cols-7 border-b border-border/30 last:border-b-0"
              >
                {week.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const rawTasks = tasksByDate.get(dateKey) ?? []
                  const orderedTasks = getOrderedTasks(dateKey, rawTasks)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isDropTarget = dragState?.currentOverDate === dateKey

                  return (
                    <MonthDayCell
                      key={dateKey}
                      date={day}
                      tasks={orderedTasks}
                      isCurrentMonth={isCurrentMonth}
                      getTaskVariant={getTaskVariant}
                      onTaskStatusChange={handleStatusChange}
                      onTaskOpenDetail={onTaskOpenDetail}
                      onCreateTask={
                        onCreateTask
                          ? () => handleCreateTask(dateKey)
                          : undefined
                      }
                      editingTaskId={editingTaskId}
                      isDropTarget={isDropTarget}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {dragState && (
            <TaskCardDragPreview task={dragState.task} size="compact" />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
