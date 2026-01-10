import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseShortcut, formatForDisplay, matchesKeyboardEvent } from './index'

describe('shortcuts', () => {
  describe('parseShortcut', () => {
    it('parses simple modifier + key', () => {
      expect(parseShortcut('CmdOrCtrl+1')).toEqual({
        key: '1',
        cmdOrCtrl: true,
        shift: false,
        alt: false,
      })
    })

    it('parses multiple modifiers', () => {
      expect(parseShortcut('CmdOrCtrl+Shift+Z')).toEqual({
        key: 'Z',
        cmdOrCtrl: true,
        shift: true,
        alt: false,
      })
    })

    it('parses all modifiers', () => {
      expect(parseShortcut('CmdOrCtrl+Shift+Alt+K')).toEqual({
        key: 'K',
        cmdOrCtrl: true,
        shift: true,
        alt: true,
      })
    })

    it('parses function keys without modifiers', () => {
      expect(parseShortcut('F11')).toEqual({
        key: 'F11',
        cmdOrCtrl: false,
        shift: false,
        alt: false,
      })
    })

    it('parses function keys with modifiers', () => {
      expect(parseShortcut('CmdOrCtrl+F5')).toEqual({
        key: 'F5',
        cmdOrCtrl: true,
        shift: false,
        alt: false,
      })
    })

    it('parses special characters', () => {
      expect(parseShortcut('CmdOrCtrl+,')).toEqual({
        key: ',',
        cmdOrCtrl: true,
        shift: false,
        alt: false,
      })
    })

    it('handles different modifier aliases', () => {
      expect(parseShortcut('Cmd+1').cmdOrCtrl).toBe(true)
      expect(parseShortcut('Ctrl+1').cmdOrCtrl).toBe(true)
      expect(parseShortcut('Command+1').cmdOrCtrl).toBe(true)
      expect(parseShortcut('Control+1').cmdOrCtrl).toBe(true)
    })

    it('handles alt/option alias', () => {
      expect(parseShortcut('Alt+1').alt).toBe(true)
      expect(parseShortcut('Option+1').alt).toBe(true)
    })

    it('is case-insensitive for modifiers', () => {
      expect(parseShortcut('cmdorctrl+shift+1')).toEqual({
        key: '1',
        cmdOrCtrl: true,
        shift: true,
        alt: false,
      })
    })

    it('preserves key case', () => {
      expect(parseShortcut('CmdOrCtrl+z').key).toBe('z')
      expect(parseShortcut('CmdOrCtrl+Z').key).toBe('Z')
    })

    it('parses Escape key', () => {
      expect(parseShortcut('Escape')).toEqual({
        key: 'Escape',
        cmdOrCtrl: false,
        shift: false,
        alt: false,
      })
    })

    it('parses Enter key with modifier', () => {
      expect(parseShortcut('CmdOrCtrl+Enter')).toEqual({
        key: 'Enter',
        cmdOrCtrl: true,
        shift: false,
        alt: false,
      })
    })
  })

  describe('formatForDisplay', () => {
    describe('on Mac', () => {
      it('formats simple shortcuts with symbols', () => {
        expect(formatForDisplay('CmdOrCtrl+1', 'mac')).toBe('⌘1')
      })

      it('formats multiple modifiers in correct order', () => {
        expect(formatForDisplay('CmdOrCtrl+Shift+Z', 'mac')).toBe('⇧⌘Z')
      })

      it('formats all modifiers', () => {
        expect(formatForDisplay('CmdOrCtrl+Shift+Alt+K', 'mac')).toBe('⌥⇧⌘K')
      })

      it('formats function keys', () => {
        expect(formatForDisplay('F11', 'mac')).toBe('F11')
        expect(formatForDisplay('CmdOrCtrl+F5', 'mac')).toBe('⌘F5')
      })

      it('formats special keys with symbols', () => {
        expect(formatForDisplay('CmdOrCtrl+Escape', 'mac')).toBe('⌘⎋')
        expect(formatForDisplay('CmdOrCtrl+Enter', 'mac')).toBe('⌘↩')
        expect(formatForDisplay('CmdOrCtrl+Backspace', 'mac')).toBe('⌘⌫')
      })

      it('uppercases single character keys', () => {
        expect(formatForDisplay('CmdOrCtrl+z', 'mac')).toBe('⌘Z')
      })
    })

    describe('on Windows/Linux', () => {
      it('formats simple shortcuts with text', () => {
        expect(formatForDisplay('CmdOrCtrl+1', 'other')).toBe('Ctrl+1')
      })

      it('formats multiple modifiers with plus signs', () => {
        expect(formatForDisplay('CmdOrCtrl+Shift+Z', 'other')).toBe(
          'Ctrl+Shift+Z'
        )
      })

      it('formats all modifiers', () => {
        expect(formatForDisplay('CmdOrCtrl+Shift+Alt+K', 'other')).toBe(
          'Ctrl+Alt+Shift+K'
        )
      })

      it('formats function keys', () => {
        expect(formatForDisplay('F11', 'other')).toBe('F11')
        expect(formatForDisplay('CmdOrCtrl+F5', 'other')).toBe('Ctrl+F5')
      })

      it('formats special keys with labels', () => {
        expect(formatForDisplay('CmdOrCtrl+Escape', 'other')).toBe('Ctrl+Esc')
        expect(formatForDisplay('CmdOrCtrl+Enter', 'other')).toBe('Ctrl+Enter')
        expect(formatForDisplay('CmdOrCtrl+Backspace', 'other')).toBe(
          'Ctrl+Backspace'
        )
      })

      it('uppercases single character keys', () => {
        expect(formatForDisplay('CmdOrCtrl+z', 'other')).toBe('Ctrl+Z')
      })
    })
  })

  describe('matchesKeyboardEvent', () => {
    // Mock navigator for platform detection
    const originalNavigator = global.navigator

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      })
    })

    function mockPlatform(platform: string) {
      Object.defineProperty(global, 'navigator', {
        value: { platform },
        writable: true,
      })
    }

    function createKeyboardEvent(options: {
      key: string
      metaKey?: boolean
      ctrlKey?: boolean
      shiftKey?: boolean
      altKey?: boolean
    }): KeyboardEvent {
      return {
        key: options.key,
        metaKey: options.metaKey ?? false,
        ctrlKey: options.ctrlKey ?? false,
        shiftKey: options.shiftKey ?? false,
        altKey: options.altKey ?? false,
      } as KeyboardEvent
    }

    describe('on Mac', () => {
      beforeEach(() => {
        mockPlatform('MacIntel')
      })

      it('matches CmdOrCtrl with metaKey', () => {
        const shortcut = parseShortcut('CmdOrCtrl+1')
        const event = createKeyboardEvent({ key: '1', metaKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })

      it('does not match CmdOrCtrl with ctrlKey on Mac', () => {
        const shortcut = parseShortcut('CmdOrCtrl+1')
        const event = createKeyboardEvent({ key: '1', ctrlKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(false)
      })

      it('matches with shift modifier', () => {
        const shortcut = parseShortcut('CmdOrCtrl+Shift+Z')
        const event = createKeyboardEvent({
          key: 'z',
          metaKey: true,
          shiftKey: true,
        })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })

      it('does not match without required shift', () => {
        const shortcut = parseShortcut('CmdOrCtrl+Shift+Z')
        const event = createKeyboardEvent({ key: 'z', metaKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(false)
      })

      it('matches function keys without modifiers', () => {
        const shortcut = parseShortcut('F11')
        const event = createKeyboardEvent({ key: 'F11' })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })
    })

    describe('on Windows/Linux', () => {
      beforeEach(() => {
        mockPlatform('Win32')
      })

      it('matches CmdOrCtrl with ctrlKey', () => {
        const shortcut = parseShortcut('CmdOrCtrl+1')
        const event = createKeyboardEvent({ key: '1', ctrlKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })

      it('does not match CmdOrCtrl with metaKey on Windows', () => {
        const shortcut = parseShortcut('CmdOrCtrl+1')
        const event = createKeyboardEvent({ key: '1', metaKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(false)
      })
    })

    describe('key matching', () => {
      beforeEach(() => {
        mockPlatform('MacIntel')
      })

      it('is case-insensitive for single characters', () => {
        const shortcut = parseShortcut('CmdOrCtrl+Z')
        expect(
          matchesKeyboardEvent(
            shortcut,
            createKeyboardEvent({ key: 'z', metaKey: true })
          )
        ).toBe(true)
        expect(
          matchesKeyboardEvent(
            shortcut,
            createKeyboardEvent({ key: 'Z', metaKey: true })
          )
        ).toBe(true)
      })

      it('matches special characters', () => {
        const shortcut = parseShortcut('CmdOrCtrl+,')
        const event = createKeyboardEvent({ key: ',', metaKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })

      it('matches arrow keys', () => {
        const shortcut = parseShortcut('CmdOrCtrl+Up')
        const event = createKeyboardEvent({ key: 'ArrowUp', metaKey: true })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })

      it('matches Escape key', () => {
        const shortcut = parseShortcut('Escape')
        const event = createKeyboardEvent({ key: 'Escape' })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(true)
      })

      it('matches Enter key variations', () => {
        const shortcut = parseShortcut('CmdOrCtrl+Enter')
        expect(
          matchesKeyboardEvent(
            shortcut,
            createKeyboardEvent({ key: 'Enter', metaKey: true })
          )
        ).toBe(true)
      })
    })

    describe('modifier exactness', () => {
      beforeEach(() => {
        mockPlatform('MacIntel')
      })

      it('does not match if extra modifiers are pressed', () => {
        const shortcut = parseShortcut('CmdOrCtrl+1')
        const event = createKeyboardEvent({
          key: '1',
          metaKey: true,
          shiftKey: true,
        })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(false)
      })

      it('does not match if required modifier is missing', () => {
        const shortcut = parseShortcut('CmdOrCtrl+1')
        const event = createKeyboardEvent({ key: '1' })
        expect(matchesKeyboardEvent(shortcut, event)).toBe(false)
      })
    })
  })
})
