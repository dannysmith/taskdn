import { useState, useMemo } from 'react'
import { AppSidebar } from '@/components/sidebar/left-sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
// TODO(tauri-integration): Migrate to TanStack Query
import { AppDataProvider, useAppData } from '@/context/app-data-context'
import { useIsTaskDetailOpen } from '@/store/task-detail-store'
import type { ViewModeKey } from '@/store/view-mode-store'
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel'
import { ViewHeader, DetailSideBar, ContentArea } from '@/components/layout'
import type { Selection } from '@/types/navigation'

/** Get the view mode key for a selection (if it supports view toggling) */
function getViewModeKey(selection: Selection | null): ViewModeKey | null {
  if (!selection) return null
  if (selection.type === 'nav' && selection.id === 'this-week')
    return 'this-week'
  if (selection.type === 'project') return 'project'
  if (selection.type === 'area') return 'area'
  if (selection.type === 'no-area') return 'area' // Use same view modes as area
  return null
}

function AppContent() {
  const [selection, setSelection] = useState<Selection | null>({
    type: 'nav',
    id: 'today',
  })
  const {
    getAreaById,
    getProjectById,
    getProjectsByAreaId,
    updateProjectStatus,
  } = useAppData()

  // Get view mode for current selection (if applicable)
  const viewModeKey = getViewModeKey(selection)

  // Get project status counts for the current area (if viewing an area)
  const projectStatusCounts = useMemo(() => {
    if (selection?.type !== 'area') return null
    const projects = getProjectsByAreaId(selection.id)
    const counts: Record<string, number> = {}
    for (const project of projects) {
      const status = project.status ?? 'planning'
      counts[status] = (counts[status] ?? 0) + 1
    }
    return counts
  }, [selection, getProjectsByAreaId])

  // Get current project (if viewing a project)
  const currentProject = useMemo(() => {
    if (selection?.type !== 'project') return null
    return getProjectById(selection.id) ?? null
  }, [selection, getProjectById])

  function getHeaderTitle(selection: Selection | null): string {
    if (!selection) return 'Dashboard'

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
        return getAreaById(selection.id)?.title ?? 'Area'
      case 'project':
        return getProjectById(selection.id)?.title ?? 'Project'
      case 'no-area':
        return 'No Area'
    }
    return 'Dashboard'
  }

  const isDetailOpen = useIsTaskDetailOpen()

  return (
    <SidebarProvider>
      <AppSidebar selection={selection} onSelectionChange={setSelection} />
      <SidebarInset className="flex flex-col overflow-hidden min-w-0">
        <ViewHeader
          title={getHeaderTitle(selection)}
          projectStatusCounts={projectStatusCounts}
          currentProject={currentProject}
          viewModeKey={viewModeKey}
          onProjectStatusChange={updateProjectStatus}
        />
        <ContentArea>
          <MainContent selection={selection} onSelectionChange={setSelection} />
        </ContentArea>
      </SidebarInset>
      <DetailSideBar isOpen={isDetailOpen}>
        <TaskDetailPanel />
      </DetailSideBar>
    </SidebarProvider>
  )
}

export function App() {
  return (
    <AppDataProvider>
      <AppContent />
    </AppDataProvider>
  )
}

export default App
