import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/query-client'
import { vaultQueryKeys } from '@/services/vault'
import type { Area, Project } from '@/lib/tauri-bindings'
import type { Selection } from '@/types/navigation'

/** Maximum number of history entries to keep */
const MAX_HISTORY_SIZE = 50

/**
 * Check if two selections are equal.
 * Used to prevent duplicate consecutive entries in history.
 */
export function selectionsEqual(
  a: Selection | null,
  b: Selection | null
): boolean {
  if (a === null || b === null) return a === b
  if (a.type !== b.type) return false

  switch (a.type) {
    case 'nav':
      return b.type === 'nav' && a.id === b.id
    case 'dev-nav':
      return b.type === 'dev-nav' && a.id === b.id
    case 'area':
      return b.type === 'area' && a.id === b.id
    case 'project':
      return b.type === 'project' && a.id === b.id
    case 'no-area':
      return b.type === 'no-area'
  }
}

/**
 * Check if a selection is still valid (entity exists).
 * Returns true for nav items, checks cache for areas/projects.
 */
function isSelectionValid(selection: Selection): boolean {
  switch (selection.type) {
    case 'nav':
    case 'dev-nav':
    case 'no-area':
      // Always valid - these are static views
      return true

    case 'area': {
      const areas = queryClient.getQueryData<Area[]>(vaultQueryKeys.areas())
      return areas?.some(a => a.id === selection.id) ?? false
    }

    case 'project': {
      const projects = queryClient.getQueryData<Project[]>(
        vaultQueryKeys.projects()
      )
      return projects?.some(p => p.id === selection.id) ?? false
    }
  }
}

/**
 * Navigation store for managing sidebar selection, view routing, and navigation history.
 *
 * This store tracks which sidebar item is selected (nav item, area, project, etc.)
 * and provides browser-style back/forward navigation via history stacks.
 */
interface NavigationState {
  selection: Selection | null
  history: Selection[] // Past selections (stack, most recent last)
  future: Selection[] // Forward stack (cleared on new navigation)

  /** Navigate to a new selection, pushing current to history */
  navigate: (selection: Selection) => void

  /** Go back to previous selection */
  goBack: () => void

  /** Go forward to next selection */
  goForward: () => void

  /** Whether back navigation is available */
  canGoBack: () => boolean

  /** Whether forward navigation is available */
  canGoForward: () => boolean

  /** Reset navigation to default state (used when vault changes) */
  resetNavigation: () => void
}

export const useNavigationStore = create<NavigationState>()(
  devtools(
    (set, get) => ({
      // Default to Today view
      selection: { type: 'nav', id: 'today' },
      history: [],
      future: [],

      navigate: selection => {
        const { selection: current, history } = get()

        // Skip if navigating to the same selection
        if (selectionsEqual(current, selection)) {
          return
        }

        // Build new history, bounded by max size
        const newHistory =
          current !== null
            ? [...history, current].slice(-MAX_HISTORY_SIZE)
            : history

        set(
          {
            selection,
            history: newHistory,
            future: [], // Clear future on new navigation
          },
          undefined,
          'navigate'
        )
      },

      goBack: () => {
        const { selection: current, history, future } = get()

        if (history.length === 0) return

        // Find the first valid selection in history (searching from end)
        // and determine where to slice
        let validIndex = -1
        for (let i = history.length - 1; i >= 0; i--) {
          const entry = history[i]
          if (entry && isSelectionValid(entry)) {
            validIndex = i
            break
          }
        }

        if (validIndex === -1) {
          // No valid selections in history - clear it
          set({ history: [] }, undefined, 'goBack:noValid')
          return
        }

        const targetSelection = history[validIndex]
        const newHistory = history.slice(0, validIndex)

        // Push current to future stack
        const newFuture = current !== null ? [current, ...future] : future

        set(
          {
            selection: targetSelection,
            history: newHistory,
            future: newFuture,
          },
          undefined,
          'goBack'
        )
      },

      goForward: () => {
        const { selection: current, history, future } = get()

        if (future.length === 0) return

        // Find the first valid selection in future (searching from start)
        let validIndex = -1
        for (let i = 0; i < future.length; i++) {
          const entry = future[i]
          if (entry && isSelectionValid(entry)) {
            validIndex = i
            break
          }
        }

        if (validIndex === -1) {
          // No valid selections in future - clear it
          set({ future: [] }, undefined, 'goForward:noValid')
          return
        }

        const targetSelection = future[validIndex]
        const newFuture = future.slice(validIndex + 1)

        // Push current to history stack
        const newHistory =
          current !== null
            ? [...history, current].slice(-MAX_HISTORY_SIZE)
            : history

        set(
          {
            selection: targetSelection,
            history: newHistory,
            future: newFuture,
          },
          undefined,
          'goForward'
        )
      },

      canGoBack: () => get().history.length > 0,

      canGoForward: () => get().future.length > 0,

      resetNavigation: () =>
        set(
          {
            selection: { type: 'nav', id: 'today' },
            history: [],
            future: [],
          },
          undefined,
          'resetNavigation'
        ),
    }),
    {
      name: 'navigation-store',
    }
  )
)
