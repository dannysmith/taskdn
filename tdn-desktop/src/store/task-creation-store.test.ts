import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useTaskCreationStore,
  type CreateTaskHandler,
} from './task-creation-store'

describe('task-creation-store', () => {
  // Helper to get initial state
  const getInitialState = () => ({
    viewDefaultHandler: null,
    viewDefaultOnTaskCreated: null,
    activeListId: null,
    activeListHandler: null,
    activeListSelectedTaskId: null,
    activeListCallbacks: null,
  })

  beforeEach(() => {
    // Reset store state before each test
    useTaskCreationStore.setState(getInitialState())
  })

  describe('initial state', () => {
    it('has null values for all state', () => {
      const state = useTaskCreationStore.getState()

      expect(state.viewDefaultHandler).toBeNull()
      expect(state.viewDefaultOnTaskCreated).toBeNull()
      expect(state.activeListId).toBeNull()
      expect(state.activeListHandler).toBeNull()
      expect(state.activeListSelectedTaskId).toBeNull()
      expect(state.activeListCallbacks).toBeNull()
    })
  })

  describe('registerViewDefault', () => {
    it('registers view default handler', () => {
      const handler: CreateTaskHandler = () => 'new-task-id'
      const { registerViewDefault } = useTaskCreationStore.getState()

      registerViewDefault({ handler })

      const state = useTaskCreationStore.getState()
      expect(state.viewDefaultHandler).toBe(handler)
      expect(state.viewDefaultOnTaskCreated).toBeNull()
    })

    it('registers handler with onTaskCreated callback', () => {
      const handler: CreateTaskHandler = () => 'new-task-id'
      const onTaskCreated = vi.fn()
      const { registerViewDefault } = useTaskCreationStore.getState()

      registerViewDefault({ handler, onTaskCreated })

      const state = useTaskCreationStore.getState()
      expect(state.viewDefaultHandler).toBe(handler)
      expect(state.viewDefaultOnTaskCreated).toBe(onTaskCreated)
    })

    it('clears registration when passed null', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const onTaskCreated = vi.fn()
      const { registerViewDefault } = useTaskCreationStore.getState()

      // First register
      registerViewDefault({ handler, onTaskCreated })
      expect(useTaskCreationStore.getState().viewDefaultHandler).toBe(handler)

      // Then clear
      registerViewDefault(null)

      const state = useTaskCreationStore.getState()
      expect(state.viewDefaultHandler).toBeNull()
      expect(state.viewDefaultOnTaskCreated).toBeNull()
    })

    it('replaces existing handler when registering new one', () => {
      const handler1: CreateTaskHandler = () => 'task-1'
      const handler2: CreateTaskHandler = () => 'task-2'
      const { registerViewDefault } = useTaskCreationStore.getState()

      registerViewDefault({ handler: handler1 })
      expect(useTaskCreationStore.getState().viewDefaultHandler).toBe(handler1)

      registerViewDefault({ handler: handler2 })
      expect(useTaskCreationStore.getState().viewDefaultHandler).toBe(handler2)
    })
  })

  describe('activateList', () => {
    it('activates a list with handler and selection', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const { activateList } = useTaskCreationStore.getState()

      activateList('list-1', {
        handler,
        selectedTaskId: 'task-123',
        taskCount: 5,
      })

      const state = useTaskCreationStore.getState()
      expect(state.activeListId).toBe('list-1')
      expect(state.activeListHandler).toBe(handler)
      expect(state.activeListSelectedTaskId).toBe('task-123')
      expect(state.activeListCallbacks).toEqual({
        setEditingTaskId: null,
        setSelectedIndex: null,
        taskCount: 5,
      })
    })

    it('activates list with all callbacks', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const setEditingTaskId = vi.fn()
      const setSelectedIndex = vi.fn()
      const { activateList } = useTaskCreationStore.getState()

      activateList('list-1', {
        handler,
        selectedTaskId: 'task-123',
        setEditingTaskId,
        setSelectedIndex,
        taskCount: 10,
      })

      const state = useTaskCreationStore.getState()
      expect(state.activeListCallbacks).toEqual({
        setEditingTaskId,
        setSelectedIndex,
        taskCount: 10,
      })
    })

    it('replaces previous active list', () => {
      const handler1: CreateTaskHandler = () => 'task-1'
      const handler2: CreateTaskHandler = () => 'task-2'
      const { activateList } = useTaskCreationStore.getState()

      activateList('list-1', {
        handler: handler1,
        selectedTaskId: 'task-a',
        taskCount: 5,
      })

      activateList('list-2', {
        handler: handler2,
        selectedTaskId: 'task-b',
        taskCount: 3,
      })

      const state = useTaskCreationStore.getState()
      expect(state.activeListId).toBe('list-2')
      expect(state.activeListHandler).toBe(handler2)
      expect(state.activeListSelectedTaskId).toBe('task-b')
    })
  })

  describe('deactivateList', () => {
    it('deactivates the currently active list', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const { activateList, deactivateList } = useTaskCreationStore.getState()

      activateList('list-1', {
        handler,
        selectedTaskId: 'task-123',
        taskCount: 5,
      })

      deactivateList('list-1')

      const state = useTaskCreationStore.getState()
      expect(state.activeListId).toBeNull()
      expect(state.activeListHandler).toBeNull()
      expect(state.activeListSelectedTaskId).toBeNull()
      expect(state.activeListCallbacks).toBeNull()
    })

    it('ignores deactivation if list ID does not match', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const { activateList, deactivateList } = useTaskCreationStore.getState()

      activateList('list-1', {
        handler,
        selectedTaskId: 'task-123',
        taskCount: 5,
      })

      // Try to deactivate a different list
      deactivateList('list-2')

      const state = useTaskCreationStore.getState()
      // Should still be active
      expect(state.activeListId).toBe('list-1')
      expect(state.activeListHandler).toBe(handler)
    })

    it('does nothing when no list is active', () => {
      const { deactivateList } = useTaskCreationStore.getState()

      // Should not throw
      deactivateList('list-1')

      const state = useTaskCreationStore.getState()
      expect(state.activeListId).toBeNull()
    })
  })

  describe('updateActiveListSelection', () => {
    it('updates the selected task ID', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const { activateList, updateActiveListSelection } =
        useTaskCreationStore.getState()

      activateList('list-1', {
        handler,
        selectedTaskId: 'task-a',
        taskCount: 5,
      })

      updateActiveListSelection('task-b', 1)

      expect(useTaskCreationStore.getState().activeListSelectedTaskId).toBe(
        'task-b'
      )
    })

    it('sets selection to null', () => {
      const handler: CreateTaskHandler = () => 'task-id'
      const { activateList, updateActiveListSelection } =
        useTaskCreationStore.getState()

      activateList('list-1', {
        handler,
        selectedTaskId: 'task-a',
        taskCount: 5,
      })

      updateActiveListSelection(null, null)

      expect(useTaskCreationStore.getState().activeListSelectedTaskId).toBeNull()
    })
  })

  describe('triggerCreate', () => {
    describe('with active list handler', () => {
      it('calls active list handler with selected task ID', async () => {
        const handler = vi.fn().mockReturnValue('new-task-id')
        const { activateList, triggerCreate } =
          useTaskCreationStore.getState()

        activateList('list-1', {
          handler,
          selectedTaskId: 'after-this-task',
          taskCount: 5,
        })

        const result = await triggerCreate()

        expect(handler).toHaveBeenCalledWith('after-this-task')
        expect(result).toBe('new-task-id')
      })

      it('calls setEditingTaskId callback with new task ID', async () => {
        const handler = vi.fn().mockReturnValue('new-task-id')
        const setEditingTaskId = vi.fn()
        const { activateList, triggerCreate } =
          useTaskCreationStore.getState()

        activateList('list-1', {
          handler,
          selectedTaskId: 'task-123',
          setEditingTaskId,
          taskCount: 5,
        })

        await triggerCreate()

        expect(setEditingTaskId).toHaveBeenCalledWith('new-task-id')
      })

      it('does not call setEditingTaskId if handler returns undefined', async () => {
        const handler = vi.fn().mockReturnValue(undefined)
        const setEditingTaskId = vi.fn()
        const { activateList, triggerCreate } =
          useTaskCreationStore.getState()

        activateList('list-1', {
          handler,
          selectedTaskId: 'task-123',
          setEditingTaskId,
          taskCount: 5,
        })

        await triggerCreate()

        expect(setEditingTaskId).not.toHaveBeenCalled()
      })

      it('handles async handler', async () => {
        const handler = vi.fn().mockResolvedValue('async-task-id')
        const setEditingTaskId = vi.fn()
        const { activateList, triggerCreate } =
          useTaskCreationStore.getState()

        activateList('list-1', {
          handler,
          selectedTaskId: 'task-123',
          setEditingTaskId,
          taskCount: 5,
        })

        const result = await triggerCreate()

        expect(result).toBe('async-task-id')
        expect(setEditingTaskId).toHaveBeenCalledWith('async-task-id')
      })
    })

    describe('with view default handler (no active list)', () => {
      it('calls view default handler with null afterTaskId', async () => {
        const handler = vi.fn().mockReturnValue('new-task-id')
        const { registerViewDefault, triggerCreate } =
          useTaskCreationStore.getState()

        registerViewDefault({ handler })

        const result = await triggerCreate()

        expect(handler).toHaveBeenCalledWith(null)
        expect(result).toBe('new-task-id')
      })

      it('calls onTaskCreated callback', async () => {
        const handler = vi.fn().mockReturnValue('new-task-id')
        const onTaskCreated = vi.fn()
        const { registerViewDefault, triggerCreate } =
          useTaskCreationStore.getState()

        registerViewDefault({ handler, onTaskCreated })

        await triggerCreate()

        expect(onTaskCreated).toHaveBeenCalledWith('new-task-id')
      })

      it('does not call onTaskCreated if handler returns undefined', async () => {
        const handler = vi.fn().mockReturnValue(undefined)
        const onTaskCreated = vi.fn()
        const { registerViewDefault, triggerCreate } =
          useTaskCreationStore.getState()

        registerViewDefault({ handler, onTaskCreated })

        await triggerCreate()

        expect(onTaskCreated).not.toHaveBeenCalled()
      })

      it('handles async view default handler', async () => {
        const handler = vi.fn().mockResolvedValue('async-task-id')
        const onTaskCreated = vi.fn()
        const { registerViewDefault, triggerCreate } =
          useTaskCreationStore.getState()

        registerViewDefault({ handler, onTaskCreated })

        const result = await triggerCreate()

        expect(result).toBe('async-task-id')
        expect(onTaskCreated).toHaveBeenCalledWith('async-task-id')
      })
    })

    describe('priority behavior', () => {
      it('uses active list handler over view default handler', async () => {
        const viewHandler = vi.fn().mockReturnValue('view-task')
        const listHandler = vi.fn().mockReturnValue('list-task')
        const { registerViewDefault, activateList, triggerCreate } =
          useTaskCreationStore.getState()

        registerViewDefault({ handler: viewHandler })
        activateList('list-1', {
          handler: listHandler,
          selectedTaskId: 'task-123',
          taskCount: 5,
        })

        const result = await triggerCreate()

        expect(listHandler).toHaveBeenCalled()
        expect(viewHandler).not.toHaveBeenCalled()
        expect(result).toBe('list-task')
      })

      it('falls back to view default when list deactivated', async () => {
        const viewHandler = vi.fn().mockReturnValue('view-task')
        const listHandler = vi.fn().mockReturnValue('list-task')
        const { registerViewDefault, activateList, deactivateList, triggerCreate } =
          useTaskCreationStore.getState()

        registerViewDefault({ handler: viewHandler })
        activateList('list-1', {
          handler: listHandler,
          selectedTaskId: 'task-123',
          taskCount: 5,
        })

        deactivateList('list-1')
        const result = await triggerCreate()

        expect(viewHandler).toHaveBeenCalled()
        expect(result).toBe('view-task')
      })
    })

    describe('with no handlers', () => {
      it('returns undefined when no handlers registered', async () => {
        const { triggerCreate } = useTaskCreationStore.getState()

        const result = await triggerCreate()

        expect(result).toBeUndefined()
      })
    })
  })
})
