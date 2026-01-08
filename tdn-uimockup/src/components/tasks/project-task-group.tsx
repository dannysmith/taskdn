import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'
import type { Project, Task } from '@/types/data'
import { ProjectHeader } from './project-header'
import { TaskList } from './task-list'
import { useTaskDragPreview } from './task-dnd-context'

/**
 * ProjectTaskGroup - Collapsible project header with its task list underneath.
 *
 * Used in AreaView (list mode) to show each project with its tasks.
 * The header shows project title, completion progress circle, and an
 * arrow to open the full ProjectView.
 *
 * Tasks can be dragged between project groups when wrapped in TaskDndContext.
 * Empty projects show a droppable zone with visual feedback.
 */
interface ProjectTaskGroupProps {
  project: Project
  tasks: Task[]
  completion: number
  onOpenProject: () => void
  onTasksReorder: (reorderedTasks: Task[]) => void
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskStatusToggle: (taskId: string) => void
  /** Called when a task's open-detail button is clicked */
  onTaskOpenDetail?: (taskId: string) => void
  /** Called when Cmd/Ctrl+N is pressed to create a task */
  onCreateTask?: (afterTaskId: string | null) => string | void
  /** Function to get context name for a task (usually not needed within project group) */
  getContextName?: (task: Task) => string | undefined
  /** Whether to show scheduled dates (default: true) */
  showScheduled?: boolean
  /** Whether to show due dates (default: true) */
  showDue?: boolean
  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean
  className?: string
}

/**
 * A project header with a collapsible list of tasks underneath.
 * Used in Area views to show multiple projects with their tasks.
 */
export function ProjectTaskGroup({
  project,
  tasks,
  completion,
  onOpenProject,
  onTasksReorder,
  onTaskTitleChange,
  onTaskStatusToggle,
  onTaskOpenDetail,
  onCreateTask,
  getContextName,
  showScheduled = true,
  showDue = true,
  defaultExpanded = true,
  className,
}: ProjectTaskGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className={cn('', className)}>
      <ProjectHeader
        project={project}
        completion={completion}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onOpenProject={onOpenProject}
      />

      {/* Collapsible task list */}
      {isExpanded && (
        <div className="ps-6 pt-1">
          {tasks.length > 0 ? (
            <TaskList
              tasks={tasks}
              projectId={project.id}
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
            <EmptyProjectDropZone projectId={project.id} />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A droppable zone for empty projects.
 * Shows visual feedback when a task is dragged over it.
 */
function EmptyProjectDropZone({ projectId }: { projectId: string }) {
  const { dragPreview } = useTaskDragPreview()

  const { setNodeRef, isOver } = useDroppable({
    id: `empty-project-${projectId}`,
    data: {
      type: 'empty-project',
      projectId: projectId,
    },
  })

  // Check if we're dragging a task from a different project
  const isDraggingFromOtherProject =
    dragPreview &&
    dragPreview.type === 'task' &&
    dragPreview.sourceContainerId !== projectId

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'text-sm text-muted-foreground py-2 px-2 rounded-lg transition-colors',
        isOver && isDraggingFromOtherProject && 'bg-primary/10 text-primary'
      )}
    >
      {isOver && isDraggingFromOtherProject
        ? 'Drop here'
        : 'No tasks in this project'}
    </div>
  )
}
