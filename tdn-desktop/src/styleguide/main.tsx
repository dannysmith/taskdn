/**
 * Dev-only styleguide: every UI component the app uses, in each state. Vite
 * serves it at http://localhost:1420/styleguide.html (the slot's port in a
 * worktree) but only builds index.html and quick-pane.html, so it never ships.
 * `bun run app styleguide` screenshots it.
 */
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '../i18n'
import { queryClient } from '../lib/query-client'
import { ThemeProvider } from '../components/providers/ThemeProvider'
import { forwardConsoleToLog } from '../lib/agent-bridge/console'
import { Styleguide } from './Styleguide'
import '../App.css'

// Lets `bun run app logs` read console output
forwardConsoleToLog()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    {/* Its own storage key, so switching theme here doesn't change the app's */}
    <ThemeProvider storageKey="taskdn-styleguide-theme">
      <Styleguide />
    </ThemeProvider>
  </QueryClientProvider>
)
