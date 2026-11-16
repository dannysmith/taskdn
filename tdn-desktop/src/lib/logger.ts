/**
 * Simple logging utility for the frontend
 *
 * In development: logs to the browser console, which dev builds also copy to
 * the log file (`lib/agent-bridge/console.ts`)
 * In production: writes to the log file through tauri-plugin-log, at the
 * level the Rust side allows (info and above)
 */
import * as pluginLog from '@tauri-apps/plugin-log'

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
}

class Logger {
  private isDevelopment = import.meta.env.DEV

  /**
   * Log a trace message (most verbose)
   */
  trace(message: string, context?: Record<string, unknown>): void {
    this.log('trace', message, context)
  }

  /**
   * Log a debug message (development only)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    }

    if (this.isDevelopment) {
      this.logToConsole(entry)
    } else {
      this.logToFile(entry)
    }
  }

  private logToFile(entry: LogEntry): void {
    const message = entry.context
      ? `${entry.message} ${safeStringify(entry.context)}`
      : entry.message
    pluginLog[entry.level](message).catch(() => {
      // Logging must never break the app
    })
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`

    const args = entry.context
      ? [prefix, entry.message, entry.context]
      : [prefix, entry.message]

    switch (entry.level) {
      case 'trace':
      case 'debug':
        console.debug(...args)
        break
      case 'info':
        console.info(...args)
        break
      case 'warn':
        console.warn(...args)
        break
      case 'error':
        console.error(...args)
        break
    }
  }
}

/** JSON for log context, falling back to String() for values JSON can't hold. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, v: unknown) =>
      v instanceof Error ? `${v.name}: ${v.message}` : v
    )
  } catch {
    return String(value)
  }
}

// Export a singleton logger instance
export const logger = new Logger()

// Export individual logging functions for convenience
export const { trace, debug, info, warn, error } = logger
