import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/store/navigation-store'
import { useVaultData, useUpdateProject } from '@/services/vault'
import { ViewHeader } from './ViewHeader'
import { InboxView, ProjectView, TodayView } from '@/components/views'
import { ProjectStatusPill } from '@/components/projects'
import type { ProjectStatus } from '@/lib/tauri-bindings'

/**
 * MainWindowContent - Primary content area that renders the active view.
 *
 * Uses navigation store to determine which view to show based on sidebar selection.
 */
export function MainWindowContent() {
  const selection = useNavigationStore(state => state.selection)
  const { projects, areas } = useVaultData()
  const updateProject = useUpdateProject()

  // Get current project if in project view
  const currentProject =
    selection?.type === 'project'
      ? projects.find(p => p.id === selection.id)
      : null

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
          return <PlaceholderView message="This Week view coming soon" />
        case 'calendar':
          return <PlaceholderView message="Calendar view coming soon" />
      }
    }

    if (selection.type === 'project') {
      return <ProjectView projectId={selection.id} />
    }

    // Area or no-area views
    return (
      <PlaceholderView
        message={`${getViewTitle()} view coming soon`}
        selection={selection}
      />
    )
  }

  return (
    <div className={cn('flex h-full flex-col bg-background')}>
      <ViewHeader title={getViewTitle()}>
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
