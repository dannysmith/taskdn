import { resolve, isAbsolute, join } from 'path';
import { homedir } from 'os';
import { Command } from '@commander-js/extra-typings';
import { getAreaContext, getProjectContext, getTaskContext } from '@bindings';
import type { Task } from '@bindings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  AreaContextResultOutput,
  ProjectContextResultOutput,
  TaskContextResultOutput,
} from '@/output/index.ts';
import { buildVaultOverview } from '@/output/vault-overview.ts';
import { getVaultConfig } from '@/config/index.ts';
import { createError } from '@/errors/types.ts';
import { formatError } from '@/errors/format.ts';

/**
 * Check if an identifier looks like a file path vs a title.
 * Returns true if the identifier appears to be a path.
 */
function isPathLike(identifier: string): boolean {
  return (
    identifier.startsWith('/') ||
    identifier.startsWith('~') ||
    identifier.startsWith('./') ||
    identifier.startsWith('../') ||
    identifier.includes('/') ||
    identifier.endsWith('.md')
  );
}

/**
 * Resolve a path-like identifier to an absolute path.
 * - Expands ~ to home directory
 * - Resolves relative paths (with /) against CWD
 * - Resolves bare filenames (.md) against tasks directory
 */
function resolveTaskPath(identifier: string, tasksDir: string): string {
  if (identifier.startsWith('~')) {
    return identifier.replace(/^~/, homedir());
  }
  if (isAbsolute(identifier)) {
    return identifier;
  }
  // If it contains a path separator, resolve relative to CWD
  if (identifier.includes('/')) {
    return resolve(identifier);
  }
  // Bare filename (e.g., "my-task.md") - resolve relative to tasks dir
  return join(tasksDir, identifier);
}

/**
 * Group tasks by their project path
 */
function groupTasksByProject(tasks: Task[], projectPaths: string[]): Map<string, Task[]> {
  const projectPathSet = new Set(projectPaths);
  const grouped = new Map<string, Task[]>();

  // Initialize empty arrays for each project
  for (const path of projectPaths) {
    grouped.set(path, []);
  }

  for (const task of tasks) {
    // Find which project this task belongs to by checking if the project name
    // matches any of our project titles
    if (task.project) {
      // Task has a project reference - find the matching project path
      for (const projectPath of projectPathSet) {
        // The task.project is a wikilink like "[[Test Project]]" or just the name
        // We need to match it against the project title
        const projectName = task.project.replace(/^\[\[|\]\]$/g, '');
        // Check if this project path could match (simple heuristic: filename contains project name)
        const pathLower = projectPath.toLowerCase();
        const nameLower = projectName.toLowerCase().replace(/\s+/g, '-');
        if (pathLower.includes(nameLower) || pathLower.includes(projectName.toLowerCase())) {
          const arr = grouped.get(projectPath) ?? [];
          arr.push(task);
          grouped.set(projectPath, arr);
          break;
        }
      }
    }
  }

  return grouped;
}

/**
 * Get tasks that are directly in the area (not via a project)
 */
function getDirectAreaTasks(tasks: Task[], projectTasks: Map<string, Task[]>): Task[] {
  // Create a set of all task paths that are in projects
  const tasksInProjects = new Set<string>();
  for (const projectTaskList of projectTasks.values()) {
    for (const task of projectTaskList) {
      tasksInProjects.add(task.path);
    }
  }

  // Return tasks that have an area but are not in the projectTasks
  return tasks.filter((task) => task.area && !tasksInProjects.has(task.path));
}

/**
 * Context command - get expanded context for an entity
 *
 * Usage:
 *   taskdn context area "Work"            # Area + projects + tasks
 *   taskdn context project "Q1"           # Project + tasks + parent area
 *   taskdn context task ~/tasks/foo.md    # Task + parent project + area
 *   taskdn context --ai                   # Vault overview (AI only)
 */
