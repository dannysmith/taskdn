import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/sidebar/AppSidebar'
import { useNavigationStore } from '@/store/navigation-store'

/**
 * LeftSideBar - Container for the app sidebar.
 *
 * Wraps the AppSidebar with SidebarProvider and connects it to navigation state.
 * Renders within MainWindow's ResizablePanel.
 */
export function LeftSideBar() {
  const selection = useNavigationStore(state => state.selection)
  const navigate = useNavigationStore(state => state.navigate)

  return (
    <SidebarProvider defaultOpen={true} className="h-full min-h-0">
      <AppSidebar
        selection={selection}
        onSelectionChange={navigate}
        className="rounded-tr-lg"
      />
    </SidebarProvider>
  )
}
