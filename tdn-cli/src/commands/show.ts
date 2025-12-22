import { Command } from '@commander-js/extra-typings';
import { formatOutput } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/index.ts';

/**
 * Show command - view a single entity with full content
 *
 * Usage:
 *   taskdn show <path>                    # Show task by path
 *   taskdn show project "Q1 Planning"     # Show project by name
 *   taskdn show area "Work"               # Show area by name
 */
export const showCommand = new Command('show')
  .description('View a single entity with full content')
  .argument('<target>', 'Path to file or name of entity')
  .action((target, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;

    // Stub implementation - will call Rust parseTaskFile
    const result = {
      type: 'task',
      path: target,
      title: '(stub) Task title',
      status: 'ready',
    };

    console.log(formatOutput(result, globalOpts));
  });
