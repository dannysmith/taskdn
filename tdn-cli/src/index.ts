#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings';
import {
  showCommand,
  listCommand,
  addCommand,
  contextCommand,
  todayCommand,
  inboxCommand,
  completeCommand,
  dropCommand,
  statusCommand,
  updateCommand,
  archiveCommand,
  editCommand,
  appendBodyCommand,
} from '@/commands/index.ts';

const program = new Command()
  .name('taskdn')
  .description('Task management CLI for humans and AI agents')
  .version('0.1.0')
  // Global options available to all commands
  .option('--ai', 'AI mode: structured Markdown output, no prompts')
  .option('--json', 'JSON output format');

// Register commands
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(addCommand);
program.addCommand(contextCommand);
program.addCommand(todayCommand);
program.addCommand(inboxCommand);
program.addCommand(completeCommand);
program.addCommand(dropCommand);
program.addCommand(statusCommand);
program.addCommand(updateCommand);
program.addCommand(archiveCommand);
program.addCommand(editCommand);
program.addCommand(appendBodyCommand);

// Parse and execute
program.parse();
