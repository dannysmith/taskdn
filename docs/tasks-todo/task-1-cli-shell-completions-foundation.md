# Task: CLI Shell Completions Foundation

**Work Directory:** `tdn-cli/`

## Overview

Add shell autocompletion support to tdn-cli using `@bomb.sh/tab`, with static completions for all commands and options, plus an automated installation system that modifies shell configuration files.

This task implements the foundation (Phases 1 & 3 from the research):

- **Phase 1:** Basic tab integration with static completions
- **Phase 3:** Auto-installation command that safely modifies shell configs

After this task, users will be able to:

- Run `tdn completion install` to add completions to their shell (zsh/bash/fish)
- Get tab completions for all commands, options, and known values (statuses, entity types)
- Manually install completions with clear documentation

**Note:** Dynamic completions (task/project/area name suggestions from the vault) are intentionally deferred to a separate task to avoid performance unknowns blocking this feature.

## Phases

### Phase 1: Basic Integration with Static Completions

Install `@bomb.sh/tab` and integrate it into the CLI with static completions.

**1.1: Install dependency**

Add to `package.json`:

```json
"dependencies": {
  "@bomb.sh/tab": "latest"
}
```

Run: `bun install`

**1.2: Integrate tab in src/index.ts**

After all commands are registered, add:

```typescript
import tab from '@bomb.sh/tab/commander'

// After all program.addCommand() calls
const completion = tab(program)
```

This automatically:

- Adds a `complete` command to the CLI
- Enables basic completions for all commands and options

**1.3: Add static completions for known values**

Add completion handlers for fields with known values:

```typescript
// Status completions for 'set' command
const setCommand = completion.commands.get('set')
if (setCommand) {
  const statusOption = setCommand.options.get('status')
  if (statusOption) {
    statusOption.handler = (complete) => {
      complete('todo', 'Not started')
      complete('in-progress', 'Currently working on')
      complete('blocked', 'Waiting on something')
      complete('ready', 'Ready to start')
      complete('done', 'Completed')
      complete('cancelled', 'No longer needed')
      complete('paused', 'On hold')
    }
  }
}

// Entity type completions for 'list' command
const listCommand = completion.commands.get('list')
if (listCommand) {
  // First argument is entity type
  const entityArg = listCommand.arguments.get(0)
  if (entityArg) {
    entityArg.handler = (complete) => {
      complete('tasks', 'List tasks')
      complete('projects', 'List projects')
      complete('areas', 'List areas')
    }
  }

  // Status option for filtering
  const statusOption = listCommand.options.get('status')
  if (statusOption) {
    statusOption.handler = (complete) => {
      // Same statuses as above
      complete('todo', 'Not started')
      // ... etc
    }
  }
}

// Add similar handlers for:
// - 'update' command status option
// - 'new' command entity-type argument
// - Any other commands with enumerable values
```

**1.4: Test basic completions manually**

```bash
# Generate completion script for your shell
bun run tdn complete zsh > /tmp/tdn-completion.zsh
source /tmp/tdn-completion.zsh

# Test completions
tdn <TAB>           # Should show all commands
tdn list <TAB>      # Should show tasks/projects/areas
tdn set <TAB>       # Should show task names (from files, initially just basic)
tdn set foo --status <TAB>  # Should show status values
```

**1.5: Document manual installation**

Add to `tdn-cli/README.md`:

````markdown
## Shell Completions

### Automatic Installation (Recommended)

Run the installation command and follow the prompts:

\```bash
tdn completion install
\```

This will add completions to your shell configuration file (~/.zshrc, ~/.bashrc, etc.).

### Manual Installation

If you prefer to install manually:

#### Zsh

\```bash
tdn complete zsh > ~/.tdn-completion.zsh
echo 'source ~/.tdn-completion.zsh' >> ~/.zshrc
source ~/.zshrc
\```

#### Bash

\```bash
tdn complete bash > ~/.tdn-completion.bash
echo 'source ~/.tdn-completion.bash' >> ~/.bashrc
source ~/.bashrc
\```

#### Fish

\```bash
tdn complete fish > ~/.config/fish/completions/tdn.fish
\```
````

### Phase 2: Completion Command Infrastructure

Create a dedicated `completion` command with install/uninstall/status subcommands.

**2.1: Create completion command file**

Create `src/commands/completion.ts`:

```typescript
import { Command } from '@commander-js/extra-typings'
import { intro, outro, confirm, log, spinner } from '@clack/prompts'
import { homedir } from 'os'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { execSync } from 'child_process'

