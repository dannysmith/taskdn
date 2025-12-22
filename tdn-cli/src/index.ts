#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings';
import { helloFromRust } from '@bindings';
import { showCommand, listCommand, addCommand, contextCommand } from '@/commands/index.ts';

// Verify Rust bindings are working (will be removed once we have real Rust functions)
const _rustCheck = helloFromRust;

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

// Parse and execute
program.parse();
