import { Command } from '@commander-js/extra-typings';
import { intro, outro, confirm, log, spinner } from '@clack/prompts';
import { existsSync, unlinkSync } from 'fs';
import {
  detectShell,
  getShellConfig,
  isAlreadyInstalled,
  generateCompletionScript,
  addToShellConfig,
  removeFromShellConfig,
  type Shell,
} from '@/lib/shell-completion.ts';

const completionCommand = new Command('completion').description('Manage shell completions');

// completion install
completionCommand
  .command('install')
  .description('Install shell completions')
  .option('--shell <shell>', 'Shell type (zsh, bash, fish)')
  .action(async (options) => {
    intro('Installing tdn shell completions');

    // Detect shell or use provided option
    const shell = (options.shell as Shell | undefined) || detectShell();
    if (!shell) {
      log.error('Could not detect shell. Use --shell option.');
      process.exit(1);
    }

    log.info(`Detected shell: ${shell}`);

    // Check if already installed
    const { configPath, sourceLine } = getShellConfig(shell);
    if (isAlreadyInstalled(configPath, sourceLine)) {
      log.warn('Completions already installed');
      outro('Nothing to do');
      return;
    }

    // Confirm with user
    const confirmed = await confirm({
      message: `Add completion sourcing to ${configPath}?`,
    });

    if (!confirmed) {
      outro('Installation cancelled');
      return;
    }

    // Generate completion script
    const spin = spinner();
    spin.start('Generating completion script');

    generateCompletionScript(shell);

    spin.stop('Completion script generated');

    // Add to shell config
    spin.start(`Updating ${configPath}`);

    addToShellConfig(configPath, sourceLine);

    spin.stop(`Updated ${configPath}`);

    outro(`Shell completions installed! Restart your terminal or run: source ${configPath}`);
  });

// completion uninstall
completionCommand
  .command('uninstall')
  .description('Uninstall shell completions')
  .action(async () => {
    intro('Uninstalling tdn shell completions');

    const shell = detectShell();
    if (!shell) {
      log.error('Could not detect shell');
      process.exit(1);
    }

    const { configPath, sourceLine, scriptPath } = getShellConfig(shell);

    if (!isAlreadyInstalled(configPath, sourceLine)) {
      log.warn('Completions not installed');
      outro('Nothing to do');
      return;
    }

    const confirmed = await confirm({
      message: `Remove completion sourcing from ${configPath}?`,
    });

    if (!confirmed) {
      outro('Uninstallation cancelled');
      return;
    }

    // Remove from shell config
    removeFromShellConfig(configPath, sourceLine);

    // Delete completion script
    if (existsSync(scriptPath)) {
      unlinkSync(scriptPath);
    }

    outro(`Shell completions uninstalled! Restart your terminal.`);
  });

// completion status
completionCommand
  .command('status')
  .description('Check completion installation status')
  .action(() => {
    intro('Completion installation status');

    const shell = detectShell();
    if (!shell) {
      log.error('Could not detect shell');
      process.exit(1);
    }

    log.info(`Shell: ${shell}`);

    const { configPath, sourceLine, scriptPath } = getShellConfig(shell);

    const installed = isAlreadyInstalled(configPath, sourceLine);
    const scriptExists = existsSync(scriptPath);

    if (installed && scriptExists) {
      log.success('Completions are installed');
      log.info(`Config: ${configPath}`);
      log.info(`Script: ${scriptPath}`);
    } else if (installed) {
      log.warn('Config file has sourcing line, but completion script is missing');
      log.info('Run `tdn completion install` to fix');
    } else {
      log.error('Completions are not installed');
      log.info('Run `tdn completion install` to install');
    }

    outro('Done');
  });

export { completionCommand };
