import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  quickSearchOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null
  /** Set of area IDs that are collapsed in the sidebar */
  collapsedAreaIds: Set<string>

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setQuickSearchOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setLastQuickPaneEntry: (text: string) => void
  /** Toggle the collapsed state of a specific area */
  toggleAreaCollapsed: (areaId: string) => void
  /** Set the collapsed state of a specific area */
  setAreaCollapsed: (areaId: string, collapsed: boolean) => void
  /** Collapse all areas */
  collapseAllAreas: (areaIds: string[]) => void
  /** Expand all areas */
  expandAllAreas: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      rightSidebarVisible: true,
      commandPaletteOpen: false,
      quickSearchOpen: false,
      preferencesOpen: false,
      lastQuickPaneEntry: null,
      collapsedAreaIds: new Set<string>(),

      toggleLeftSidebar: () =>
        set(
          state => ({ leftSidebarVisible: !state.leftSidebarVisible }),
          undefined,
          'toggleLeftSidebar'
        ),

      setLeftSidebarVisible: visible =>
        set(
          { leftSidebarVisible: visible },
          undefined,
          'setLeftSidebarVisible'
        ),

      toggleRightSidebar: () =>
        set(
          state => ({ rightSidebarVisible: !state.rightSidebarVisible }),
          undefined,
          'toggleRightSidebar'
        ),

      setRightSidebarVisible: visible =>
        set(
          { rightSidebarVisible: visible },
          undefined,
          'setRightSidebarVisible'
        ),

      toggleCommandPalette: () =>
        set(
          state => ({ commandPaletteOpen: !state.commandPaletteOpen }),
          undefined,
          'toggleCommandPalette'
        ),

      setCommandPaletteOpen: open =>
        set({ commandPaletteOpen: open }, undefined, 'setCommandPaletteOpen'),

      setQuickSearchOpen: open =>
        set({ quickSearchOpen: open }, undefined, 'setQuickSearchOpen'),

      togglePreferences: () =>
        set(
          state => ({ preferencesOpen: !state.preferencesOpen }),
          undefined,
          'togglePreferences'
        ),

      setPreferencesOpen: open =>
        set({ preferencesOpen: open }, undefined, 'setPreferencesOpen'),

      setLastQuickPaneEntry: text =>
        set({ lastQuickPaneEntry: text }, undefined, 'setLastQuickPaneEntry'),

      toggleAreaCollapsed: areaId =>
        set(
          state => {
            const newSet = new Set(state.collapsedAreaIds)
            if (newSet.has(areaId)) {
              newSet.delete(areaId)
            } else {
              newSet.add(areaId)
            }
            return { collapsedAreaIds: newSet }
          },
          undefined,
          'toggleAreaCollapsed'
        ),

      setAreaCollapsed: (areaId, collapsed) =>
        set(
          state => {
            const newSet = new Set(state.collapsedAreaIds)
            if (collapsed) {
              newSet.add(areaId)
            } else {
              newSet.delete(areaId)
            }
            return { collapsedAreaIds: newSet }
          },
          undefined,
          'setAreaCollapsed'
        ),

      collapseAllAreas: areaIds =>
        set(
          { collapsedAreaIds: new Set(areaIds) },
          undefined,
          'collapseAllAreas'
        ),

      expandAllAreas: () =>
        set({ collapsedAreaIds: new Set() }, undefined, 'expandAllAreas'),
    }),
    {
      name: 'ui-store',
    }
  )
)
