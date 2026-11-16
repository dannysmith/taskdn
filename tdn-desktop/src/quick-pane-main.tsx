import ReactDOM from 'react-dom/client'
import QuickPaneApp from './components/quick-pane/QuickPaneApp'
import { QuickPaneErrorBoundary } from './components/quick-pane/QuickPaneErrorBoundary'
import { createPageApi } from './lib/agent-bridge/page'
import { forwardConsoleToLog } from './lib/agent-bridge/console'
import { applyThemeToDocument, getStoredTheme } from './lib/theme'
import './quick-pane.css'

// Lets `bun run app --window=quick-pane` drive this window. The theme is set on
// the page only, leaving the stored setting the main window owns alone.
if (import.meta.env.DEV) {
  forwardConsoleToLog()
  window.__agentBridge = createPageApi({
    getTheme: getStoredTheme,
    setTheme: theme => {
      if (theme === 'system') return applyThemeToDocument()
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    },
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QuickPaneErrorBoundary>
    <QuickPaneApp />
  </QuickPaneErrorBoundary>
)
