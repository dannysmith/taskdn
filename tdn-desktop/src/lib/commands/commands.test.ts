import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { TFunction } from 'i18next'
import type { CommandContext, AppCommand, ContextMenuEntity } from './types'
import { isTaskCommandAvailable, getTargetTask } from './types'
import {
  createTestTask,
  createTestProject,
  createTestArea,
  resetFactoryCounters,
} from '@/test/helpers/vault'

const mockUIStore = {
  getState: vi.fn(() => ({
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    commandPaletteOpen: false,
    toggleLeftSidebar: vi.fn(),
    toggleRightSidebar: vi.fn(),
    toggleCommandPalette: vi.fn(),
  })),
}

vi.mock('@/store/ui-store', () => ({
  useUIStore: mockUIStore,
}))

vi.mock('@/store/task-creation-store', () => ({
  useTaskCreationStore: {
    getState: vi.fn(() => ({
      triggerCreate: vi.fn(),
    })),
  },
}))

// Mock Tauri plugins for entity commands
vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(undefined),
  openUrl: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getEntityRawContent: vi.fn().mockResolvedValue({
      status: 'ok',
      data: '# Test Content\n\nThis is test markdown.',
    }),
    updateTask: vi.fn().mockResolvedValue({
      status: 'ok',
      data: {},
    }),
    createTask: vi.fn().mockResolvedValue({
      status: 'ok',
      data: { id: 'new-task-id' },
    }),
    deleteTask: vi.fn().mockResolvedValue({
      status: 'ok',
      data: null,
    }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/services/vault', () => ({
  markMutationStart: vi.fn(),
  markMutationComplete: vi.fn(),
}))

vi.mock('@/hooks/use-platform', () => ({
  getPlatform: vi.fn(() => 'macos'),
  __resetPlatformCache: vi.fn(),
}))

vi.mock('@/lib/platform-strings', () => ({
  getPlatformStrings: vi.fn(() => ({
    revealInFileManager: 'Reveal in Finder',
  })),
}))

// Mock Tauri window API
const mockWindow = {
  close: vi.fn().mockResolvedValue(undefined),
  minimize: vi.fn().mockResolvedValue(undefined),
  toggleMaximize: vi.fn().mockResolvedValue(undefined),
  setFullscreen: vi.fn().mockResolvedValue(undefined),
  isFullscreen: vi.fn().mockResolvedValue(false),
}

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => mockWindow),
}))

const { registerCommands, getAllCommands, executeCommand } =
  await import('./registry')
const { navigationCommands } = await import('./navigation-commands')
const { appCommands } = await import('./app-commands')
const { entityCommands } = await import('./entity-commands')
const { taskCommands } = await import('./task-commands')
const { windowCommands } = await import('./window-commands')
const { revealItemInDir, openPath, openUrl } =
  await import('@tauri-apps/plugin-opener')
const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
const { commands } = await import('@/lib/tauri-bindings')

const createMockContext = (): CommandContext => ({
  openPreferences: vi.fn(),
  isObsidianEnabled: vi.fn(() => false),
  showToast: vi.fn(),
  navigateToView: vi.fn(),
  navigateToArea: vi.fn(),
  navigateToProject: vi.fn(),
  navigateToNoArea: vi.fn(),
  // Navigation history
  goBack: vi.fn(),
  goForward: vi.fn(),
  canGoBack: vi.fn(() => false),
  canGoForward: vi.fn(() => false),
  getAreas: vi.fn(() => []),
  getProjects: vi.fn(() => []),
  collapseAllAreas: vi.fn(),
  expandAllAreas: vi.fn(),
  openExternalUrl: vi.fn(),
  // Task-specific context
  selectedTaskId: null,
  getSelectedTask: vi.fn(() => null),
  openTask: vi.fn(),
  focusField: vi.fn(),
  // Cache update methods
  updateTaskInCache: vi.fn(),
  addTaskToCache: vi.fn(),
  deleteTaskFromCache: vi.fn(),
  // Preferences
  isPermanentDeleteEnabled: vi.fn(() => false),
  // Context menu target
  getContextMenuTarget: vi.fn(() => null),
  setContextMenuTarget: vi.fn(),
})

// Mock translation function for testing
const mockT = ((key: string): string => {
  const translations: Record<string, string> = {
    'commands.toggleLeftSidebar.label': 'Toggle Left Sidebar',
    'commands.toggleLeftSidebar.description': 'Show or hide the left sidebar',
    'commands.toggleRightSidebar.label': 'Toggle Right Sidebar',
    'commands.toggleRightSidebar.description': 'Show or hide the right sidebar',
    'commands.openPreferences.label': 'Open Preferences',
    'commands.openPreferences.description': 'Open the application preferences',
  }
  return translations[key] || key
}) as TFunction

