import { useState, useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useVaultData, useVaultHelpers } from '@/services/vault'
import type { SidebarOrder } from '@/types/sidebar-order'
import { ORPHAN_CONTAINER_ID } from '@/types/sidebar-order'

/**
 * Manages sidebar display order separately from entity data.
 *
 * This hook tracks the visual ordering of areas and projects in the sidebar,
 * allowing drag-and-drop reordering without modifying the underlying entities.
 *
 * Adapted from the mockup to use TanStack Query hooks (useVaultData)
 * instead of synchronous AppDataContext.
 *
 * The order state tracks manual reordering. When no manual reorder has occurred,
 * items are displayed in their natural order from the data source.
 *
 * @returns Object with ordered data and reorder functions
 */
export function useSidebarOrder() {
  const { areas, projects } = useVaultData()
  const { getActiveAreas } = useVaultHelpers()

  // Get active (non-archived) areas
  const activeAreas = getActiveAreas()

  // Manual reorder overrides (null = use natural order from data)
  const [areaOrderOverride, setAreaOrderOverride] = useState<string[] | null>(
    null
  )
  const [projectOrderOverride, setProjectOrderOverride] = useState<Record<
    string,
    string[]
  > | null>(null)

  // Compute effective area order
  const effectiveAreaOrder = useMemo(() => {
    if (areaOrderOverride) {
      // Filter to only include IDs that still exist in data
      return areaOrderOverride.filter(id => activeAreas.some(a => a.id === id))
    }
    return activeAreas.map(a => a.id)
  }, [areaOrderOverride, activeAreas])

  // Compute effective project order for a container
  const getEffectiveProjectOrder = useCallback(
    (containerId: string): string[] => {
      if (projectOrderOverride?.[containerId]) {
        // Filter to only include IDs that still exist
        return projectOrderOverride[containerId].filter(id =>
          projects.some(p => p.id === id)
        )
      }
      // Default: projects in natural order
      if (containerId === ORPHAN_CONTAINER_ID) {
        return projects.filter(p => !p.area).map(p => p.id)
      }
      return projects.filter(p => p.area?.includes(containerId)).map(p => p.id)
    },
    [projectOrderOverride, projects]
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

  // Reorder areas
  const reorderAreas = useCallback(
    (activeId: string, overId: string) => {
      const currentOrder = effectiveAreaOrder
      const oldIndex = currentOrder.indexOf(activeId)
      const newIndex = currentOrder.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      setAreaOrderOverride(arrayMove(currentOrder, oldIndex, newIndex))
    },
    [effectiveAreaOrder]
  )

  // Reorder projects within the same container
  const reorderProjectsInArea = useCallback(
    (containerId: string, activeId: string, overId: string) => {
      const containerProjects = getEffectiveProjectOrder(containerId)
      const oldIndex = containerProjects.indexOf(activeId)
      const newIndex = containerProjects.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      setProjectOrderOverride(prev => ({
        ...prev,
        [containerId]: arrayMove(containerProjects, oldIndex, newIndex),
      }))
    },
    [getEffectiveProjectOrder]
  )

  // Move project to a different area (updates display order only for now)
  // TODO: Call updateProjectArea mutation to persist the change
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

      setProjectOrderOverride(prev => ({
        ...prev,
        [fromContainerId]: fromProjects,
        [toContainerId]: toProjects,
      }))

      // TODO: Call updateProjectArea mutation to persist the change
      // const newAreaId = toContainerId === ORPHAN_CONTAINER_ID ? null : toContainerId
      // updateProjectArea(projectId, newAreaId)
    },
    [getEffectiveProjectOrder]
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
