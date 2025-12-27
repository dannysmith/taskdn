import { Command } from '@commander-js/extra-typings';
import * as p from '@clack/prompts';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { getUserConfigPath } from '@/config/index.ts';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions, OutputMode } from '@/output/types.ts';

/**
 * Init command - initialize tdn configuration
 *
 * Usage:
 *   tdn init                                  # Interactive setup
 *   tdn init --tasks-dir ~/tasks --projects-dir ~/projects --areas-dir ~/areas
 */

interface InitOptions {
  tasksDir?: string;
  projectsDir?: string;
  areasDir?: string;
  force?: boolean;
}

/**
 * Expand tilde in paths to home directory
 */
function expandTilde(path: string): string {
  if (path.startsWith('~/')) {
    return resolve(process.env.HOME || process.env.USERPROFILE || '', path.slice(2));
  }
  return path;
}

/**
 * Interactive mode for init command
 */
async function interactiveInit(configPath: string, configExists: boolean): Promise<boolean> {
  p.intro('Initialize tdn configuration');

  if (configExists) {
    const overwrite = await p.confirm({
      message: `Config file already exists at ${configPath}. Overwrite?`,
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Operation cancelled');
      return false;
    }
  }

  const tasksDir = await p.text({
    message: 'Tasks directory:',
    placeholder: '~/notes/tasks',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Tasks directory is required';
      return undefined;
    },
  });

  if (p.isCancel(tasksDir)) {
    p.cancel('Operation cancelled');
    return false;
  }

  const projectsDir = await p.text({
    message: 'Projects directory:',
    placeholder: '~/notes/projects',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Projects directory is required';
      return undefined;
    },
  });

  if (p.isCancel(projectsDir)) {
    p.cancel('Operation cancelled');
    return false;
  }

  const areasDir = await p.text({
    message: 'Areas directory:',
    placeholder: '~/notes/areas',
    validate: (value) => {
      if (!value || value.trim() === '') return 'Areas directory is required';
      return undefined;
    },
  });

  if (p.isCancel(areasDir)) {
    p.cancel('Operation cancelled');
    return false;
  }

  // Create the config file
  const config = {
    tasksDir: expandTilde(tasksDir),
    projectsDir: expandTilde(projectsDir),
    areasDir: expandTilde(areasDir),
  };

  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  p.outro(`Configuration saved to ${configPath}`);
  return true;
}

/**
 * Non-interactive mode for init command
 */
function nonInteractiveInit(
  configPath: string,
  configExists: boolean,
  options: InitOptions,
  mode: OutputMode
): void {
  // Check if all required options are provided
  if (!options.tasksDir || !options.projectsDir || !options.areasDir) {
    if (mode === 'human') {
      console.error('Error: All directory options are required in non-interactive mode.');
      console.error(
        '\nExample: tdn init --tasks-dir ~/tasks --projects-dir ~/projects --areas-dir ~/areas'
      );
    } else {
      console.error(
        JSON.stringify({
          error: 'MISSING_ARGUMENT',
          message:
            'All directory options (--tasks-dir, --projects-dir, --areas-dir) are required in non-interactive mode',
        })
      );
    }
    process.exit(2);
  }

  // Check if config exists and force flag not set
  if (configExists && !options.force) {
    if (mode === 'human') {
      console.error(`Error: Config file already exists at ${configPath}`);
      console.error('Use --force to overwrite');
    } else {
      console.error(
        JSON.stringify({
          error: 'CONFIG_EXISTS',
          message: 'Config file already exists',
          path: configPath,
        })
      );
    }
    process.exit(1);
  }

  // Create the config file
  const config = {
    tasksDir: expandTilde(options.tasksDir),
    projectsDir: expandTilde(options.projectsDir),
    areasDir: expandTilde(options.areasDir),
  };

  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  if (mode === 'human') {
    console.log(`✓ Configuration saved to ${configPath}`);
  } else if (mode === 'ai') {
    console.log(`Configuration saved to \`${configPath}\``);
  } else {
    console.log(
      JSON.stringify({
        success: true,
        configPath,
        config,
      })
    );
  }
}

export const initCommand = new Command('init')
  .description('Initialize tdn configuration')
  .option('--tasks-dir <path>', 'Tasks directory path')
  .option('--projects-dir <path>', 'Projects directory path')
  .option('--areas-dir <path>', 'Areas directory path')
  .option('--force', 'Overwrite existing config file')
  .action(async (options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    try {
      const configPath = getUserConfigPath();
      const configExists = existsSync(configPath);

      // Check if we should use interactive mode
      const hasAnyOption =
        options.tasksDir || options.projectsDir || options.areasDir || options.force;

      if (!hasAnyOption && mode === 'human') {
        // Interactive mode
        await interactiveInit(configPath, configExists);
      } else {
        // Non-interactive mode
        nonInteractiveInit(configPath, configExists, options as InitOptions, mode);
      }
    } catch (error) {
      if (mode === 'human') {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        console.error(
          JSON.stringify({
            error: 'INIT_FAILED',
            message: error instanceof Error ? error.message : String(error),
          })
        );
      }
      process.exit(1);
    }
  });
