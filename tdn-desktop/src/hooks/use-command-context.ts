import { openUrl } from '@tauri-apps/plugin-opener'
import { useUIStore } from '@/store/ui-store'
import { useNavigationStore } from '@/store/navigation-store'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { notify } from '@/lib/notifications'
import { queryClient } from '@/lib/query-client'
import { vaultQueryKeys } from '@/services/vault'
import type { CommandContext } from '@/lib/commands/types'
import type { Area, Project, Task } from '@/lib/tauri-bindings'
import type { NavId } from '@/types/navigation'

/**
 * Module-level singleton actions safe to call outside React components.
 * Uses getState() at call time, so treat as imperative helpers, not hooks.
 * Note: Store must be initialized before use (always true after app mount).
 *
 * Exported for use in non-React contexts (e.g., menu handlers).
 */
export const commandContext: CommandContext = {
  // Preferences
  openPreferences: () => useUIStore.getState().setPreferencesOpen(true),

  // Notifications
  showToast: (message, type = 'info') =>
    void notify(message, undefined, { type }),

  // Navigation
  navigateToView: (view: NavId) =>
    useNavigationStore.getState().setSelection({ type: 'nav', id: view }),
  navigateToArea: (areaId: string) =>
    useNavigationStore.getState().setSelection({ type: 'area', id: areaId }),
  navigateToProject: (projectId: string) =>
    useNavigationStore
      .getState()
      .setSelection({ type: 'project', id: projectId }),
  navigateToNoArea: () =>
    useNavigationStore.getState().setSelection({ type: 'no-area' }),

  // Data access (reads from TanStack Query cache)
  getAreas: () => {
    const areas = queryClient.getQueryData<Area[]>(vaultQueryKeys.areas())
    return areas ?? []
  },
  getProjects: () => {
    const projects = queryClient.getQueryData<Project[]>(
      vaultQueryKeys.projects()
    )
    return projects ?? []
  },

  // Sidebar management
  collapseAllAreas: () => {
    const areas = queryClient.getQueryData<Area[]>(vaultQueryKeys.areas())
    const activeAreas = areas?.filter(a => a.status !== 'archived') ?? []
    useUIStore.getState().collapseAllAreas(activeAreas.map(a => a.id))
  },
  expandAllAreas: () => useUIStore.getState().expandAllAreas(),

  // External URLs
  openExternalUrl: (url: string) => void openUrl(url),

  // Task selection (reads from task-detail-store)
  get selectedTaskId() {
    return useTaskDetailStore.getState().openTaskId
  },
  getSelectedTask: () => {
    const taskId = useTaskDetailStore.getState().openTaskId
    if (!taskId) return null

    const tasks = queryClient.getQueryData<Task[]>(vaultQueryKeys.tasks())
    return tasks?.find(t => t.id === taskId) ?? null
  },

  // Task operations
  openTask: (taskId: string) => {
    useTaskDetailStore.getState().openTask(taskId)
  },
}

/**
 * Command context hook - provides essential actions for commands.
 * Returns a stable reference to avoid unnecessary re-renders.
 */
export function useCommandContext(): CommandContext {
  return commandContext
}
