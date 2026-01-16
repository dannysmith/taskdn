/**
 * Keyboard shortcut utilities.
 *
 * Provides parsing, formatting, and matching for keyboard shortcuts
 * using Tauri's accelerator format as the canonical format.
 *
 * @example
 * import { parseShortcut, formatForDisplay, matchesKeyboardEvent } from '@/lib/shortcuts'
 *
 * // Parse a shortcut string
 * const parsed = parseShortcut('CmdOrCtrl+Shift+Z')
 *
 * // Format for display
 * formatForDisplay('CmdOrCtrl+1') // '⌘1' on Mac, 'Ctrl+1' on Windows
 *
 * // Match against a keyboard event
 * if (matchesKeyboardEvent(parsed, event)) {
 *   // Handle the shortcut
 * }
 */

export type { ParsedShortcut } from './types'
export { parseShortcut, formatForDisplay } from './parser'
export { matchesKeyboardEvent } from './matcher'
