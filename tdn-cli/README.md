# tdn-cli

Task management CLI for humans and AI agents.

Part of the [Taskdn](../) monorepo. See the [CLI documentation](https://tdn.danny.is/cli/overview) for usage guides.

## What Is This?

A hybrid TypeScript + Rust CLI that provides fast, flexible task/project/area management with multiple output modes:

- **Human mode**: Terminal-optimized with colors and formatting
- **AI mode**: Structured Markdown for LLM integration
- **JSON mode**: Machine-readable for programmatic access

Key features:
- Natural language date parsing (`tomorrow`, `next monday`, `+3d`)
- Fuzzy entity lookup by title or path
- Advanced filtering (status, dates, relationships, full-text search)
- Batch operations with detailed change tracking
- VaultSession pattern for 3× faster multi-query operations

## Installation

### Homebrew (macOS/Linux)

```bash
brew tap dannysmith/taproom
brew install tdn
```

### From Source (Development)

For development, install from source to get a symlink that always points to your local build:

```bash
# From the monorepo root
bun cli:install-local
```

This creates a symlink at `~/.local/bin/tdn`. After pulling changes or modifying code, rebuild:

```bash
bun run build
```

Note: If you have both Homebrew and local installs, whichever appears first in your `$PATH` takes precedence.

## Setup (Development)

For local development without installing globally:

```bash
bun install
bun run build        # Build release bindings (required before first use)
```

## Development

```bash
bun run check        # Lint, typecheck, clippy, and Rust tests
bun run fix          # Auto-fix formatting issues
bun run build:dev    # Build debug bindings (faster iteration)
bun run test         # Run all tests (TS + Rust)
bun run test:ts      # Run TypeScript tests only
```

After modifying Rust `#[napi]` functions, run `bun run build` to regenerate TypeScript bindings.

## Architecture

```
┌─────────────────────────────────────┐
│   TypeScript (Bun)                  │  CLI interface, prompts, output formatting
├─────────────────────────────────────┤
│   NAPI-RS Bindings                  │  Auto-generated types in bindings/
├─────────────────────────────────────┤
│   Rust Core                         │  Parsing, search, file I/O (performance-critical)
└─────────────────────────────────────┘
```

**Key patterns:**
- **VaultSession**: Lazy index caching for multi-query commands (3× faster)
- **Output modes**: Human/AI/JSON formatters dispatch from commands
- **Round-trip file writing**: Preserves unknown frontmatter fields and formatting
- **Parallel vault scanning**: Uses rayon for 3× faster large vault operations

## Project Structure

```
src/
├── index.ts            # Entry point, global options
├── commands/           # One file per command
│   ├── list.ts         # Query and filter entities
│   ├── show.ts         # Display full entity details
│   ├── new.ts          # Create entities
│   ├── set.ts          # Change status
│   ├── update.ts       # Modify fields
│   └── ...
└── output/             # Human/AI/JSON formatters

crates/core/
└── src/
    ├── lib.rs          # NAPI exports
    ├── task.rs         # Task parsing
    ├── vault.rs        # VaultSession & index
    └── writer.rs       # Round-trip file updates

bindings/               # Auto-generated (gitignored)
├── index.js
└── index.d.ts

tests/
├── fixtures/vault/     # Test data (committed)
├── e2e/                # Primary test suite
├── unit/               # Formatters, utilities
└── helpers/            # Test utilities

docs/developer/         # Detailed documentation
```

## Commands

Available commands (run with `--ai` or `--json` flags for different output modes):

| Command       | Purpose                        |
| ------------- | ------------------------------ |
| `list`        | Query and filter entities      |
| `show`        | Display full entity details    |
| `new`         | Create tasks/projects/areas    |
| `context`     | Show relationships & timelines |
| `today`       | Today's actionable tasks       |
| `set status`  | Change status                  |
| `update`      | Modify entity fields           |
| `archive`     | Move to archive subdirectory   |
| `open`        | Open in $EDITOR                |
| `append-body` | Add content to body            |

See [CLI Interface Guide](docs/developer/cli-interface-guide.md) for detailed usage.

## Configuration

Configure vault directories and ignore patterns in `~/.taskdn.json` or `./.taskdn.json`:

```json
{
  "tasksDir": "~/notes/tasks",
  "projectsDir": "~/notes/projects",
  "areasDir": "~/notes/areas",
  "ignore": [
    "*.bak",
    "*.tmp",
    "README.md"
  ]
}
```

### Ignoring Files

To exclude specific files from all Taskdn operations, use the `ignore` field with filename patterns:

- Patterns use `.gitignore`-style glob syntax (`*.bak`, `temp?.md`)
- Patterns match **filenames only** (not paths)
- Ignored files excluded from `list`, `show`, `doctor`, and all other commands
- Platform-aware case sensitivity (macOS/Windows: insensitive)

See [Configuration Guide](docs/developer/configuration.md#ignore-patterns) for details.

## Shell Completions

Tab completions work for all commands, options, statuses, and entity types.

### Usage

Tab completions work for commands, arguments, and option values:

```bash
tdn <TAB>                      # Commands: list, show, new, set, etc.
tdn list <TAB>                 # Arguments: tasks, projects, areas
tdn set status <TAB>           # Status values: inbox, ready, in-progress, etc.
tdn list --status=<TAB>        # Option values (use equals syntax)
```

### Automatic Installation (Recommended)

Run the installation command and follow the prompts:

```bash
tdn completion install
```

This will add completions to your shell configuration file (~/.zshrc, ~/.bashrc, etc.). For zsh users, the installer automatically ensures `compinit` (the completion system) is initialized.

### Manual Installation

If you prefer to install manually:

#### Zsh

```bash
tdn complete zsh > ~/.tdn-completion.zsh

# Add to .zshrc
cat >> ~/.zshrc << 'EOF'
# tdn completions
# Ensure completion system is initialized
autoload -Uz compinit && compinit
[[ -f ~/.tdn-completion.zsh ]] && source ~/.tdn-completion.zsh
EOF

source ~/.zshrc
```

#### Bash

```bash
tdn complete bash > ~/.tdn-completion.bash

# Add to .bashrc
cat >> ~/.bashrc << 'EOF'
# tdn completions
if [ -f ~/.tdn-completion.bash ]; then
  source ~/.tdn-completion.bash
fi
EOF

source ~/.bashrc
```

#### Fish

```bash
tdn complete fish > ~/.config/fish/completions/tdn.fish
```

## Documentation

### Developer Docs

- [Architecture Guide](docs/developer/architecture-guide.md) - Patterns, dependencies, Rust↔TS boundary
- [CLI Interface Guide](docs/developer/cli-interface-guide.md) - Commands, filtering, entity lookup
- [Output Format Spec](docs/developer/output-format-spec.md) - Human/AI/JSON formatting rules
- [VaultSession Pattern](docs/developer/vault-session-pattern.md) - Index caching & performance
- [Testing Guide](docs/developer/testing.md) - E2E-first testing strategy
- [AI Context](docs/developer/ai-context.md) - AI mode output specification

## Testing

E2E tests are the primary focus. Run the full suite with `bun run test`.

Test against the disposable vault:
```bash
./scripts/reset-dummy-vault.sh  # Reset test vault
bun run test                     # Run all tests
```

See [Testing Guide](docs/developer/testing.md) for details.

## License

Licensed under [MIT](./LICENSE).
