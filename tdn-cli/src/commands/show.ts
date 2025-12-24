import { resolve } from 'path';
import { Command } from '@commander-js/extra-typings';
import { parseTaskFile, parseProjectFile, parseAreaFile } from '@bindings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskResult,
  ProjectResult,
  AreaResult,
  FormattableResult,
} from '@/output/index.ts';
import { createError, type CliError } from '@/errors/types.ts';
import { formatError } from '@/errors/format.ts';
import { detectEntityType } from '@/lib/entity-lookup.ts';

/**
 * Show command - view a single entity with full content
 *
 * Usage:
 *   taskdn show <path>                    # Show task or project by path
 *   taskdn show area "Work"               # Show area by name (stub)
 */
export const showCommand = new Command('show')
  .description('View a single entity with full content')
  .argument('<target>', 'Path to file or name of entity')
  .action((target, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    // Resolve to absolute path
    const absolutePath = resolve(target);
    const entityType = detectEntityType(absolutePath);

    try {
      let result: FormattableResult;

      if (entityType === 'project') {
        const project = parseProjectFile(absolutePath);
        result = {
          type: 'project',
          project,
        } as ProjectResult;
      } else if (entityType === 'area') {
        const area = parseAreaFile(absolutePath);
        result = {
          type: 'area',
          area,
        } as AreaResult;
      } else {
        const task = parseTaskFile(absolutePath);
        result = {
          type: 'task',
          task,
        } as TaskResult;
      }

      console.log(formatOutput(result, globalOpts));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Detect error type from the Rust error message
      let cliError: CliError;
      if (message.includes('File not found')) {
        cliError = createError.notFound(entityType, absolutePath);
      } else if (
        message.includes('Failed to parse frontmatter') ||
        message.includes('No frontmatter found')
      ) {
        // Extract details from the parse error message
        const details = message.replace(/^Failed to parse frontmatter:\s*/, '');
        cliError = createError.parseError(absolutePath, undefined, details);
      } else {
        // Generic parse error for other cases
        cliError = createError.parseError(absolutePath, undefined, message);
      }

      // Format and output the error
      const output = formatError(cliError, mode);
      if (mode === 'human') {
        console.error(output);
      } else {
        console.log(output);
      }

      process.exit(1);
    }
  });
