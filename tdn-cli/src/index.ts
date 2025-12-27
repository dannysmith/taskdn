#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings';
import {
  showCommand,
  listCommand,
  newCommand,
  contextCommand,
  todayCommand,
  setCommand,
  updateCommand,
  archiveCommand,
  openCommand,
  appendBodyCommand,
  initCommand,
  configCommand,
  doctorCommand,
} from '@/commands/index.ts';

const program = new Command()
  .name('tdn')
  .description('Task management CLI for humans and AI agents')
  .version('0.1.0')
  // Global options available to all commands
  .option('--ai', 'AI mode: structured Markdown output, no prompts')
  .option('--json', 'JSON output format');

// Register commands
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(newCommand);
program.addCommand(contextCommand);
program.addCommand(todayCommand);
program.addCommand(setCommand);
program.addCommand(updateCommand);
program.addCommand(archiveCommand);
program.addCommand(openCommand);
program.addCommand(appendBodyCommand);
program.addCommand(initCommand);
program.addCommand(configCommand);
program.addCommand(doctorCommand);

// Parse and execute
program.parse();
