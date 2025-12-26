import { Command } from '@commander-js/extra-typings';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type { GlobalOptions, BodyAppendedResult, DryRunResult } from '@/output/types.ts';
import { parseTaskFile, parseProjectFile, parseAreaFile } from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import {
  detectEntityType,
  lookupTask,
  lookupProject,
  lookupArea,
  type EntityType,
} from '@/lib/entity-lookup.ts';

/**
 * Append-body command - add text to the end of an entity's body
 *
 * Usage:
 *   taskdn append-body ~/tasks/foo.md "Added a new note"
 *   taskdn append-body "project plan" "Multi-line note text here"  # Fuzzy matching
 *   taskdn append-body ~/projects/bar.md "Multi-line
 *   note text here"
 *
 * Appends the provided text to the file body with a newline before
 * and an ISO date in brackets at the end.
 */

/**
 * Get the current ISO date (YYYY-MM-DD format)
 */
function getIsoDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Get the entity title from a file
 */
function getEntityTitle(filePath: string, entityType: EntityType): string {
  switch (entityType) {
    case 'task':
      return parseTaskFile(filePath).title;
    case 'project':
      return parseProjectFile(filePath).title;
    case 'area':
      return parseAreaFile(filePath).title;
  }
}

/**
 * Format the text to append (with date suffix)
 */
function formatAppendText(text: string): string {
  const isoDate = getIsoDate();
  return `${text} [${isoDate}]`;
}

/**
 * Resolve an entity query to a path and type.
 * Supports both direct paths and fuzzy matching.
 */
function resolveEntityQuery(
  query: string
): { path: string; entityType: EntityType } | { error: string; matches?: string[] } {
  // Check if it looks like a path
  const looksLikePath =
    query.startsWith('/') ||
    query.startsWith('./') ||
    query.startsWith('../') ||
    query.startsWith('~') ||
    query.includes('/') ||
    query.endsWith('.md');

  if (looksLikePath) {
    const fullPath = resolve(query);
    const entityType = detectEntityType(fullPath);
    return { path: fullPath, entityType };
  }

  // Try fuzzy matching - tasks first, then projects, then areas
  const taskResult = lookupTask(query);
  if (taskResult.type === 'exact' || taskResult.type === 'single') {
    return { path: taskResult.matches[0]!.path, entityType: 'task' };
  }
  if (taskResult.type === 'multiple') {
    const matchTitles = taskResult.matches.map((t) => t.title);
    return { error: `Multiple tasks match "${query}"`, matches: matchTitles };
  }

  const projectResult = lookupProject(query);
  if (projectResult.type === 'exact' || projectResult.type === 'single') {
    return { path: projectResult.matches[0]!.path, entityType: 'project' };
  }
  if (projectResult.type === 'multiple') {
    const matchTitles = projectResult.matches.map((p) => p.title);
    return { error: `Multiple projects match "${query}"`, matches: matchTitles };
  }

  const areaResult = lookupArea(query);
  if (areaResult.type === 'exact' || areaResult.type === 'single') {
    return { path: areaResult.matches[0]!.path, entityType: 'area' };
  }
  if (areaResult.type === 'multiple') {
    const matchTitles = areaResult.matches.map((a) => a.title);
    return { error: `Multiple areas match "${query}"`, matches: matchTitles };
  }

  // No matches found
  return { error: `No task, project, or area found matching "${query}"` };
}

/**
 * Append text to a file's body section.
 *
 * The body is everything after the frontmatter closing delimiter (---).
 * We append a blank line (if needed) followed by the text with date.
 */
function appendToBody(
  filePath: string,
  text: string,
  entityType: EntityType
): { title: string; appendedText: string } {
  const fullPath = resolve(filePath);

  if (!existsSync(fullPath)) {
    throw createError.notFound(entityType, filePath);
  }

  const title = getEntityTitle(fullPath, entityType);
  const formattedText = formatAppendText(text);

  // Read the file content
  const content = readFileSync(fullPath, 'utf-8');

  // Find the end of frontmatter (second ---)
  // Frontmatter format is: ---\n...\n---\n<body>
  const frontmatterStartIndex = content.indexOf('---');
  if (frontmatterStartIndex === -1) {
    throw createError.parseError(filePath, undefined, 'No frontmatter found');
  }

  const frontmatterEndIndex = content.indexOf('---', frontmatterStartIndex + 3);
  if (frontmatterEndIndex === -1) {
    throw createError.parseError(filePath, undefined, 'Malformed frontmatter');
  }

  // Split into frontmatter and body
  const afterFrontmatter = frontmatterEndIndex + 3;
  const frontmatterPart = content.slice(0, afterFrontmatter);
  const bodyPart = content.slice(afterFrontmatter);

  // Append to body with appropriate newlines
  // If body is empty or only whitespace, start with two newlines
  // Otherwise, ensure there's a blank line before the new content
  let newBody: string;
  const trimmedBody = bodyPart.trim();
  if (trimmedBody === '') {
    // Empty body - start fresh
    newBody = '\n\n' + formattedText + '\n';
  } else {
    // Has existing content - add blank line before new content
    // Preserve the original body ending
    const endsWithNewline = bodyPart.endsWith('\n');
    if (endsWithNewline) {
      newBody = bodyPart.trimEnd() + '\n\n' + formattedText + '\n';
    } else {
      newBody = bodyPart + '\n\n' + formattedText + '\n';
    }
  }

  // Write the new content
  const newContent = frontmatterPart + newBody;
  writeFileSync(fullPath, newContent, 'utf-8');

  return { title, appendedText: formattedText };
}

/**
 * Preview append-body (for dry-run mode)
 */
function previewAppendBody(filePath: string, text: string, entityType: EntityType): DryRunResult {
  const fullPath = resolve(filePath);

  if (!existsSync(fullPath)) {
    throw createError.notFound(entityType, filePath);
  }

  const title = getEntityTitle(fullPath, entityType);
  const formattedText = formatAppendText(text);

  return {
    type: 'dry-run',
    operation: 'append-body',
    entityType,
    title,
    path: fullPath,
    appendText: formattedText,
  };
}

export const appendBodyCommand = new Command('append-body')
  .description('Append text to the body of a task, project, or area')
  .argument('<query>', 'Path or title of task/project/area')
  .argument('<text>', 'Text to append (multi-line supported)')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (query, text, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);
    const dryRun = options.dryRun ?? false;

    try {
      // Resolve the entity query (supports both paths and fuzzy matching)
      const resolution = resolveEntityQuery(query);

      if ('error' in resolution) {
        if (resolution.matches) {
          throw createError.ambiguous(query, resolution.matches);
        }
        throw createError.notFound('task', query);
      }

      const { path: fullPath, entityType } = resolution;

      if (dryRun) {
        const result = previewAppendBody(fullPath, text, entityType);
        console.log(formatOutput(result, globalOpts));
      } else {
        const { title, appendedText } = appendToBody(fullPath, text, entityType);
        const result: BodyAppendedResult = {
          type: 'body-appended',
          entityType,
          title,
          path: fullPath,
          appendedText,
        };
        console.log(formatOutput(result, globalOpts));
      }
    } catch (error) {
      if (isCliError(error)) {
        console.error(formatError(error, mode));
      } else {
        console.error(String(error));
      }
      process.exit(1);
    }
  });
