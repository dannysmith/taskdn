import { Command } from '@commander-js/extra-typings';
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/types.ts';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { lookupTask } from '@/lib/entity-lookup.ts';
import { disambiguateTasks } from '@/lib/disambiguation.ts';
import { getVaultConfig } from '@/config/index.ts';
import { createVaultSession } from '@bindings';

/**
 * Open command - open file in $EDITOR
 *
 * Usage:
 *   tdn open ~/tasks/foo.md
 *   tdn open "project plan"      # Fuzzy title matching
 *
 * Only works in interactive (human) mode.
 * Returns error in AI mode since it requires user interaction.
 */

/**
 * Allowed editors for security purposes.
 * Common editors that are safe to execute without shell interpretation.
 */
const ALLOWED_EDITORS = [
  'vim',
  'vim.exe',
  'vi',
  'vi.exe',
  'nvim',
  'nvim.exe',
  'nano',
  'nano.exe',
  'emacs',
  'emacs.exe',
  'code',
  'code.exe',
  'subl',
  'subl.exe',
  'atom',
  'atom.exe',
  'gedit',
  'gedit.exe',
  'kate',
  'kate.exe',
  'notepad',
  'notepad.exe',
  'notepad++',
  'notepad++.exe',
  'micro',
  'micro.exe',
  'helix',
  'helix.exe',
  'hx',
  'hx.exe',
];

/**
 * Validate that the editor command is safe to execute.
 * Checks for dangerous shell metacharacters first, then validates against allowed list.
 * Exported for testing.
 */
export function validateEditor(editor: string): void {
  // CRITICAL: Check for shell metacharacters FIRST before any processing
  const dangerousChars = /[;&|`$()<>]/;
  if (dangerousChars.test(editor)) {
    throw new Error(`Editor path contains dangerous shell metacharacters: ${editor}`);
  }

  // Extract base command name and validate against allowed list
  const editorBasename = basename(editor).toLowerCase();
  if (!ALLOWED_EDITORS.includes(editorBasename)) {
    throw new Error(
      `Editor "${editorBasename}" is not in the allowed list. ` +
        `Allowed editors: ${ALLOWED_EDITORS.join(', ')}`
    );
  }
}

/**
 * Get the editor command to use.
 * Priority: $VISUAL → $EDITOR → vim
 * Validates the editor for security.
 */
function getEditor(): string {
  const editor = process.env.VISUAL || process.env.EDITOR || 'vim';
  validateEditor(editor);
  return editor;
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
      const config = getVaultConfig();
      const session = createVaultSession(config);
      const lookupResult = lookupTask(session, query, config);
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
        shell: false, // SECURITY: Prevents command injection via $EDITOR
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
