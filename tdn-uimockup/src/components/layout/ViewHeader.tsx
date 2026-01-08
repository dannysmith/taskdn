import type { Project, ProjectStatus } from '@/types/data'
import { useViewMode, type ViewModeKey } from '@/store/view-mode-store'
import { ProjectStatusBadges } from '@/components/projects/project-status-badges'
import { ProjectStatusPill } from '@/components/projects/project-status-pill'
import { ViewToggle } from '@/components/ui/view-toggle'

/**
 * ViewHeader - Top header bar for all main content views.
 *
 * Displays the view title on the left, optional contextual information in the
 * middle (project status counts for area views, or a status pill for project
 * views), and a view mode toggle on the right (list/kanban/calendar).
 *
 * Usage:
 * - Every view component renders this at the top of its content area
 * - Pass `projectStatusCounts` when viewing an area (shows badge breakdown)
 * - Pass `currentProject` when viewing a single project (shows editable status)
 * - Pass `viewModeKey` to enable the list/kanban/calendar toggle
 */
interface ViewHeaderProps {
  title: string
  projectStatusCounts?: Record<string, number> | null
  currentProject?: Project | null
  viewModeKey?: ViewModeKey | null
  onProjectStatusChange?: (projectId: string, status: ProjectStatus) => void
}

export function ViewHeader({
  title,
  projectStatusCounts,
  currentProject,
  viewModeKey,
  onProjectStatusChange,
}: ViewHeaderProps) {
  return (
    <header className="@container flex h-14 shrink-0 items-center gap-2 @sm:gap-3 border-b px-3 @sm:px-4">
      <h1 className="text-lg @sm:text-xl font-semibold truncate shrink-0">{title}</h1>
      {projectStatusCounts && (
        <div className="hidden @lg:block overflow-hidden">
          <ProjectStatusBadges counts={projectStatusCounts} />
        </div>
      )}
      {currentProject && onProjectStatusChange && (
        <ProjectStatusPill
          status={currentProject.status ?? 'planning'}
          onStatusChange={(newStatus) =>
            onProjectStatusChange(currentProject.id, newStatus)
          }
        />
      )}
      {/* View mode toggle - pushed to right */}
      {viewModeKey && (
        <div className="ms-auto shrink-0">
          <HeaderViewToggle viewModeKey={viewModeKey} />
        </div>
      )}
    </header>
  )
}

/** Small component to use the view mode hook (can't use hooks conditionally) */
function HeaderViewToggle({ viewModeKey }: { viewModeKey: ViewModeKey }) {
  const { viewMode, setViewMode, availableModes } = useViewMode(viewModeKey)
  return (
    <ViewToggle
      value={viewMode}
      onChange={setViewMode}
      availableModes={availableModes}
    />
  )
}
