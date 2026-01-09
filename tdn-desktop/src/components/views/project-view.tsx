import * as React from 'react'

import { useVaultData, useUpdateTask, useCreateTask } from '@/services/vault'
import type { Task } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useProjectOrder } from '@/hooks/use-project-order'
import { DraggableTaskList } from '@/components/tasks/task-list'
import { EmptyState } from '@/components/ui/empty-state'
import { CollapsibleNotesSection } from '@/components/ui/collapsible-notes'

/**
 * ProjectView - Displays all tasks within a single project.
 *
 * Projects are finishable efforts with a clear outcome (e.g., "Launch website",
 * "Plan vacation"). This view displays:
 * 1. Project notes (collapsible) - goals, context, reference material (TODO)
 * 2. Tasks section - all tasks belonging to this project
 *
 * Currently supports list mode only. Kanban mode will be added later.
 *
 * The project status pill in ViewHeader allows changing project status
 * (planning, ready, in-progress, blocked, done, dropped).
 */
interface ProjectViewProps {
  projectId: string
}

export function ProjectView({ projectId }: ProjectViewProps) {
  const { tasks, projects } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const openTask = useTaskDetailStore(state => state.openTask)

  // Find the project
  const project = React.useMemo(() => {
    return projects.find(p => p.id === projectId)
  }, [projects, projectId])

  // Get all tasks for this project
  // Tasks reference projects via wikilink format [[Project Title]], not by hash ID
  // So we match using the project's title, not its ID
  const projectTasks = React.useMemo(() => {
    if (!project) return []
    return tasks.filter(t => t.project?.includes(project.title))
  }, [tasks, project])

  // Manage display order for project tasks
  const { setOrder, getOrderedTasks } = useProjectOrder(projectId, projectTasks)
  const orderedTasks = getOrderedTasks()

  const handleReorder = React.useCallback(
    (reorderedTasks: Task[]) => {
      setOrder(reorderedTasks)
    },
    [setOrder]
  )

  const handleTitleChange = React.useCallback(
    (taskId: string, newTitle: string) => {
      updateTask.mutate({
        id: taskId,
        title: newTitle,
        status: null,
        project: null,
        area: null,
        scheduled: null,
        due: null,
        deferUntil: null,
        body: null,
      })
    },
    [updateTask]
  )

  const handleStatusToggle = React.useCallback(
    (taskId: string) => {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      // Toggle between done and ready
      const newStatus = task.status === 'done' ? 'ready' : 'done'
      updateTask.mutate({
        id: taskId,
        title: null,
        status: newStatus,
        project: null,
        area: null,
        scheduled: null,
        due: null,
        deferUntil: null,
        body: null,
      })
    },
    [tasks, updateTask]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      openTask(taskId)
    },
    [openTask]
  )

  const handleCreateTask = React.useCallback(
    async (_afterTaskId: string | null): Promise<string | undefined> => {
      const newTask = await createTask.mutateAsync({
        title: '',
        status: 'ready',
        projectId,
        areaId: project?.area ?? null,
        scheduled: null,
        due: null,
        deferUntil: null,
      })
      return newTask.id
    },
    [createTask, projectId, project?.area]
  )

  // Combine description and body for notes
  // (hoisted before early return to satisfy React hooks rules)
  const projectNotes = React.useMemo(() => {
    if (!project) return ''
    const parts: string[] = []
    if (project.description) parts.push(project.description)
    if (project.body) parts.push(project.body)
    return parts.join('\n\n')
  }, [project])

  if (!project) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Project not found"
          description="This project may have been deleted or moved."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Notes (collapsible) */}
      {projectNotes && <CollapsibleNotesSection notes={projectNotes} />}

      {/* Tasks Section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Tasks
        </h2>

        {orderedTasks.length > 0 ? (
          <DraggableTaskList
            tasks={orderedTasks}
            projectId={`project-${projectId}`}
            onTasksReorder={handleReorder}
            onTaskTitleChange={handleTitleChange}
            onTaskStatusToggle={handleStatusToggle}
            onTaskOpenDetail={handleOpenDetail}
            onCreateTask={handleCreateTask}
            showScheduled={true}
            showDue={true}
          />
        ) : (
          <EmptyState
            title="No tasks yet"
            description="Press ⌘N to create a task in this project."
          />
        )}
      </section>
    </div>
  )
}
