# Shell Completions Guide

This document explains how to add and maintain shell completions in tdn-cli.

## Overview

We use [`@bomb.sh/tab`](https://github.com/bombshell-dev/clack/tree/main/packages/tab) for shell completions. The library generates completion scripts for zsh, bash, fish, and PowerShell.

**Critical limitation:** The Commander adapter automatically extracts option definitions but **does NOT extract positional arguments**. You must manually register argument completions in `src/index.ts`.

## Adding Argument Completions

When you add a command with positional arguments, register completions manually:

```typescript
// In src/index.ts, after: const completion = tab(program);

const myCompletion = completion.commands.get('my-command');
if (myCompletion) {
  // Register the argument with its completion handler
  myCompletion.argument(
    'argument-name',
    (complete: (value: string, description: string) => void) => {
      complete('value1', 'Description of value1');
      complete('value2', 'Description of value2');
    },
    false  // false = optional, true = required
  );
}
```

**Real example from `list` command:**

```typescript
const listCompletion = completion.commands.get('list');
if (listCompletion) {
  listCompletion.argument(
    'entity-type',
    (complete: (value: string, description: string) => void) => {
      complete('tasks', 'List tasks');
      complete('projects', 'List projects');
      complete('areas', 'List areas');
    },
    false  // optional argument
  );
}
```

**For subcommands:** Use the flat command string (e.g., `'set status'` not nested):

```typescript
const setStatusCompletion = completion.commands.get('set status');
if (setStatusCompletion) {
  setStatusCompletion.argument(
    'status-value',
    (complete: (value: string, description: string) => void) => {
      complete('inbox', 'Newly captured, not yet processed');
      complete('ready', 'Processed and ready to work on');
      // ...
    },
    true  // required argument
  );
}
```

## Adding Option Value Completions

Option **names** complete automatically (extracted from Commander definitions). To add completions for option **values**, attach a handler:

```typescript
const myCompletion = completion.commands.get('my-command');
if (myCompletion) {
  const myOption = myCompletion.options.get('my-option');
  if (myOption) {
    myOption.handler = (complete: (value: string, description: string) => void) => {
      complete('value1', 'Description');
      complete('value2', 'Description');
    };
  }
}
```

**Real example from `list` command's `--status` option:**

```typescript
const listCompletion = completion.commands.get('list');
if (listCompletion) {
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
```

**Note:** Option value completions require equals syntax in zsh/bash: `tdn list --status=<TAB>` (not `--status <TAB>`).

## Development Workflow

### When Adding a New Command

1. Define the command in `src/commands/your-command.ts`
2. Register it in `src/index.ts` via `program.addCommand(yourCommand)`
3. If it has arguments or options with values, add completion handlers in `src/index.ts`
4. Test locally (see below)

### When Modifying Existing Commands

If you change argument names, option names, or add new values to complete:

1. Update the completion handlers in `src/index.ts`
2. Regenerate your local completion script (see below)

### Testing Completions Locally

After making changes:

```bash
# Regenerate the completion script
tdn complete zsh > ~/.tdn-completion.zsh

# Restart your shell or reload
source ~/.zshrc

# Test
tdn <TAB>                    # Should show all commands
tdn list <TAB>               # Should show entity types
tdn list --status=<TAB>      # Should show status values
```

**Important:** The completion script is a static snapshot. After code changes affecting completions, you must regenerate it.

## Common Patterns

### Shared Value Lists

If multiple commands use the same values (like status), you can extract the completion logic:

```typescript
const addStatusCompletions = (complete: (value: string, description: string) => void) => {
  complete('inbox', 'Newly captured, not yet processed');
  complete('ready', 'Processed and ready to work on');
  // ... etc
};

// Then use it:
const statusOption1 = listCompletion.options.get('status');
if (statusOption1) {
  statusOption1.handler = addStatusCompletions;
}

const statusOption2 = newCompletion.options.get('status');
if (statusOption2) {
  statusOption2.handler = addStatusCompletions;
}
```

### Completion Structure Location

All completion setup lives in **one place**: `src/index.ts`, immediately after the `tab(program)` call. This keeps the pattern centralized and easy to maintain.

## Troubleshooting

**Completions not showing after changes?**
- Regenerate the completion script: `tdn complete zsh > ~/.tdn-completion.zsh`
- Reload your shell: `source ~/.zshrc`

**Arguments not completing?**
- Check that you manually registered them (Commander adapter doesn't extract arguments)
- Verify the command name matches exactly (including subcommands as flat strings)

**Option values not completing?**
- Use equals syntax: `--option=<TAB>` not `--option <TAB>`
- Check that you're setting `.handler` on the option, not the command
