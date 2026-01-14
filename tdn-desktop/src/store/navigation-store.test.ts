import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NavId } from '@/types/navigation'

// Mock the query client for validity checks
const mockAreas = [
  { id: 'area-1', title: 'Work', status: 'active' },
  { id: 'area-2', title: 'Personal', status: 'active' },
]

const mockProjects = [
  { id: 'project-1', title: 'Launch', status: 'active' },
  { id: 'project-2', title: 'Redesign', status: 'active' },
]

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    getQueryData: vi.fn((key: readonly string[]) => {
      if (key[1] === 'areas') return mockAreas
      if (key[1] === 'projects') return mockProjects
      return null
    }),
  },
}))

vi.mock('@/services/vault', () => ({
  vaultQueryKeys: {
    areas: () => ['vault', 'areas'] as const,
    projects: () => ['vault', 'projects'] as const,
  },
}))

const { useNavigationStore, selectionsEqual } =
  await import('./navigation-store')

describe('navigation-store', () => {
  // Helper to get clean initial state
  const getDefaultState = () => ({
    selection: { type: 'nav' as const, id: 'today' as NavId },
    history: [] as ReturnType<typeof useNavigationStore.getState>['history'],
    future: [] as ReturnType<typeof useNavigationStore.getState>['future'],
  })

  beforeEach(() => {
    // Reset store state before each test
    useNavigationStore.setState(getDefaultState())
  })

  describe('selectionsEqual', () => {
    it('returns true for equal nav selections', () => {
      expect(
        selectionsEqual(
          { type: 'nav', id: 'today' },
          { type: 'nav', id: 'today' }
        )
      ).toBe(true)
    })

    it('returns false for different nav selections', () => {
      expect(
        selectionsEqual(
          { type: 'nav', id: 'today' },
          { type: 'nav', id: 'inbox' }
        )
      ).toBe(false)
    })

    it('returns true for equal area selections', () => {
      expect(
        selectionsEqual(
          { type: 'area', id: 'work' },
          { type: 'area', id: 'work' }
        )
      ).toBe(true)
    })

    it('returns false for different area selections', () => {
      expect(
        selectionsEqual(
          { type: 'area', id: 'work' },
          { type: 'area', id: 'home' }
        )
      ).toBe(false)
    })

    it('returns true for equal project selections', () => {
      expect(
        selectionsEqual(
          { type: 'project', id: 'proj-1' },
          { type: 'project', id: 'proj-1' }
        )
      ).toBe(true)
    })

    it('returns true for no-area selections', () => {
      expect(selectionsEqual({ type: 'no-area' }, { type: 'no-area' })).toBe(
        true
      )
    })

    it('returns false for different types', () => {
      expect(
        selectionsEqual(
          { type: 'nav', id: 'today' },
          { type: 'area', id: 'work' }
        )
      ).toBe(false)
    })

    it('handles null values', () => {
      expect(selectionsEqual(null, null)).toBe(true)
      expect(selectionsEqual(null, { type: 'nav', id: 'today' })).toBe(false)
      expect(selectionsEqual({ type: 'nav', id: 'today' }, null)).toBe(false)
    })

    it('returns true for equal dev-nav selections', () => {
      expect(
        selectionsEqual(
          { type: 'dev-nav', id: 'component-reference' },
          { type: 'dev-nav', id: 'component-reference' }
        )
      ).toBe(true)
    })
  })

  describe('initial state', () => {
    it('defaults to Today view', () => {
      const state = useNavigationStore.getState()

      expect(state.selection).toEqual({ type: 'nav', id: 'today' })
    })

    it('starts with empty history and future', () => {
      const state = useNavigationStore.getState()

      expect(state.history).toEqual([])
      expect(state.future).toEqual([])
    })

    it('reports canGoBack as false initially', () => {
      const { canGoBack } = useNavigationStore.getState()

      expect(canGoBack()).toBe(false)
    })

    it('reports canGoForward as false initially', () => {
      const { canGoForward } = useNavigationStore.getState()

      expect(canGoForward()).toBe(false)
    })
  })

  describe('navigate', () => {
    describe('nav selection', () => {
      it('sets Today nav selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'nav', id: 'today' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'today',
        })
      })

      it('sets This Week nav selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'nav', id: 'this-week' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'this-week',
        })
      })

      it('sets Inbox nav selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'nav', id: 'inbox' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'inbox',
        })
      })

      it('sets Calendar nav selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'nav', id: 'calendar' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'calendar',
        })
      })
    })

    describe('area selection', () => {
      it('sets area selection with ID', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'area', id: 'area-123' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'area',
          id: 'area-123',
        })
      })

      it('sets different area selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'area', id: 'work-area' })
        navigate({ type: 'area', id: 'personal-area' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'area',
          id: 'personal-area',
        })
      })
    })

    describe('project selection', () => {
      it('sets project selection with ID', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'project', id: 'project-456' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'project',
          id: 'project-456',
        })
      })

      it('sets different project selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'project', id: 'launch-project' })
        navigate({ type: 'project', id: 'redesign-project' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'project',
          id: 'redesign-project',
        })
      })
    })

    describe('no-area selection', () => {
      it('sets no-area selection', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'no-area' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'no-area',
        })
      })
    })

    describe('selection type transitions', () => {
      it('transitions from nav to area', () => {
        const { navigate } = useNavigationStore.getState()

        // Start at today (nav)
        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'today',
        })

        // Switch to area
        navigate({ type: 'area', id: 'work' })
        expect(useNavigationStore.getState().selection).toEqual({
          type: 'area',
          id: 'work',
        })
      })

      it('transitions from area to project', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'area', id: 'work' })
        navigate({ type: 'project', id: 'launch' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'project',
          id: 'launch',
        })
      })

      it('transitions from project to nav', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'project', id: 'launch' })
        navigate({ type: 'nav', id: 'inbox' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'inbox',
        })
      })

      it('transitions from no-area back to nav', () => {
        const { navigate } = useNavigationStore.getState()

        navigate({ type: 'no-area' })
        navigate({ type: 'nav', id: 'today' })

        expect(useNavigationStore.getState().selection).toEqual({
          type: 'nav',
          id: 'today',
        })
      })
    })
  })

  describe('history tracking', () => {
    it('pushes previous selection to history on navigate', () => {
      const { navigate } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })

      expect(useNavigationStore.getState().history).toEqual([
        { type: 'nav', id: 'today' },
      ])
    })

    it('builds up history with multiple navigations', () => {
      const { navigate } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      navigate({ type: 'area', id: 'work' })
      navigate({ type: 'project', id: 'launch' })

      expect(useNavigationStore.getState().history).toEqual([
        { type: 'nav', id: 'today' },
        { type: 'nav', id: 'inbox' },
        { type: 'area', id: 'work' },
      ])
    })

    it('reports canGoBack as true after navigation', () => {
      const { navigate } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })

      expect(useNavigationStore.getState().canGoBack()).toBe(true)
    })

    it('does not add to history when navigating to same selection', () => {
      const { navigate } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'today' }) // Same as current

      expect(useNavigationStore.getState().history).toEqual([])
    })

    it('clears future stack on new navigation', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      navigate({ type: 'area', id: 'work' })
      goBack()

      // Future should have work area
      expect(useNavigationStore.getState().future).toEqual([
        { type: 'area', id: 'work' },
      ])

      // New navigation should clear future
      navigate({ type: 'project', id: 'launch' })

      expect(useNavigationStore.getState().future).toEqual([])
    })

    it('bounds history at 50 entries', () => {
      const { navigate } = useNavigationStore.getState()

      // Navigate 55 times (using nav selections which are always valid)
      for (let i = 0; i < 55; i++) {
        // Alternate between nav views to create distinct entries
        navigate({ type: 'nav', id: i % 2 === 0 ? 'inbox' : 'calendar' })
      }

      expect(useNavigationStore.getState().history.length).toBe(50)
      // First entry should be nav (from early in the sequence)
      expect(useNavigationStore.getState().history[0]?.type).toBe('nav')
    })
  })

  describe('goBack', () => {
    it('navigates to previous selection', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()

      expect(useNavigationStore.getState().selection).toEqual({
        type: 'nav',
        id: 'today',
      })
    })

    it('pushes current selection to future stack', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()

      expect(useNavigationStore.getState().future).toEqual([
        { type: 'nav', id: 'inbox' },
      ])
    })

    it('removes entry from history', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      navigate({ type: 'area', id: 'work' })
      goBack()

      expect(useNavigationStore.getState().history).toEqual([
        { type: 'nav', id: 'today' },
      ])
    })

    it('does nothing when history is empty', () => {
      const { goBack } = useNavigationStore.getState()

      const before = useNavigationStore.getState()
      goBack()
      const after = useNavigationStore.getState()

      expect(after.selection).toEqual(before.selection)
    })

    it('reports canGoBack as false after going back to start', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()

      expect(useNavigationStore.getState().canGoBack()).toBe(false)
    })

    it('reports canGoForward as true after going back', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()

      expect(useNavigationStore.getState().canGoForward()).toBe(true)
    })

    it('skips invalid area selections', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      // Navigate to areas - one exists, one doesn't
      navigate({ type: 'area', id: 'area-1' }) // Valid
      navigate({ type: 'area', id: 'deleted-area' }) // Invalid - doesn't exist
      navigate({ type: 'nav', id: 'inbox' })

      // Going back should skip deleted-area and go to area-1
      goBack()

      expect(useNavigationStore.getState().selection).toEqual({
        type: 'area',
        id: 'area-1',
      })
    })

    it('skips invalid project selections', () => {
      const { navigate, goBack } = useNavigationStore.getState()

      navigate({ type: 'project', id: 'project-1' }) // Valid
      navigate({ type: 'project', id: 'deleted-project' }) // Invalid
      navigate({ type: 'nav', id: 'inbox' })

      goBack()

      expect(useNavigationStore.getState().selection).toEqual({
        type: 'project',
        id: 'project-1',
      })
    })

    it('clears history if all entries are invalid', () => {
      // Start with only invalid areas in history (no valid entries)
      useNavigationStore.setState({
        selection: { type: 'nav', id: 'inbox' },
        history: [
          { type: 'area', id: 'deleted-1' },
          { type: 'area', id: 'deleted-2' },
        ],
        future: [],
      })

      const { goBack } = useNavigationStore.getState()
      goBack()

      // Should stay on inbox since no valid history entries
      expect(useNavigationStore.getState().selection).toEqual({
        type: 'nav',
        id: 'inbox',
      })
      expect(useNavigationStore.getState().history).toEqual([])
    })
  })

  describe('goForward', () => {
    it('navigates to next selection in future', () => {
      const { navigate, goBack, goForward } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()
      goForward()

      expect(useNavigationStore.getState().selection).toEqual({
        type: 'nav',
        id: 'inbox',
      })
    })

    it('pushes current selection to history', () => {
      const { navigate, goBack, goForward } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()
      goForward()

      expect(useNavigationStore.getState().history).toEqual([
        { type: 'nav', id: 'today' },
      ])
    })

    it('removes entry from future', () => {
      const { navigate, goBack, goForward } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      navigate({ type: 'area', id: 'work' })
      goBack()
      goBack()
      goForward()

      expect(useNavigationStore.getState().future).toEqual([
        { type: 'area', id: 'work' },
      ])
    })

    it('does nothing when future is empty', () => {
      const { navigate, goForward } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      const before = useNavigationStore.getState()
      goForward()
      const after = useNavigationStore.getState()

      expect(after.selection).toEqual(before.selection)
    })

    it('reports canGoForward as false after going forward to end', () => {
      const { navigate, goBack, goForward } = useNavigationStore.getState()

      navigate({ type: 'nav', id: 'inbox' })
      goBack()
      goForward()

      expect(useNavigationStore.getState().canGoForward()).toBe(false)
    })

    it('skips invalid selections in future', () => {
      const { navigate, goBack, goForward } = useNavigationStore.getState()

      navigate({ type: 'area', id: 'deleted-area' })
      navigate({ type: 'nav', id: 'inbox' })
      goBack()
      goBack()

      // Future should have deleted-area then inbox
      goForward()

      // Should skip deleted-area and go to inbox
      expect(useNavigationStore.getState().selection).toEqual({
        type: 'nav',
        id: 'inbox',
      })
    })
  })

  describe('back/forward flow', () => {
    it('handles complex navigation sequence', () => {
      const { navigate, goBack, goForward } = useNavigationStore.getState()

      // today -> inbox -> area-1 -> project-1 (using valid IDs from mock)
      navigate({ type: 'nav', id: 'inbox' })
      navigate({ type: 'area', id: 'area-1' })
      navigate({ type: 'project', id: 'project-1' })

      // Back to area-1
      goBack()
      expect(useNavigationStore.getState().selection).toEqual({
        type: 'area',
        id: 'area-1',
      })

      // Back to inbox
      goBack()
      expect(useNavigationStore.getState().selection).toEqual({
        type: 'nav',
        id: 'inbox',
      })

      // Forward to area-1
      goForward()
      expect(useNavigationStore.getState().selection).toEqual({
        type: 'area',
        id: 'area-1',
      })

      // New navigation clears future
      navigate({ type: 'no-area' })
      expect(useNavigationStore.getState().canGoForward()).toBe(false)

      // Back should go to area-1
      goBack()
      expect(useNavigationStore.getState().selection).toEqual({
        type: 'area',
        id: 'area-1',
      })
    })
  })
})
