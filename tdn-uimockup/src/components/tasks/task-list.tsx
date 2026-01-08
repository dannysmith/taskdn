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
  type DropAnimation,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

import { cn } from '@/lib/utils'
import type { Task } from '@/types/data'
import { SortableTaskItem } from './sortable-task-item'
import { TaskStatusCheckbox } from './task-status-checkbox'
import { useTaskDragPreview } from './task-dnd-context'

/**
 * Task List Components
 *
 * Two variants for displaying lists of tasks with drag-and-drop:
 *
 * 1. TaskList - For use inside a parent TaskDndContext (e.g., AreaView)
 *    Expects external DndContext, handles only same-container reordering.
 *    Used when multiple lists need cross-container drag support.
 *
 * 2. DraggableTaskList - Standalone with its own DndContext (e.g., ProjectView)
 *    Self-contained drag-and-drop. Use when there's only one list.
 *
 * Both provide:
 * - Keyboard navigation (arrows, Enter to edit, Space to toggle status)
 * - Cmd/Ctrl+N to create new task after selection
 * - Cmd/Ctrl+Arrow to reorder selected task
 * - Visual selection and inline title editing
 */

// -----------------------------------------------------------------------------
// Shared Props
// -----------------------------------------------------------------------------

interface BaseTaskListProps {
  tasks: Task[]
  projectId: string
  onTasksReorder: (reorderedTasks: Task[]) => void
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskStatusToggle: (taskId: string) => void
  /** Called when a task's open-detail button is clicked */
  onTaskOpenDetail?: (taskId: string) => void
  /** Called when Cmd/Ctrl+N is pressed. Returns the new task ID to edit. */
  onCreateTask?: (afterTaskId: string | null) => string | void
  className?: string
  /** Function to get context name (project/area) for a task */
  getContextName?: (task: Task) => string | undefined
  /** Whether to show scheduled dates (default: true) */
  showScheduled?: boolean
  /** Whether to show due dates (default: true) */
  showDue?: boolean
}

// -----------------------------------------------------------------------------
// TaskList - Base component for use with external DndContext
// -----------------------------------------------------------------------------

interface TaskListProps extends BaseTaskListProps {
  /** External selection state (for parent-controlled selection) */
  selectedIndex?: number | null
  onSelectedIndexChange?: (index: number | null) => void
  /** External editing state (for parent-controlled editing) */
  editingTaskId?: string | null
  onEditingTaskIdChange?: (taskId: string | null) => void
}

/**
 * A keyboard-navigable task list for use with an external DndContext.
 * Renders items within a SortableContext but expects parent to provide DndContext.
 *
 * Keyboard shortcuts:
 * - Arrow Up/Down: Move selection
 * - Enter: Start editing selected task title
 * - Escape: Cancel editing, or deselect
 * - Cmd/Ctrl + Arrow Up/Down: Reorder selected task
 * - Space: Toggle task status (done/ready)
 */
