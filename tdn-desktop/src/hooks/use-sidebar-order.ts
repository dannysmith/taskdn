import { useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import {
  useVaultData,
  useVaultHelpers,
  useUpdateProject,
} from '@/services/vault'
import { useDisplayOrderStore } from '@/store/display-order-store'
import type { SidebarOrder } from '@/types/sidebar-order'
import { ORPHAN_CONTAINER_ID } from '@/types/sidebar-order'

/**
 * Manages sidebar display order separately from entity data.
 *
 * This hook tracks the visual ordering of areas and projects in the sidebar,
 * allowing drag-and-drop reordering without modifying the underlying entities
 * (except when moving projects to a different area, which updates the vault).
 *
 * Order state is stored in Zustand (session-persistent, survives unmount).
 * When no manual reorder has occurred (null), items display in natural order.
 *
 * Key behaviors:
 * - Reordering within an area: Updates visual order only (Zustand)
 * - Moving project to different area: Updates visual order AND calls mutation
 *   to persist the area change to the vault file
 */
export function useSidebarOrder() {
  const { areas, projects } = useVaultData()
  const { getActiveAreas } = useVaultHelpers()
  const updateProjectMutation = useUpdateProject()

  // Get active (non-archived) areas
  const activeAreas = getActiveAreas()

  // Get order state from Zustand (using selector syntax for performance)
  const sidebarAreaOrder = useDisplayOrderStore(state => state.sidebarAreaOrder)
  const sidebarProjectOrder = useDisplayOrderStore(
    state => state.sidebarProjectOrder
  )

  // Compute effective area order
  const effectiveAreaOrder = useMemo(() => {
    if (sidebarAreaOrder) {
      // Filter to only include IDs that still exist in data
      return sidebarAreaOrder.filter(id => activeAreas.some(a => a.id === id))
    }
    return activeAreas.map(a => a.id)
  }, [sidebarAreaOrder, activeAreas])

  // Compute effective project order for a container
  const getEffectiveProjectOrder = useCallback(
    (containerId: string): string[] => {
      if (sidebarProjectOrder?.[containerId]) {
        // Filter to only include IDs that still exist
        return sidebarProjectOrder[containerId].filter(id =>
          projects.some(p => p.id === id)
        )
      }
      // Default: projects in natural order
      if (containerId === ORPHAN_CONTAINER_ID) {
        return projects.filter(p => !p.area).map(p => p.id)
      }
      // Find area by ID to get its title for wikilink matching
      // Project.area is a wikilink like "[[Finance]]", not an ID
      const area = areas.find(a => a.id === containerId)
      if (!area) return []
      return projects.filter(p => p.area?.includes(area.title)).map(p => p.id)
    },
    [sidebarProjectOrder, projects, areas]
  )

  // Build order object for compatibility
  const order = useMemo<SidebarOrder>(() => {
    const projectOrder: Record<string, string[]> = {}
    for (const area of activeAreas) {
      projectOrder[area.id] = getEffectiveProjectOrder(area.id)
    }
    projectOrder[ORPHAN_CONTAINER_ID] =
      getEffectiveProjectOrder(ORPHAN_CONTAINER_ID)
    return { areaOrder: effectiveAreaOrder, projectOrder }
  }, [effectiveAreaOrder, activeAreas, getEffectiveProjectOrder])

  // Reorder areas (visual order only)
  const reorderAreas = useCallback(
    (activeId: string, overId: string) => {
      const currentOrder = effectiveAreaOrder
      const oldIndex = currentOrder.indexOf(activeId)
      const newIndex = currentOrder.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      const { setSidebarAreaOrder } = useDisplayOrderStore.getState()
      setSidebarAreaOrder(arrayMove(currentOrder, oldIndex, newIndex))
    },
    [effectiveAreaOrder]
  )

  // Reorder projects within the same container (visual order only)
  const reorderProjectsInArea = useCallback(
    (containerId: string, activeId: string, overId: string) => {
      const containerProjects = getEffectiveProjectOrder(containerId)
      const oldIndex = containerProjects.indexOf(activeId)
      const newIndex = containerProjects.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      const { setSidebarProjectOrder } = useDisplayOrderStore.getState()
      setSidebarProjectOrder(
        containerId,
        arrayMove(containerProjects, oldIndex, newIndex)
      )
    },
    [getEffectiveProjectOrder]
  )

  // Move project to a different area
  // This updates BOTH visual order AND persists the area change to vault
  const moveProjectToArea = useCallback(
    (
      projectId: string,
      fromContainerId: string,
      toContainerId: string,
      insertIndex?: number
    ) => {
      const fromProjects = [...getEffectiveProjectOrder(fromContainerId)]
      const toProjects = [...getEffectiveProjectOrder(toContainerId)]

      // Remove from source
      const sourceIndex = fromProjects.indexOf(projectId)
      if (sourceIndex !== -1) {
        fromProjects.splice(sourceIndex, 1)
      }

      // Add to target at specified index or end
      const targetIndex = insertIndex ?? toProjects.length
      toProjects.splice(targetIndex, 0, projectId)

      // Update visual order in Zustand
      const { setSidebarProjectOrderBatch } = useDisplayOrderStore.getState()
      setSidebarProjectOrderBatch({
        [fromContainerId]: fromProjects,
        [toContainerId]: toProjects,
      })

      // Persist the area change to vault
      // Area value should be the wikilink format, or empty string to clear
      let newAreaValue: string
      if (toContainerId === ORPHAN_CONTAINER_ID) {
        // Moving to orphan = clearing the area
        newAreaValue = ''
      } else {
        // Moving to an area = set area to the area's title (will be converted to wikilink)
        const targetArea = areas.find(a => a.id === toContainerId)
        newAreaValue = targetArea?.title ?? ''
      }

      // Call mutation to update the project file
      updateProjectMutation.mutate({
        id: projectId,
        area: newAreaValue,
        // All other fields null = don't change
        title: null,
        status: null,
        description: null,
        startDate: null,
        endDate: null,
        body: null,
      })
    },
    [getEffectiveProjectOrder, areas, updateProjectMutation]
  )

  // Get ordered areas (returns Area objects in display order)
  const orderedAreas = useMemo(() => {
    return order.areaOrder
      .map(id => areas.find(a => a.id === id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined)
  }, [order.areaOrder, areas])

  // Get ordered projects for a container
  const getOrderedProjects = useCallback(
    (containerId: string) => {
      const projectIds = order.projectOrder[containerId] ?? []
      return projectIds
        .map(id => projects.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
    },
    [order.projectOrder, projects]
  )

  // Get ordered orphan projects
  const orderedOrphanProjects = useMemo(() => {
    return getOrderedProjects(ORPHAN_CONTAINER_ID)
  }, [getOrderedProjects])

  return {
    order,
    orderedAreas,
    orderedOrphanProjects,
    getOrderedProjects,
    reorderAreas,
    reorderProjectsInArea,
    moveProjectToArea,
  }
}
