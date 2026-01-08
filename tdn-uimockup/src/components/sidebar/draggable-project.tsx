import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ban, CircleCheck, CirclePause } from 'lucide-react'

import { ProgressCircle } from '@/components/ui/progress-circle'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/types/data'
import { getDragId } from '@/types/sidebar-order'
import type { DragItem } from '@/types/sidebar-order'

/**
 * DraggableProject - Project row in the sidebar with drag-drop support.
 *
 * Displays a project with status indicator and title. Draggable for:
 * - Reordering within an area
 * - Moving to a different area
 * - Moving to/from "No Area"
 *
 * Also exports:
 * - ProjectStatusIndicator: Shows progress circle or status icon
 * - getProjectTitleClass: Returns muted class for done/paused projects
 *
 * ProjectStatusIndicator is also reused in ProjectHeader and ProjectCard.
 */

// -----------------------------------------------------------------------------
// Status Indicator
// -----------------------------------------------------------------------------

interface ProjectStatusIndicatorProps {
  status: ProjectStatus | undefined
  completion: number
}

export function ProjectStatusIndicator({
  status,
  completion,
}: ProjectStatusIndicatorProps) {
  const iconClass = 'size-4 shrink-0'

  switch (status) {
    case 'blocked':
      return <Ban className={`${iconClass} text-status-blocked`} />
    case 'paused':
      return <CirclePause className={`${iconClass} text-status-paused`} />
    case 'done':
      return <CircleCheck className={`${iconClass} text-status-done`} />
    case 'planning':
      return (
        <ProgressCircle
          value={completion}
          size={16}
          strokeWidth={2}
          className={`${iconClass} text-status-planning`}
        />
      )
    case 'ready':
      return (
        <ProgressCircle
          value={completion}
          size={16}
          strokeWidth={2}
          className={`${iconClass} text-status-ready`}
        />
      )
    case 'in-progress':
    default:
      return (
        <ProgressCircle
          value={completion}
          size={16}
          strokeWidth={2}
          className={`${iconClass} text-status-in-progress`}
        />
      )
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function getProjectTitleClass(
  status: ProjectStatus | undefined
): string {
  if (status === 'done' || status === 'paused') {
    return 'text-muted-foreground'
  }
  return ''
}

// -----------------------------------------------------------------------------
// Draggable Project
// -----------------------------------------------------------------------------

interface DraggableProjectProps {
  project: Project
  containerId: string
  isSelected: boolean
  onSelect: () => void
  completion: number
}

export function DraggableProject({
  project,
  containerId,
  isSelected,
  onSelect,
  completion,
}: DraggableProjectProps) {
  const dragId = getDragId('project', project.id)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      type: 'project',
      id: project.id,
      containerId,
    } satisfies DragItem,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50 z-50')}
      {...attributes}
      {...listeners}
    >
      <SidebarMenuButton
        className="ps-7 select-none"
        tooltip={project.title}
        isActive={isSelected}
        onClick={onSelect}
      >
        <ProjectStatusIndicator
          status={project.status}
          completion={completion}
        />
        <span className={cn('truncate', getProjectTitleClass(project.status))}>
          {project.title}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
