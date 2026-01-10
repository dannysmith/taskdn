import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useCommandContext } from './use-command-context'
import { useGlobalShortcuts } from './use-global-shortcuts'
import { useUIStore } from '@/store/ui-store'
import { logger } from '@/lib/logger'

/**
 * Main window event listeners - handles global keyboard shortcuts and cross-window events.
 *
 * This hook composes specialized hooks for different event types:
 * - useGlobalShortcuts: Command-driven keyboard shortcuts
 * - Quick pane submit listener: Cross-window communication from quick pane
 */
export function useMainWindowEventListeners() {
  const commandContext = useCommandContext()

  useGlobalShortcuts(commandContext)

  // Listen for quick pane submissions (cross-window event)
  useEffect(() => {
    let isMounted = true
    let unlisten: (() => void) | null = null

    listen<{ text: string }>('quick-pane-submit', event => {
      logger.debug('Quick pane submit event received', {
        text: event.payload.text,
      })
      const { setLastQuickPaneEntry } = useUIStore.getState()
      setLastQuickPaneEntry(event.payload.text)
    })
      .then(unlistenFn => {
        if (!isMounted) {
          unlistenFn()
        } else {
          unlisten = unlistenFn
        }
      })
      .catch(error => {
        logger.error('Failed to setup quick-pane-submit listener', { error })
      })

    return () => {
      isMounted = false
      if (unlisten) {
        unlisten()
      }
    }
  }, [])
}
