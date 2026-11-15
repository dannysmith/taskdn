import { reset } from 'ansis';
import type {
  OutputMode,
  Formatter,
  FormattableResult,
  GlobalOptions,
  TaskResult,
  TaskListResult,
  ProjectResult,
  ProjectListResult,
  AreaResult,
  AreaListResult,
  AreaContextResultOutput,
  ProjectContextResultOutput,
  TaskContextResultOutput,
  VaultOverviewResult,
  TimelineData,
  VaultStats,
  ProjectsByStatus,
  AreaStats,
  TasksByStatus,
  ProjectStats,
} from './types.ts';
import { getOutputMode } from './types.ts';
import { humanFormatter } from './human/index.ts';
import { aiFormatter } from './ai/index.ts';
import { jsonFormatter } from './json.ts';
import { aiJsonFormatter } from './ai-json.ts';

export type {
  OutputMode,
  Formatter,
  FormattableResult,
  GlobalOptions,
  TaskResult,
  TaskListResult,
  ProjectResult,
  ProjectListResult,
  AreaResult,
  AreaListResult,
  AreaContextResultOutput,
  ProjectContextResultOutput,
  TaskContextResultOutput,
  VaultOverviewResult,
  TimelineData,
  VaultStats,
  ProjectsByStatus,
  AreaStats,
  TasksByStatus,
  ProjectStats,
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
    case 'ai-json':
      return aiJsonFormatter;
  }
}

/**
 * Format a result using the appropriate formatter based on global options.
 * Human output to a terminal starts with an ANSI reset, to stop colour
 * bleeding in from the prompt. Other output is never prefixed, so `--json`
 * and `--ai` stay parseable.
 */
export function formatOutput(result: FormattableResult, options: GlobalOptions): string {
  const mode = getOutputMode(options);
  const formatter = getFormatter(mode);
  const prefix = mode === 'human' && process.stdout.isTTY ? reset.open : '';
  return prefix + formatter.format(result);
}
