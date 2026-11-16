import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@/hooks/use-theme'
import { createAgentApi } from '@/lib/agent-bridge/api'

/**
 * Dev-only: installs `window.__agentBridge` (see `lib/agent-bridge/api.ts`) for the
 * agent bridge CLI, `bun run app`. MainWindow renders it only when
 * `import.meta.env.DEV`.
 */
export function AgentBridge() {
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()

  // The API is created once, so it reads the latest theme through a ref
  const latest = useRef({ theme, setTheme })
  useEffect(() => {
    latest.current = { theme, setTheme }
  })

  useEffect(() => {
    window.__agentBridge = createAgentApi({
      queryClient,
      getTheme: () => latest.current.theme,
      setTheme: theme => latest.current.setTheme(theme),
    })
    return () => {
      delete window.__agentBridge
    }
  }, [queryClient])

  return null
}
