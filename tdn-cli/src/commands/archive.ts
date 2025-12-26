import { Command } from '@commander-js/extra-typings';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type { GlobalOptions, ArchivedResult, BatchResult, DryRunResult } from '@/output/types.ts';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { lookupTask } from '@/lib/entity-lookup.ts';

/**
 * Archive command - move file(s) to archive subdirectory
 *
 * Usage:
 *   taskdn archive ~/tasks/foo.md
 *   taskdn archive ~/tasks/foo.md ~/tasks/bar.md   # Multiple files
 */

/**
 * Get a unique archive path, handling duplicates with numeric suffixes.
 */
function getUniqueArchivePath(archiveDir: string, filename: string): string {
  const ext = '.md';
  const baseName = filename.endsWith(ext) ? filename.slice(0, -ext.length) : filename;

  let targetPath = join(archiveDir, filename);
  let counter = 1;

  while (existsSync(targetPath)) {
    targetPath = join(archiveDir, `${baseName}-${counter}${ext}`);
    counter++;
  }

  return targetPath;
}

/**
 * Archive a single file.
 * Moves it to an 'archive' subdirectory in the same parent directory.
 * Supports both path-based and fuzzy title-based lookup.
 */
function archiveFile(taskQuery: string): { title: string; fromPath: string; toPath: string } {
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
  const title = task.title;

  // Determine archive directory (parent/archive/)
  const parentDir = dirname(fullPath);
  const archiveDir = join(parentDir, 'archive');
  const filename = basename(fullPath);

  // Create archive directory if needed
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  // Get unique target path
  const targetPath = getUniqueArchivePath(archiveDir, filename);

  // Move the file
  renameSync(fullPath, targetPath);

  // Note: We could update updated-at in the moved file, but moving already
  // modifies the file's mtime. For now, we skip the explicit update.

  return {
    title,
    fromPath: fullPath,
    toPath: targetPath,
  };
}

/**
 * Preview archiving a file (for dry-run mode).
 * Supports both path-based and fuzzy title-based lookup.
 */
function previewArchive(taskQuery: string): DryRunResult {
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

  // Determine archive directory and target path
  const parentDir = dirname(fullPath);
  const archiveDir = join(parentDir, 'archive');
  const filename = basename(fullPath);
  const targetPath = getUniqueArchivePath(archiveDir, filename);

  return {
    type: 'dry-run',
    operation: 'archive',
    entityType: 'task',
    title: task.title,
    path: fullPath,
    toPath: targetPath,
  };
}

export const archiveCommand = new Command('archive')
  .description('Move file(s) to archive subdirectory')
  .argument('<queries...>', 'Task path(s) or title(s) to archive')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (paths, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);
    const dryRun = options.dryRun ?? false;

    // Single path case
    if (paths.length === 1) {
      const singlePath = paths[0]!;
      try {
        if (dryRun) {
          const result = previewArchive(singlePath);
          console.log(formatOutput(result, globalOpts));
        } else {
          const { title, fromPath, toPath } = archiveFile(singlePath);
          const result: ArchivedResult = {
            type: 'archived',
            title,
            fromPath,
            toPath,
          };
          console.log(formatOutput(result, globalOpts));
        }
      } catch (error) {
        if (isCliError(error)) {
          console.error(formatError(error, mode));
        } else {
          const cliError = createError.parseError('', 0, String(error));
          console.error(formatError(cliError, mode));
        }
        process.exit(1);
      }
      return;
    }

    // Batch case - for dry-run, output previews for each
    if (dryRun) {
      for (const filePath of paths) {
        try {
          const result = previewArchive(filePath);
          console.log(formatOutput(result, globalOpts));
        } catch (error) {
          if (isCliError(error)) {
            console.error(formatError(error, mode));
          }
        }
      }
      return;
    }

    // Batch case - process all, collect results
    const successes: BatchResult['successes'] = [];
    const failures: BatchResult['failures'] = [];

    for (const filePath of paths) {
      try {
        const { title, fromPath, toPath } = archiveFile(filePath);
        successes.push({
          path: fromPath,
          title,
          toPath,
        });
      } catch (error) {
        if (isCliError(error)) {
          failures.push({
            path: filePath,
            code: error.code,
            message: error.message,
          });
        } else {
          failures.push({
            path: filePath,
            code: 'UNKNOWN',
            message: String(error),
          });
        }
      }
    }

    const result: BatchResult = {
      type: 'batch-result',
      operation: 'archived',
      successes,
      failures,
    };

    console.log(formatOutput(result, globalOpts));

    // Exit code 1 if any failed
    if (failures.length > 0) {
      process.exit(1);
    }
  });
