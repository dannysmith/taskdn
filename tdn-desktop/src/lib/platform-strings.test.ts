import { describe, it, expect } from 'vitest'
import { getPlatformStrings, formatShortcut } from './platform-strings'

describe('platform-strings', () => {
  describe('getPlatformStrings', () => {
    describe('macOS', () => {
      it('returns macOS-specific strings', () => {
        const strings = getPlatformStrings('macos')

        expect(strings.revealInFileManager).toBe('Reveal in Finder')
        expect(strings.fileManagerName).toBe('Finder')
        expect(strings.modifierKey).toBe('Cmd')
        expect(strings.modifierKeySymbol).toBe('⌘')
        expect(strings.optionKey).toBe('Option')
        expect(strings.optionKeySymbol).toBe('⌥')
        expect(strings.preferencesLabel).toBe('Preferences')
        expect(strings.quitLabel).toBe('Quit')
        expect(strings.trashName).toBe('Trash')
      })
    })

    describe('Windows', () => {
      it('returns Windows-specific strings', () => {
        const strings = getPlatformStrings('windows')

        expect(strings.revealInFileManager).toBe('Show in Explorer')
        expect(strings.fileManagerName).toBe('Explorer')
        expect(strings.modifierKey).toBe('Ctrl')
        expect(strings.modifierKeySymbol).toBe('Ctrl')
        expect(strings.optionKey).toBe('Alt')
        expect(strings.optionKeySymbol).toBe('Alt')
        expect(strings.preferencesLabel).toBe('Settings')
        expect(strings.quitLabel).toBe('Exit')
        expect(strings.trashName).toBe('Recycle Bin')
      })
    })

    describe('Linux', () => {
      it('returns Linux-specific strings', () => {
        const strings = getPlatformStrings('linux')

        expect(strings.revealInFileManager).toBe('Show in Files')
        expect(strings.fileManagerName).toBe('Files')
        expect(strings.modifierKey).toBe('Ctrl')
        expect(strings.modifierKeySymbol).toBe('Ctrl')
        expect(strings.optionKey).toBe('Alt')
        expect(strings.optionKeySymbol).toBe('Alt')
        expect(strings.preferencesLabel).toBe('Preferences')
        expect(strings.quitLabel).toBe('Quit')
        expect(strings.trashName).toBe('Trash')
      })
    })

    describe('undefined platform', () => {
      it('defaults to macOS strings when platform is undefined', () => {
        const strings = getPlatformStrings(undefined)

        expect(strings.revealInFileManager).toBe('Reveal in Finder')
        expect(strings.fileManagerName).toBe('Finder')
        expect(strings.modifierKeySymbol).toBe('⌘')
      })
    })
  })

  describe('formatShortcut', () => {
    describe('macOS shortcuts', () => {
      it('formats single modifier key shortcut', () => {
        expect(formatShortcut('macos', 'K')).toBe('⌘K')
        expect(formatShortcut('macos', 'S')).toBe('⌘S')
        expect(formatShortcut('macos', 'N')).toBe('⌘N')
      })

      it('formats shortcut with shift modifier', () => {
        expect(formatShortcut('macos', 'K', ['shift', 'mod'])).toBe('⇧⌘K')
        expect(formatShortcut('macos', 'N', ['shift', 'mod'])).toBe('⇧⌘N')
      })

      it('formats shortcut with alt modifier', () => {
        expect(formatShortcut('macos', 'K', ['alt', 'mod'])).toBe('⌥⌘K')
      })

      it('formats shortcut with all modifiers', () => {
        expect(formatShortcut('macos', 'K', ['shift', 'alt', 'mod'])).toBe(
          '⇧⌥⌘K'
        )
      })

      it('formats shortcut without any modifier', () => {
        expect(formatShortcut('macos', 'F1', [])).toBe('F1')
        expect(formatShortcut('macos', 'Escape', [])).toBe('Escape')
        expect(formatShortcut('macos', 'Enter', [])).toBe('Enter')
      })

      it('formats shortcut with only shift', () => {
        expect(formatShortcut('macos', 'Tab', ['shift'])).toBe('⇧Tab')
      })
    })

    describe('Windows shortcuts', () => {
      it('formats single modifier key shortcut', () => {
        expect(formatShortcut('windows', 'K')).toBe('Ctrl+K')
        expect(formatShortcut('windows', 'S')).toBe('Ctrl+S')
        expect(formatShortcut('windows', 'N')).toBe('Ctrl+N')
      })

      it('formats shortcut with shift modifier', () => {
        expect(formatShortcut('windows', 'K', ['shift', 'mod'])).toBe(
          'Shift+Ctrl+K'
        )
      })

      it('formats shortcut with alt modifier', () => {
        expect(formatShortcut('windows', 'K', ['alt', 'mod'])).toBe(
          'Alt+Ctrl+K'
        )
      })

      it('formats shortcut with all modifiers', () => {
        expect(formatShortcut('windows', 'K', ['shift', 'alt', 'mod'])).toBe(
          'Shift+Alt+Ctrl+K'
        )
      })

      it('formats shortcut without any modifier', () => {
        expect(formatShortcut('windows', 'F1', [])).toBe('F1')
        expect(formatShortcut('windows', 'Escape', [])).toBe('Escape')
      })
    })

    describe('Linux shortcuts', () => {
      it('formats shortcuts same as Windows', () => {
        expect(formatShortcut('linux', 'K')).toBe('Ctrl+K')
        expect(formatShortcut('linux', 'K', ['shift', 'mod'])).toBe(
          'Shift+Ctrl+K'
        )
      })
    })

    describe('undefined platform shortcuts', () => {
      it('defaults to macOS shortcuts when platform is undefined', () => {
        expect(formatShortcut(undefined, 'K')).toBe('⌘K')
        expect(formatShortcut(undefined, 'K', ['shift', 'mod'])).toBe('⇧⌘K')
      })
    })

    describe('special keys', () => {
      it('handles function keys', () => {
        expect(formatShortcut('macos', 'F1', [])).toBe('F1')
        expect(formatShortcut('macos', 'F12', [])).toBe('F12')
      })

      it('handles navigation keys', () => {
        expect(formatShortcut('macos', 'ArrowUp', [])).toBe('ArrowUp')
        expect(formatShortcut('macos', 'Enter', [])).toBe('Enter')
        expect(formatShortcut('macos', 'Tab', [])).toBe('Tab')
      })

      it('handles keys with modifiers', () => {
        expect(formatShortcut('macos', 'Enter', ['mod'])).toBe('⌘Enter')
        expect(formatShortcut('macos', 'ArrowDown', ['mod'])).toBe('⌘ArrowDown')
      })
    })
  })
})
