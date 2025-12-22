/**
 * Output mode enum
 */
export type OutputMode = 'human' | 'ai' | 'json';

/**
 * Global options available to all commands
 */
export interface GlobalOptions {
  ai?: boolean;
  json?: boolean;
}

/**
 * Determines the output mode from global flags
 */
export function getOutputMode(options: GlobalOptions): OutputMode {
  if (options.json) return 'json';
  if (options.ai) return 'ai';
  return 'human';
}

/**
 * Base interface for command results that can be formatted
 */
export interface FormattableResult {
  type: string;
}

/**
 * Formatter interface - all output formatters implement this
 */
export interface Formatter {
  format(result: FormattableResult): string;
}
