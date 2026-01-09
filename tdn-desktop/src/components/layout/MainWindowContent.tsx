import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/store/navigation-store'
import { ViewHeader } from './ViewHeader'

/**
 * MainWindowContent - Primary content area that renders the active view.
 *
 * Uses navigation store to determine which view to show based on sidebar selection.
 * Will be expanded to render actual view components (InboxView, TodayView, etc.)
 */
export function MainWindowContent() {
  const selection = useNavigationStore(state => state.selection)

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
      case 'area':
        return `Area: ${selection.id}`
      case 'project':
        return `Project: ${selection.id}`
      case 'no-area':
        return 'No Area'
    }
    return 'Unknown'
  }

  return (
    <div className={cn('flex h-full flex-col bg-background')}>
      <ViewHeader title={getViewTitle()} />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {getViewTitle()}
          </h2>
          <p className="text-muted-foreground">
            View content will be rendered here
          </p>
          {selection && (
            <pre className="mt-4 text-xs text-muted-foreground bg-muted p-2 rounded">
              {JSON.stringify(selection, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
