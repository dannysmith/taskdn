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
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import type { Task } from '@/lib/tauri-bindings'
import { useTaskCreationStore } from '@/store/task-creation-store'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useCommandContext } from '@/hooks/use-command-context'
import { showTaskContextMenu } from '@/lib/context-menu'
import { TaskItem, type TaskItemProps } from './task-item'
import { TaskStatusCheckbox } from './task-status-checkbox'
import { useTaskDragPreview } from './task-dnd-context'

/**
 * Task List Components
 *
 * Two variants for displaying lists of tasks with drag-and-drop:
 *
 * 1. TaskList - For use inside a parent TaskDndContext (e.g., AreaView, TodayView)
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
  onCreateTask?: (
    afterTaskId: string | null
  ) => string | undefined | Promise<string | undefined>
  /**
   * Called when a newly created task is canceled (Escape pressed before confirming).
   * If provided, newly created tasks will be deleted when Escape is pressed.
   */
  onDeleteTask?: (taskId: string) => void | Promise<void>
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
  /**
   * Task ID to auto-select and focus for editing.
   * Used when a new task is created via view default handler.
   */
  autoEditItemId?: string | null
  /** Called when auto-edit is consumed (to clear the pending ID) */
  onAutoEditConsumed?: () => void
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
  // onTaskOpenDetail - no longer used here; selection syncs to detail store automatically
  onCreateTask,
  onDeleteTask,
  className,
  getContextName,
  showScheduled = true,
  showDue = true,
  selectedIndex: externalSelectedIndex,
  onSelectedIndexChange,
  editingTaskId: externalEditingTaskId,
  onEditingTaskIdChange,
  autoEditItemId,
  onAutoEditConsumed,
}: TaskListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const commandContext = useCommandContext()

  // Internal state (used when not controlled externally)
  const [internalSelectedIndex, setInternalSelectedIndex] = React.useState<
    number | null
  >(null)
  const [internalEditingTaskId, setInternalEditingTaskId] = React.useState<
    string | null
  >(null)

  // Track newly created tasks that haven't been confirmed yet
  const [newlyCreatedTaskId, setNewlyCreatedTaskId] = React.useState<
    string | null
  >(null)
  const [previousSelectedIndex, setPreviousSelectedIndex] = React.useState<
    number | null
  >(null)
  // Track if edit was confirmed (Enter) vs canceled (Escape)
  const editConfirmedRef = React.useRef(false)

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
    lastDroppedTaskId !== null && tasks.some(t => t.id === lastDroppedTaskId)

  // Select the dropped task after a drag ends, or clear selection if task went to another list
  React.useEffect(() => {
    if (lastDroppedTaskId) {
      const droppedIndex = tasks.findIndex(t => t.id === lastDroppedTaskId)
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

  // Sync selection to task detail store (so right sidebar shows selected task)
  // Use startTransition to defer this update - the detail panel can be expensive
  // to render, and we don't want it to block the selection visual feedback
  const setOpenTaskId = useTaskDetailStore(state => state.setOpenTaskId)
  React.useEffect(() => {
    if (
      selectedIndex !== null &&
      selectedIndex >= 0 &&
      selectedIndex < tasks.length
    ) {
      const selectedTask = tasks[selectedIndex]
      if (selectedTask) {
        React.startTransition(() => {
          setOpenTaskId(selectedTask.id)
        })
      }
    }
  }, [selectedIndex, tasks, setOpenTaskId])

  // Focus container when selection changes (for keyboard events)
  // Use preventScroll to avoid browser's default scroll-to-focused-element behavior
  React.useEffect(() => {
    if (selectedIndex !== null && !editingTaskId && containerRef.current) {
      containerRef.current.focus({ preventScroll: true })
    }
  }, [selectedIndex, editingTaskId])

  // Scroll selected item into view (for keyboard navigation)
  // block: 'nearest' ensures minimal scrolling - no scroll if already visible
  React.useEffect(() => {
    if (selectedIndex !== null && selectedIndex < tasks.length) {
      const selectedTask = tasks[selectedIndex]
      if (selectedTask && containerRef.current) {
        const element = containerRef.current.querySelector(
          `[data-task-id="${selectedTask.id}"]`
        )
        element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, tasks])

  // Auto-edit: when autoEditItemId is set, find the task and start editing
  // This is used when a task is created via the view's default handler
  React.useEffect(() => {
    if (!autoEditItemId) return

    // Find the task in the list
    const taskIndex = tasks.findIndex(t => t.id === autoEditItemId)
    if (taskIndex !== -1) {
      // Select and edit the task
      setSelectedIndex(taskIndex)
      setEditingTaskId(autoEditItemId)
      // Notify that we consumed the auto-edit
      onAutoEditConsumed?.()
    }
  }, [
    autoEditItemId,
    tasks,
    setSelectedIndex,
    setEditingTaskId,
    onAutoEditConsumed,
  ])

  // Register with task creation store when this list has a selection
  // This enables Cmd+N to create tasks after the selected task via the global handler
  React.useEffect(() => {
    if (!onCreateTask) {
      return
    }

    // Get the selected task (may be undefined if index is out of range)
    const selectedTask =
      selectedIndex !== null && selectedIndex < tasks.length
        ? tasks[selectedIndex]
        : undefined

    if (selectedTask) {
      // Has valid selection - activate this list
      useTaskCreationStore.getState().activateList(projectId, {
        handler: afterTaskId => onCreateTask(afterTaskId),
        selectedTaskId: selectedTask.id,
        setEditingTaskId,
        setSelectedIndex,
        taskCount: tasks.length,
      })
    } else {
      // No selection - deactivate (reverts to view default)
      useTaskCreationStore.getState().deactivateList(projectId)
    }

    // Cleanup: deactivate when this list unmounts
    return () => {
      useTaskCreationStore.getState().deactivateList(projectId)
    }
  }, [
    projectId,
    selectedIndex,
    tasks,
    onCreateTask,
    setEditingTaskId,
    setSelectedIndex,
  ])

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
        // Check defaultPrevented to avoid double-handling if global handler already fired
        if (isMeta && onCreateTask && !e.defaultPrevented) {
          e.preventDefault()
          e.stopPropagation() // Prevent global handler from also firing
          const afterTaskId =
            selectedIndex !== null && tasks[selectedIndex]
              ? tasks[selectedIndex].id
              : null
          // Capture current index for the async callback
          const currentIndex = selectedIndex
          const currentLength = tasks.length

          // Save the previous selection so we can restore it if task is canceled
          setPreviousSelectedIndex(currentIndex)
          // Reset the confirm flag for the new edit session
          editConfirmedRef.current = false

          const result = onCreateTask(afterTaskId)
          // Handle both sync and async returns
          const handleNewTask = (newTaskId: string | undefined) => {
            if (newTaskId) {
              // Track this as a newly created task
              setNewlyCreatedTaskId(newTaskId)
              setEditingTaskId(newTaskId)
              if (currentIndex !== null) {
                setSelectedIndex(currentIndex + 1)
              } else {
                setSelectedIndex(currentLength)
              }
            }
          }
          if (result instanceof Promise) {
            result.then(handleNewTask)
          } else {
            handleNewTask(result)
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

  // Called when edit is confirmed with Enter
  const handleConfirmEdit = () => {
    editConfirmedRef.current = true
    // Clear the newly created tracking since edit was confirmed
    setNewlyCreatedTaskId(null)
    setPreviousSelectedIndex(null)
  }

  const handleEndEdit = () => {
    // Check if this was a newly created task that was canceled (Escape)
    const wasNewlyCreated =
      newlyCreatedTaskId && editingTaskId === newlyCreatedTaskId
    const wasCanceled = !editConfirmedRef.current

    if (wasNewlyCreated && wasCanceled && onDeleteTask) {
      // Delete the canceled new task
      const taskIdToDelete = newlyCreatedTaskId
      onDeleteTask(taskIdToDelete)
      // Restore previous selection
      setSelectedIndex(previousSelectedIndex)
    }

    // Reset tracking state
    setNewlyCreatedTaskId(null)
    setPreviousSelectedIndex(null)
    editConfirmedRef.current = false

    setEditingTaskId(null)
    // Re-focus container for keyboard navigation
    containerRef.current?.focus({ preventScroll: true })
  }

  // Generate drag IDs with project prefix for uniqueness across containers
  const dragIds = React.useMemo(
    () => tasks.map(t => `task-${projectId}-${t.id}`),
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
              dragId={dragIds[index] ?? `task-${projectId}-${task.id}`}
              containerId={projectId}
              droppedTaskInList={droppedTaskInList}
              isSelected={selectedIndex === index}
              isEditing={editingTaskId === task.id}
              onSelect={() => handleSelect(index)}
              onStartEdit={() => handleStartEdit(task.id)}
              onEndEdit={handleEndEdit}
              onConfirmEdit={handleConfirmEdit}
              onTitleChange={newTitle => onTaskTitleChange(task.id, newTitle)}
              onStatusToggle={() => onTaskStatusToggle(task.id)}
              onContextMenu={() => showTaskContextMenu(task, commandContext)}
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
// SortableTaskItem - Task with sortable wrapper and cross-container gap
// -----------------------------------------------------------------------------

interface SortableTaskItemProps extends Omit<TaskItemProps, 'className'> {
  /** Unique drag ID for this item (should be unique across all containers) */
  dragId: string
  /** Container ID for cross-container drag detection */
  containerId: string
  /** Whether the dropped task has appeared in this container (suppresses gap) */
  droppedTaskInList?: boolean
  className?: string
}

/**
 * A sortable wrapper for TaskItem that provides drag-and-drop functionality.
 * Follows the SortableKanbanCard pattern for consistent, smooth DnD behavior.
 */
function SortableTaskItem({
  task,
  dragId,
  containerId,
  droppedTaskInList,
  className,
  isEditing,
  onContextMenu,
  ...taskItemProps
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      type: 'task',
      taskId: task.id,
      projectId: containerId,
    },
  })

  // Check if we should show a gap before this item (cross-container drag)
  // Don't show gap once the dropped task has appeared in this container
  const { crossContainerHover } = useTaskDragPreview()
  const showGapBefore =
    crossContainerHover?.targetContainerId === containerId &&
    crossContainerHover?.insertBeforeId === task.id &&
    !droppedTaskInList

  const style: React.CSSProperties = {
    // Always apply transforms - no suppression during cross-container drag
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Only apply drag listeners when NOT editing to prevent interference with input
  const dragProps = isEditing ? {} : { ...attributes, ...listeners }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={cn(
        'touch-manipulation',
        isDragging && 'opacity-50',
        // CSS gap animation for cross-container drag
        showGapBefore && 'mt-10 transition-[margin] duration-150 ease-out',
        className
      )}
    >
      <TaskItem
        task={task}
        isEditing={isEditing}
        onContextMenu={onContextMenu}
        {...taskItemProps}
      />
    </div>
  )
}

// -----------------------------------------------------------------------------
// DraggableTaskList - Standalone component with its own DndContext
// -----------------------------------------------------------------------------

interface DraggableTaskListProps extends BaseTaskListProps {
  /**
   * Task ID to auto-select and focus for editing.
   * Used when a new task is created via view default handler.
   */
  autoEditItemId?: string | null
  /** Called when auto-edit is consumed (to clear the pending ID) */
  onAutoEditConsumed?: () => void
}

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
  // onTaskOpenDetail - no longer used; selection syncs to detail store automatically
  onCreateTask,
  onDeleteTask,
  className,
  getContextName,
  showScheduled = true,
  showDue = true,
  autoEditItemId,
  onAutoEditConsumed,
}: DraggableTaskListProps) {
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)

  // Auto-edit: when autoEditItemId is set, find the task and start editing
  // This is used when a task is created via the view's default handler
  React.useEffect(() => {
    if (!autoEditItemId) return

    // Find the task in the list
    const taskIndex = tasks.findIndex(t => t.id === autoEditItemId)
    if (taskIndex !== -1) {
      // Select and edit the task
      setSelectedIndex(taskIndex)
      setEditingTaskId(autoEditItemId)
      // Notify that we consumed the auto-edit
      onAutoEditConsumed?.()
    }
  }, [autoEditItemId, tasks, onAutoEditConsumed])

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
      const index = tasks.findIndex(t => t.id === data.taskId)
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

    const oldIndex = tasks.findIndex(t => t.id === activeData.taskId)
    const newIndex = tasks.findIndex(t => t.id === overData.taskId)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newTasks = arrayMove(tasks, oldIndex, newIndex)
      onTasksReorder(newTasks)
      setSelectedIndex(newIndex)
    }
  }

  // Find active task for drag overlay
  const activeTask = activeTaskId
    ? tasks.find(t => t.id === activeTaskId)
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
        onCreateTask={onCreateTask}
        onDeleteTask={onDeleteTask}
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
      <TaskStatusCheckbox
        status={task.status}
        onToggle={Function.prototype as () => void}
      />
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