describe('Simplified Command System', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    mockContext = createMockContext()
    registerCommands(navigationCommands)
    registerCommands(appCommands)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Command Registration', () => {
    it('registers commands correctly', () => {
      const commands = getAllCommands(mockContext)
      expect(commands.length).toBeGreaterThan(0)

      const sidebarCommand = commands.find(
        cmd => cmd.id === 'toggle-left-sidebar'
      )
      expect(sidebarCommand).toBeDefined()
      expect(mockT(sidebarCommand?.labelKey ?? '')).toContain('Sidebar')
    })

    it('filters commands by search term using translations', () => {
      const searchResults = getAllCommands(mockContext, 'sidebar', mockT)

      expect(searchResults.length).toBeGreaterThan(0)
      searchResults.forEach(cmd => {
        const label = mockT(cmd.labelKey).toLowerCase()
        const description = cmd.descriptionKey
          ? mockT(cmd.descriptionKey).toLowerCase()
          : ''
        const keywords = cmd.keywords?.join(' ').toLowerCase() ?? ''
        const matchesSearch =
          label.includes('sidebar') ||
          description.includes('sidebar') ||
          keywords.includes('sidebar')

        expect(matchesSearch).toBe(true)
      })
    })
  })

  describe('Command Execution', () => {
    it('executes toggle-left-sidebar command correctly', async () => {
      const result = await executeCommand('toggle-left-sidebar', mockContext)

      expect(result.success).toBe(true)
    })

    it('executes toggle-right-sidebar command correctly', async () => {
      const result = await executeCommand('toggle-right-sidebar', mockContext)

      expect(result.success).toBe(true)
    })

    it('handles non-existent command', async () => {
      const result = await executeCommand('non-existent-command', mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('handles command execution errors', async () => {
      const errorCommand: AppCommand = {
        id: 'error-command',
        labelKey: 'commands.error.label',
        execute: () => {
          throw new Error('Test error')
        },
      }

      registerCommands([errorCommand])

      const result = await executeCommand('error-command', mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Test error')
    })

    it('executes dynamic area navigation commands', async () => {
      // Create context with mock areas
      const contextWithAreas = createMockContext()
      vi.mocked(contextWithAreas.getAreas).mockReturnValue([
        { id: 'area-123', title: 'Work', status: 'active' },
        { id: 'area-456', title: 'Personal', status: 'active' },
      ] as never)

      // Dynamic commands aren't in static registry - they're generated at runtime
      const result = await executeCommand(
        'navigate-area-area-123',
        contextWithAreas
      )

      expect(result.success).toBe(true)
      expect(contextWithAreas.navigateToArea).toHaveBeenCalledWith('area-123')
    })

    it('executes dynamic project navigation commands', async () => {
      const contextWithProjects = createMockContext()
      vi.mocked(contextWithProjects.getProjects).mockReturnValue([
        { id: 'proj-789', title: 'Website Redesign', status: 'active' },
      ] as never)

      const result = await executeCommand(
        'navigate-project-proj-789',
        contextWithProjects
      )

      expect(result.success).toBe(true)
      expect(contextWithProjects.navigateToProject).toHaveBeenCalledWith(
        'proj-789'
      )
    })
  })
})

describe('isTaskCommandAvailable', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    resetFactoryCounters()
    mockContext = createMockContext()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when context menu target is a task', () => {
    const task = createTestTask({ id: 'task-123' })
    const target: ContextMenuEntity = { type: 'task', entity: task }
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(target)

    expect(isTaskCommandAvailable(mockContext)).toBe(true)
  })

  it('returns false when context menu target is not a task', () => {
    // No context menu target and no selected task
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = null

    expect(isTaskCommandAvailable(mockContext)).toBe(false)
  })

  it('returns true when task is selected and focus is not in editable element', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = 'task-123'

    // Mock document.activeElement to be a div (non-editable)
    const div = document.createElement('div')
    Object.defineProperty(document, 'activeElement', {
      value: div,
      configurable: true,
    })

    expect(isTaskCommandAvailable(mockContext)).toBe(true)
  })

  it('returns false when task is selected but focus is in input element', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = 'task-123'

    const input = document.createElement('input')
    Object.defineProperty(document, 'activeElement', {
      value: input,
      configurable: true,
    })

    expect(isTaskCommandAvailable(mockContext)).toBe(false)
  })

  it('returns false when task is selected but focus is in textarea', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = 'task-123'

    const textarea = document.createElement('textarea')
    Object.defineProperty(document, 'activeElement', {
      value: textarea,
      configurable: true,
    })

    expect(isTaskCommandAvailable(mockContext)).toBe(false)
  })

  it('returns false when task is selected but focus is in select element', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = 'task-123'

    const select = document.createElement('select')
    Object.defineProperty(document, 'activeElement', {
      value: select,
      configurable: true,
    })

    expect(isTaskCommandAvailable(mockContext)).toBe(false)
  })

  it('returns false when task is selected but focus is in contenteditable element', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = 'task-123'

    const contentEditable = document.createElement('div')
    contentEditable.contentEditable = 'true'
    // Mock isContentEditable since jsdom may not properly implement it
    Object.defineProperty(contentEditable, 'isContentEditable', {
      value: true,
      configurable: true,
    })
    Object.defineProperty(document, 'activeElement', {
      value: contentEditable,
      configurable: true,
    })

    expect(isTaskCommandAvailable(mockContext)).toBe(false)
  })

  it('returns false when no task is selected', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    mockContext.selectedTaskId = null

    expect(isTaskCommandAvailable(mockContext)).toBe(false)
  })
})

