import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Store for managing global Cmd+N task creation.
 *
 * Views register their task creation context when mounted/focused.
 * The global keyboard handler (use-keyboard-shortcuts) triggers creation
 * via this store, so Cmd+N works regardless of component focus.
 *
 * Each view is responsible for:
 * 1. Registering its createTask handler when mounted
 * 2. Updating the selectedTaskId when selection changes
 * 3. Unregistering when unmounted
 */

export type CreateTaskHandler = (
  afterTaskId: string | null
) => Promise<string | undefined> | string | undefined

export type InsertTaskInOrderHandler = (
  newTaskId: string,
  afterTaskId: string | null
) => void

interface TaskCreationState {
  /**
   * The handler to call when Cmd+N is pressed.
   * Returns the new task ID if successful, undefined otherwise.
   */
  createTaskHandler: CreateTaskHandler | null

  /**
   * The currently selected task ID in the active task list.
   * New tasks will be inserted after this task.
   * If null, new tasks are appended at the end.
   */
  selectedTaskId: string | null

  /**
   * Handler to insert the new task at the correct position in the order.
   * Called after createTaskHandler succeeds.
   */
  insertInOrderHandler: InsertTaskInOrderHandler | null

  /**
   * Callback to set the editing task ID in the active list.
   * Called after task creation to put the new task in edit mode.
   */
  setEditingTaskId: ((taskId: string | null) => void) | null

  /**
   * Callback to update the selection index in the active list.
   * Called after task creation to select the new task.
   */
  setSelectedIndex: ((index: number | null) => void) | null

  /**
   * The current number of tasks in the active list.
   * Used to calculate the new selection index.
   */
  taskCount: number

  // Actions
  registerContext: (context: {
    createTaskHandler: CreateTaskHandler
    insertInOrderHandler?: InsertTaskInOrderHandler
    setEditingTaskId?: (taskId: string | null) => void
    setSelectedIndex?: (index: number | null) => void
    taskCount?: number
  }) => void

  updateSelection: (
    selectedTaskId: string | null,
    selectedIndex: number | null
  ) => void

  updateTaskCount: (count: number) => void

  unregisterContext: () => void

  /**
   * Trigger task creation via Cmd+N.
   * Returns the new task ID if successful.
   */
  triggerCreate: () => Promise<string | undefined>
}

export const useTaskCreationStore = create<TaskCreationState>()(
  devtools(
    (set, get) => ({
      createTaskHandler: null,
      selectedTaskId: null,
      insertInOrderHandler: null,
      setEditingTaskId: null,
      setSelectedIndex: null,
      taskCount: 0,

      registerContext: context => {
        set(
          {
            createTaskHandler: context.createTaskHandler,
            insertInOrderHandler: context.insertInOrderHandler ?? null,
            setEditingTaskId: context.setEditingTaskId ?? null,
            setSelectedIndex: context.setSelectedIndex ?? null,
            taskCount: context.taskCount ?? 0,
          },
          undefined,
          'registerContext'
        )
      },

      updateSelection: (selectedTaskId, _selectedIndex) => {
        set({ selectedTaskId }, undefined, 'updateSelection')
      },

      updateTaskCount: count => {
        set({ taskCount: count }, undefined, 'updateTaskCount')
      },

      unregisterContext: () => {
        set(
          {
            createTaskHandler: null,
            selectedTaskId: null,
            insertInOrderHandler: null,
            setEditingTaskId: null,
            setSelectedIndex: null,
            taskCount: 0,
          },
          undefined,
          'unregisterContext'
        )
      },

      triggerCreate: async () => {
        const state = get()
        if (!state.createTaskHandler) {
          return undefined
        }

        const afterTaskId = state.selectedTaskId
        const result = state.createTaskHandler(afterTaskId)

        // Handle both sync and async results
        const newTaskId = result instanceof Promise ? await result : result

        if (newTaskId) {
          // Insert in correct order position if handler provided
          if (state.insertInOrderHandler) {
            state.insertInOrderHandler(newTaskId, afterTaskId)
          }

          // Set the new task to editing mode
          if (state.setEditingTaskId) {
            state.setEditingTaskId(newTaskId)
          }
        }

        return newTaskId
      },
    }),
    {
      name: 'task-creation-store',
    }
  )
)
