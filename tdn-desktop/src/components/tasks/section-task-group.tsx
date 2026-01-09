import * as React from 'react'

import { cn } from '@/lib/utils'
import type { Task } from '@/lib/tauri-bindings'
import { SectionHeader } from './section-header'
import { DraggableTaskList } from './task-list'

/**
 * SectionTaskGroup - Collapsible section with a task list.
 *
 * Used in TodayView for sections like "Scheduled for Today", "Overdue", etc.
 * Provides a collapsible header with task count and a draggable task list.
 *
 * This is a simplified version without heading support or cross-section DnD.
 * Each section manages its own DnD context via DraggableTaskList.
 */
interface SectionTaskGroupProps {
  /** Unique identifier for this section (used for drag IDs) */
  sectionId: string
  /** Display title for the section header */
  title: string
  /** Optional icon to display in the header */
  icon?: React.ReactNode
  /** Tasks to display in this section */
  tasks: Task[]
  /** Called when tasks are reordered via drag-and-drop */
  onTasksReorder: (reorderedTasks: Task[]) => void
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskStatusToggle: (taskId: string) => void
  /** Called when a task's open-detail button is clicked */
  onTaskOpenDetail?: (taskId: string) => void
  /** Called when Cmd/Ctrl+N is pressed to create a task */
  onCreateTask?: (afterTaskId: string | null) => Promise<string | undefined>
  /** Function to get context name for a task (project/area name) */
  getContextName?: (task: Task) => string | undefined
  /** Whether to show scheduled dates (default: true) */
  showScheduled?: boolean
  /** Whether to show due dates (default: true) */
  showDue?: boolean
  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean
  /** Called when the "+ Task" header button is clicked */
  onAddTask?: () => void
  className?: string
}

export function SectionTaskGroup({
  sectionId,
  title,
  icon,
  tasks,
  onTasksReorder,
  onTaskTitleChange,
  onTaskStatusToggle,
  onTaskOpenDetail,
  onCreateTask,
  getContextName,
  showScheduled = true,
  showDue = true,
  defaultExpanded = true,
  onAddTask,
  className,
}: SectionTaskGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const handleToggleExpand = () => {
    setIsExpanded(prev => !prev)
  }

  return (
    <div className={cn('', className)}>
      <SectionHeader
        title={title}
        icon={icon}
        taskCount={tasks.length}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onAddTask={onAddTask}
      />

      {/* Collapsible content */}
      {isExpanded && (
        <div className="ps-6 pt-1">
          {tasks.length > 0 ? (
            <DraggableTaskList
              tasks={tasks}
              listId={sectionId}
              onTasksReorder={onTasksReorder}
              onTaskTitleChange={onTaskTitleChange}
              onTaskStatusToggle={onTaskStatusToggle}
              onTaskOpenDetail={onTaskOpenDetail}
              onCreateTask={onCreateTask}
              getContextName={getContextName}
              showScheduled={showScheduled}
              showDue={showDue}
            />
          ) : (
            <div className="text-sm text-muted-foreground py-2 px-2">
              No tasks
            </div>
          )}
        </div>
      )}
    </div>
  )
}
