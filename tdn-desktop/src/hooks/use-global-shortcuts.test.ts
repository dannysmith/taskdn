import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGlobalShortcuts } from './use-global-shortcuts'
import type { CommandContext } from '@/lib/commands/types'

// Mock the commands module
vi.mock('@/lib/commands', () => ({
  getAllCommands: vi.fn(),
  executeCommand: vi.fn(),
}))

// Mock shortcuts module
vi.mock('@/lib/shortcuts', () => ({
  parseShortcut: vi.fn((shortcut: string) => ({
    key: shortcut.split('+').pop() || '',
    cmdOrCtrl: shortcut.includes('CmdOrCtrl'),
    ctrl: false,
    shift: shortcut.includes('Shift'),
    alt: shortcut.includes('Alt'),
  })),
  matchesKeyboardEvent: vi.fn(),
}))

import { getAllCommands, executeCommand } from '@/lib/commands'
import { matchesKeyboardEvent } from '@/lib/shortcuts'

describe('useGlobalShortcuts', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a minimal mock context
    mockContext = {
      openPreferences: vi.fn(),
      isObsidianEnabled: vi.fn(() => false),
      showToast: vi.fn(),
      navigateToView: vi.fn(),
      navigateToArea: vi.fn(),
      navigateToProject: vi.fn(),
      navigateToNoArea: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      canGoBack: vi.fn(() => false),
      canGoForward: vi.fn(() => false),
      getAreas: vi.fn(() => []),
      getProjects: vi.fn(() => []),
      collapseAllAreas: vi.fn(),
      expandAllAreas: vi.fn(),
      openExternalUrl: vi.fn(),
      selectedTaskId: null,
      getSelectedTask: vi.fn(() => null),
      openTask: vi.fn(),
      focusField: vi.fn(),
      updateTaskInCache: vi.fn(),
      addTaskToCache: vi.fn(),
      deleteTaskFromCache: vi.fn(),
      isPermanentDeleteEnabled: vi.fn(() => false),
      getContextMenuTarget: vi.fn(() => null),
      setContextMenuTarget: vi.fn(),
    }

    // Default: no commands
    vi.mocked(getAllCommands).mockReturnValue([])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('adds keydown listener on mount', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

    renderHook(() => useGlobalShortcuts(mockContext))

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    )

    addEventListenerSpy.mockRestore()
  })

  it('removes keydown listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => useGlobalShortcuts(mockContext))
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    )

    removeEventListenerSpy.mockRestore()
  })

  it('executes matching command when shortcut is pressed', () => {
    const mockCommand = {
      id: 'test-command',
      labelKey: 'commands.test',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([mockCommand])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

    renderHook(() => useGlobalShortcuts(mockContext))

    // Simulate keydown event
    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    expect(executeCommand).toHaveBeenCalledWith('test-command', mockContext)
  })

  it('prevents default when command is executed', () => {
    const mockCommand = {
      id: 'test-command',
      labelKey: 'commands.test',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([mockCommand])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

    renderHook(() => useGlobalShortcuts(mockContext))

    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    document.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('does not execute command when no match', () => {
    const mockCommand = {
      id: 'test-command',
      labelKey: 'commands.test',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([mockCommand])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(false)

    renderHook(() => useGlobalShortcuts(mockContext))

    const event = new KeyboardEvent('keydown', {
      key: 'x',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    expect(executeCommand).not.toHaveBeenCalled()
  })

  it('respects defaultPrevented', () => {
    const mockCommand = {
      id: 'test-command',
      labelKey: 'commands.test',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([mockCommand])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

    renderHook(() => useGlobalShortcuts(mockContext))

    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    // Simulate component-level handler preventing default
    event.preventDefault()

    document.dispatchEvent(event)

    // Command should not be executed because event was already handled
    expect(executeCommand).not.toHaveBeenCalled()
  })

  describe('skips editable elements', () => {
    it('skips when input is focused', () => {
      const mockCommand = {
        id: 'test-command',
        labelKey: 'commands.test',
        shortcut: 'CmdOrCtrl+T',
        execute: vi.fn(),
      }

      vi.mocked(getAllCommands).mockReturnValue([mockCommand])
      vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

      // Create and focus an input
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      renderHook(() => useGlobalShortcuts(mockContext))

      const event = new KeyboardEvent('keydown', {
        key: 't',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(executeCommand).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(input)
    })

    it('skips when textarea is focused', () => {
      const mockCommand = {
        id: 'test-command',
        labelKey: 'commands.test',
        shortcut: 'CmdOrCtrl+T',
        execute: vi.fn(),
      }

      vi.mocked(getAllCommands).mockReturnValue([mockCommand])
      vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

      // Create and focus a textarea
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      renderHook(() => useGlobalShortcuts(mockContext))

      const event = new KeyboardEvent('keydown', {
        key: 't',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(executeCommand).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(textarea)
    })

    it('skips when select is focused', () => {
      const mockCommand = {
        id: 'test-command',
        labelKey: 'commands.test',
        shortcut: 'CmdOrCtrl+T',
        execute: vi.fn(),
      }

      vi.mocked(getAllCommands).mockReturnValue([mockCommand])
      vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

      // Create and focus a select
      const select = document.createElement('select')
      document.body.appendChild(select)
      select.focus()

      renderHook(() => useGlobalShortcuts(mockContext))

      const event = new KeyboardEvent('keydown', {
        key: 't',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      expect(executeCommand).not.toHaveBeenCalled()

      // Cleanup
      document.body.removeChild(select)
    })

    it('skips when contenteditable is focused', () => {
      const mockCommand = {
        id: 'test-command',
        labelKey: 'commands.test',
        shortcut: 'CmdOrCtrl+T',
        execute: vi.fn(),
      }

      vi.mocked(getAllCommands).mockReturnValue([mockCommand])
      vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

      // Create a contenteditable div
      // Note: jsdom doesn't properly implement isContentEditable, so we mock it
      // See: https://github.com/jsdom/jsdom/issues/1670
      const div = document.createElement('div')
      div.contentEditable = 'true'
      Object.defineProperty(div, 'isContentEditable', {
        value: true,
        configurable: true,
      })

      // Save original activeElement getter and mock it
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        Document.prototype,
        'activeElement'
      )

      try {
        Object.defineProperty(document, 'activeElement', {
          get: () => div,
          configurable: true,
        })

        renderHook(() => useGlobalShortcuts(mockContext))

        const event = new KeyboardEvent('keydown', {
          key: 't',
          metaKey: true,
          bubbles: true,
        })
        document.dispatchEvent(event)

        expect(executeCommand).not.toHaveBeenCalled()
      } finally {
        // Restore original activeElement - delete our override first
        delete (document as { activeElement?: unknown }).activeElement
        if (originalDescriptor) {
          Object.defineProperty(
            Document.prototype,
            'activeElement',
            originalDescriptor
          )
        }
      }
    })
  })

  it('executes when non-editable element is focused', () => {
    const mockCommand = {
      id: 'test-command',
      labelKey: 'commands.test',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([mockCommand])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

    // Create and focus a regular div
    const div = document.createElement('div')
    div.tabIndex = 0
    document.body.appendChild(div)
    div.focus()

    renderHook(() => useGlobalShortcuts(mockContext))

    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    expect(executeCommand).toHaveBeenCalledWith('test-command', mockContext)

    // Cleanup
    document.body.removeChild(div)
  })

  it('only executes first matching command', () => {
    const command1 = {
      id: 'command-1',
      labelKey: 'commands.one',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }
    const command2 = {
      id: 'command-2',
      labelKey: 'commands.two',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([command1, command2])
    // Only match the first command
    vi.mocked(matchesKeyboardEvent).mockImplementation((parsed, event) => {
      return true // Both would match
    })

    renderHook(() => useGlobalShortcuts(mockContext))

    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    // Should only execute the first matching command
    expect(executeCommand).toHaveBeenCalledTimes(1)
    expect(executeCommand).toHaveBeenCalledWith('command-1', mockContext)
  })

  it('skips commands without shortcuts', () => {
    const commandWithShortcut = {
      id: 'with-shortcut',
      labelKey: 'commands.with',
      shortcut: 'CmdOrCtrl+T',
      execute: vi.fn(),
    }
    const commandWithoutShortcut = {
      id: 'without-shortcut',
      labelKey: 'commands.without',
      // No shortcut
      execute: vi.fn(),
    }

    vi.mocked(getAllCommands).mockReturnValue([
      commandWithoutShortcut,
      commandWithShortcut,
    ])
    vi.mocked(matchesKeyboardEvent).mockReturnValue(true)

    renderHook(() => useGlobalShortcuts(mockContext))

    const event = new KeyboardEvent('keydown', {
      key: 't',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    // Should execute the command with shortcut, not the one without
    expect(executeCommand).toHaveBeenCalledWith('with-shortcut', mockContext)
  })
})
