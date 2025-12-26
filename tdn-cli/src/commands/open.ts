import { Command } from '@commander-js/extra-typings';
import { spawnSync } from 'node:child_process';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/types.ts';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { lookupTask } from '@/lib/entity-lookup.ts';
import { disambiguateTasks } from '@/lib/disambiguation.ts';

/**
 * Open command - open file in $EDITOR
 *
 * Usage:
 *   taskdn open ~/tasks/foo.md
 *   taskdn open "project plan"      # Fuzzy title matching
 *
 * Only works in interactive (human) mode.
 * Returns error in AI mode since it requires user interaction.
 */

/**
 * Get the editor command to use.
 * Priority: $VISUAL → $EDITOR → vim → nano
 */
function getEditor(): string {
  return process.env.VISUAL || process.env.EDITOR || 'vim';
}

export const openCommand = new Command('open')
  .description('Open task in $EDITOR (interactive mode only)')
  .argument('<query>', 'Task path or title')
  .action(async (query, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    // Open command is only available in human (interactive) mode
    if (mode !== 'human') {
      const error = createError.notSupported(
        'Open command requires interactive mode',
        'Use `update --set` for programmatic changes'
      );
      console.error(formatError(error, mode));
      process.exit(1);
    }

    try {
      // Look up the task first to get its title
      const lookupResult = lookupTask(query);
      if (lookupResult.type === 'none') {
        throw createError.notFound('task', query);
      }

      let task;
      if (lookupResult.type === 'multiple') {
        // In human mode, show interactive disambiguation
        task = await disambiguateTasks(query, lookupResult.matches, mode);
      } else {
        task = lookupResult.matches[0]!;
      }

      // Open the selected task
      const editor = getEditor();
      const result = spawnSync(editor, [task.path], {
        stdio: 'inherit',
        shell: true,
      });

      if (result.error) {
        throw new Error(`Failed to open editor: ${result.error.message}`);
      }

      if (result.status !== 0) {
        throw new Error(`Editor exited with code ${result.status}`);
      }

      // After opening, show the task title
      console.log(`\nOpened: ${task.title}`);
    } catch (error) {
      if (isCliError(error)) {
        console.error(formatError(error, mode));
      } else {
        console.error(String(error));
      }
      process.exit(1);
    }
  });
