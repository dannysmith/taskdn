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
 * @returns Object with ordered data and reorder functions:
 *   - `order` - Internal display-order state (SidebarOrder)
 *   - `orderedAreas` - Area objects in display order
 *   - `orderedOrphanProjects` - Projects without an area, in display order
 *   - `getOrderedProjects(containerId)` - Get projects for an area in display order
 *   - `reorderAreas(activeId, overId)` - Swap two areas in the sidebar
 *   - `reorderProjectsInArea(containerId, activeId, overId)` - Reorder within an area
 *   - `moveProjectToArea(projectId, fromId, toId, insertIndex?)` - Move project to new area
 */
export function useSidebarOrder() {
  const { areas, projects } = useVaultData()
  const { getActiveAreas } = useVaultHelpers()

  // Get active (non-archived) areas
  const activeAreas = getActiveAreas()

  // Initialize order from current data
  const [order, setOrder] = useState<SidebarOrder>(() => {
    const areaOrder = activeAreas.map(a => a.id)

    const projectOrder: Record<string, string[]> = {}

    // Projects for each area
    for (const area of activeAreas) {
      projectOrder[area.id] = projects
        .filter(p => p.area?.includes(area.id))
        .map(p => p.id)
    }

    // Orphan projects
    projectOrder[ORPHAN_CONTAINER_ID] = projects
      .filter(p => !p.area)
      .map(p => p.id)

    return { areaOrder, projectOrder }
  })

  // Reorder areas
  const reorderAreas = useCallback((activeId: string, overId: string) => {
    setOrder(prev => {
      const oldIndex = prev.areaOrder.indexOf(activeId)
      const newIndex = prev.areaOrder.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return prev

      return {
        ...prev,
        areaOrder: arrayMove(prev.areaOrder, oldIndex, newIndex),
      }
    })
  }, [])

  // Reorder projects within the same container
  const reorderProjectsInArea = useCallback(
    (containerId: string, activeId: string, overId: string) => {
      setOrder(prev => {
        const containerProjects = prev.projectOrder[containerId] ?? []
        const oldIndex = containerProjects.indexOf(activeId)
        const newIndex = containerProjects.indexOf(overId)
        if (oldIndex === -1 || newIndex === -1) return prev

        return {
          ...prev,
          projectOrder: {
            ...prev.projectOrder,
            [containerId]: arrayMove(containerProjects, oldIndex, newIndex),
          },
        }
      })
    },
    []
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
      // Update display order
      setOrder(prev => {
        const fromProjects = [...(prev.projectOrder[fromContainerId] ?? [])]
        const toProjects = [...(prev.projectOrder[toContainerId] ?? [])]

        // Remove from source
        const sourceIndex = fromProjects.indexOf(projectId)
        if (sourceIndex !== -1) {
          fromProjects.splice(sourceIndex, 1)
        }

        // Add to target at specified index or end
        const targetIndex = insertIndex ?? toProjects.length
        toProjects.splice(targetIndex, 0, projectId)

        return {
          ...prev,
          projectOrder: {
            ...prev.projectOrder,
            [fromContainerId]: fromProjects,
            [toContainerId]: toProjects,
          },
        }
      })

      // TODO: Call updateProjectArea mutation to persist the change
      // const newAreaId = toContainerId === ORPHAN_CONTAINER_ID ? null : toContainerId
      // updateProjectArea(projectId, newAreaId)
    },
    []
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