const completionCommand = new Command('completion').description(
  'Manage shell completions'
)

// completion install
completionCommand
  .command('install')
  .description('Install shell completions')
  .option('--shell <shell>', 'Shell type (zsh, bash, fish)')
  .action(async (options) => {
    intro('Installing tdn shell completions')

    // Detect shell or use provided option
    const shell = options.shell || detectShell()
    if (!shell) {
      log.error('Could not detect shell. Use --shell option.')
      process.exit(1)
    }

    log.info(`Detected shell: ${shell}`)

    // Check if already installed
    const { configPath, sourceLine } = getShellConfig(shell)
    if (isAlreadyInstalled(configPath, sourceLine)) {
      log.warn('Completions already installed')
      outro('Nothing to do')
      return
    }

    // Confirm with user
    const confirmed = await confirm({
      message: `Add completion sourcing to ${configPath}?`,
    })

    if (!confirmed) {
      outro('Installation cancelled')
      return
    }

    // Generate completion script
    const spin = spinner()
    spin.start('Generating completion script')

    const scriptPath = generateCompletionScript(shell)

    spin.stop('Completion script generated')

    // Add to shell config
    spin.start(`Updating ${configPath}`)

    addToShellConfig(configPath, sourceLine)

    spin.stop(`Updated ${configPath}`)

    outro(
      `Shell completions installed! Restart your terminal or run: source ${configPath}`
    )
  })

// completion uninstall
completionCommand
  .command('uninstall')
  .description('Uninstall shell completions')
  .action(async () => {
    intro('Uninstalling tdn shell completions')

    const shell = detectShell()
    if (!shell) {
      log.error('Could not detect shell')
      process.exit(1)
    }

    const { configPath, sourceLine, scriptPath } = getShellConfig(shell)

    if (!isAlreadyInstalled(configPath, sourceLine)) {
      log.warn('Completions not installed')
      outro('Nothing to do')
      return
    }

    const confirmed = await confirm({
      message: `Remove completion sourcing from ${configPath}?`,
    })

    if (!confirmed) {
      outro('Uninstallation cancelled')
      return
    }

    // Remove from shell config
    removeFromShellConfig(configPath, sourceLine)

    // Delete completion script
    if (existsSync(scriptPath)) {
      unlinkSync(scriptPath)
    }

    outro(`Shell completions uninstalled! Restart your terminal.`)
  })

// completion status
completionCommand
  .command('status')
  .description('Check completion installation status')
  .action(() => {
    intro('Completion installation status')

    const shell = detectShell()
    if (!shell) {
      log.error('Could not detect shell')
      process.exit(1)
    }

    log.info(`Shell: ${shell}`)

    const { configPath, sourceLine, scriptPath } = getShellConfig(shell)

    const installed = isAlreadyInstalled(configPath, sourceLine)
    const scriptExists = existsSync(scriptPath)

    if (installed && scriptExists) {
      log.success('Completions are installed')
      log.info(`Config: ${configPath}`)
      log.info(`Script: ${scriptPath}`)
    } else if (installed) {
      log.warn(
        'Config file has sourcing line, but completion script is missing'
      )
      log.info('Run `tdn completion install` to fix')
    } else {
      log.error('Completions are not installed')
      log.info('Run `tdn completion install` to install')
    }

    outro('Done')
  })

export { completionCommand }
```

**2.2: Create helper utilities**

Create `src/lib/shell-completion.ts`:

```typescript
import { homedir } from 'os'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync, mkdirSync } from 'fs'
import { dirname } from 'path'

export type Shell = 'zsh' | 'bash' | 'fish' | 'pwsh'

export function detectShell(): Shell | null {
  const shell = process.env.SHELL || ''

  if (shell.includes('zsh')) return 'zsh'
  if (shell.includes('bash')) return 'bash'
  if (shell.includes('fish')) return 'fish'
  if (shell.includes('pwsh') || shell.includes('powershell')) return 'pwsh'

  return null
}

