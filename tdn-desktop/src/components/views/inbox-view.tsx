import * as React from 'react'

import {
  useVaultData,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
} from '@/services/vault'
import type { Task } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useInboxOrder } from '@/hooks/use-inbox-order'
import { DraggableTaskList } from '@/components/tasks/task-list'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * InboxView - Displays all tasks with "inbox" status.
 *
 * The inbox is the capture point for new, unprocessed tasks. Tasks land here
 * when created via quick-add and haven't yet been triaged into a project,
 * given a due date, or moved to another status.
 *
 * Users process the inbox by opening each task and either:
 * - Assigning it to a project/area
 * - Setting dates (scheduled, due, deferUntil)
 * - Changing status to "next", "waiting", etc.
 * - Completing or dropping it
 *
 * Display order is managed by useInboxOrder hook, separate from entity data.
 */
export function InboxView() {
  const { tasks } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const openTask = useTaskDetailStore(state => state.openTask)

  // Get all tasks with inbox status
  const inboxTasks = React.useMemo(() => {
    return tasks.filter(t => t.status === 'inbox')
  }, [tasks])

  // Manage display order for inbox tasks
  const { setOrder, getOrderedTasks } = useInboxOrder(inboxTasks)
  const orderedInboxTasks = getOrderedTasks()

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
        status: 'inbox',
        projectId: null,
        areaId: null,
        scheduled: null,
        due: null,
        deferUntil: null,
      })
      return newTask.id
    },
    [createTask]
  )

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId)
    },
    [deleteTask]
  )

  return (
    <div className="space-y-4">
      {orderedInboxTasks.length > 0 ? (
        <DraggableTaskList
          tasks={orderedInboxTasks}
          projectId="inbox"
          onTasksReorder={handleReorder}
          onTaskTitleChange={handleTitleChange}
          onTaskStatusToggle={handleStatusToggle}
          onTaskOpenDetail={handleOpenDetail}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          showScheduled={true}
          showDue={true}
        />
      ) : (
        <EmptyState
          title="Inbox is empty"
          description="Newly captured tasks will appear here."
        />
      )}
    </div>
  )
}