export function TaskList({
  tasks,
  projectId,
  onTasksReorder,
  onTaskTitleChange,
  onTaskStatusToggle,
  onTaskOpenDetail,
  onCreateTask,
  className,
  getContextName,
  showScheduled = true,
  showDue = true,
  selectedIndex: externalSelectedIndex,
  onSelectedIndexChange,
  editingTaskId: externalEditingTaskId,
  onEditingTaskIdChange,
}: TaskListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Internal state (used when not controlled externally)
  const [internalSelectedIndex, setInternalSelectedIndex] = React.useState<
    number | null
  >(null)
  const [internalEditingTaskId, setInternalEditingTaskId] = React.useState<
    string | null
  >(null)

  // Use external state if provided, otherwise internal
  const selectedIndex =
    externalSelectedIndex !== undefined
      ? externalSelectedIndex
      : internalSelectedIndex
  const setSelectedIndex = onSelectedIndexChange ?? setInternalSelectedIndex
  const editingTaskId =
    externalEditingTaskId !== undefined
      ? externalEditingTaskId
      : internalEditingTaskId
  const setEditingTaskId = onEditingTaskIdChange ?? setInternalEditingTaskId

  // Get drag context for dropped task selection and cross-container gap animation
  const {
    lastDroppedTaskId,
    clearLastDroppedTaskId,
    crossContainerHover,
    clearCrossContainerHover,
  } = useTaskDragPreview()

  // Check if the dropped task has appeared in this list
  const droppedTaskInList =
    lastDroppedTaskId !== null && tasks.some((t) => t.id === lastDroppedTaskId)

  // Select the dropped task after a drag ends, or clear selection if task went to another list
  React.useEffect(() => {
    if (lastDroppedTaskId) {
      const droppedIndex = tasks.findIndex((t) => t.id === lastDroppedTaskId)
      if (droppedIndex !== -1) {
        // This list contains the dropped task - select it
        setSelectedIndex(droppedIndex)
      } else {
        // This list doesn't contain the dropped task - clear selection
        setSelectedIndex(null)
      }
    }
  }, [lastDroppedTaskId, tasks, setSelectedIndex])

  // Clean up cross-container hover state once the dropped task appears
  React.useEffect(() => {
    if (
      droppedTaskInList &&
      crossContainerHover?.targetContainerId === projectId
    ) {
      clearLastDroppedTaskId()
      clearCrossContainerHover()
    }
  }, [
    droppedTaskInList,
    crossContainerHover?.targetContainerId,
    projectId,
    clearLastDroppedTaskId,
    clearCrossContainerHover,
  ])

  // Keep selection valid when tasks change
  React.useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= tasks.length) {
      setSelectedIndex(tasks.length > 0 ? tasks.length - 1 : null)
    }
  }, [tasks.length, selectedIndex, setSelectedIndex])

  // Focus container when selection changes (for keyboard events)
  React.useEffect(() => {
    if (selectedIndex !== null && !editingTaskId && containerRef.current) {
      containerRef.current.focus()
    }
  }, [selectedIndex, editingTaskId])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle keyboard events while editing
    if (editingTaskId) return

    const isMeta = e.metaKey || e.ctrlKey

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (isMeta && selectedIndex !== null) {
          // Reorder: move task down
          if (selectedIndex < tasks.length - 1) {
            const newTasks = arrayMove(tasks, selectedIndex, selectedIndex + 1)
            onTasksReorder(newTasks)
            setSelectedIndex(selectedIndex + 1)
          }
        } else {
          // Navigate down
          if (selectedIndex === null) {
            setSelectedIndex(0)
          } else if (selectedIndex < tasks.length - 1) {
            setSelectedIndex(selectedIndex + 1)
          }
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isMeta && selectedIndex !== null) {
          // Reorder: move task up
          if (selectedIndex > 0) {
            const newTasks = arrayMove(tasks, selectedIndex, selectedIndex - 1)
            onTasksReorder(newTasks)
            setSelectedIndex(selectedIndex - 1)
          }
        } else {
          // Navigate up
          if (selectedIndex === null) {
            setSelectedIndex(tasks.length - 1)
          } else if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1)
          }
        }
        break

      case 'Enter':
        e.preventDefault()
        if (selectedIndex !== null && tasks[selectedIndex]) {
          setEditingTaskId(tasks[selectedIndex].id)
        }
        break

      case 'Escape':
        e.preventDefault()
        if (selectedIndex !== null) {
          setSelectedIndex(null)
        }
        break

      case ' ':
        e.preventDefault()
        if (selectedIndex !== null && tasks[selectedIndex]) {
          onTaskStatusToggle(tasks[selectedIndex].id)
        }
        break

      case 'n':
      case 'N':
        if (isMeta && onCreateTask) {
          e.preventDefault()
          const afterTaskId =
            selectedIndex !== null && tasks[selectedIndex]
              ? tasks[selectedIndex].id
              : null
          const newTaskId = onCreateTask(afterTaskId)
          // If a new task ID was returned, start editing it
          if (newTaskId) {
            // Find the index of the new task (it should be right after the selected one)
            // We need to wait for the tasks to update, so we'll set editing state
            // The new task will be in editing mode once it appears
            setEditingTaskId(newTaskId)
            // Select the new task (it will be after the current one)
            if (selectedIndex !== null) {
              setSelectedIndex(selectedIndex + 1)
            } else {
              setSelectedIndex(tasks.length) // Will be at the end
            }
          }
        }
        break
    }
  }

  // Selection handlers
  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setEditingTaskId(null)
  }

  const handleStartEdit = (taskId: string) => {
    setEditingTaskId(taskId)
  }

  const handleEndEdit = () => {
    setEditingTaskId(null)
    // Re-focus container for keyboard navigation
    containerRef.current?.focus()
  }

  // Generate drag IDs with project prefix for uniqueness across containers
  const dragIds = React.useMemo(
    () => tasks.map((t) => `task-${projectId}-${t.id}`),
    [tasks, projectId]
  )

  // Check if we should show a trailing gap (cross-container drag, append at end)
  // Don't show gap once the dropped task has appeared in this container
  const showTrailingGap =
    crossContainerHover?.targetContainerId === projectId &&
    crossContainerHover?.insertBeforeId === null &&
    !droppedTaskInList

  if (tasks.length === 0) {
    return (
      <div
        className={cn(
          'py-4 text-center text-muted-foreground text-sm',
          className
        )}
      >
        No tasks
      </div>
    )
  }

  // Clear selection when clicking outside
  const handleBlur = (e: React.FocusEvent) => {
    // Only clear if focus moved outside the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setSelectedIndex(null)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('outline-none', className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <SortableContext items={dragIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map((task, index) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              dragId={dragIds[index]}
              containerId={projectId}
              droppedTaskInList={droppedTaskInList}
              isSelected={selectedIndex === index}
              isEditing={editingTaskId === task.id}
              onSelect={() => handleSelect(index)}
              onStartEdit={() => handleStartEdit(task.id)}
              onEndEdit={handleEndEdit}
              onTitleChange={(newTitle) =>
                onTaskTitleChange(task.id, newTitle)
              }
              onStatusToggle={() => onTaskStatusToggle(task.id)}
              onOpenDetail={
                onTaskOpenDetail ? () => onTaskOpenDetail(task.id) : undefined
              }
              contextName={getContextName?.(task)}
              showScheduled={showScheduled}
              showDue={showDue}
            />
          ))}
          {/* Trailing gap for cross-container drag (append at end) */}
          <div
            className={cn(
              'transition-[height] duration-150 ease-out',
              showTrailingGap ? 'h-10' : 'h-0'
            )}
          />
        </div>
      </SortableContext>
    </div>
  )
}

