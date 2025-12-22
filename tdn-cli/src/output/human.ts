import { bold, green, blue, dim } from 'ansis';
import type { Formatter, FormattableResult } from './types.ts';

/**
 * Human-readable formatter with colors and styling
 */
export const humanFormatter: Formatter = {
  format(result: FormattableResult): string {
    // Stub implementation - will be replaced with proper formatting
    switch (result.type) {
      case 'task':
        return bold(green('Task')) + dim(' (stub output)');
      case 'task-list':
        return bold(blue('Tasks')) + dim(' (stub output)');
      case 'project':
        return bold(green('Project')) + dim(' (stub output)');
      case 'area':
        return bold(green('Area')) + dim(' (stub output)');
      case 'context':
        return bold(blue('Context')) + dim(' (stub output)');
      default:
        return dim(`[${result.type}] stub output`);
    }
  },
};
