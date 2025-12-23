import type {
  OutputMode,
  Formatter,
  FormattableResult,
  GlobalOptions,
  TaskResult,
  TaskListResult,
  ProjectResult,
  AreaResult,
} from './types.ts';
import { getOutputMode } from './types.ts';
import { humanFormatter } from './human.ts';
import { aiFormatter } from './ai.ts';
import { jsonFormatter } from './json.ts';

export type {
  OutputMode,
  Formatter,
  FormattableResult,
  GlobalOptions,
  TaskResult,
  TaskListResult,
  ProjectResult,
  AreaResult,
};
export { getOutputMode };

/**
 * Get the appropriate formatter for the given output mode
 */
export function getFormatter(mode: OutputMode): Formatter {
  switch (mode) {
    case 'human':
      return humanFormatter;
    case 'ai':
      return aiFormatter;
    case 'json':
      return jsonFormatter;
  }
}

/**
 * Format a result using the appropriate formatter based on global options
 */
export function formatOutput(result: FormattableResult, options: GlobalOptions): string {
  const mode = getOutputMode(options);
  const formatter = getFormatter(mode);
  return formatter.format(result);
}
