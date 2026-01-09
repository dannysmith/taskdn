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
import { TaskItem, type TaskItemProps } from './task-item'
import { TaskStatusCheckbox } from './task-status-checkbox'

/**
 * DraggableTaskList - Standalone task list with drag-and-drop.
 *
 * A self-contained task list with its own DndContext for drag-and-drop.
 * Use this for single-list views like InboxView or ProjectView.
 *
 * Features:
 * - Keyboard navigation (arrows, Enter to edit, Space to toggle status)
 * - Cmd/Ctrl+N to create new task after selection
 * - Cmd/Ctrl+Arrow to reorder selected task
 * - Visual selection and inline title editing
 */

interface DraggableTaskListProps {
  tasks: Task[]
  listId: string
  onTasksReorder: (reorderedTasks: Task[]) => void
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskStatusToggle: (taskId: string) => void
  onTaskOpenDetail?: (taskId: string) => void
  onCreateTask?: (afterTaskId: string | null) => Promise<string | undefined>
  className?: string
  getContextName?: (task: Task) => string | undefined
  showScheduled?: boolean
  showDue?: boolean
}

export function DraggableTaskList({
  tasks,
  listId,
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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)

  // Sensors for drag and drop
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

  // Keep selection valid when tasks change
  React.useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= tasks.length) {
      setSelectedIndex(tasks.length > 0 ? tasks.length - 1 : null)
    }
  }, [tasks.length, selectedIndex])

  // Focus container when selection changes (for keyboard events)
  React.useEffect(() => {
    if (selectedIndex !== null && !editingTaskId && containerRef.current) {
      containerRef.current.focus()
    }
  }, [selectedIndex, editingTaskId])

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { taskId: string } | undefined
    if (data?.taskId) {
      setActiveTaskId(data.taskId)
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingTaskId) return

    const isMeta = e.metaKey || e.ctrlKey

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (isMeta && selectedIndex !== null) {
          if (selectedIndex < tasks.length - 1) {
            const newTasks = arrayMove(tasks, selectedIndex, selectedIndex + 1)
            onTasksReorder(newTasks)
            setSelectedIndex(selectedIndex + 1)
          }
        } else {
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
          if (selectedIndex > 0) {
            const newTasks = arrayMove(tasks, selectedIndex, selectedIndex - 1)
            onTasksReorder(newTasks)
            setSelectedIndex(selectedIndex - 1)
          }
        } else {
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
          // Capture current index for the async callback
          const currentIndex = selectedIndex
          const currentLength = tasks.length
          onCreateTask(afterTaskId).then(newTaskId => {
            if (newTaskId) {
              setEditingTaskId(newTaskId)
              if (currentIndex !== null) {
                setSelectedIndex(currentIndex + 1)
              } else {
                setSelectedIndex(currentLength)
              }
            }
          })
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
    containerRef.current?.focus()
  }

  // Clear selection when clicking outside
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setSelectedIndex(null)
    }
  }

  // Find active task for drag overlay
  const activeTask = activeTaskId
    ? tasks.find(t => t.id === activeTaskId)
    : null

  // Generate drag IDs
  const dragIds = React.useMemo(
    () => tasks.map(t => `task-${listId}-${t.id}`),
    [tasks, listId]
  )

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
                dragId={dragIds[index] ?? `task-${listId}-${task.id}`}
                isSelected={selectedIndex === index}
                isEditing={editingTaskId === task.id}
                onSelect={() => handleSelect(index)}
                onStartEdit={() => handleStartEdit(task.id)}
                onEndEdit={handleEndEdit}
                onTitleChange={newTitle => onTaskTitleChange(task.id, newTitle)}
                onStatusToggle={() => onTaskStatusToggle(task.id)}
                onOpenDetail={
                  onTaskOpenDetail ? () => onTaskOpenDetail(task.id) : undefined
                }
                contextName={getContextName?.(task)}
                showScheduled={showScheduled}
                showDue={showDue}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask && <TaskDragPreview task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}

// -----------------------------------------------------------------------------
// Sortable Task Item
// -----------------------------------------------------------------------------

interface SortableTaskItemProps extends Omit<TaskItemProps, 'className'> {
  dragId: string
  className?: string
}

function SortableTaskItem({
  task,
  dragId,
  isEditing,
  className,
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
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Only apply drag listeners when NOT editing
  const dragProps = isEditing ? {} : { ...attributes, ...listeners }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={cn(
        'touch-manipulation',
        isDragging && 'opacity-50',
        className
      )}
    >
      <TaskItem task={task} isEditing={isEditing} {...taskItemProps} />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Drag Preview
// -----------------------------------------------------------------------------

function TaskDragPreview({ task }: { task: Task }) {
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
