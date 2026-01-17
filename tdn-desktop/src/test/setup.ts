import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// Reset platform cache between tests to ensure clean state
// This must be done after mocks are set up (vi.mock calls are hoisted)
afterEach(async () => {
  const { __resetPlatformCache } = await import('@/hooks/use-platform')
  __resetPlatformCache()
})

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// =============================================================================
// Tauri API Mocks
// =============================================================================
// These mocks prevent async operations from failing in the jsdom test
// environment and eliminate act() warnings from pending promises.

// Core event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => undefined), // unlisten function
  emit: vi.fn().mockResolvedValue(undefined),
}))

// Updater plugin
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockResolvedValue(null),
}))

// Deep link plugin
vi.mock('@tauri-apps/plugin-deep-link', () => ({
  onOpenUrl: vi.fn().mockResolvedValue(() => undefined), // unlisten function
}))

// OS plugin (locale detection, platform info)
// Note: platform() is synchronous, locale() is async
vi.mock('@tauri-apps/plugin-os', () => ({
  locale: vi.fn().mockResolvedValue('en-US'),
  platform: vi.fn().mockReturnValue('macos'),
  version: vi.fn().mockReturnValue('14.0.0'),
  type: vi.fn().mockReturnValue('macos'),
  arch: vi.fn().mockReturnValue('aarch64'),
}))

// Process plugin (app lifecycle)
vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn().mockResolvedValue(undefined),
  exit: vi.fn().mockResolvedValue(undefined),
}))

// Window API (window controls, focus events)
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn().mockReturnValue({
    onFocusChanged: vi.fn().mockResolvedValue(() => undefined),
    isFullscreen: vi.fn().mockResolvedValue(false),
    isMaximized: vi.fn().mockResolvedValue(false),
    minimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    unmaximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    setFullscreen: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Menu API (native menu building)
vi.mock('@tauri-apps/api/menu', () => {
  const mockMenuItem = { id: vi.fn(), text: vi.fn() }
  return {
    Menu: {
      new: vi.fn().mockResolvedValue({
        setAsAppMenu: vi.fn().mockResolvedValue(undefined),
        append: vi.fn().mockResolvedValue(undefined),
        items: vi.fn().mockResolvedValue([]),
      }),
    },
    MenuItem: {
      new: vi.fn().mockResolvedValue(mockMenuItem),
    },
    Submenu: {
      new: vi.fn().mockResolvedValue({
        ...mockMenuItem,
        append: vi.fn().mockResolvedValue(undefined),
      }),
    },
    PredefinedMenuItem: {
      new: vi.fn().mockResolvedValue(mockMenuItem),
    },
    CheckMenuItem: {
      new: vi.fn().mockResolvedValue(mockMenuItem),
    },
  }
})

// Mock typed Tauri bindings (tauri-specta generated)
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    greet: vi.fn().mockResolvedValue('Hello, test!'),
    loadPreferences: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { theme: 'system' } }),
    savePreferences: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    sendNativeNotification: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: null }),
    saveEmergencyData: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    loadEmergencyData: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    cleanupOldRecoveryFiles: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: 0 }),
  },
  unwrapResult: vi.fn((result: { status: string; data?: unknown }) => {
    if (result.status === 'ok') return result.data
    throw result
  }),
}))
