#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings';
import tab from '@bomb.sh/tab/commander';
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
  completionCommand,
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
program.addCommand(completionCommand);

// Add tab completions
// @ts-expect-error - tab library types don't fully match Commander extra-typings
const completion = tab(program);

// IMPORTANT: The @bomb.sh/tab Commander adapter doesn't extract arguments from
// Commander's .argument() definitions. We need to manually register them.

// Add static completions for known values

// Register and configure 'list' command argument
const listCompletion = completion.commands.get('list');
if (listCompletion) {
  // Manually register the entity-type argument that Commander defines
  listCompletion.argument(
    'entity-type',
    (complete: (value: string, description: string) => void) => {
      complete('tasks', 'List tasks');
      complete('projects', 'List projects');
      complete('areas', 'List areas');
    },
    false
  ); // false = optional argument

  // Status option for filtering
  const statusOption = listCompletion.options.get('status');
  if (statusOption) {
    statusOption.handler = (complete: (value: string, description: string) => void) => {
      complete('inbox', 'Newly captured, not yet processed');
      complete('ready', 'Processed and ready to work on');
      complete('in-progress', 'Currently being worked on');
      complete('blocked', 'Waiting on external dependency');
      complete('icebox', 'Deferred indefinitely');
      complete('done', 'Completed');
      complete('dropped', 'No longer needed');
    };
  }
}

// Register and configure 'new' command arguments
const newCompletion = completion.commands.get('new');
if (newCompletion) {
  // First argument: entity-or-title
  newCompletion.argument(
    'entity-or-title',
    (complete: (value: string, description: string) => void) => {
      complete('task', 'Create a new task');
      complete('project', 'Create a new project');
      complete('area', 'Create a new area');
    },
    false
  ); // false = optional

  // Status option
  const statusOption = newCompletion.options.get('status');
  if (statusOption) {
    statusOption.handler = (complete: (value: string, description: string) => void) => {
      complete('inbox', 'Newly captured, not yet processed');
      complete('ready', 'Processed and ready to work on');
      complete('in-progress', 'Currently being worked on');
      complete('blocked', 'Waiting on external dependency');
      complete('icebox', 'Deferred indefinitely');
      complete('planning', 'Project: still being scoped');
      complete('paused', 'Project: temporarily on hold');
      complete('active', 'Area: visible in area lists');
      complete('archived', 'Area: hidden from normal views');
    };
  }
}

// Register and configure 'set status' command argument
const setStatusCompletion = completion.commands.get('set status');
if (setStatusCompletion) {
  // The status value argument
  setStatusCompletion.argument(
    'status-value',
    (complete: (value: string, description: string) => void) => {
      complete('inbox', 'Newly captured, not yet processed');
      complete('ready', 'Processed and ready to work on');
      complete('in-progress', 'Currently being worked on');
      complete('blocked', 'Waiting on external dependency');
      complete('icebox', 'Deferred indefinitely');
      complete('done', 'Completed');
      complete('dropped', 'No longer needed');
    },
    true
  ); // true = required argument
}

// Parse and execute
program.parse();
