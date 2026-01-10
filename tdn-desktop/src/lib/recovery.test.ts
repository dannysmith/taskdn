import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveEmergencyData,
  loadEmergencyData,
  cleanupOldFiles,
  saveCrashState,
} from './recovery'
import { commands } from '@/lib/tauri-bindings'

// Mock the Tauri bindings
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    saveEmergencyData: vi.fn(),
    loadEmergencyData: vi.fn(),
    cleanupOldRecoveryFiles: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveEmergencyData', () => {
    it('saves data successfully', async () => {
      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      const data = { content: 'test', timestamp: 12345 }
      await expect(
        saveEmergencyData('test-file', data)
      ).resolves.toBeUndefined()

      expect(commands.saveEmergencyData).toHaveBeenCalledWith('test-file', data)
    })

    it('throws on validation error', async () => {
      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'ValidationError', message: 'Invalid filename' },
      })

      await expect(saveEmergencyData('invalid!@#', {})).rejects.toThrow(
        'Validation error: Invalid filename'
      )
    })

    it('throws on data too large error', async () => {
      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'DataTooLarge', max_bytes: 1000000 },
      })

      const largeData = { huge: 'x'.repeat(2000000) }
      await expect(saveEmergencyData('large-file', largeData)).rejects.toThrow(
        'Data too large (max 1000000 bytes)'
      )
    })

    it('throws on IO error', async () => {
      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'IoError', message: 'Permission denied' },
      })

      await expect(saveEmergencyData('test-file', {})).rejects.toThrow(
        'IO error: Permission denied'
      )
    })

    it('handles silent option', async () => {
      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      await saveEmergencyData('test-file', { data: 'test' }, { silent: true })

      expect(commands.saveEmergencyData).toHaveBeenCalled()
    })
  })

  describe('loadEmergencyData', () => {
    it('loads existing data successfully', async () => {
      const savedData = { content: 'recovered', timestamp: 12345 }
      vi.mocked(commands.loadEmergencyData).mockResolvedValue({
        status: 'ok',
        data: savedData,
      })

      const result = await loadEmergencyData('test-file')

      expect(result).toEqual(savedData)
      expect(commands.loadEmergencyData).toHaveBeenCalledWith('test-file')
    })

    it('returns null when file not found', async () => {
      vi.mocked(commands.loadEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'FileNotFound' },
      })

      const result = await loadEmergencyData('non-existent')

      expect(result).toBeNull()
    })

    it('throws on parse error', async () => {
      vi.mocked(commands.loadEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'ParseError', message: 'Invalid JSON' },
      })

      await expect(loadEmergencyData('corrupt-file')).rejects.toThrow(
        'Parse error: Invalid JSON'
      )
    })

    it('throws on IO error', async () => {
      vi.mocked(commands.loadEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'IoError', message: 'Read failed' },
      })

      await expect(loadEmergencyData('test-file')).rejects.toThrow(
        'IO error: Read failed'
      )
    })

    it('returns typed data', async () => {
      interface MyData {
        value: number
        name: string
      }

      vi.mocked(commands.loadEmergencyData).mockResolvedValue({
        status: 'ok',
        data: { value: 42, name: 'test' },
      })

      const result = await loadEmergencyData<MyData>('typed-file')

      expect(result).toEqual({ value: 42, name: 'test' })
      // Type checking happens at compile time
      if (result) {
        expect(result.value).toBe(42)
        expect(result.name).toBe('test')
      }
    })
  })

  describe('cleanupOldFiles', () => {
    it('returns count of removed files', async () => {
      vi.mocked(commands.cleanupOldRecoveryFiles).mockResolvedValue({
        status: 'ok',
        data: 5,
      })

      const removed = await cleanupOldFiles()

      expect(removed).toBe(5)
    })

    it('returns 0 when no files to clean', async () => {
      vi.mocked(commands.cleanupOldRecoveryFiles).mockResolvedValue({
        status: 'ok',
        data: 0,
      })

      const removed = await cleanupOldFiles()

      expect(removed).toBe(0)
    })

    it('throws on error', async () => {
      vi.mocked(commands.cleanupOldRecoveryFiles).mockResolvedValue({
        status: 'error',
        error: { type: 'IoError', message: 'Cleanup failed' },
      })

      await expect(cleanupOldFiles()).rejects.toThrow('IO error: Cleanup failed')
    })
  })

  describe('saveCrashState', () => {
    beforeEach(() => {
      // Mock window and navigator for crash state tests
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'test-agent' },
        writable: true,
      })
      Object.defineProperty(global, 'window', {
        value: { location: { href: 'http://localhost:1420/' } },
        writable: true,
      })
    })

    it('saves crash state with timestamp', async () => {
      vi.useFakeTimers()
      // Use a specific timestamp directly for predictable testing
      const testTimestamp = 1700000000000 // Nov 14, 2023
      vi.setSystemTime(new Date(testTimestamp))

      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      const state = { currentPage: '/dashboard' }
      await saveCrashState(state)

      expect(commands.saveEmergencyData).toHaveBeenCalledWith(
        `crash-${testTimestamp}`,
        expect.objectContaining({
          timestamp: testTimestamp,
          state: { currentPage: '/dashboard' },
          userAgent: 'test-agent',
          url: 'http://localhost:1420/',
        })
      )

      vi.useRealTimers()
    })

    it('includes crash info when provided', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-06-15T12:00:00'))

      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'ok',
        data: null,
      })

      const state = { data: 'test' }
      const crashInfo = {
        error: 'TypeError: Cannot read property',
        stack: 'at Component.render',
        componentStack: 'in MyComponent',
      }

      await saveCrashState(state, crashInfo)

      expect(commands.saveEmergencyData).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          crashInfo,
        })
      )

      vi.useRealTimers()
    })

    it('does not throw on save error (silent failure)', async () => {
      vi.mocked(commands.saveEmergencyData).mockResolvedValue({
        status: 'error',
        error: { type: 'IoError', message: 'Save failed' },
      })

      // Should not throw
      await expect(saveCrashState({ data: 'test' })).resolves.toBeUndefined()
    })
  })
})
