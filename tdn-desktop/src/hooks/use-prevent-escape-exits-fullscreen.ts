import { useEffect } from 'react'

/**
 * Prevents the Escape key from exiting macOS native fullscreen mode.
 *
 * macOS treats Escape as a system-level shortcut to exit fullscreen.
 * By calling preventDefault() in the capture phase, we block this behavior
 * while still allowing the event to propagate to dialogs and components
 * that need to handle Escape (e.g., closing modals).
 *
 * This is necessary because Base UI dialogs don't call preventDefault()
 * on Escape (unlike Radix UI), so the event reaches the OS handler.
 */
export function usePreventEscapeExitsFullscreen() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
      }
    }

    // Capture phase ensures we run before any other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () =>
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])
}
