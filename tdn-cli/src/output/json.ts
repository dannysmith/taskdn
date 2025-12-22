import type { Formatter, FormattableResult } from './types.ts';

/**
 * JSON formatter - structured data for scripts and programmatic access
 */
export const jsonFormatter: Formatter = {
  format(result: FormattableResult): string {
    // Stub implementation - will be replaced with proper JSON output
    // JSON output always includes a summary field per spec
    const output = {
      summary: `Stub output for ${result.type}`,
      ...result,
    };
    return JSON.stringify(output, null, 2);
  },
};
