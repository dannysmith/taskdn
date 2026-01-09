import { useMemo } from 'react'

import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/store/navigation-store'
import { useViewMode, type ViewModeKey } from '@/store/view-mode-store'
import {
  useVaultData,
  useVaultHelpers,
  useUpdateProject,
} from '@/services/vault'
import { ViewHeader } from './ViewHeader'
import {
  AreaView,
  CalendarView,
  InboxView,
  NoAreaView,
  ProjectView,
  TodayView,
  WeekView,
} from '@/components/views'
import { ProjectStatusBadges, ProjectStatusPill } from '@/components/projects'
import { ViewToggle } from '@/components/ui/view-toggle'
import type { ProjectStatus } from '@/lib/tauri-bindings'

/**
 * MainWindowContent - Primary content area that renders the active view.
 *
 * Uses navigation store to determine which view to show based on sidebar selection.
 */
export function MainWindowContent() {
  const selection = useNavigationStore(state => state.selection)
  const { projects, areas } = useVaultData()
  const { getProjectsByAreaId } = useVaultHelpers()
  const updateProject = useUpdateProject()

  // Get current project if in project view
  const currentProject =
    selection?.type === 'project'
      ? projects.find(p => p.id === selection.id)
      : null

  // Compute project status counts for area view
  const projectStatusCounts = useMemo(() => {
    if (selection?.type !== 'area') return null

    const areaProjects = getProjectsByAreaId(selection.id)
    const counts: Record<string, number> = {}

    for (const project of areaProjects) {
      const status = project.status ?? 'planning'
      counts[status] = (counts[status] ?? 0) + 1
    }

    return counts
  }, [selection, getProjectsByAreaId])

  // Handle project status change
  const handleProjectStatusChange = (newStatus: ProjectStatus) => {
    if (!currentProject) return
    updateProject.mutate({
      id: currentProject.id,
      status: newStatus,
      title: null,
      area: null,
      description: null,
      startDate: null,
      endDate: null,
      body: null,
    })
  }

  // Determine the view title based on selection
  const getViewTitle = () => {
    if (!selection) return 'Select a view'

    switch (selection.type) {
      case 'nav':
        switch (selection.id) {
          case 'today':
            return 'Today'
          case 'this-week':
            return 'This Week'
          case 'inbox':
            return 'Inbox'
          case 'calendar':
            return 'Calendar'
        }
        break
      case 'area': {
        const area = areas.find(a => a.id === selection.id)
        return area?.title ?? 'Area'
      }
      case 'project': {
        const project = projects.find(p => p.id === selection.id)
        return project?.title ?? 'Project'
      }
      case 'no-area':
        return 'No Area'
    }
    return 'Unknown'
  }

  // Determine if this view supports mode switching
  const getViewModeKey = (): ViewModeKey | null => {
    if (!selection) return null

    if (selection.type === 'nav' && selection.id === 'this-week') {
      return 'this-week'
    }
    if (selection.type === 'project') {
      return 'project'
    }
    if (selection.type === 'area') {
      return 'area'
    }
    if (selection.type === 'no-area') {
      return 'area' // Uses same list/kanban toggle as area view
    }
    return null
  }

  const viewModeKey = getViewModeKey()

  // Render the appropriate view based on selection
  const renderContent = () => {
    if (!selection) {
      return <PlaceholderView message="Select a view from the sidebar" />
    }

    if (selection.type === 'nav') {
      switch (selection.id) {
        case 'inbox':
          return <InboxView />
        case 'today':
          return <TodayView />
        case 'this-week':
          return <WeekView />
        case 'calendar':
          return <CalendarView />
      }
    }

    if (selection.type === 'project') {
      return <ProjectView projectId={selection.id} />
    }

    if (selection.type === 'area') {
      return <AreaView areaId={selection.id} />
    }

    if (selection.type === 'no-area') {
      return <NoAreaView />
    }

    return <PlaceholderView message={`Unknown view`} selection={selection} />
  }

  return (
    <div className={cn('flex h-full flex-col bg-background')}>
      <ViewHeader
        title={getViewTitle()}
        actions={viewModeKey && <HeaderViewToggle viewModeKey={viewModeKey} />}
      >
        {projectStatusCounts && (
          <ProjectStatusBadges
            counts={projectStatusCounts}
            className="hidden @lg:flex"
          />
        )}
        {currentProject && (
          <ProjectStatusPill
            status={currentProject.status ?? 'in-progress'}
            onStatusChange={handleProjectStatusChange}
          />
        )}
      </ViewHeader>
      <div className="flex-1 overflow-auto p-4">{renderContent()}</div>
    </div>
  )
}

/** Helper component to use the view mode hook (can't use hooks conditionally) */
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

// Placeholder for views not yet implemented
function PlaceholderView({
  message,
  selection,
}: {
  message: string
  selection?: object
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center h-full">
      <div className="text-center">
        <p className="text-muted-foreground">{message}</p>
        {selection && (
          <pre className="mt-4 text-xs text-muted-foreground bg-muted p-2 rounded">
            {JSON.stringify(selection, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
