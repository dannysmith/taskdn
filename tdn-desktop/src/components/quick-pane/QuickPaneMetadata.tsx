import { Calendar, Flag, Snowflake, CircleDot, FolderOpen } from 'lucide-react'

import type { TaskStatus, Area, Project } from '@/lib/tauri-bindings'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DateButton } from '@/components/ui/date-button'
import { TaskStatusPill } from '@/components/tasks/TaskStatusPill'

interface QuickPaneMetadataProps {
  // Status
  status: TaskStatus
  onStatusChange: (status: TaskStatus) => void

  // Project/Area
  projectId: string | null
  onProjectChange: (projectId: string | undefined) => void
  areaId: string | null
  onAreaChange: (areaId: string | undefined) => void
  projects: Project[]
  areas: Area[]

  // Dates
  scheduled: string | null
  onScheduledChange: (date: string | undefined) => void
  due: string | null
  onDueChange: (date: string | undefined) => void
  deferUntil: string | null
  onDeferUntilChange: (date: string | undefined) => void
}

/**
 * QuickPaneMetadata - Status, project, area, and date selection row.
 *
 * Left side: Status pill, project selector, area selector
 * Right side: Date buttons (scheduled, due, defer-until)
 */
export function QuickPaneMetadata({
  status,
  onStatusChange,
  projectId,
  onProjectChange,
  areaId,
  onAreaChange,
  projects,
  areas,
  scheduled,
  onScheduledChange,
  due,
  onDueChange,
  deferUntil,
  onDeferUntilChange,
}: QuickPaneMetadataProps) {
  // Filter to active projects/areas
  const activeProjects = projects.filter(p => p.status !== 'done')
  const activeAreas = areas.filter(a => a.status === 'active')

  // Find current selections
  const currentProject = projectId
    ? projects.find(p => p.id === projectId)
    : null
  const currentArea = areaId ? areas.find(a => a.id === areaId) : null

  // Include current selection even if not active
  const projectOptions =
    currentProject && !activeProjects.find(p => p.id === currentProject.id)
      ? [currentProject, ...activeProjects]
      : activeProjects

  const areaOptions =
    currentArea && !activeAreas.find(a => a.id === currentArea.id)
      ? [currentArea, ...activeAreas]
      : activeAreas

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
      {/* Left side: Status + Project + Area */}
      <div className="flex items-center gap-2">
        <TaskStatusPill status={status} onStatusChange={onStatusChange} />

        <SearchableSelect
          value={currentProject?.id}
          options={projectOptions.map(p => ({ value: p.id, label: p.title }))}
          placeholder="Project..."
          displayValue={currentProject?.title}
          icon={<CircleDot className="size-3 text-entity-project" />}
          onChange={onProjectChange}
          emptyText="No projects"
        />

        <SearchableSelect
          value={currentArea?.id}
          options={areaOptions.map(a => ({ value: a.id, label: a.title }))}
          placeholder="Area..."
          displayValue={currentArea?.title}
          icon={<FolderOpen className="size-3 text-entity-area" />}
          onChange={onAreaChange}
          emptyText="No areas"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-4" />

      {/* Right side: Date buttons */}
      <div className="flex items-center gap-1.5">
        <DateButton
          icon={<Calendar className="size-3" />}
          value={scheduled ?? undefined}
          onChange={onScheduledChange}
          tooltip="Scheduled"
          variant="scheduled"
        />
        <DateButton
          icon={<Flag className="size-3" />}
          value={due ?? undefined}
          onChange={onDueChange}
          tooltip="Due"
          variant="due"
        />
        <DateButton
          icon={<Snowflake className="size-3" />}
          value={deferUntil ?? undefined}
          onChange={onDeferUntilChange}
          tooltip="Defer"
          variant="defer"
        />
      </div>
    </div>
  )
}
