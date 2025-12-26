import { Command } from '@commander-js/extra-typings';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/types.ts';
import { parseTaskFile } from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { detectEntityType } from '@/lib/entity-lookup.ts';

/**
 * Open command - open file in $EDITOR
 *
 * Usage:
 *   taskdn open ~/tasks/foo.md
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
 */
function editFile(filePath: string): void {
  const fullPath = resolve(filePath);

  // Validate file exists
  if (!existsSync(fullPath)) {
    throw createError.notFound('task', filePath);
  }

  // Validate this is a task (not a project or area)
  const entityType = detectEntityType(fullPath);
  if (entityType !== 'task') {
    throw createError.invalidEntityType('open', entityType, ['task']);
  }

  // Validate it's a valid task file
  try {
    parseTaskFile(fullPath);
  } catch {
    throw createError.parseError(filePath, undefined, 'Not a valid task file');
  }

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
  .argument('<path>', 'Path to task file')
  .action(async (path, _options, command) => {
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
      editFile(path);
      // After opening, optionally show the updated task
      const task = parseTaskFile(resolve(path));
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
