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

// Add static completions for known values

// Status completions for 'set status' command
const setCompletion = completion.commands.get('set');
if (setCompletion) {
  // @ts-expect-error - completion API has commands property
  const setStatusSubcommand = setCompletion.commands?.get('status');
  if (setStatusSubcommand) {
    // The last argument is the status value
    const statusArg = setStatusSubcommand.arguments.get(setStatusSubcommand.arguments.size - 1);
    if (statusArg) {
      statusArg.handler = (complete: (value: string, description: string) => void) => {
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
}

// Entity type completions for 'list' command
const listCompletion = completion.commands.get('list');
if (listCompletion) {
  // First argument is entity type
  const entityArg = listCompletion.arguments.get('0');
  if (entityArg) {
    entityArg.handler = (complete: (value: string, description: string) => void) => {
      complete('tasks', 'List tasks');
      complete('task', 'List tasks (singular)');
      complete('projects', 'List projects');
      complete('project', 'List projects (singular)');
      complete('areas', 'List areas');
      complete('area', 'List areas (singular)');
    };
  }

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

// Entity type completions for 'new' command
const newCompletion = completion.commands.get('new');
if (newCompletion) {
  // First argument can be entity type
  const entityOrTitleArg = newCompletion.arguments.get('0');
  if (entityOrTitleArg) {
    entityOrTitleArg.handler = (complete: (value: string, description: string) => void) => {
      complete('task', 'Create a new task');
      complete('project', 'Create a new project');
      complete('projects', 'Create a new project (plural)');
      complete('area', 'Create a new area');
      complete('areas', 'Create a new area (plural)');
    };
  }

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

// Parse and execute
program.parse();
