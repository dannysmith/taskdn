import { Command } from '@commander-js/extra-typings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/index.ts';

/**
 * Add command - create new entities
 *
 * Usage:
 *   taskdn add "Task title"                           # Quick add task
 *   taskdn add "Task" --project "Q1" --due friday     # With metadata
 *   taskdn add                                        # Interactive (human only)
 *   taskdn add project "Q1 Planning"                  # Add project
 *   taskdn add area "Work"                            # Add area
 */
export const addCommand = new Command('add')
  .description('Create a new entity')
  .argument('[entity-or-title]', 'Entity type (project/area) or task title')
  .argument('[title]', 'Title (when entity type is specified)')
  .option('--project <project>', 'Assign to project')
  .option('--area <area>', 'Assign to area')
  .option('--status <status>', 'Initial status')
  .option('--due <date>', 'Due date')
  .option('--scheduled <date>', 'Scheduled date')
  .option('--defer-until <date>', 'Defer until date')
  .option('--dry-run', 'Show what would be created without creating')
  .action((entityOrTitle, title, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    // If no arguments and human mode, would trigger interactive prompts
    if (!entityOrTitle && mode === 'human') {
      // Stub: in real implementation, would use @clack/prompts here
      console.log('(stub) Interactive add mode - would prompt for details');
      return;
    }

    // If no arguments in AI/JSON mode, error
    if (!entityOrTitle) {
      console.error('Error: Title required in non-interactive mode');
      process.exit(2);
    }

    // Stub implementation
    const result = {
      type: 'task',
      path: '(stub) ~/tasks/new-task.md',
      title: title ?? entityOrTitle,
      status: 'inbox',
    };

    console.log(formatOutput(result, globalOpts));
  });
