import type { ParsedShortcut } from './types'

/**
 * Check if a keyboard event matches a parsed shortcut.
 *
 * Handles cross-platform modifier keys:
 * - cmdOrCtrl matches metaKey on Mac, ctrlKey on Windows/Linux
 *
 * @example
 * const shortcut = parseShortcut('CmdOrCtrl+1')
 * matchesKeyboardEvent(shortcut, event) // true if Cmd+1 (Mac) or Ctrl+1 (other)
 */
export function matchesKeyboardEvent(
  shortcut: ParsedShortcut,
  event: KeyboardEvent
): boolean {
  // Check modifier keys
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform?.toLowerCase().includes('mac')

  // CmdOrCtrl: metaKey on Mac, ctrlKey on Windows/Linux
  const cmdOrCtrlPressed = isMac ? event.metaKey : event.ctrlKey

  if (shortcut.cmdOrCtrl !== cmdOrCtrlPressed) {
    return false
  }

  // Ctrl key (⌃): always event.ctrlKey on Mac, but on Windows we need to be careful
  // because ctrlKey might already be used for cmdOrCtrl
  if (isMac) {
    // On Mac, ctrl is separate from cmd
    if (shortcut.ctrl !== event.ctrlKey) {
      return false
    }
  } else {
    // On Windows/Linux, if cmdOrCtrl is true, ctrlKey is already checked above
    // Only check ctrl separately if cmdOrCtrl is false
    if (!shortcut.cmdOrCtrl && shortcut.ctrl !== event.ctrlKey) {
      return false
    }
  }

  if (shortcut.shift !== event.shiftKey) {
    return false
  }

  if (shortcut.alt !== event.altKey) {
    return false
  }

  // Check the main key
  return keysMatch(shortcut.key, event.key)
}

/**
 * Check if two keys match, handling case sensitivity and special keys.
 */
function keysMatch(shortcutKey: string, eventKey: string): boolean {
  // Normalize both keys for comparison
  const normalizedShortcut = normalizeKey(shortcutKey)
  const normalizedEvent = normalizeKey(eventKey)

  return normalizedShortcut === normalizedEvent
}

/**
 * Normalize a key string for comparison.
 */
function normalizeKey(key: string): string {
  // Single character keys - compare lowercase
  if (key.length === 1) {
    return key.toLowerCase()
  }

  // Special key mappings (event.key values to shortcut format)
  const keyMappings: Record<string, string> = {
    escape: 'escape',
    esc: 'escape',
    enter: 'enter',
    return: 'enter',
    tab: 'tab',
    backspace: 'backspace',
    delete: 'delete',
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
    ' ': 'space',
    spacebar: 'space',
  }

  const lower = key.toLowerCase()
  return keyMappings[lower] ?? lower
}
