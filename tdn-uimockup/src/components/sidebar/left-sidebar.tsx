import * as React from 'react'
import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  CalendarIcon,
  CalendarDaysIcon,
  ChevronRight,
  FolderIcon,
  InboxIcon,
  PanelLeftIcon,
  SunIcon,
} from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAppData } from '@/context/app-data-context'
import { cn } from '@/lib/utils'
import { useSidebarOrder } from '@/hooks/use-sidebar-order'
import { DraggableArea } from './draggable-area'
import {
  DraggableProject,
  ProjectStatusIndicator,
  getProjectTitleClass,
} from './draggable-project'
// TODO(tauri-integration): Migrate to TanStack Query (via useSidebarOrder)
import type { Selection, NavId } from '@/types/navigation'
import appIcon from '@/assets/icon-1024-trans.png'
import { getDragId, ORPHAN_CONTAINER_ID } from '@/types/sidebar-order'
import type { DragItem } from '@/types/sidebar-order'

/**
 * AppSidebar (left-sidebar.tsx) - Main navigation sidebar for the app.
 *
 * The left sidebar contains:
 * 1. App branding + collapse toggle button
 * 2. Fixed navigation items: Today, This Week, Inbox, Calendar
 * 3. Draggable Area sections (collapsible, contain projects)
 * 4. "No Area" section for orphan projects
 *
 * Supports drag-and-drop for:
 * - Reordering areas relative to each other
 * - Reordering projects within an area
 * - Moving projects between areas (cross-container)
 * - Moving projects to/from "No Area"
 *
 * Display order is managed by useSidebarOrder hook, persisted separately
 * from entity data.
 */

// -----------------------------------------------------------------------------
// Nav Items
// -----------------------------------------------------------------------------

const navItems: {
  id: NavId
  name: string
  icon: typeof SunIcon
  iconClass: string
}[] = [
  { id: 'today', name: 'Today', icon: SunIcon, iconClass: 'text-icon-today' },
  {
    id: 'this-week',
    name: 'This Week',
    icon: CalendarDaysIcon,
    iconClass: 'text-icon-week',
  },
  { id: 'inbox', name: 'Inbox', icon: InboxIcon, iconClass: 'text-icon-inbox' },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: CalendarIcon,
    iconClass: 'text-icon-calendar',
  },
]

// -----------------------------------------------------------------------------
// App Sidebar
// -----------------------------------------------------------------------------

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selection: Selection | null
  onSelectionChange: (selection: Selection) => void
}

