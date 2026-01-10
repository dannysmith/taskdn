import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskDetailStore } from './task-detail-store'
import { useUIStore } from './ui-store'

describe('task-detail-store', () => {
  // Helper to get initial state
  const getInitialState = () => ({
    openTaskId: null,
  })

  beforeEach(() => {
    // Reset both stores before each test
    useTaskDetailStore.setState(getInitialState())
    useUIStore.setState({
      leftSidebarVisible: true,
      rightSidebarVisible: false, // Start with sidebar hidden
      commandPaletteOpen: false,
      preferencesOpen: false,
    })
  })

  describe('initial state', () => {
    it('has null openTaskId', () => {
      const state = useTaskDetailStore.getState()
      expect(state.openTaskId).toBeNull()
    })
  })

  describe('setOpenTaskId', () => {
    it('sets the open task ID', () => {
      const { setOpenTaskId } = useTaskDetailStore.getState()

      setOpenTaskId('task-123')

      expect(useTaskDetailStore.getState().openTaskId).toBe('task-123')
    })

    it('clears the open task ID when passed null', () => {
      const { setOpenTaskId } = useTaskDetailStore.getState()

      setOpenTaskId('task-123')
      setOpenTaskId(null)

      expect(useTaskDetailStore.getState().openTaskId).toBeNull()
    })

    it('does NOT automatically show the right sidebar', () => {
      const { setOpenTaskId } = useTaskDetailStore.getState()

      setOpenTaskId('task-123')

      // setOpenTaskId is for setting WHAT is shown, not WHETHER it's shown
      expect(useUIStore.getState().rightSidebarVisible).toBe(false)
    })
  })

  describe('openTask', () => {
    it('sets the open task ID', () => {
      const { openTask } = useTaskDetailStore.getState()

      openTask('task-456')

      expect(useTaskDetailStore.getState().openTaskId).toBe('task-456')
    })

    it('also shows the right sidebar', () => {
      const { openTask } = useTaskDetailStore.getState()

      openTask('task-456')

      expect(useUIStore.getState().rightSidebarVisible).toBe(true)
    })

    it('replaces previously open task', () => {
      const { openTask } = useTaskDetailStore.getState()

      openTask('task-1')
      openTask('task-2')

      expect(useTaskDetailStore.getState().openTaskId).toBe('task-2')
    })

    it('keeps sidebar visible when opening different tasks', () => {
      const { openTask } = useTaskDetailStore.getState()

      openTask('task-1')
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)

      openTask('task-2')
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)
    })
  })

  describe('closeTask', () => {
    it('clears the open task ID', () => {
      const { openTask, closeTask } = useTaskDetailStore.getState()

      openTask('task-123')
      closeTask()

      expect(useTaskDetailStore.getState().openTaskId).toBeNull()
    })

    it('does NOT hide the right sidebar', () => {
      const { openTask, closeTask } = useTaskDetailStore.getState()

      openTask('task-123')
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)

      closeTask()
      // closeTask only clears the task ID, doesn't hide the sidebar
      // This allows the sidebar to show a "no task selected" state
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)
    })

    it('does nothing when already closed', () => {
      const { closeTask } = useTaskDetailStore.getState()

      // Should not throw
      closeTask()

      expect(useTaskDetailStore.getState().openTaskId).toBeNull()
    })
  })

  describe('cross-store interaction', () => {
    it('sidebar can be hidden independently of task selection', () => {
      const { openTask } = useTaskDetailStore.getState()
      const { setRightSidebarVisible } = useUIStore.getState()

      openTask('task-123')
      expect(useTaskDetailStore.getState().openTaskId).toBe('task-123')
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)

      // User hides sidebar but task remains selected
      setRightSidebarVisible(false)
      expect(useTaskDetailStore.getState().openTaskId).toBe('task-123')
      expect(useUIStore.getState().rightSidebarVisible).toBe(false)

      // Re-opening shows the same task
      setRightSidebarVisible(true)
      expect(useTaskDetailStore.getState().openTaskId).toBe('task-123')
    })

    it('setOpenTaskId can be used to change task without affecting visibility', () => {
      const { openTask, setOpenTaskId } = useTaskDetailStore.getState()

      // First open with sidebar visible
      openTask('task-1')
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)

      // Change task without re-triggering sidebar visibility
      setOpenTaskId('task-2')
      expect(useTaskDetailStore.getState().openTaskId).toBe('task-2')
      expect(useUIStore.getState().rightSidebarVisible).toBe(true)

      // Hide sidebar, then change task
      useUIStore.getState().setRightSidebarVisible(false)
      setOpenTaskId('task-3')
      expect(useTaskDetailStore.getState().openTaskId).toBe('task-3')
      expect(useUIStore.getState().rightSidebarVisible).toBe(false)
    })
  })
})
