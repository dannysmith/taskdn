import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { TFunction } from 'i18next'
import type { CommandContext, AppCommand } from './types'

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

const { registerCommands, getAllCommands, executeCommand } =
  await import('./registry')
const { navigationCommands } = await import('./navigation-commands')
const { appCommands } = await import('./app-commands')

const createMockContext = (): CommandContext => ({
  openPreferences: vi.fn(),
  showToast: vi.fn(),
  navigateToView: vi.fn(),
  navigateToArea: vi.fn(),
  navigateToProject: vi.fn(),
  navigateToNoArea: vi.fn(),
  getAreas: vi.fn(() => []),
  getProjects: vi.fn(() => []),
  collapseAllAreas: vi.fn(),
  expandAllAreas: vi.fn(),
  openExternalUrl: vi.fn(),
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
