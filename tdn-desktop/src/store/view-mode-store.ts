import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { ViewMode } from '@/components/ui/view-toggle'

/**
 * View Mode Store - Persists list/kanban/calendar selection per view type.
 *
 * Each view type (this-week, project, area) can have its own view mode,
 * allowing users to prefer different layouts for different contexts.
 * For example: calendar for weekly view, list for project view.
 *
 * This is independent of entity data and works immediately.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Keys for storing view mode by view type */
export type ViewModeKey = 'this-week' | 'project' | 'area'

interface ViewModeState {
  modes: Record<ViewModeKey, ViewMode>
  setViewMode: (key: ViewModeKey, mode: ViewMode) => void
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const defaultModes: Record<ViewModeKey, ViewMode> = {
  'this-week': 'calendar',
  project: 'list',
  area: 'list',
}

const availableModes: Record<ViewModeKey, ViewMode[]> = {
  'this-week': ['calendar', 'kanban'],
  project: ['list', 'kanban'],
  area: ['list', 'kanban'],
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useViewModeStore = create<ViewModeState>()(
  devtools(
    persist(
      set => ({
        modes: defaultModes,
        setViewMode: (key, mode) =>
          set(
            state => ({ modes: { ...state.modes, [key]: mode } }),
            undefined,
            'setViewMode'
          ),
      }),
      { name: 'view-mode-storage', version: 1 }
    ),
    { name: 'view-mode-store' }
  )
)

// -----------------------------------------------------------------------------
// Convenience Hook
// -----------------------------------------------------------------------------

/**
 * Hook to get and set the view mode for a specific view type.
 * Provides the same API as the old useViewMode context hook.
 */
export function useViewMode(key: ViewModeKey) {
  const viewMode = useViewModeStore(
    state => state.modes[key] ?? defaultModes[key]
  )
  const setViewModeAction = useViewModeStore(state => state.setViewMode)

  const setViewMode = (mode: ViewMode) => setViewModeAction(key, mode)
  const modes = availableModes[key]

  return { viewMode, setViewMode, availableModes: modes }
}
