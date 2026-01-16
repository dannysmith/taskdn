/**
 * Hook to handle taskdn:// deep link URLs.
 *
 * Listens for deep link events from the Tauri deep-link plugin and
 * delegates command processing to the deep-link-handler module.
 */

import { useEffect } from 'react'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { logger } from '@/lib/logger'
import { parseDeepLinkUrl } from '@/lib/deep-link'
import { processDeepLink, bringWindowToFront } from '@/lib/deep-link-handler'

/**
 * Hook to listen for and handle deep link events.
 *
 * Should be called once at the app root level. Uses the query client
 * cache directly to look up entities, so no context needs to be passed.
 */
export function useDeepLink(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      try {
        unlisten = await onOpenUrl(async (urls: string[]) => {
          logger.info('Deep link received', { urls })

          for (const url of urls) {
            const command = parseDeepLinkUrl(url)
            logger.debug('Parsed deep link command', { url, command })

            const success = await processDeepLink(command)

            if (success) {
              // Only bring window to front if we successfully handled the URL
              await bringWindowToFront()
            }
          }
        })
      } catch (error) {
        logger.error('Failed to set up deep link listener', { error })
      }
    }

    setupListener()

    return () => {
      unlisten?.()
    }
  }, [])
}
