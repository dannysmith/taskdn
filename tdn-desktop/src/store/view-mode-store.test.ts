import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useViewModeStore,
  useViewMode,
  type ViewModeKey,
} from './view-mode-store'
import type { ViewMode } from '@/components/ui/view-toggle'

describe('view-mode-store', () => {
  // Helper to get default initial state
  const getDefaultState = () => ({
    modes: {
      'this-week': 'calendar' as ViewMode,
      project: 'list' as ViewMode,
      area: 'list' as ViewMode,
    },
  })

  beforeEach(() => {
    // Reset store state before each test
    useViewModeStore.setState(getDefaultState())
  })

  describe('initial state', () => {
    it('has calendar mode for this-week view', () => {
      const state = useViewModeStore.getState()
      expect(state.modes['this-week']).toBe('calendar')
    })

    it('has list mode for project view', () => {
      const state = useViewModeStore.getState()
      expect(state.modes.project).toBe('list')
    })

    it('has list mode for area view', () => {
      const state = useViewModeStore.getState()
      expect(state.modes.area).toBe('list')
    })
  })

  describe('setViewMode', () => {
    it('sets mode for this-week view', () => {
      const { setViewMode } = useViewModeStore.getState()

      setViewMode('this-week', 'kanban')

      expect(useViewModeStore.getState().modes['this-week']).toBe('kanban')
    })

    it('sets mode for project view', () => {
      const { setViewMode } = useViewModeStore.getState()

      setViewMode('project', 'kanban')

      expect(useViewModeStore.getState().modes.project).toBe('kanban')
    })

    it('sets mode for area view', () => {
      const { setViewMode } = useViewModeStore.getState()

      setViewMode('area', 'kanban')

      expect(useViewModeStore.getState().modes.area).toBe('kanban')
    })

    it('preserves other view modes when changing one', () => {
      const { setViewMode } = useViewModeStore.getState()

      setViewMode('project', 'kanban')

      const state = useViewModeStore.getState()
      expect(state.modes['this-week']).toBe('calendar') // unchanged
      expect(state.modes.project).toBe('kanban') // changed
      expect(state.modes.area).toBe('list') // unchanged
    })

    it('allows switching between modes', () => {
      const { setViewMode } = useViewModeStore.getState()

      setViewMode('project', 'kanban')
      expect(useViewModeStore.getState().modes.project).toBe('kanban')

      setViewMode('project', 'list')
      expect(useViewModeStore.getState().modes.project).toBe('list')
    })
  })

  describe('useViewMode hook', () => {
    describe('this-week view', () => {
      it('returns calendar mode by default', () => {
        const { result } = renderHook(() => useViewMode('this-week'))

        expect(result.current.viewMode).toBe('calendar')
      })

      it('returns available modes (calendar and kanban)', () => {
        const { result } = renderHook(() => useViewMode('this-week'))

        expect(result.current.availableModes).toEqual(['calendar', 'kanban'])
      })

      it('updates mode via setViewMode', () => {
        const { result } = renderHook(() => useViewMode('this-week'))

        act(() => {
          result.current.setViewMode('kanban')
        })

        expect(result.current.viewMode).toBe('kanban')
      })
    })

    describe('project view', () => {
      it('returns list mode by default', () => {
        const { result } = renderHook(() => useViewMode('project'))

        expect(result.current.viewMode).toBe('list')
      })

      it('returns available modes (list and kanban)', () => {
        const { result } = renderHook(() => useViewMode('project'))

        expect(result.current.availableModes).toEqual(['list', 'kanban'])
      })

      it('updates mode via setViewMode', () => {
        const { result } = renderHook(() => useViewMode('project'))

        act(() => {
          result.current.setViewMode('kanban')
        })

        expect(result.current.viewMode).toBe('kanban')
      })
    })

    describe('area view', () => {
      it('returns list mode by default', () => {
        const { result } = renderHook(() => useViewMode('area'))

        expect(result.current.viewMode).toBe('list')
      })

      it('returns available modes (list and kanban)', () => {
        const { result } = renderHook(() => useViewMode('area'))

        expect(result.current.availableModes).toEqual(['list', 'kanban'])
      })

      it('updates mode via setViewMode', () => {
        const { result } = renderHook(() => useViewMode('area'))

        act(() => {
          result.current.setViewMode('kanban')
        })

        expect(result.current.viewMode).toBe('kanban')
      })
    })

    describe('multiple views', () => {
      it('maintains independent state per view key', () => {
        const { result: projectResult } = renderHook(() =>
          useViewMode('project')
        )
        const { result: areaResult } = renderHook(() => useViewMode('area'))

        act(() => {
          projectResult.current.setViewMode('kanban')
        })

        expect(projectResult.current.viewMode).toBe('kanban')
        expect(areaResult.current.viewMode).toBe('list') // unchanged
      })
    })
  })
})
