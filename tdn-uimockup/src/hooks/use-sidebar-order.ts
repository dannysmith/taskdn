import { useState, useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import type { SidebarOrder } from '@/types/sidebar-order'
import { ORPHAN_CONTAINER_ID } from '@/types/sidebar-order'

/**
 * Manages sidebar display order separately from entity data.
 *
 * This hook tracks the visual ordering of areas and projects in the sidebar,
 * allowing drag-and-drop reordering without modifying the underlying entities.
 *
 * When a project is moved to a different area, this hook updates both:
 * 1. The display order (local state)
 * 2. The project's areaId (via updateProjectArea from AppDataContext)
 *
 * @returns Object with ordered data and reorder functions:
 *   - `order` - Internal display-order state (SidebarOrder) with areaOrder and projectOrder maps
 *   - `orderedAreas` - Area objects in display order
 *   - `orderedOrphanProjects` - Projects without an area, in display order
 *   - `getOrderedProjects(containerId)` - Get projects for an area in display order
 *   - `reorderAreas(activeId, overId)` - Swap two areas in the sidebar
 *   - `reorderProjectsInArea(containerId, activeId, overId)` - Reorder within an area
 *   - `moveProjectToArea(projectId, fromId, toId, insertIndex?)` - Move project to new area
 */
export function useSidebarOrder() {
  const { data, updateProjectArea } = useAppData()

  // Initialize order from current data
  const [order, setOrder] = useState<SidebarOrder>(() => {
    const areaOrder = data.areas.map((a) => a.id)

    const projectOrder: Record<string, string[]> = {}

    // Projects for each area
    for (const area of data.areas) {
      projectOrder[area.id] = data.projects
        .filter((p) => p.areaId === area.id)
        .map((p) => p.id)
    }

    // Orphan projects
    projectOrder[ORPHAN_CONTAINER_ID] = data.projects
      .filter((p) => !p.areaId)
      .map((p) => p.id)

    return { areaOrder, projectOrder }
  })

  // Reorder areas
  const reorderAreas = useCallback((activeId: string, overId: string) => {
    setOrder((prev) => {
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
      setOrder((prev) => {
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

  // Move project to a different area (updates both order and entity data)
  const moveProjectToArea = useCallback(
    (
      projectId: string,
      fromContainerId: string,
      toContainerId: string,
      insertIndex?: number
    ) => {
      // Update display order
      setOrder((prev) => {
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

      // Update entity data (project.areaId)
      const newAreaId =
        toContainerId === ORPHAN_CONTAINER_ID ? null : toContainerId
      updateProjectArea(projectId, newAreaId)
    },
    [updateProjectArea]
  )

  // Get ordered areas (returns Area objects in display order)
  const orderedAreas = useMemo(() => {
    return order.areaOrder
      .map((id) => data.areas.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined)
  }, [order.areaOrder, data.areas])

  // Get ordered projects for a container
  const getOrderedProjects = useCallback(
    (containerId: string) => {
      const projectIds = order.projectOrder[containerId] ?? []
      return projectIds
        .map((id) => data.projects.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
    },
    [order.projectOrder, data.projects]
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
