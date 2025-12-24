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
  type TaskCreateFields,
  type ProjectCreateFields,
  type AreaCreateFields,
} from '@bindings';
import { parseNaturalDate } from '@/output/helpers/index.ts';
import { createError, formatError, isCliError } from '@/errors/index.ts';

/**
 * Add command - create new entities
 *
 * Usage:
 *   taskdn add "Task title"                           # Quick add task
 *   taskdn add "Task" --project "Q1" --due friday     # With metadata
 *   taskdn add                                        # Interactive (human only)
 *   taskdn add project "Q1 Planning"                  # Add project
 *   taskdn add area "Work"                            # Add area
 */

interface AddOptions {
  project?: string;
  area?: string;
  status?: string;
  due?: string;
  scheduled?: string;
  deferUntil?: string;
  type?: string;
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

  const fields: ProjectCreateFields = {
    status: options.status,
    area: options.area,
    description: undefined, // Could add --description option later
    startDate: undefined,
    endDate: undefined,
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
      { value: 'inbox', label: 'inbox (default)' },
      { value: 'ready', label: 'ready' },
      { value: 'icebox', label: 'icebox' },
    ],
    initialValue: 'inbox',
  });

  if (p.isCancel(status)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const due = await p.text({
    message: 'Due date (optional):',
    placeholder: 'tomorrow, friday, +3d, 2025-01-15',
  });

  if (p.isCancel(due)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const project = await p.text({
    message: 'Project (optional):',
    placeholder: 'Project name',
  });

  if (p.isCancel(project)) {
    p.cancel('Operation cancelled');
    return null;
  }

  p.outro('Creating task...');

  // Create the task
  const config = getVaultConfig();
  const parsedDue = due ? parseNaturalDate(due) : undefined;

  const fields: TaskCreateFields = {
    status: status as string,
    project: project || undefined,
    area: undefined,
    due: parsedDue ?? undefined,
    scheduled: undefined,
    deferUntil: undefined,
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
      { value: 'planning', label: 'planning' },
      { value: 'ready', label: 'ready' },
      { value: 'in-progress', label: 'in-progress' },
    ],
    initialValue: undefined,
  });

  if (p.isCancel(status)) {
    p.cancel('Operation cancelled');
    return null;
  }

  const area = await p.text({
    message: 'Area (optional):',
    placeholder: 'Area name',
  });

  if (p.isCancel(area)) {
    p.cancel('Operation cancelled');
    return null;
  }

  p.outro('Creating project...');

  // Create the project
  const config = getVaultConfig();

  const fields: ProjectCreateFields = {
    status: (status as string) || undefined,
    area: area || undefined,
    description: undefined,
    startDate: undefined,
    endDate: undefined,
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

  p.outro('Creating area...');

  // Create the area
  const config = getVaultConfig();

  const fields: AreaCreateFields = {
    status: 'active',
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

export const addCommand = new Command('add')
  .description('Create a new entity')
  .argument('[entity-or-title]', 'Entity type (project/area) or task title')
  .argument('[title]', 'Title (when entity type is specified)')
  .option('--project <project>', 'Assign to project (tasks only)')
  .option('--area <area>', 'Assign to area')
  .option('--status <status>', 'Initial status')
  .option('--due <date>', 'Due date (tasks only)')
  .option('--scheduled <date>', 'Scheduled date (tasks only)')
  .option('--defer-until <date>', 'Defer until date (tasks only)')
  .option('--type <type>', 'Area type (areas only)')
  .option('--dry-run', 'Show what would be created without creating')
  .action(async (entityOrTitle, title, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    try {
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
        const error = createError.missingField(
          'title',
          'Title is required in non-interactive mode'
        );
        console.error(formatError(error, mode));
        process.exit(2);
      }

      // Determine what we're creating
      let result: TaskCreatedResult | ProjectCreatedResult | AreaCreatedResult;

      if (entityOrTitle.toLowerCase() === 'project') {
        // Creating a project
        if (!title) {
          const error = createError.missingField('title', 'Project title is required');
          console.error(formatError(error, mode));
          process.exit(2);
        }
        result = createProject(title, options as AddOptions);
      } else if (entityOrTitle.toLowerCase() === 'area') {
        // Creating an area
        if (!title) {
          const error = createError.missingField('title', 'Area title is required');
          console.error(formatError(error, mode));
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
