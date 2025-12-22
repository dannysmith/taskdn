import type { Formatter, FormattableResult } from './types.ts';

/**
 * AI-mode formatter - structured Markdown optimized for LLM consumption
 */
export const aiFormatter: Formatter = {
  format(result: FormattableResult): string {
    // Stub implementation - will be replaced with proper Markdown formatting
    switch (result.type) {
      case 'task':
        return '## Task\n\n- **status:** (stub)\n- **path:** (stub)';
      case 'task-list':
        return '## Tasks\n\n(stub output)';
      case 'project':
        return '## Project\n\n- **status:** (stub)\n- **path:** (stub)';
      case 'area':
        return '## Area\n\n- **path:** (stub)';
      case 'context':
        return '## Context\n\n(stub output)';
      default:
        return `## ${result.type}\n\n(stub output)`;
    }
  },
};
