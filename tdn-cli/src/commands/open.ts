import { Command } from '@commander-js/extra-typings';
import { spawnSync } from 'node:child_process';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/types.ts';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { lookupTask } from '@/lib/entity-lookup.ts';

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

/**
 * Open a file in the editor.
 * Supports both path-based and fuzzy title-based lookup.
 */
function editFile(taskQuery: string): void {
  // Look up the task (supports both paths and fuzzy matching)
  const lookupResult = lookupTask(taskQuery);

  // Handle lookup results
  if (lookupResult.type === 'none') {
    throw createError.notFound('task', taskQuery);
  }

  if (lookupResult.type === 'multiple') {
    // Multiple matches - return ambiguous error with all match titles
    const matchTitles = lookupResult.matches.map((t) => t.title);
    throw createError.ambiguous(taskQuery, matchTitles);
  }

  // Single match (either exact path or single fuzzy match)
  const task = lookupResult.matches[0]!;
  const fullPath = task.path;

  const editor = getEditor();

  // Spawn the editor synchronously and wait for it to exit
  const result = spawnSync(editor, [fullPath], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to open editor: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Editor exited with code ${result.status}`);
  }
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
      if (lookupResult.type === 'multiple') {
        const matchTitles = lookupResult.matches.map((t) => t.title);
        throw createError.ambiguous(query, matchTitles);
      }
      const task = lookupResult.matches[0]!;

      editFile(query);
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