export function getShellConfig(shell: Shell): {
  configPath: string
  scriptPath: string
  sourceLine: string
} {
  const home = homedir()

  switch (shell) {
    case 'zsh':
      return {
        configPath: `${home}/.zshrc`,
        scriptPath: `${home}/.tdn-completion.zsh`,
        sourceLine: 'source ~/.tdn-completion.zsh',
      }

    case 'bash':
      // macOS uses .bash_profile, Linux uses .bashrc
      const bashConfig =
        process.platform === 'darwin'
          ? `${home}/.bash_profile`
          : `${home}/.bashrc`

      return {
        configPath: bashConfig,
        scriptPath: `${home}/.tdn-completion.bash`,
        sourceLine: 'source ~/.tdn-completion.bash',
      }

    case 'fish':
      return {
        configPath: `${home}/.config/fish/config.fish`,
        scriptPath: `${home}/.config/fish/completions/tdn.fish`,
        sourceLine: '', // fish loads from completions dir automatically
      }

    case 'pwsh':
      // Windows PowerShell profile (Windows only)
      if (process.platform !== 'win32') {
        throw new Error('PowerShell completion is only supported on Windows')
      }
      const profilePath = execSync('powershell -Command "$PROFILE"', {
        encoding: 'utf8',
      }).trim()
      return {
        configPath: profilePath,
        scriptPath: `${homedir()}/.tdn-completion.ps1`,
        sourceLine: '. ~/.tdn-completion.ps1',
      }

    default:
      throw new Error(`Unsupported shell: ${shell}`)
  }
}

export function generateCompletionScript(shell: Shell): string {
  const { scriptPath } = getShellConfig(shell)

  // Ensure directory exists (especially for fish completions dir)
  const scriptDir = dirname(scriptPath)
  if (!existsSync(scriptDir)) {
    mkdirSync(scriptDir, { recursive: true })
  }

  // Run: tdn complete <shell> > scriptPath
  const completionScript = execSync(`bun run tdn complete ${shell}`, {
    encoding: 'utf8',
  })

  writeFileSync(scriptPath, completionScript, 'utf8')

  return scriptPath
}

export function isAlreadyInstalled(
  configPath: string,
  sourceLine: string
): boolean {
  if (!existsSync(configPath)) {
    return false
  }

  const content = readFileSync(configPath, 'utf8')
  return content.includes(sourceLine)
}

export function addToShellConfig(configPath: string, sourceLine: string): void {
  if (!sourceLine) {
    // Fish doesn't need sourcing (uses completions dir)
    return
  }

  // Create backup
  const backup = `${configPath}.backup-${Date.now()}`
  if (existsSync(configPath)) {
    copyFileSync(configPath, backup)
  }

  // Append sourcing line
  const content = existsSync(configPath) ? readFileSync(configPath, 'utf8') : ''
  const newContent =
    content.trim() + '\n\n# tdn completions\n' + sourceLine + '\n'

  writeFileSync(configPath, newContent, 'utf8')
}

