import ReactDOM from 'react-dom/client'
import QuickPaneApp from './components/quick-pane/QuickPaneApp'
import { QuickPaneErrorBoundary } from './components/quick-pane/QuickPaneErrorBoundary'
import './quick-pane.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QuickPaneErrorBoundary>
    <QuickPaneApp />
  </QuickPaneErrorBoundary>
)
