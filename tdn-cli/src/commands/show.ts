import { resolve } from 'path';
import { Command } from '@commander-js/extra-typings';
import { red } from 'ansis';
import { parseTaskFile, parseProjectFile } from '@bindings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskResult,
  ProjectResult,
  FormattableResult,
} from '@/output/index.ts';

/**
 * Detect entity type from file path.
 *
 * TODO: This is a temporary hack that checks for '/projects/' in the path.
 * Once config is implemented, this should check if the path falls under the
 * user's configured projects_dir, tasks_dir, or areas_dir.
 */
function detectEntityType(path: string): 'task' | 'project' {
  if (path.includes('/projects/')) {
    return 'project';
  }
  return 'task';
}

/**
 * Show command - view a single entity with full content
 *
 * Usage:
 *   taskdn show <path>                    # Show task or project by path
 *   taskdn show area "Work"               # Show area by name (stub)
 */
export const showCommand = new Command('show')
  .description('View a single entity with full content')
  .argument('<target>', 'Path to file or name of entity')
  .action((target, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    // Resolve to absolute path
    const absolutePath = resolve(target);

    try {
      const entityType = detectEntityType(absolutePath);
      let result: FormattableResult;

      if (entityType === 'project') {
        const project = parseProjectFile(absolutePath);
        result = {
          type: 'project',
          project,
        } as ProjectResult;
      } else {
        const task = parseTaskFile(absolutePath);
        result = {
          type: 'task',
          task,
        } as TaskResult;
      }

      console.log(formatOutput(result, globalOpts));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (mode === 'json') {
        console.log(
          JSON.stringify(
            {
              error: true,
              message,
              path: absolutePath,
            },
            null,
            2
          )
        );
      } else if (mode === 'ai') {
        console.log(`## Error\n\n- **message:** ${message}\n- **path:** ${absolutePath}`);
      } else {
        console.error(red(`Error: ${message}`));
      }

      process.exit(1);
    }
  });