export function removeFromShellConfig(
  configPath: string,
  sourceLine: string
): void {
  if (!existsSync(configPath) || !sourceLine) {
    return
  }

  const content = readFileSync(configPath, 'utf8')

  // Remove the sourcing line and the comment before it if it exists
  const lines = content.split('\n')
  const filtered = lines.filter((line, i) => {
    if (line.trim() === sourceLine) {
      return false
    }
    // Remove "# tdn completions" comment if next line is the source line
    if (
      line.trim() === '# tdn completions' &&
      lines[i + 1]?.trim() === sourceLine
    ) {
      return false
    }
    return true
  })

  writeFileSync(configPath, filtered.join('\n'), 'utf8')
}
```

**2.3: Register completion command**

Add to `src/commands/index.ts`:

```typescript
export { completionCommand } from './completion.ts'
```

Add to `src/index.ts`:

```typescript
import { completionCommand } from '@/commands/index.ts'
program.addCommand(completionCommand)
```

### Phase 3: Enhance init Command

Add optional completion installation to the `init` command in **interactive mode only**.

**Note:** This enhancement only applies when `tdn init` is run without options (interactive mode). Non-interactive init (with `--tasks-dir` etc.) should not prompt for completion installation.

**3.1: Update init.ts**

After successful config creation in interactive mode:

```typescript
// At the end of init command, after config is written
if (mode === 'human') {
  console.log()

  const installCompletion = await confirm({
    message: 'Install shell completions for tdn?',
    initialValue: true,
  })

  if (installCompletion) {
    // Import completion install logic
    const {
      detectShell,
      getShellConfig,
      isAlreadyInstalled,
      generateCompletionScript,
      addToShellConfig,
    } = await import('@/lib/shell-completion')

    const shell = detectShell()
    if (!shell) {
      log.warn('Could not detect shell. Run `tdn completion install` manually.')
    } else {
      const { configPath, sourceLine } = getShellConfig(shell)

      if (isAlreadyInstalled(configPath, sourceLine)) {
        log.info('Completions already installed')
      } else {
        try {
          const scriptPath = generateCompletionScript(shell)
          addToShellConfig(configPath, sourceLine)

          log.success('Shell completions installed!')
          log.info(`Restart your terminal or run: source ${configPath}`)
        } catch (error) {
          log.error(`Failed to install completions: ${error.message}`)
          log.info('You can install them manually with: tdn completion install')
        }
      }
    }
  }
}
```

### Phase 4: Testing

**4.1: Manual testing checklist**

Test on each supported shell:

- [ ] **zsh:** `tdn completion install` works
- [ ] **zsh:** Tab completion works after sourcing
- [ ] **zsh:** `tdn completion uninstall` removes completions
- [ ] **bash:** `tdn completion install` works
- [ ] **bash:** Tab completion works after sourcing
- [ ] **fish:** `tdn completion install` works (if fish available)
- [ ] Edge case: Running `install` twice doesn't duplicate entries
- [ ] Edge case: Config file doesn't exist - creates it
- [ ] `tdn init` offers to install completions
- [ ] `tdn completion status` shows correct status

**4.2: Test completion suggestions**

```bash
tdn <TAB>                    # All commands
tdn list <TAB>               # tasks, projects, areas
tdn set <TAB>                # Should show available completions
tdn set foo --status <TAB>   # All 7 status values
tdn new <TAB>                # task, project, area
```

**4.3: Add TypeScript unit tests**

Create `tests/lib/shell-completion.test.ts` for utility functions:

- `detectShell()` with mocked `process.env.SHELL`
- `getShellConfig()` for each shell type
- `isAlreadyInstalled()` with sample config content

## Verification

- [ ] `@bomb.sh/tab` installed in package.json
- [ ] Tab integration added to `src/index.ts`
- [ ] Static completions defined for status, entity-type, and other known values
- [ ] `src/commands/completion.ts` created with install/uninstall/status subcommands
- [ ] `src/lib/shell-completion.ts` created with helper functions
- [ ] `init` command offers to install completions in interactive mode
- [ ] README.md documents both automatic and manual installation
- [ ] Manual testing passes on zsh and bash
- [ ] TypeScript unit tests added for shell utilities
- [ ] `bun run check` passes
- [ ] All commands have basic tab completion working

## Notes

**Critical implementation fixes:**

- All required imports must be included (existsSync, copyFileSync, unlinkSync, mkdirSync, dirname)
- Fish completions directory must be created before writing completion file
- PowerShell support requires platform check (Windows only)
- Phase 3 completions prompt only applies in interactive mode

**Performance considerations:**

- Static completions are fast (no I/O)
- Completion script generation happens once during install
- Tab presses don't reload the vault (that's deferred to next task)

**Safety:**

- Always backup shell config before modifying
- Check for existing sourcing lines to avoid duplicates
- Provide manual installation docs as fallback
- Graceful error handling if shell detection fails

**Scope boundaries:**

- This task does NOT implement dynamic completions (task/project/area names from vault)
- That's intentionally deferred to avoid performance unknowns blocking this feature
- Focus is on infrastructure and static completions only

**Follow-up task:**

- `task-x-cli-shell-completions-dynamic.md` adds vault-based dynamic completions
