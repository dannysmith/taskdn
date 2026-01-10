/**
 * Parsed representation of a keyboard shortcut.
 *
 * Shortcuts use Tauri's accelerator format as the canonical format:
 * - 'CmdOrCtrl+1' - Cross-platform primary modifier
 * - 'CmdOrCtrl+Shift+Z' - With shift modifier
 * - 'F11' - Function keys (no modifier required)
 */
export interface ParsedShortcut {
  /** The main key (e.g., '1', ',', 'F11', 'Escape') */
  key: string
  /** CmdOrCtrl modifier (Cmd on Mac, Ctrl on Windows/Linux) */
  cmdOrCtrl: boolean
  /** Shift modifier */
  shift: boolean
  /** Alt/Option modifier */
  alt: boolean
}
