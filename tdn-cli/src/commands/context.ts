import { Command } from '@commander-js/extra-typings';
import { getAreaContext, getProjectContext } from '@bindings';
import type { Task } from '@bindings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  AreaContextResultOutput,
  ProjectContextResultOutput,
} from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';
import { createError } from '@/errors/types.ts';
import { formatError } from '@/errors/format.ts';

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

      // AI mode: return vault overview (stub for now)
      const result = {
        type: 'vault-overview',
        areas: [],
        summary: {
          totalActiveTasks: 0,
          overdueCount: 0,
          inProgressCount: 0,
        },
        thisWeek: {
          dueTasks: [],
          scheduledTasks: [],
        },
      };
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

    // Stub implementation for task entity type
    const result = {
      type: 'context',
      entityType,
      target,
      data: '(stub) expanded context would go here',
    };

    console.log(formatOutput(result, globalOpts));
  });