describe('getTargetTask', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    resetFactoryCounters()
    mockContext = createMockContext()
  })

  it('returns context menu task when available', () => {
    const contextMenuTask = createTestTask({
      id: 'context-task',
      title: 'Context Menu Task',
    })
    const selectedTask = createTestTask({
      id: 'selected-task',
      title: 'Selected Task',
    })
    const target: ContextMenuEntity = { type: 'task', entity: contextMenuTask }

    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(target)
    vi.mocked(mockContext.getSelectedTask).mockReturnValue(selectedTask)

    // Should return context menu task, not selected task
    const result = getTargetTask(mockContext)
    expect(result).toBe(contextMenuTask)
    expect(result?.id).toBe('context-task')
  })

  it('returns selected task when no context menu target', () => {
    const selectedTask = createTestTask({
      id: 'selected-task',
      title: 'Selected Task',
    })

    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    vi.mocked(mockContext.getSelectedTask).mockReturnValue(selectedTask)

    const result = getTargetTask(mockContext)
    expect(result).toBe(selectedTask)
    expect(result?.id).toBe('selected-task')
  })

  it('returns null when no context menu target and no selected task', () => {
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue(null)
    vi.mocked(mockContext.getSelectedTask).mockReturnValue(null)

    expect(getTargetTask(mockContext)).toBeNull()
  })

  it('falls back to selected task when context menu target is not a task', () => {
    const project = createTestProject({ id: 'project-1' })
    const selectedTask = createTestTask({ id: 'selected-task' })

    // Context menu target is a project, not a task
    vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
      type: 'project',
      entity: project,
    } as ContextMenuEntity)
    vi.mocked(mockContext.getSelectedTask).mockReturnValue(selectedTask)

    const result = getTargetTask(mockContext)
    expect(result).toBe(selectedTask)
  })
})

