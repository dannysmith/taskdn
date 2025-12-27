import { Command } from '@commander-js/extra-typings';
import { getConfigSource } from '@/config/index.ts';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/types.ts';
import { homedir } from 'os';

/**
 * Config command - view current configuration
 *
 * Usage:
 *   tdn config     # Show effective configuration
 */

/**
 * Replace home directory with ~ for display
 */
function formatPath(path: string): string {
  const home = homedir();
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

export const configCommand = new Command('config')
  .description('View current configuration')
  .action((options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    try {
      const source = getConfigSource();

      // Determine which config file is in use
      let configFile: string;
      if (source.localConfigExists) {
        configFile = formatPath(source.localConfigPath);
      } else if (source.userConfigExists) {
        configFile = formatPath(source.userConfigPath);
      } else {
        configFile = '(none - using defaults)';
      }

      if (mode === 'human') {
        console.log('Configuration\n');
        console.log(`  Tasks directory:    ${formatPath(source.effectiveConfig.tasksDir)}`);
        console.log(`  Projects directory: ${formatPath(source.effectiveConfig.projectsDir)}`);
        console.log(`  Areas directory:    ${formatPath(source.effectiveConfig.areasDir)}`);
        console.log();
        console.log(`  Config file: ${configFile}`);
      } else if (mode === 'ai') {
        console.log('## Configuration\n');
        console.log(`- **tasks-dir:** ${formatPath(source.effectiveConfig.tasksDir)}`);
        console.log(`- **projects-dir:** ${formatPath(source.effectiveConfig.projectsDir)}`);
        console.log(`- **areas-dir:** ${formatPath(source.effectiveConfig.areasDir)}`);
        console.log(`- **config-file:** ${configFile}`);
      } else {
        // JSON mode
        console.log(
          JSON.stringify(
            {
              tasksDir: source.effectiveConfig.tasksDir,
              projectsDir: source.effectiveConfig.projectsDir,
              areasDir: source.effectiveConfig.areasDir,
              configFile: source.localConfigExists
                ? source.localConfigPath
                : source.userConfigExists
                  ? source.userConfigPath
                  : null,
            },
            null,
            2
          )
        );
      }
    } catch (error) {
      if (mode === 'human') {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        console.error(
          JSON.stringify({
            error: 'CONFIG_ERROR',
            message: error instanceof Error ? error.message : String(error),
          })
        );
      }
      process.exit(1);
    }
  });
