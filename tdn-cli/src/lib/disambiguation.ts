/**
 * Interactive disambiguation for ambiguous entity queries.
 *
 * When a query matches multiple entities in human mode, shows an interactive
 * picker to let the user select which one they meant.
 */

import * as p from '@clack/prompts';
import type { Task, Project, Area } from '@bindings';
import { createError } from '@/errors/index.ts';
import { homedir } from 'os';
import type { OutputMode } from '@/output/types.ts';

/**
 * Format a file path for display by replacing home directory with ~
 */
function formatPath(path: string): string {
  const home = homedir();
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

/**
 * Show interactive picker for multiple task matches.
 * Returns the selected task or null if cancelled.
 * Only works in human mode - throws error in AI/JSON mode.
 */
export async function disambiguateTasks(
  query: string,
  matches: Task[],
  mode: OutputMode
): Promise<Task> {
  // In AI/JSON mode, throw the ambiguous error
  if (mode !== 'human') {
    throw createError.ambiguous(
      query,
      matches.map((t) => t.title)
    );
  }

  // In human mode, show interactive picker
  const options = matches.map((task) => ({
    value: task,
    label: task.title,
    hint: formatPath(task.path),
  }));

  const selected = await p.select({
    message: `Multiple tasks match "${query}":`,
    options,
  });

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return selected as Task;
}

/**
 * Show interactive picker for multiple project matches.
 * Returns the selected project or null if cancelled.
 * Only works in human mode - throws error in AI/JSON mode.
 */
export async function disambiguateProjects(
  query: string,
  matches: Project[],
  mode: OutputMode
): Promise<Project> {
  // In AI/JSON mode, throw the ambiguous error
  if (mode !== 'human') {
    throw createError.ambiguous(
      query,
      matches.map((p) => p.title)
    );
  }

  // In human mode, show interactive picker
  const options = matches.map((project) => ({
    value: project,
    label: project.title,
    hint: formatPath(project.path),
  }));

  const selected = await p.select({
    message: `Multiple projects match "${query}":`,
    options,
  });

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return selected as Project;
}

/**
 * Show interactive picker for multiple area matches.
 * Returns the selected area or null if cancelled.
 * Only works in human mode - throws error in AI/JSON mode.
 */
export async function disambiguateAreas(
  query: string,
  matches: Area[],
  mode: OutputMode
): Promise<Area> {
  // In AI/JSON mode, throw the ambiguous error
  if (mode !== 'human') {
    throw createError.ambiguous(
      query,
      matches.map((a) => a.title)
    );
  }

  // In human mode, show interactive picker
  const options = matches.map((area) => ({
    value: area,
    label: area.title,
    hint: formatPath(area.path),
  }));

  const selected = await p.select({
    message: `Multiple areas match "${query}":`,
    options,
  });

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled');
    process.exit(0);
  }

  return selected as Area;
}
