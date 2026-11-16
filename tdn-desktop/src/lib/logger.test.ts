import { describe, it, expect, vi, afterEach } from 'vitest'

const pluginLog = vi.hoisted(() => ({
  trace: vi.fn(() => Promise.resolve()),
  debug: vi.fn(() => Promise.resolve()),
  info: vi.fn(() => Promise.resolve()),
  warn: vi.fn(() => Promise.resolve()),
  error: vi.fn(() => Promise.resolve()),
}))
vi.mock('@tauri-apps/plugin-log', () => pluginLog)

/** A fresh logger, built with import.meta.env.DEV set to `dev`. */
async function loggerFor(dev: boolean) {
  vi.stubEnv('DEV', dev)
  vi.resetModules()
  return (await import('./logger')).logger
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('logger', () => {
  it('writes to the log file in release builds, with context as JSON', async () => {
    const logger = await loggerFor(false)
    logger.warn('Save failed', {
      path: 'tasks/a.md',
      error: new Error('EACCES'),
    })
    expect(pluginLog.warn).toHaveBeenCalledWith(
      'Save failed {"path":"tasks/a.md","error":"Error: EACCES"}'
    )
  })

  it('logs to the console in dev builds, which forward it to the file themselves', async () => {
    const consoleInfo = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined)
    const logger = await loggerFor(true)
    logger.info('Vault loaded')
    expect(consoleInfo).toHaveBeenCalled()
    expect(pluginLog.info).not.toHaveBeenCalled()
  })
})
