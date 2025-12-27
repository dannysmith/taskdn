import { Command } from '@commander-js/extra-typings';
import * as p from '@clack/prompts';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskCreatedResult,
  ProjectCreatedResult,
  AreaCreatedResult,
} from '@/output/types.ts';
import { getVaultConfig } from '@/config/index.ts';
import {
  createTaskFile,
  createProjectFile,
  createAreaFile,
  scanProjects,
  scanAreas,
  type TaskCreateFields,
  type ProjectCreateFields,
  type AreaCreateFields,
} from '@bindings';
import { parseNaturalDate } from '@/output/helpers/index.ts';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { normalizeEntityType } from '@/lib/entity-type.ts';

/**
 * New command - create new entities
 *
 * Usage:
 *   tdn new "Task title"                           # Quick new task
 *   tdn new "Task" --project "Q1" --due friday     # With metadata
 *   tdn new                                        # Interactive (human only)
 *   tdn new project "Q1 Planning"                  # New project
 *   tdn new projects "Q1 Planning"                 # Plural form also supported
 *   tdn new area "Work"                            # New area
 *   tdn new areas "Work"                           # Plural form also supported
 */

interface AddOptions {
  project?: string;
  area?: string;
  status?: string;
  due?: string;
  scheduled?: string;
  deferUntil?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  dryRun?: boolean;
}

/**
 * Parse a date option, converting natural language to ISO 8601.
 * Returns the parsed date or throws an error if invalid.
 */
function parseDateOption(value: string | undefined, fieldName: string): string | undefined {
  if (!value) return undefined;

  const parsed = parseNaturalDate(value);
  if (!parsed) {
    throw createError.invalidDate(fieldName, value, [
      'tomorrow',
      'friday',
      '+3d',
      '+1w',
      '2025-01-15',
    ]);
  }
  return parsed;
}

/**
 * Create a task with the given title and options.
 */
function createTask(title: string, options: AddOptions): TaskCreatedResult {
  const config = getVaultConfig();

  // Parse date fields
  const due = parseDateOption(options.due, 'due');
  const scheduled = parseDateOption(options.scheduled, 'scheduled');
  const deferUntil = parseDateOption(options.deferUntil, 'defer-until');

  const fields: TaskCreateFields = {
    status: options.status,
    project: options.project,
    area: options.area,
    due,
    scheduled,
    deferUntil,
  };

  const task = createTaskFile(config.tasksDir, title, fields);

  return {
    type: 'task-created',
    task,
  };
}

/**
 * Create a project with the given title and options.
 */
function createProject(title: string, options: AddOptions): ProjectCreatedResult {
  const config = getVaultConfig();

  // Parse date fields
  const startDate = parseDateOption(options.startDate, 'start-date');
  const endDate = parseDateOption(options.endDate, 'end-date');

  const fields: ProjectCreateFields = {
    status: options.status,
    area: options.area,
    description: undefined, // Could add --description option later
    startDate,
    endDate,
  };

  const project = createProjectFile(config.projectsDir, title, fields);

  return {
    type: 'project-created',
    project,
  };
}

/**
 * Create an area with the given title and options.
 */
function createArea(title: string, options: AddOptions): AreaCreatedResult {
  const config = getVaultConfig();

  const fields: AreaCreateFields = {
    status: options.status,
    areaType: options.type,
    description: undefined,
  };

  const area = createAreaFile(config.areasDir, title, fields);

  return {
    type: 'area-created',
    area,
  };
}

/**
 * Interactive mode for creating a task.
 */
