# tdn-cli

Task management CLI for humans and AI agents.

Part of the [Taskdn](../) monorepo. See `../docs/product-overviews/cli/` for high-level requirements and technical overview.

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

## Installation (Production Use)

To install `tdn` globally on your machine for daily use:

```bash
# From the project root
./scripts/install-local.sh
```

This script will:
1. Install dependencies
2. Build the Rust bindings
3. Create a symlink at `~/.local/bin/tdn`
4. Verify the installation

After installation, you can use `tdn` from anywhere:

```bash
tdn --help
tdn list tasks --ai
```

**Updating:** When you pull new changes, simply rebuild the bindings:

```bash
cd tdn-cli
bun run build
```

The symlink continues to point to the latest code.

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

## Documentation

### Developer Docs

- [Architecture Guide](docs/developer/architecture-guide.md) - Patterns, dependencies, Rust↔TS boundary
- [CLI Interface Guide](docs/developer/cli-interface-guide.md) - Commands, filtering, entity lookup
- [Output Format Spec](docs/developer/output-format-spec.md) - Human/AI/JSON formatting rules
- [VaultSession Pattern](docs/developer/vault-session-pattern.md) - Index caching & performance
- [Testing Guide](docs/developer/testing.md) - E2E-first testing strategy
- [AI Context](docs/developer/ai-context.md) - AI mode output specification

### Product Docs

High-level requirements and technical overview in the monorepo:
- `../docs/product-overviews/cli/cli-requirements.md`
- `../docs/product-overviews/cli/cli-tech.md`

## Testing

E2E tests are the primary focus. Run the full suite with `bun run test`.

Test against the disposable vault:
```bash
./scripts/reset-dummy-vault.sh  # Reset test vault
bun run test                     # Run all tests
```

See [Testing Guide](docs/developer/testing.md) for details.
