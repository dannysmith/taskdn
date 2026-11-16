import * as React from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  type PanelImperativeHandle,
} from '@/components/ui/resizable'
import { TitleBar } from '@/components/titlebar/TitleBar'
import { LeftSideBar } from './LeftSideBar'
import { RightSideBar } from './RightSideBar'
import { MainWindowContent } from './MainWindowContent'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { QuickSearch } from '@/components/quick-search/QuickSearch'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { AgentBridge } from '@/components/agent-bridge/AgentBridge'
import { AppToaster } from './AppToaster'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/use-main-window-event-listeners'
import { cn } from '@/lib/utils'

/**
 * Layout sizing configuration for resizable panels.
 * All values are percentages of total width.
 * Sidebar defaults + main default must equal 100.
 */
const LAYOUT = {
  leftSidebar: { default: 20, min: 15, max: 40 },
  rightSidebar: { default: 20, min: 15, max: 40 },
  main: { min: 30 },
} as const

// Main content default is calculated to ensure totals sum to 100%
const MAIN_CONTENT_DEFAULT =
  100 - LAYOUT.leftSidebar.default - LAYOUT.rightSidebar.default

// react-resizable-panels reads bare numbers as pixels
const percent = (value: number) => `${value}%`

/**
 * Keep the store in step when a sidebar is collapsed or expanded by dragging
 * its handle, rather than with the toggle.
 */
function syncVisibility(side: 'left' | 'right', sizePercent: number) {
  const visible = sizePercent > 0
  const state = useUIStore.getState()
  if (side === 'left' && state.leftSidebarVisible !== visible) {
    state.setLeftSidebarVisible(visible)
  }
  if (side === 'right' && state.rightSidebarVisible !== visible) {
    state.setRightSidebarVisible(visible)
  }
}

export function MainWindow() {
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
  const rightSidebarVisible = useUIStore(state => state.rightSidebarVisible)

  // Set up global event listeners (keyboard shortcuts, etc.)
  useMainWindowEventListeners()

  // Sidebars are hidden by collapsing their panels, so the main content takes
  // the space. Hiding a panel with CSS would leave its width empty
  const leftPanelRef = React.useRef<PanelImperativeHandle>(null)
  const rightPanelRef = React.useRef<PanelImperativeHandle>(null)

  React.useEffect(() => {
    if (leftSidebarVisible) leftPanelRef.current?.expand()
    else leftPanelRef.current?.collapse()
  }, [leftSidebarVisible])

  React.useEffect(() => {
    if (rightSidebarVisible) rightPanelRef.current?.expand()
    else rightPanelRef.current?.collapse()
  }, [rightSidebarVisible])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden rounded-xl bg-background">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            id="left-sidebar"
            // A collapsed panel keeps its content mounted; inert keeps keyboard
            // focus out of it
            inert={!leftSidebarVisible}
            panelRef={leftPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={percent(LAYOUT.leftSidebar.default)}
            minSize={percent(LAYOUT.leftSidebar.min)}
            maxSize={percent(LAYOUT.leftSidebar.max)}
            onResize={size => syncVisibility('left', size.asPercentage)}
          >
            <LeftSideBar />
          </ResizablePanel>

          <ResizableHandle
            className={cn('bg-transparent', !leftSidebarVisible && 'hidden')}
          />

          <ResizablePanel
            id="main"
            defaultSize={percent(MAIN_CONTENT_DEFAULT)}
            minSize={percent(LAYOUT.main.min)}
          >
            <MainWindowContent />
          </ResizablePanel>

          <ResizableHandle
            className={cn('bg-transparent', !rightSidebarVisible && 'hidden')}
          />

          <ResizablePanel
            id="right-sidebar"
            inert={!rightSidebarVisible}
            panelRef={rightPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={percent(LAYOUT.rightSidebar.default)}
            minSize={percent(LAYOUT.rightSidebar.min)}
            maxSize={percent(LAYOUT.rightSidebar.max)}
            onResize={size => syncVisibility('right', size.asPercentage)}
          >
            <RightSideBar />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Global UI Components (hidden until triggered) */}
      <CommandPalette />
      <QuickSearch />
      <PreferencesDialog />
      {import.meta.env.DEV && <AgentBridge />}
      <AppToaster />
    </div>
  )
}
