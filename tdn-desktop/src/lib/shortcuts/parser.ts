import type { ParsedShortcut } from './types'

/**
 * Parse a Tauri accelerator format shortcut string into structured form.
 *
 * @example
 * parseShortcut('CmdOrCtrl+1') // { key: '1', cmdOrCtrl: true, shift: false, alt: false }
 * parseShortcut('CmdOrCtrl+Shift+Z') // { key: 'Z', cmdOrCtrl: true, shift: true, alt: false }
 * parseShortcut('F11') // { key: 'F11', cmdOrCtrl: false, shift: false, alt: false }
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.split('+')

  let cmdOrCtrl = false
  let ctrl = false
  let shift = false
  let alt = false
  let key = ''

  for (const part of parts) {
    const normalized = part.toLowerCase()
    switch (normalized) {
      case 'cmdorctrl':
      case 'cmd':
      case 'command':
        cmdOrCtrl = true
        break
      case 'ctrl':
      case 'control':
        // Ctrl is the Control key (⌃) - separate from CmdOrCtrl
        ctrl = true
        break
      case 'shift':
        shift = true
        break
      case 'alt':
      case 'option':
        alt = true
        break
      default:
        // This is the main key - preserve original case for display
        key = part
    }
  }

  return { key, cmdOrCtrl, ctrl, shift, alt }
}

/**
 * Format a shortcut string for display in the UI.
 *
 * @example
 * formatForDisplay('CmdOrCtrl+1', 'mac') // '⌘1'
 * formatForDisplay('CmdOrCtrl+1', 'other') // 'Ctrl+1'
 * formatForDisplay('CmdOrCtrl+Shift+Z', 'mac') // '⇧⌘Z'
 * formatForDisplay('F11', 'mac') // 'F11'
 */
export function formatForDisplay(
  shortcut: string,
  platform: 'mac' | 'other' = typeof navigator !== 'undefined' &&
  navigator.platform?.toLowerCase().includes('mac')
    ? 'mac'
    : 'other'
): string {
  const parsed = parseShortcut(shortcut)

  if (platform === 'mac') {
    // Mac uses symbols, no separators
    // Order: ⌃ (ctrl) ⌥ (alt) ⇧ (shift) ⌘ (cmd) Key
    const parts: string[] = []
    if (parsed.ctrl) parts.push('⌃')
    if (parsed.alt) parts.push('⌥')
    if (parsed.shift) parts.push('⇧')
    if (parsed.cmdOrCtrl) parts.push('⌘')
    parts.push(formatKeyForDisplay(parsed.key, 'mac'))
    return parts.join('')
  } else {
    // Windows/Linux uses text with + separators
    const parts: string[] = []
    if (parsed.cmdOrCtrl) parts.push('Ctrl')
    if (parsed.ctrl) parts.push('Ctrl') // On Windows, ctrl is also Ctrl
    if (parsed.alt) parts.push('Alt')
    if (parsed.shift) parts.push('Shift')
    parts.push(formatKeyForDisplay(parsed.key, 'other'))
    return parts.join('+')
  }
}

/**
 * Format a key for display, handling special keys.
 */
function formatKeyForDisplay(key: string, platform: 'mac' | 'other'): string {
  const keyLower = key.toLowerCase()

  // Special key mappings
  const macSymbols: Record<string, string> = {
    escape: '⎋',
    enter: '↩',
    return: '↩',
    tab: '⇥',
    backspace: '⌫',
    delete: '⌦',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    space: '␣',
  }

  const otherLabels: Record<string, string> = {
    escape: 'Esc',
    enter: 'Enter',
    return: 'Enter',
    tab: 'Tab',
    backspace: 'Backspace',
    delete: 'Del',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    space: 'Space',
  }

  if (platform === 'mac') {
    const symbol = macSymbols[keyLower]
    if (symbol) return symbol
  }

  if (platform === 'other') {
    const label = otherLabels[keyLower]
    if (label) return label
  }

  // For regular keys, uppercase single characters
  if (key.length === 1) {
    return key.toUpperCase()
  }

  // Function keys and others - preserve as-is
  return key
}