// -----------------------------------------------------------------------------
// DraggableTaskList - Standalone component with its own DndContext
// -----------------------------------------------------------------------------

type DraggableTaskListProps = BaseTaskListProps

/**
 * A standalone task list with its own DndContext for drag-and-drop.
 * Use this when the task list is the only drag-drop container (e.g., ProjectView).
 */
export function DraggableTaskList({
  tasks,
  projectId,
  onTasksReorder,
  onTaskTitleChange,
  onTaskStatusToggle,
  onTaskOpenDetail,
  onCreateTask,
  className,
  getContextName,
  showScheduled = true,
  showDue = true,
}: DraggableTaskListProps) {
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)

  // Sensors for drag and drop - only PointerSensor
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

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { taskId: string } | undefined
    if (data?.taskId) {
      setActiveTaskId(data.taskId)
      // Update selection to match dragged item
      const index = tasks.findIndex((t) => t.id === data.taskId)
      if (index !== -1) {
        setSelectedIndex(index)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null)

    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeData = active.data.current as { taskId: string } | undefined
    const overData = over.data.current as { taskId: string } | undefined

    if (!activeData || !overData) return

    const oldIndex = tasks.findIndex((t) => t.id === activeData.taskId)
    const newIndex = tasks.findIndex((t) => t.id === overData.taskId)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newTasks = arrayMove(tasks, oldIndex, newIndex)
      onTasksReorder(newTasks)
      setSelectedIndex(newIndex)
    }
  }

  // Find active task for drag overlay
  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null

  if (tasks.length === 0) {
    return (
      <div
        className={cn(
          'py-8 text-center text-muted-foreground text-sm',
          className
        )}
      >
        No tasks yet
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TaskList
        tasks={tasks}
        projectId={projectId}
        onTasksReorder={onTasksReorder}
        onTaskTitleChange={onTaskTitleChange}
        onTaskStatusToggle={onTaskStatusToggle}
        onTaskOpenDetail={onTaskOpenDetail}
        onCreateTask={onCreateTask}
        className={className}
        getContextName={getContextName}
        showScheduled={showScheduled}
        showDue={showDue}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
        editingTaskId={editingTaskId}
        onEditingTaskIdChange={setEditingTaskId}
      />

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask && <TaskDragPreview task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}

// -----------------------------------------------------------------------------
// Drag Preview
// -----------------------------------------------------------------------------

export function TaskDragPreview({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-card shadow-xl border border-border/50">
      <TaskStatusCheckbox status={task.status} onToggle={() => {}} />
      <span
        className={cn(
          'flex-1 text-sm truncate',
          (task.status === 'done' || task.status === 'dropped') &&
            'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </span>
    </div>
  )
}
