import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore } from './navigation-store'
import type { NavId } from '@/types/navigation'

describe('navigation-store', () => {
  // Helper to get default initial state
  const getDefaultState = () => ({
    selection: { type: 'nav' as const, id: 'today' as NavId },
  })

  beforeEach(() => {
    // Reset store state before each test
    useNavigationStore.setState(getDefaultState())
  })

  describe('initial state', () => {
    it('defaults to Today view', () => {
      const state = useNavigationStore.getState()

      expect(state.selection).toEqual({ type: 'nav', id: 'today' })
    })
  })

  describe('setSelection', () => {
    describe('nav selection', () => {
      it('sets Today nav selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'nav', id: 'today' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'today',
        })
      })

      it('sets This Week nav selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'nav', id: 'this-week' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'this-week',
        })
      })

      it('sets Inbox nav selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'nav', id: 'inbox' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'inbox',
        })
      })

      it('sets Calendar nav selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'nav', id: 'calendar' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'calendar',
        })
      })
    })

    describe('area selection', () => {
      it('sets area selection with ID', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'area', id: 'area-123' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'area',
          id: 'area-123',
        })
      })

      it('sets different area selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'area', id: 'work-area' })
        setSelection({ type: 'area', id: 'personal-area' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'area',
          id: 'personal-area',
        })
      })
    })

    describe('project selection', () => {
      it('sets project selection with ID', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'project', id: 'project-456' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'project',
          id: 'project-456',
        })
      })

      it('sets different project selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'project', id: 'launch-project' })
        setSelection({ type: 'project', id: 'redesign-project' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'project',
          id: 'redesign-project',
        })
      })
    })

    describe('no-area selection', () => {
      it('sets no-area selection', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'no-area' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'no-area',
        })
      })
    })

    describe('selection type transitions', () => {
      it('transitions from nav to area', () => {
        const { setSelection } = useNavigationStore.getState()

        // Start at today (nav)
        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'today',
        })

        // Switch to area
        setSelection({ type: 'area', id: 'work' })
        expect(useNavigationStore.getState().selection).toEqual({
          type: 'area',
          id: 'work',
        })
      })

      it('transitions from area to project', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'area', id: 'work' })
        setSelection({ type: 'project', id: 'launch' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'project',
          id: 'launch',
        })
      })

      it('transitions from project to nav', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'project', id: 'launch' })
        setSelection({ type: 'nav', id: 'inbox' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'inbox',
        })
      })

      it('transitions from no-area back to nav', () => {
        const { setSelection } = useNavigationStore.getState()

        setSelection({ type: 'no-area' })
        setSelection({ type: 'nav', id: 'today' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'today',
        })
      })
    })
  })
})
