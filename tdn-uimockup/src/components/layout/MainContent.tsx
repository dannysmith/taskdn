import type { Selection } from '@/types/navigation'
import { TodayView } from '@/components/views/today-view'
import { WeekView } from '@/components/views/week-view'
import { InboxView } from '@/components/views/inbox-view'
import { CalendarView } from '@/components/views/calendar-view'
import { AreaView } from '@/components/views/area-view'
import { ProjectView } from '@/components/views/project-view'
import { NoAreaView } from '@/components/views/no-area-view'

/**
 * MainContent - View router that renders the appropriate view based on navigation.
 *
 * This is the central content area of the app. It switches between different view
 * components based on the current selection from the sidebar:
 *
 * Navigation items (selection.type === 'nav'):
 * - 'today' → TodayView (overdue + today's tasks)
 * - 'this-week' → WeekView (week calendar or kanban)
 * - 'inbox' → InboxView (unprocessed tasks)
 * - 'calendar' → CalendarView (month view)
 *
 * Entity selections:
 * - 'area' → AreaView (projects and tasks within an area)
 * - 'project' → ProjectView (tasks within a project)
 * - 'no-area' → NoAreaView (orphan projects without an area)
 *
 * Passes down navigation callbacks so views can link to related entities
 * (e.g., clicking a project name in TodayView navigates to that project).
 */
interface MainContentProps {
  selection: Selection | null
  onSelectionChange: (selection: Selection) => void
}

export function MainContent({
  selection,
  onSelectionChange,
}: MainContentProps) {
  if (!selection) {
    return (
      <div className="text-muted-foreground text-sm">
        Select a project from the sidebar to get started.
      </div>
    )
  }

  switch (selection.type) {
    case 'nav':
      switch (selection.id) {
        case 'today':
          return (
            <TodayView
              onNavigateToProject={(projectId) =>
                onSelectionChange({ type: 'project', id: projectId })
              }
              onNavigateToArea={(areaId) =>
                onSelectionChange({ type: 'area', id: areaId })
              }
            />
          )
        case 'this-week':
          return (
            <WeekView
              onNavigateToProject={(projectId) =>
                onSelectionChange({ type: 'project', id: projectId })
              }
              onNavigateToArea={(areaId) =>
                onSelectionChange({ type: 'area', id: areaId })
              }
            />
          )
        case 'inbox':
          return <InboxView />
        case 'calendar':
          return <CalendarView />
      }
      break
    case 'area':
      return (
        <AreaView
          areaId={selection.id}
          onNavigateToProject={(projectId) =>
            onSelectionChange({ type: 'project', id: projectId })
          }
        />
      )
    case 'project':
      return <ProjectView projectId={selection.id} />
    case 'no-area':
      return (
        <NoAreaView
          onNavigateToProject={(projectId) =>
            onSelectionChange({ type: 'project', id: projectId })
          }
        />
      )
  }
}
