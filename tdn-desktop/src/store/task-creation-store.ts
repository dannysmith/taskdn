import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Store for managing global Cmd+N task creation.
 *
 * This store supports a two-layer handler system:
 * 1. View Default Handler - Registered by views on mount. Used when no task is selected.
 * 2. Active List Handler - Registered by lists when they have a selection. Takes priority.
 *
 * Priority in triggerCreate: activeListHandler → viewDefaultHandler
 *
 * Views register their default handler for creating tasks in their primary section.
 * Lists (TaskList, OrderedItemList) register as "active" when they have a selection,
 * enabling task creation after the selected task.
 */

export type CreateTaskHandler = (
  afterTaskId: string | null
) => Promise<string | undefined> | string | undefined

interface ActiveListCallbacks {
  setEditingTaskId: ((id: string | null) => void) | null
  setSelectedIndex: ((index: number | null) => void) | null
  taskCount: number
}

interface TaskCreationState {
  // === View-level default (fallback when no task selected) ===
  /**
   * Handler for creating tasks in the view's default section.
   * Used when Cmd+N is pressed with no task selected.
   */
  viewDefaultHandler: CreateTaskHandler | null

  /**
   * Callback after task creation via view default.
   * Typically used to trigger edit mode (e.g., setPendingEditItemId).
   */
  viewDefaultOnTaskCreated: ((taskId: string) => void) | null

  // === List-level (when a task is selected in a specific list) ===
  /**
   * ID of the currently active list (the one with a selection).
   * Used to prevent one list from accidentally clearing another's registration.
   */
  activeListId: string | null

  /**
   * Handler for creating tasks in the active list.
   * Takes priority over viewDefaultHandler when set.
   */
  activeListHandler: CreateTaskHandler | null

  /**
   * The selected task ID in the active list.
   * New tasks will be inserted after this task.
   */
  activeListSelectedTaskId: string | null

  /**
   * Callbacks for the active list (edit mode, selection, task count).
   */
  activeListCallbacks: ActiveListCallbacks | null

  // === Actions ===
  /**
   * Register the view's default handler for task creation.
   * Pass null to clear the registration.
   */
  registerViewDefault: (
    config: {
      handler: CreateTaskHandler
      onTaskCreated?: (taskId: string) => void
    } | null
  ) => void

  /**
   * Activate a list for task creation (when it has a selection).
   * Only one list can be active at a time; calling this overwrites any previous active list.
   */
  activateList: (
    listId: string,
    context: {
      handler: CreateTaskHandler
      selectedTaskId: string
      setEditingTaskId?: (id: string | null) => void
      setSelectedIndex?: (index: number | null) => void
      taskCount: number
    }
  ) => void

  /**
   * Deactivate a list (when selection is cleared or component unmounts).
   * Only clears if the listId matches the currently active list.
   */
  deactivateList: (listId: string) => void

  /**
   * Update the selection within the currently active list.
   */
  updateActiveListSelection: (
    taskId: string | null,
    index: number | null
  ) => void

  /**
   * Trigger task creation via Cmd+N.
   * Priority: activeListHandler → viewDefaultHandler
   * Returns the new task ID if successful.
   */
  triggerCreate: () => Promise<string | undefined>
}

export const useTaskCreationStore = create<TaskCreationState>()(
  devtools(
    (set, get) => ({
      // State
      viewDefaultHandler: null,
      viewDefaultOnTaskCreated: null,
      activeListId: null,
      activeListHandler: null,
      activeListSelectedTaskId: null,
      activeListCallbacks: null,

      // Actions
      registerViewDefault: config => {
        if (config === null) {
          set(
            {
              viewDefaultHandler: null,
              viewDefaultOnTaskCreated: null,
            },
            undefined,
            'registerViewDefault:clear'
          )
        } else {
          set(
            {
              viewDefaultHandler: config.handler,
              viewDefaultOnTaskCreated: config.onTaskCreated ?? null,
            },
            undefined,
            'registerViewDefault'
          )
        }
      },

      activateList: (listId, context) => {
        set(
          {
            activeListId: listId,
            activeListHandler: context.handler,
            activeListSelectedTaskId: context.selectedTaskId,
            activeListCallbacks: {
              setEditingTaskId: context.setEditingTaskId ?? null,
              setSelectedIndex: context.setSelectedIndex ?? null,
              taskCount: context.taskCount,
            },
          },
          undefined,
          'activateList'
        )
      },

      deactivateList: listId => {
        const state = get()
        // Only clear if this list is the currently active one
        if (state.activeListId === listId) {
          set(
            {
              activeListId: null,
              activeListHandler: null,
              activeListSelectedTaskId: null,
              activeListCallbacks: null,
            },
            undefined,
            'deactivateList'
          )
        }
      },

      updateActiveListSelection: (taskId, _index) => {
        set(
          { activeListSelectedTaskId: taskId },
          undefined,
          'updateActiveListSelection'
        )
      },

      triggerCreate: async () => {
        const state = get()

        // Priority 1: Active list handler (when a task is selected in a list)
        if (state.activeListHandler) {
          const afterTaskId = state.activeListSelectedTaskId
          const result = state.activeListHandler(afterTaskId)
          const newTaskId = result instanceof Promise ? await result : result

          if (newTaskId && state.activeListCallbacks?.setEditingTaskId) {
            state.activeListCallbacks.setEditingTaskId(newTaskId)
          }

          return newTaskId
        }

        // Priority 2: View default handler (when no task selected)
        if (state.viewDefaultHandler) {
          const result = state.viewDefaultHandler(null) // No afterTaskId for view default
          const newTaskId = result instanceof Promise ? await result : result

          if (newTaskId && state.viewDefaultOnTaskCreated) {
            state.viewDefaultOnTaskCreated(newTaskId) // Triggers edit mode in view
          }

          return newTaskId
        }

        return undefined
      },
    }),
    {
      name: 'task-creation-store',
    }
  )
)