describe('Entity Commands', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    resetFactoryCounters()
    mockContext = createMockContext()
    vi.clearAllMocks()
    registerCommands(entityCommands)
  })

  describe('reveal-in-finder', () => {
    it('calls revealItemInDir with entity path', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('reveal-in-finder', mockContext)

      expect(result.success).toBe(true)
      expect(revealItemInDir).toHaveBeenCalledWith('/test/tasks/task-123.md')
    })

    it('shows error toast when revealItemInDir fails', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(revealItemInDir).mockRejectedValueOnce(
        new Error('Failed to reveal')
      )

      const result = await executeCommand('reveal-in-finder', mockContext)

      expect(result.success).toBe(true) // Command itself doesn't throw
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })

    it('works with project context menu target', async () => {
      const project = createTestProject({
        id: 'project-1',
        path: '/test/projects/project-1.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'project',
        entity: project,
      })

      const result = await executeCommand('reveal-in-finder', mockContext)

      expect(result.success).toBe(true)
      expect(revealItemInDir).toHaveBeenCalledWith(
        '/test/projects/project-1.md'
      )
    })

    it('works with area context menu target', async () => {
      const area = createTestArea({
        id: 'area-1',
        path: '/test/areas/area-1.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'area',
        entity: area,
      })

      const result = await executeCommand('reveal-in-finder', mockContext)

      expect(result.success).toBe(true)
      expect(revealItemInDir).toHaveBeenCalledWith('/test/areas/area-1.md')
    })
  })

  describe('open-in-default-app', () => {
    it('calls openPath with entity path', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('open-in-default-app', mockContext)

      expect(result.success).toBe(true)
      expect(openPath).toHaveBeenCalledWith('/test/tasks/task-123.md')
    })

    it('shows error toast when openPath fails', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(openPath).mockRejectedValueOnce(new Error('Failed to open'))

      const result = await executeCommand('open-in-default-app', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })

  describe('open-in-obsidian', () => {
    it('opens Obsidian URI when Obsidian is enabled', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(mockContext.isObsidianEnabled).mockReturnValue(true)

      const result = await executeCommand('open-in-obsidian', mockContext)

      expect(result.success).toBe(true)
      expect(openUrl).toHaveBeenCalledWith(
        expect.stringContaining('obsidian://open?path=')
      )
    })

    it('is not available when Obsidian is disabled', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(mockContext.isObsidianEnabled).mockReturnValue(false)

      // The command should not be available
      const allCommands = getAllCommands(mockContext)
      const obsidianCommand = allCommands.find(
        cmd => cmd.id === 'open-in-obsidian'
      )

      expect(obsidianCommand).toBeUndefined()
    })
  })

  describe('copy-file-path', () => {
    it('copies entity path to clipboard', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      // Mock navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      })

      const result = await executeCommand('copy-file-path', mockContext)

      expect(result.success).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '/test/tasks/task-123.md'
      )
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })
  })

  describe('copy-local-url', () => {
    it('copies taskdn:// URL to clipboard', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      })

      const result = await executeCommand('copy-local-url', mockContext)

      expect(result.success).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('taskdn://open?path=')
      )
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })
  })

  describe('copy-as-markdown', () => {
    it('copies raw file content to clipboard', async () => {
      const task = createTestTask({
        id: 'task-123',
        path: '/test/tasks/task-123.md',
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('copy-as-markdown', mockContext)

      expect(result.success).toBe(true)
      expect(commands.getEntityRawContent).toHaveBeenCalledWith(
        'task',
        'task-123'
      )
      expect(writeText).toHaveBeenCalledWith(
        '# Test Content\n\nThis is test markdown.'
      )
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })

    it('shows error toast when getEntityRawContent fails', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(commands.getEntityRawContent).mockResolvedValueOnce({
        status: 'error',
        error: { type: 'internal', message: 'Failed' },
      } as never)

      const result = await executeCommand('copy-as-markdown', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })
})

describe('Task Commands', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    resetFactoryCounters()
    mockContext = createMockContext()
    vi.clearAllMocks()
    registerCommands(taskCommands)

    // Set up a non-editable active element
    const div = document.createElement('div')
    Object.defineProperty(document, 'activeElement', {
      value: div,
      configurable: true,
    })
  })

  describe('set-scheduled-today', () => {
    it('updates task with today date', async () => {
      const task = createTestTask({ id: 'task-123', scheduled: null })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      // Mock the updateTask to return the updated task
      vi.mocked(commands.updateTask).mockResolvedValueOnce({
        status: 'ok',
        data: { ...task, scheduled: '2025-01-17' },
      } as never)

      const result = await executeCommand('set-scheduled-today', mockContext)

      expect(result.success).toBe(true)
      expect(commands.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-123',
          scheduled: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        })
      )
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })

    it('shows error toast when updateTask fails', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(commands.updateTask).mockResolvedValueOnce({
        status: 'error',
        error: { type: 'internal', message: 'Failed' },
      } as never)

      const result = await executeCommand('set-scheduled-today', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })

  describe('edit-scheduled-date', () => {
    it('calls focusField with scheduled', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('edit-scheduled-date', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.focusField).toHaveBeenCalledWith('scheduled')
    })
  })

  describe('edit-due-date', () => {
    it('calls focusField with due', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('edit-due-date', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.focusField).toHaveBeenCalledWith('due')
    })
  })

  describe('edit-defer-date', () => {
    it('calls focusField with defer', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('edit-defer-date', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.focusField).toHaveBeenCalledWith('defer')
    })
  })

  describe('edit-status', () => {
    it('calls focusField with status', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const result = await executeCommand('edit-status', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.focusField).toHaveBeenCalledWith('status')
    })
  })

  describe('copy-task-title', () => {
    it('copies task title to clipboard', async () => {
      const task = createTestTask({ id: 'task-123', title: 'My Task Title' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      })

      const result = await executeCommand('copy-task-title', mockContext)

      expect(result.success).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'My Task Title'
      )
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })
  })

  describe('duplicate-task', () => {
    it('creates a duplicate task', async () => {
      const task = createTestTask({
        id: 'task-123',
        title: 'Original Task',
        status: 'ready',
        project: null,
        area: null,
        scheduled: '2025-01-20',
        due: null,
        deferUntil: null,
      })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })

      const newTask = { ...task, id: 'new-task-id' }
      vi.mocked(commands.createTask).mockResolvedValueOnce({
        status: 'ok',
        data: newTask,
      } as never)

      const result = await executeCommand('duplicate-task', mockContext)

      expect(result.success).toBe(true)
      expect(commands.createTask).toHaveBeenCalledWith({
        title: 'Original Task',
        status: 'ready',
        projectId: null,
        areaId: null,
        scheduled: '2025-01-20',
        due: null,
        deferUntil: null,
      })
      expect(mockContext.addTaskToCache).toHaveBeenCalledWith(newTask)
      expect(mockContext.openTask).toHaveBeenCalledWith('new-task-id')
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })
  })

  describe('delete-task', () => {
    it('deletes task with permanent flag based on preferences', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(mockContext.isPermanentDeleteEnabled).mockReturnValue(true)
      vi.mocked(commands.deleteTask).mockResolvedValueOnce({
        status: 'ok',
        data: null,
      } as never)

      const result = await executeCommand('delete-task', mockContext)

      expect(result.success).toBe(true)
      expect(commands.deleteTask).toHaveBeenCalledWith('task-123', true)
      expect(mockContext.deleteTaskFromCache).toHaveBeenCalledWith('task-123')
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'success'
      )
    })

    it('deletes task with move to trash when permanent delete disabled', async () => {
      const task = createTestTask({ id: 'task-123' })
      vi.mocked(mockContext.getContextMenuTarget).mockReturnValue({
        type: 'task',
        entity: task,
      })
      vi.mocked(mockContext.isPermanentDeleteEnabled).mockReturnValue(false)
      vi.mocked(commands.deleteTask).mockResolvedValueOnce({
        status: 'ok',
        data: null,
      } as never)

      const result = await executeCommand('delete-task', mockContext)

      expect(result.success).toBe(true)
      expect(commands.deleteTask).toHaveBeenCalledWith('task-123', false)
    })
  })
})

