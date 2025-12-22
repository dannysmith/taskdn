import { resolve } from 'path';
import { Command } from '@commander-js/extra-typings';
import { red } from 'ansis';
import { parseTaskFile } from '@bindings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type { GlobalOptions, TaskResult } from '@/output/index.ts';

/**
 * Show command - view a single entity with full content
 *
 * Usage:
 *   taskdn show <path>                    # Show task by path
 *   taskdn show project "Q1 Planning"     # Show project by name (stub)
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

    try {
      const task = parseTaskFile(absolutePath);

      const result: TaskResult = {
        type: 'task',
        task,
      };

      console.log(formatOutput(result, globalOpts));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (mode === 'json') {
        console.log(
          JSON.stringify(
            {
              error: true,
              message,
              path: absolutePath,
            },
            null,
            2
          )
        );
      } else if (mode === 'ai') {
        console.log(`## Error\n\n- **message:** ${message}\n- **path:** ${absolutePath}`);
      } else {
        console.error(red(`Error: ${message}`));
      }

      process.exit(1);
    }
  });
