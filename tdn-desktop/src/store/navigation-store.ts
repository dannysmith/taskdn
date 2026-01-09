import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Selection } from '@/types/navigation'

/**
 * Navigation store for managing sidebar selection and view routing.
 *
 * This store tracks which sidebar item is selected (nav item, area, project, etc.)
 * and provides the state needed for MainWindowContent to render the appropriate view.
 */
interface NavigationState {
  selection: Selection | null

  setSelection: (selection: Selection) => void
}

export const useNavigationStore = create<NavigationState>()(
  devtools(
    set => ({
      // Default to Today view
      selection: { type: 'nav', id: 'today' },

      setSelection: selection => set({ selection }, undefined, 'setSelection'),
    }),
    {
      name: 'navigation-store',
    }
  )
)
