import * as React from 'react'

import {
  useVaultData,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
} from '@/services/vault'
import type { Task } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useTaskCreationStore } from '@/store/task-creation-store'
import { useDisplayOrderStore } from '@/store/display-order-store'
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

  // State for auto-editing newly created tasks
  const [pendingEditItemId, setPendingEditItemId] = React.useState<
    string | null
  >(null)

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
    (afterTaskId: string | null): string => {
      const tempId = crypto.randomUUID()

      // Calculate new order with temp ID
      const currentOrder = orderedInboxTasks.map(t => t.id)
      let newOrder: string[]

      if (afterTaskId) {
        const insertIndex = currentOrder.indexOf(afterTaskId)
        if (insertIndex !== -1) {
          // Insert after the selected task
          newOrder = [
            ...currentOrder.slice(0, insertIndex + 1),
            tempId,
            ...currentOrder.slice(insertIndex + 1),
          ]
        } else {
          // afterTaskId not found, append to end
          newOrder = [...currentOrder, tempId]
        }
      } else {
        // No selection, append to end
        newOrder = [...currentOrder, tempId]
      }

      // Update the order store immediately
      useDisplayOrderStore.getState().setInboxOrder(newOrder)

      createTask.mutate(
        {
          tempId,
          title: '',
          status: 'inbox',
          projectId: null,
          areaId: null,
          scheduled: null,
          due: null,
          deferUntil: null,
        },
        {
          onSuccess: realTask => {
            const order = useDisplayOrderStore.getState().inboxOrder
            if (order) {
              const updatedOrder = order.map(id =>
                id === tempId ? realTask.id : id
              )
              useDisplayOrderStore.getState().setInboxOrder(updatedOrder)
            }
            // Update pendingEditItemId to real task ID so auto-edit continues with correct ID
            setPendingEditItemId(realTask.id)
          },
          onError: () => {
            const order = useDisplayOrderStore.getState().inboxOrder
            if (order) {
              const revertedOrder = order.filter(id => id !== tempId)
              useDisplayOrderStore.getState().setInboxOrder(revertedOrder)
            }
          },
        }
      )

      return tempId
    },
    [createTask, orderedInboxTasks]
  )

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId)
    },
    [deleteTask]
  )

  // Clear pending edit after it's consumed
  const handleAutoEditConsumed = React.useCallback(() => {
    setPendingEditItemId(null)
  }, [])

  // Register view default handler for Cmd+N task creation
  // When no task is selected, Cmd+N creates a new inbox task at the end
  React.useEffect(() => {
    useTaskCreationStore.getState().registerViewDefault({
      handler: handleCreateTask,
      onTaskCreated: taskId => setPendingEditItemId(taskId),
    })

    return () => {
      useTaskCreationStore.getState().registerViewDefault(null)
    }
  }, [handleCreateTask])

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
          autoEditItemId={pendingEditItemId}
          onAutoEditConsumed={handleAutoEditConsumed}
        />
      ) : (
        <EmptyState
          title="Inbox is empty"
          description="Newly captured tasks will appear here. Press ⌘N to create a task."
        />
      )}
    </div>
  )
}