describe('Window Commands', () => {
  let mockContext: CommandContext

  beforeEach(() => {
    resetFactoryCounters()
    mockContext = createMockContext()
    vi.clearAllMocks()
    registerCommands(windowCommands)
  })

  describe('window-close', () => {
    it('closes the current window', async () => {
      const result = await executeCommand('window-close', mockContext)

      expect(result.success).toBe(true)
      expect(mockWindow.close).toHaveBeenCalled()
    })

    it('shows error toast when close fails', async () => {
      mockWindow.close.mockRejectedValueOnce(new Error('Close failed'))

      const result = await executeCommand('window-close', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })

  describe('window-minimize', () => {
    it('minimizes the current window', async () => {
      const result = await executeCommand('window-minimize', mockContext)

      expect(result.success).toBe(true)
      expect(mockWindow.minimize).toHaveBeenCalled()
    })

    it('shows error toast when minimize fails', async () => {
      mockWindow.minimize.mockRejectedValueOnce(new Error('Minimize failed'))

      const result = await executeCommand('window-minimize', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })

  describe('window-toggle-maximize', () => {
    it('toggles the maximize state', async () => {
      const result = await executeCommand('window-toggle-maximize', mockContext)

      expect(result.success).toBe(true)
      expect(mockWindow.toggleMaximize).toHaveBeenCalled()
    })

    it('shows error toast when toggle maximize fails', async () => {
      mockWindow.toggleMaximize.mockRejectedValueOnce(
        new Error('Toggle failed')
      )

      const result = await executeCommand('window-toggle-maximize', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })

  describe('window-fullscreen', () => {
    it('enters fullscreen mode', async () => {
      const result = await executeCommand('window-fullscreen', mockContext)

      expect(result.success).toBe(true)
      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(true)
    })

    it('shows error toast when entering fullscreen fails', async () => {
      mockWindow.setFullscreen.mockRejectedValueOnce(
        new Error('Fullscreen failed')
      )

      const result = await executeCommand('window-fullscreen', mockContext)

      expect(result.success).toBe(true)
      expect(mockContext.showToast).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      )
    })
  })

  describe('window-exit-fullscreen', () => {
    it('exits fullscreen mode', async () => {
      const result = await executeCommand('window-exit-fullscreen', mockContext)

      expect(result.success).toBe(true)
      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(false)
    })
  })
})