async function interactiveAddTask(): Promise<TaskCreatedResult | null> {
  const config = getVaultConfig();

  p.intro('Create a new task');

  const title = await p.text({
    message: 'Task title:',
    placeholder: 'What needs to be done?',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Title is required';
      return undefined;
    },
  });

  if (p.isCancel(title)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const status = await p.select({
    message: 'Status:',
    options: [
      { value: 'inbox', label: 'inbox - newly captured, not yet processed (default)' },
      { value: 'ready', label: 'ready - processed and ready to work on' },
      { value: 'in-progress', label: 'in-progress - currently being worked on' },
      { value: 'blocked', label: 'blocked - waiting on external dependency' },
      { value: 'icebox', label: 'icebox - deferred indefinitely' },
    ],
    initialValue: 'inbox',
  });

  if (p.isCancel(status)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const due = await p.text({
    message: 'Due date (optional):',
    placeholder: 'Hard deadline: tomorrow, friday, +3d, 2025-01-15',
  });

  if (p.isCancel(due)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const scheduled = await p.text({
    message: 'Scheduled date (optional):',
    placeholder: 'When to work on it: tomorrow, monday, +1w',
  });

  if (p.isCancel(scheduled)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const deferUntil = await p.text({
    message: 'Defer until (optional):',
    placeholder: 'Hide until this date: +3d, next week, 2025-02-01',
  });

  if (p.isCancel(deferUntil)) {
    p.cancel('Operation cancelled');
    return null;
  }

  // Build project options from existing projects
  const existingProjects = scanProjects(config);
  const projectOptions: Array<{ value: string | undefined; label: string }> = [
    { value: undefined, label: '(none)' },
    ...existingProjects.map((proj) => ({ value: proj.title, label: proj.title })),
  ];

  const project = await p.select({
    message: 'Project (optional):',
    options: projectOptions,
    initialValue: undefined,
  });

  if (p.isCancel(project)) {
    p.cancel('Operation cancelled');
    return null;
  }

  // Build area options from existing areas
  const existingAreas = scanAreas(config);
  const areaOptions: Array<{ value: string | undefined; label: string }> = [
    { value: undefined, label: '(none)' },
    ...existingAreas.map((area) => ({ value: area.title, label: area.title })),
  ];

  const area = await p.select({
    message: 'Area (optional):',
    options: areaOptions,
    initialValue: undefined,
  });

  if (p.isCancel(area)) {
    p.cancel('Operation cancelled');
    return null;
  }

  p.outro('Creating task...');

  // Create the task - validate dates using the same logic as non-interactive mode
  const parsedDue = parseDateOption(due, 'due');
  const parsedScheduled = parseDateOption(scheduled, 'scheduled');
  const parsedDeferUntil = parseDateOption(deferUntil, 'defer-until');

  const fields: TaskCreateFields = {
    status: status as string,
    project: project || undefined,
    area: area || undefined,
    due: parsedDue,
    scheduled: parsedScheduled,
    deferUntil: parsedDeferUntil,
  };

  const task = createTaskFile(config.tasksDir, title, fields);

  return {
    type: 'task-created',
    task,
  };
}

/**
 * Interactive mode for creating a project.
 */
async function interactiveAddProject(): Promise<ProjectCreatedResult | null> {
  const config = getVaultConfig();

  p.intro('Create a new project');

  const title = await p.text({
    message: 'Project title:',
    placeholder: 'What is this project about?',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Title is required';
      return undefined;
    },
  });

  if (p.isCancel(title)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const status = await p.select({
    message: 'Status:',
    options: [
      { value: undefined, label: '(no status)' },
      { value: 'planning', label: 'planning - still being scoped' },
      { value: 'ready', label: 'ready - planned and ready to begin' },
      { value: 'in-progress', label: 'in-progress - active work happening' },
      { value: 'blocked', label: 'blocked - waiting on another project' },
      { value: 'paused', label: 'paused - temporarily on hold' },
    ],
    initialValue: undefined,
  });

  if (p.isCancel(status)) {
    p.cancel('Operation cancelled');
    return null;
  }

  // Build area options from existing areas
  const existingAreas = scanAreas(config);
  const areaOptions: Array<{ value: string | undefined; label: string }> = [
    { value: undefined, label: '(none)' },
    ...existingAreas.map((area) => ({ value: area.title, label: area.title })),
  ];

  const area = await p.select({
    message: 'Area (optional):',
    options: areaOptions,
    initialValue: undefined,
  });

  if (p.isCancel(area)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const startDate = await p.text({
    message: 'Start date (optional):',
    placeholder: 'When work begins: today, monday, 2025-02-01',
  });

  if (p.isCancel(startDate)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const endDate = await p.text({
    message: 'End date (optional):',
    placeholder: 'Target completion: +2w, 2025-03-31',
  });

  if (p.isCancel(endDate)) {
    p.cancel('Operation cancelled');
    return null;
  }

  p.outro('Creating project...');

  // Parse dates
  const parsedStartDate = startDate ? parseNaturalDate(startDate) : undefined;
  const parsedEndDate = endDate ? parseNaturalDate(endDate) : undefined;

  const fields: ProjectCreateFields = {
    status: (status as string) || undefined,
    area: area || undefined,
    description: undefined,
    startDate: parsedStartDate ?? undefined,
    endDate: parsedEndDate ?? undefined,
  };

  const project = createProjectFile(config.projectsDir, title, fields);

  return {
    type: 'project-created',
    project,
  };
}

/**
 * Interactive mode for creating an area.
 */
async function interactiveAddArea(): Promise<AreaCreatedResult | null> {
  const config = getVaultConfig();

  p.intro('Create a new area');

  const title = await p.text({
    message: 'Area title:',
    placeholder: 'What area of responsibility?',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Title is required';
      return undefined;
    },
  });

  if (p.isCancel(title)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const areaType = await p.text({
    message: 'Type (optional):',
    placeholder: 'client, life-area, etc.',
  });

  if (p.isCancel(areaType)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const status = await p.select({
    message: 'Status:',
    options: [
      { value: 'active', label: 'active - visible in area lists (default)' },
      { value: 'archived', label: 'archived - hidden from normal views' },
    ],
    initialValue: 'active',
  });

  if (p.isCancel(status)) {
    p.cancel('Operation cancelled');
    return null;
  }

  p.outro('Creating area...');

  const fields: AreaCreateFields = {
    status: status as string,
    areaType: areaType || undefined,
    description: undefined,
  };

  const area = createAreaFile(config.areasDir, title, fields);

  return {
    type: 'area-created',
    area,
  };
}

/**
 * Interactive mode selector.
 */
async function interactiveAdd(): Promise<
  TaskCreatedResult | ProjectCreatedResult | AreaCreatedResult | null
> {
  const entityType = await p.select({
    message: 'What would you like to create?',
    options: [
      { value: 'task', label: 'Task' },
      { value: 'project', label: 'Project' },
      { value: 'area', label: 'Area' },
    ],
  });

  if (p.isCancel(entityType)) {
    p.cancel('Operation cancelled');
    return null;
  }

  switch (entityType) {
    case 'task':
      return interactiveAddTask();
    case 'project':
      return interactiveAddProject();
    case 'area':
      return interactiveAddArea();
    default:
      return null;
  }
}

export const newCommand = new Command('new')
  .description('Create a new entity')
  .argument('[entity-or-title]', 'Entity type (project(s)/area(s)) or task title')
  .argument('[title]', 'Title (when entity type is specified)')
  .option('-p, --project <project>', 'Assign to project (tasks only)')
  .option('-a, --area <area>', 'Assign to area')
  .option('-s, --status <status>', 'Initial status')
  .option('-d, --due <date>', 'Due date (tasks only)')
  .option('--scheduled <date>', 'Scheduled date (tasks only)')
  .option('--defer-until <date>', 'Defer until date (tasks only)')
  .option('--start-date <date>', 'Start date (projects only)')
  .option('--end-date <date>', 'End date (projects only)')
  .option('--type <type>', 'Area type (areas only)')
  .option('--dry-run', 'Show what would be created without creating')
  .option('--stdin', 'Accept JSON input from stdin')
  .action(async (entityOrTitle, title, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    try {
      // Handle --stdin flag for piped JSON input
      if (options.stdin) {
        // Read from stdin
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        const input = Buffer.concat(chunks).toString('utf-8');

        // Parse JSON
        let jsonData: unknown;
        try {
          jsonData = JSON.parse(input);
        } catch {
          if (mode === 'human') {
            console.error('Error: Invalid JSON input');
          } else {
            console.error(
              JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'Invalid JSON input',
              })
            );
          }
          process.exit(2);
        }

        // Validate it's an object
        if (typeof jsonData !== 'object' || jsonData === null) {
          if (mode === 'human') {
            console.error('Error: JSON input must be an object');
          } else {
            console.error(
              JSON.stringify({
                error: 'INVALID_INPUT',
                message: 'JSON input must be an object',
              })
            );
          }
          process.exit(2);
        }

        const data = jsonData as Record<string, unknown>;

        // Extract title
        if (!data.title || typeof data.title !== 'string') {
          if (mode === 'human') {
            console.error('Error: JSON input must include a "title" field');
          } else {
            console.error(
              JSON.stringify({
                error: 'MISSING_FIELD',
                message: 'JSON input must include a "title" field',
              })
            );
          }
          process.exit(2);
        }

        const taskTitle = data.title as string;

        // Build options from JSON data
        const stdinOptions: AddOptions = {
          status: typeof data.status === 'string' ? data.status : undefined,
          project: typeof data.project === 'string' ? data.project : undefined,
          area: typeof data.area === 'string' ? data.area : undefined,
          due: typeof data.due === 'string' ? data.due : undefined,
          scheduled: typeof data.scheduled === 'string' ? data.scheduled : undefined,
          deferUntil: typeof data.deferUntil === 'string' ? data.deferUntil : undefined,
        };

        // Create the task
        const result = createTask(taskTitle, stdinOptions);
        console.log(formatOutput(result, globalOpts));
        return;
      }

      // If no arguments and human mode, trigger interactive prompts
      if (!entityOrTitle && mode === 'human') {
        const result = await interactiveAdd();
        if (result) {
          console.log(formatOutput(result, globalOpts));
        }
        return;
      }

      // If no arguments in AI/JSON mode, error
      if (!entityOrTitle) {
        if (mode === 'human') {
          console.error('Error: Title or entity type is required in non-interactive mode.');
          console.error('\nExamples:');
          console.error('  tdn new "Task title"');
          console.error('  tdn new project "Project title"');
        } else {
          console.error(
            JSON.stringify({
              error: 'MISSING_ARGUMENT',
              message: 'Title or entity type is required in non-interactive mode',
            })
          );
        }
        process.exit(2);
      }

      // Determine what we're creating
      let result: TaskCreatedResult | ProjectCreatedResult | AreaCreatedResult;

      // Normalize entity type to support both singular and plural forms
      const normalizedType = normalizeEntityType(entityOrTitle, 'singular');

      if (normalizedType === 'project') {
        // Creating a project
        if (!title) {
          if (mode === 'human') {
            console.error('Error: Project title is required.');
            console.error('\nExample: tdn new project "My Project"');
          } else {
            console.error(
              JSON.stringify({
                error: 'MISSING_ARGUMENT',
                message: 'Project title is required',
              })
            );
          }
          process.exit(2);
        }
        result = createProject(title, options as AddOptions);
      } else if (normalizedType === 'area') {
        // Creating an area
        if (!title) {
          if (mode === 'human') {
            console.error('Error: Area title is required.');
            console.error('\nExample: tdn new area "My Area"');
          } else {
            console.error(
              JSON.stringify({
                error: 'MISSING_ARGUMENT',
                message: 'Area title is required',
              })
            );
          }
          process.exit(2);
        }
        result = createArea(title, options as AddOptions);
      } else {
        // Creating a task (first argument is the title)
        const taskTitle = title ? `${entityOrTitle} ${title}` : entityOrTitle;
        result = createTask(taskTitle, options as AddOptions);
      }

      console.log(formatOutput(result, globalOpts));
    } catch (error) {
      if (isCliError(error)) {
        // It's already a CLI error
        console.error(formatError(error, mode));
      } else {
        // Wrap unknown errors
        const cliError = createError.parseError('', 0, String(error));
        console.error(formatError(cliError, mode));
      }
      process.exit(1);
    }
  });