export const contextCommand = new Command('context')
  .description('Get expanded context for an entity')
  .argument('[entity-type]', 'Entity type: area, project, or task')
  .argument('[target]', 'Name or path of the entity')
  .action((entityType, target, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    // No args behavior differs by mode
    if (!entityType && !target) {
      if (mode === 'human') {
        console.error(
          'Error: Please specify an entity (area, project, or task) or use --ai for vault overview.'
        );
        console.error('\nExamples:');
        console.error('  taskdn context area "Work"');
        console.error('  taskdn context project "Q1 Planning"');
        console.error('  taskdn context --ai');
        process.exit(2);
      }

      // AI mode: return vault overview
      const config = getVaultConfig();
      const result = buildVaultOverview(config);
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Handle area context
    if (entityType === 'area') {
      if (!target) {
        console.error('Error: Please specify an area name.');
        console.error('\nExample: taskdn context area "Work"');
        process.exit(2);
      }

      const config = getVaultConfig();
      const result = getAreaContext(config, target);

      if (!result.area) {
        // Area not found
        const error = createError.notFound('area', target);
        const output = formatError(error, mode);
        if (mode === 'human') {
          console.error(output);
        } else {
          console.log(output);
        }
        process.exit(1);
      }

      // Group tasks by project
      const projectPaths = result.projects.map((p) => p.path);
      const projectTasks = groupTasksByProject(result.tasks, projectPaths);
      const directTasks = getDirectAreaTasks(result.tasks, projectTasks);

      const output: AreaContextResultOutput = {
        type: 'area-context',
        area: result.area,
        projects: result.projects,
        projectTasks,
        directTasks,
        warnings: result.warnings,
      };

      console.log(formatOutput(output, globalOpts));
      return;
    }

    // Handle project context
    if (entityType === 'project') {
      if (!target) {
        console.error('Error: Please specify a project name.');
        console.error('\nExample: taskdn context project "Q1 Planning"');
        process.exit(2);
      }

      const config = getVaultConfig();
      const result = getProjectContext(config, target);

      if (!result.project) {
        // Project not found
        const error = createError.notFound('project', target);
        const output = formatError(error, mode);
        if (mode === 'human') {
          console.error(output);
        } else {
          console.log(output);
        }
        process.exit(1);
      }

      const output: ProjectContextResultOutput = {
        type: 'project-context',
        project: result.project,
        area: result.area ?? null,
        tasks: result.tasks,
        warnings: result.warnings,
      };

      console.log(formatOutput(output, globalOpts));
      return;
    }

    // Handle task context
    if (entityType === 'task') {
      if (!target) {
        console.error('Error: Please specify a task title or path.');
        console.error('\nExamples:');
        console.error('  taskdn context task "Fix login bug"');
        console.error('  taskdn context task ~/tasks/fix-login-bug.md');
        process.exit(2);
      }

      const config = getVaultConfig();

      // Determine if target is a path or title, and resolve if path-like
      const identifier = isPathLike(target) ? resolveTaskPath(target, config.tasksDir) : target;

      const result = getTaskContext(config, identifier);

      // Check for ambiguous matches
      if (result.ambiguousMatches.length > 0) {
        const matchPaths = result.ambiguousMatches.map((t) => t.path);
        const error = createError.ambiguous(target, matchPaths);
        const output = formatError(error, mode);
        if (mode === 'human') {
          console.error(output);
        } else {
          console.log(output);
        }
        process.exit(1);
      }

      if (!result.task) {
        // Task not found
        const error = createError.notFound('task', target);
        const output = formatError(error, mode);
        if (mode === 'human') {
          console.error(output);
        } else {
          console.log(output);
        }
        process.exit(1);
      }

      const output: TaskContextResultOutput = {
        type: 'task-context',
        task: result.task,
        project: result.project ?? null,
        area: result.area ?? null,
        warnings: result.warnings,
      };

      console.log(formatOutput(output, globalOpts));
      return;
    }

    // Unknown entity type
    console.error(`Error: Unknown entity type '${entityType}'.`);
    console.error('\nSupported types: area, project, task');
    process.exit(2);
  });
