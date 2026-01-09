import { useEffect, useCallback, useRef } from 'react'
import {
  useTaskCreationStore,
  type CreateTaskHandler,
  type InsertTaskInOrderHandler,
} from '@/store/task-creation-store'

/**
 * Hook for registering a view's task creation context with the global Cmd+N handler.
 *
 * When this hook is active, pressing Cmd+N anywhere (except in text inputs) will
 * trigger task creation using the provided handler.
 *
 * @param options.createTask - Handler that creates a task. Receives afterTaskId (the
 *   task the new one should be inserted after, or null for end of list).
 *   Should return the new task ID.
 *
 * @param options.insertInOrder - Optional handler to insert the new task at the
 *   correct position in the display order. Called after createTask succeeds.
 *
 * @param options.tasks - The current list of tasks. Used to determine:
 *   - The afterTaskId for insertion (based on selectedIndex)
 *   - Whether a task is selected
 *
 * @param options.selectedIndex - The index of the currently selected task, or null.
 *   New tasks are inserted after this task.
 *
 * @param options.setEditingTaskId - Called with the new task ID to put it in edit mode.
 *
 * @param options.setSelectedIndex - Called to update selection to the new task.
 *
 * @example
 * ```tsx
 * function MyView() {
 *   const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
 *   const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
 *
 *   const handleCreateTask = async (afterTaskId: string | null) => {
 *     const newTask = await createTaskMutation.mutateAsync({ ... })
 *     return newTask.id
 *   }
 *
 *   useTaskCreationContext({
 *     createTask: handleCreateTask,
 *     tasks: orderedTasks,
 *     selectedIndex,
 *     setEditingTaskId,
 *     setSelectedIndex,
 *   })
 *
 *   return <TaskList ... />
 * }
 * ```
 */
interface UseTaskCreationContextOptions {
  createTask: CreateTaskHandler
  insertInOrder?: InsertTaskInOrderHandler
  tasks: { id: string }[]
  selectedIndex: number | null
  setEditingTaskId?: (taskId: string | null) => void
  setSelectedIndex?: (index: number | null) => void
}

export function useTaskCreationContext({
  createTask,
  insertInOrder,
  tasks,
  selectedIndex,
  setEditingTaskId,
  setSelectedIndex,
}: UseTaskCreationContextOptions) {
  const {
    registerContext,
    unregisterContext,
    updateSelection,
    updateTaskCount,
  } = useTaskCreationStore()

  // Use refs to avoid re-registering on every render
  const createTaskRef = useRef(createTask)
  const insertInOrderRef = useRef(insertInOrder)
  const setEditingTaskIdRef = useRef(setEditingTaskId)
  const setSelectedIndexRef = useRef(setSelectedIndex)

  // Update refs when callbacks change
  useEffect(() => {
    createTaskRef.current = createTask
    insertInOrderRef.current = insertInOrder
    setEditingTaskIdRef.current = setEditingTaskId
    setSelectedIndexRef.current = setSelectedIndex
  }, [createTask, insertInOrder, setEditingTaskId, setSelectedIndex])

  // Stable wrappers that use refs
  const stableCreateTask = useCallback<CreateTaskHandler>(afterTaskId => {
    return createTaskRef.current(afterTaskId)
  }, [])

  const stableInsertInOrder = useCallback<InsertTaskInOrderHandler>(
    (newTaskId, afterTaskId) => {
      insertInOrderRef.current?.(newTaskId, afterTaskId)
    },
    []
  )

  const stableSetEditingTaskId = useCallback((taskId: string | null) => {
    setEditingTaskIdRef.current?.(taskId)
  }, [])

  const stableSetSelectedIndex = useCallback((index: number | null) => {
    setSelectedIndexRef.current?.(index)
  }, [])

  // Register context on mount, unregister on unmount
  useEffect(() => {
    registerContext({
      createTaskHandler: stableCreateTask,
      insertInOrderHandler: stableInsertInOrder,
      setEditingTaskId: stableSetEditingTaskId,
      setSelectedIndex: stableSetSelectedIndex,
      taskCount: tasks.length,
    })

    return () => {
      unregisterContext()
    }
  }, [
    registerContext,
    unregisterContext,
    stableCreateTask,
    stableInsertInOrder,
    stableSetEditingTaskId,
    stableSetSelectedIndex,
    tasks.length,
  ])

  // Update selection when it changes
  useEffect(() => {
    const selectedTaskId =
      selectedIndex !== null && tasks[selectedIndex]
        ? tasks[selectedIndex].id
        : null
    updateSelection(selectedTaskId, selectedIndex)
  }, [selectedIndex, tasks, updateSelection])

  // Update task count when tasks change
  useEffect(() => {
    updateTaskCount(tasks.length)
  }, [tasks.length, updateTaskCount])
}