export function AppSidebar({
  selection,
  onSelectionChange,
  ...props
}: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const { getProjectCompletion } = useAppData()
  const {
    orderedAreas,
    orderedOrphanProjects,
    getOrderedProjects,
    reorderAreas,
    reorderProjectsInArea,
    moveProjectToArea,
  } = useSidebarOrder()

  // Track active drag item
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)

  // Sensors with activation constraint (8px to distinguish click from drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Drop animation config
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItem | undefined
    if (data) {
      setActiveItem(data)
    }
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeData = active.data.current as DragItem | undefined
      const overData = over.data.current as DragItem | undefined

      if (!activeData) return

      // Handle area reordering during drag (for immediate visual feedback)
      if (activeData.type === 'area' && overData?.type === 'area') {
        reorderAreas(activeData.id, overData.id)
        return
      }

      // Handle project cross-container moves
      if (activeData.type === 'project') {
        let overContainerId: string | null = null

        if (overData?.type === 'project') {
          overContainerId = overData.containerId
        } else if (overData?.type === 'area') {
          // Dropping on an area header - use that area as container
          overContainerId = overData.id
        } else {
          // Might be dropping on the orphan container itself
          const overId = over.id.toString()
          if (overId === ORPHAN_CONTAINER_ID) {
            overContainerId = ORPHAN_CONTAINER_ID
          }
        }

        if (overContainerId === null) return

        const activeContainerId = activeData.containerId ?? ORPHAN_CONTAINER_ID

        // Cross-container move
        if (activeContainerId !== overContainerId) {
          moveProjectToArea(activeData.id, activeContainerId, overContainerId)
        }
      }
    },
    [moveProjectToArea, reorderAreas]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveItem(null)

      if (!over || active.id === over.id) return

      const activeData = active.data.current as DragItem | undefined
      const overData = over.data.current as DragItem | undefined

      if (!activeData || !overData) return

      // Reorder projects within same container (areas handled in dragOver)
      if (
        activeData.type === 'project' &&
        overData.type === 'project' &&
        activeData.containerId === overData.containerId
      ) {
        const containerId = activeData.containerId ?? ORPHAN_CONTAINER_ID
        reorderProjectsInArea(containerId, activeData.id, overData.id)
      }
    },
    [reorderProjectsInArea]
  )

  // Get drag item IDs for SortableContext
  const areaIds = orderedAreas.map((a) => getDragId('area', a.id))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-14 flex-row items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <img src={appIcon} alt="Taskdn" className="size-7 shrink-0" />
          <span className="font-semibold text-lg">Taskdn</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="size-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeftIcon className="size-4" />
        </button>
      </SidebarHeader>

      <DndContext
        sensors={isCollapsed ? [] : sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SidebarContent className="gap-0 py-2">
          {/* Navigation Items */}
          <SidebarGroup className="py-0">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className="font-semibold"
                    tooltip={item.name}
                    isActive={
                      selection?.type === 'nav' && selection.id === item.id
                    }
                    onClick={() =>
                      onSelectionChange({ type: 'nav', id: item.id })
                    }
                  >
                    <item.icon className={item.iconClass} />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator className="my-2 group-data-[collapsible=icon]:hidden" />

          {/* Sortable Areas */}
          <SortableContext
            items={areaIds}
            strategy={verticalListSortingStrategy}
          >
            {orderedAreas.map((area) => {
              const projects = getOrderedProjects(area.id)
              const projectIds = projects.map((p) => getDragId('project', p.id))

              return (
                <DraggableArea
                  key={area.id}
                  area={area}
                  isSelected={
                    selection?.type === 'area' && selection.id === area.id
                  }
                  onSelect={() =>
                    onSelectionChange({ type: 'area', id: area.id })
                  }
                >
                  <SidebarMenu>
                    <SortableContext
                      items={projectIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {projects.map((project) => (
                        <DraggableProject
                          key={project.id}
                          project={project}
                          containerId={area.id}
                          isSelected={
                            selection?.type === 'project' &&
                            selection.id === project.id
                          }
                          onSelect={() =>
                            onSelectionChange({
                              type: 'project',
                              id: project.id,
                            })
                          }
                          completion={getProjectCompletion(project.id)}
                        />
                      ))}
                    </SortableContext>
                  </SidebarMenu>
                </DraggableArea>
              )
            })}
          </SortableContext>

          {/* No Area Section (always visible for drop target) */}
          <Collapsible
            defaultOpen
            className="group/collapsible group-data-[collapsible=icon]:hidden"
          >
            <SidebarGroup className="py-0">
              <SidebarGroupLabel
                className={cn(
                  'group/label gap-2 text-sm font-semibold cursor-pointer',
                  selection?.type === 'no-area'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={() => onSelectionChange({ type: 'no-area' })}
                >
                  <FolderIcon className="text-icon-folder-none shrink-0" />
                  <span className="truncate">No Area</span>
                </button>
                <CollapsibleTrigger
                  className="p-0.5 rounded hover:bg-sidebar-accent-foreground/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ChevronRight className="size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {orderedOrphanProjects.length === 0 ? (
                      <EmptyDropZone id={ORPHAN_CONTAINER_ID} />
                    ) : (
                      <SortableContext
                        items={orderedOrphanProjects.map((p) =>
                          getDragId('project', p.id)
                        )}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedOrphanProjects.map((project) => (
                          <DraggableProject
                            key={project.id}
                            project={project}
                            containerId={ORPHAN_CONTAINER_ID}
                            isSelected={
                              selection?.type === 'project' &&
                              selection.id === project.id
                            }
                            onSelect={() =>
                              onSelectionChange({
                                type: 'project',
                                id: project.id,
                              })
                            }
                            completion={getProjectCompletion(project.id)}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarContent>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeItem && <DragPreview item={activeItem} />}
        </DragOverlay>
      </DndContext>

      <SidebarRail />
    </Sidebar>
  )
}

// -----------------------------------------------------------------------------
// Empty Drop Zone
// -----------------------------------------------------------------------------

function EmptyDropZone({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <SidebarMenuItem ref={setNodeRef}>
      <div
        className={cn(
          'h-8 mx-2 my-1 border-2 border-dashed rounded flex items-center justify-center transition-colors',
          isOver
            ? 'border-primary/50 bg-primary/5'
            : 'border-muted-foreground/25'
        )}
      >
        <span className="text-xs text-muted-foreground">
          {isOver ? 'Drop to add' : 'Drop here'}
        </span>
      </div>
    </SidebarMenuItem>
  )
}

// -----------------------------------------------------------------------------
// Drag Preview
// -----------------------------------------------------------------------------

function DragPreview({ item }: { item: DragItem }) {
  const { getAreaById, getProjectById, getProjectCompletion } = useAppData()

  if (item.type === 'area') {
    const area = getAreaById(item.id)
    if (!area) return null

    return (
      <div className="bg-sidebar rounded-md shadow-lg border border-border">
        <SidebarGroupLabel className="gap-2 text-sm font-semibold">
          <FolderIcon className="text-icon-folder" />
          <span className="truncate">{area.title}</span>
          <ChevronRight className="ms-auto" />
        </SidebarGroupLabel>
      </div>
    )
  }

  if (item.type === 'project') {
    const project = getProjectById(item.id)
    if (!project) return null

    const completion = getProjectCompletion(project.id)

    return (
      <div className="bg-sidebar rounded-md shadow-lg border border-border">
        <SidebarMenuButton className="ps-7">
          <ProjectStatusIndicator
            status={project.status}
            completion={completion}
          />
          <span
            className={cn('truncate', getProjectTitleClass(project.status))}
          >
            {project.title}
          </span>
        </SidebarMenuButton>
      </div>
    )
  }

  return null
}
