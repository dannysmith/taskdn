import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ViewMode } from '@/components/ui/view-toggle'

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
    (set) => ({
      modes: defaultModes,
      setViewMode: (key, mode) =>
        set(
          (state) => ({ modes: { ...state.modes, [key]: mode } }),
          undefined,
          'setViewMode'
        ),
    }),
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
    (state) => state.modes[key] ?? defaultModes[key]
  )
  const setViewModeAction = useViewModeStore((state) => state.setViewMode)

  const setViewMode = (mode: ViewMode) => setViewModeAction(key, mode)
  const modes = availableModes[key]

  return { viewMode, setViewMode, availableModes: modes }
}
