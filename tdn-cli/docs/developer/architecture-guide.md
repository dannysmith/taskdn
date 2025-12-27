# Architecture Guide

This document explains the high-level architecture and key patterns in tdn-cli. It's intended as a reference for developers (including AI coding agents) to ensure consistency across the codebase.

## Related Documentation

For detailed information on specific patterns and systems:

- **[VaultSession Pattern](./vault-session-pattern.md)** - Index caching and performance optimization
- **[CLI Interface Guide](./cli-interface-guide.md)** - Command patterns, entity lookup, filtering
- **[AI Context Output](./ai-context.md)** - AI mode output format specification
- **[Output Format Spec](./output-format-spec.md)** - Human/AI/JSON formatting patterns
- **[Testing Guide](./testing.md)** - Testing strategy and patterns

## Overview

tdn-cli is a hybrid TypeScript + Rust project:

```
┌─────────────────────────────────────────────────┐
│                TypeScript Layer (Bun)               │
│    CLI interface, prompts, output formatting        │
├─────────────────────────────────────────────────┤
│                NAPI-RS Bindings                     │
│     Auto-generated TypeScript types in bindings/    │
├─────────────────────────────────────────────────┤
│                Rust Core (crates/core)              │
│     Parsing, search, file operations                │
└─────────────────────────────────────────────────┘
```

**TypeScript layer** handles user interaction: argument parsing, interactive prompts, and output formatting. It's optimized for developer experience and rapid iteration.

**Rust core** handles performance-critical operations: parsing task files, searching/filtering, and file I/O. Functions are exposed to TypeScript via NAPI-RS, with types auto-generated in `bindings/`.

## Directory Structure

```
tdn-cli/
├── src/                    # TypeScript CLI layer
│   ├── index.ts            # Entry point, global options
│   ├── commands/           # One file per command
│   └── output/             # Human/AI/JSON formatters
├── crates/core/            # Rust library
│   └── src/
│       ├── lib.rs          # Module exports + NAPI bindings
│       └── task.rs         # Task parsing
├── bindings/               # Auto-generated (gitignored)
└── tests/                  # See testing.md
```

## Testing

See [testing.md](./testing.md) for our testing strategy. Key points:

- E2E tests are the primary focus (test CLI as users would use it)
- Rust unit tests for parsing logic
- TypeScript unit tests for formatters

## Dependencies

### TypeScript Dependencies

| Package                       | Purpose             | When to use                           |
| ----------------------------- | ------------------- | ------------------------------------- |
| `commander`                   | CLI framework       | Defining commands, arguments, options |
| `@commander-js/extra-typings` | Type inference      | Always use with commander             |
| `@clack/prompts`              | Interactive prompts | User input, spinners                  |
| `ansis`                       | Terminal styling    | Colors, bold, dim text                |

### Rust Dependencies

| Crate                  | Purpose             |
| ---------------------- | ------------------- |
| `napi` / `napi-derive` | TypeScript bindings |
| `gray_matter`          | Frontmatter parsing |
| `serde` / `serde_yaml` | Serialization       |
| `thiserror`            | Error handling      |

## Key Patterns

### VaultSession Pattern (Performance)

For commands that perform multiple queries or relationship traversal, use VaultSession to cache the vault index:

```typescript
const session = createVaultSession(config); // Create once per command
const tasks = findTasksByTitle(session, "foo"); // Reuses index
const area = getAreaContext(session, "Work"); // Reuses same index
```

**Key benefits:**
- Index built once, reused for all queries in a command
- 3× faster for commands with multiple lookups
- Lazy building - only if query functions are called

See [vault-session-pattern.md](./vault-session-pattern.md) for detailed explanation and when to use sessions vs. simple functions.

### Round-Trip File Writing (Writer Pattern)

File updates preserve unknown frontmatter fields and user formatting by manipulating raw YAML instead of round-tripping through typed structs:

```rust
// ❌ Don't: Loses unknown fields
let yaml = serde_yaml::to_string(&task)?;

// ✅ Do: Preserves everything
let parsed = parse_file_parts(&content)?; // Returns (Mapping, body)
set_yaml_field(&mut mapping, "status", "done");
```

This is critical for user trust - we never discard fields we don't understand.

See: `crates/core/src/writer.rs` comments for implementation details.

### Security & Performance Patterns

**Vault Path Validation** (`src/config/index.ts`):
- Blocks system directories (`/etc`, `/usr`, `/bin`)
- Warns if outside home directory
- All paths resolved to absolute form

**DoS Protection** (`crates/core/src/vault.rs`):
- MAX_FILES_PER_SCAN: 10,000 files (prevents directory scanning attacks)
- MAX_PARALLEL_THREADS: 8 threads (prevents CPU exhaustion)
- Silent truncation with warnings

**Parallel Vault Scanning** (`scan_directory`):
- Uses rayon for parallel file parsing
- 3× faster on large vaults (2500ms → 750ms for 5000 files)
- Safe: each file parsed independently, bounded thread pool

### Output Modes

Commands dispatch to formatters rather than formatting directly:

```typescript
const result: TaskResult = { type: "task", task };
console.log(formatOutput(result, globalOpts));
```

Modes:
- **Human** (default): Colored terminal output
- **AI** (`--ai`): Structured Markdown for LLMs
- **JSON** (`--json`): Machine-readable with `summary` field
- **AI-JSON** (`--ai --json`): Markdown in JSON envelope

See [output-format-spec.md](./output-format-spec.md) and [ai-context.md](./ai-context.md) for detailed specifications.

### Command Structure

Commands are defined in `src/commands/` and registered in `src/index.ts`:

```typescript
export const exampleCommand = new Command("example")
  .description("Brief description")
  .argument("<required>", "Argument description")
  .option("--flag", "Option description")
  .action((arg, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const result = { type: "task", task }; // Build result
    console.log(formatOutput(result, globalOpts)); // Dispatch to formatter
  });
```

Access global options (`--ai`, `--json`) via `command.optsWithGlobals()`.

### Rust-TypeScript Boundary

Rust functions are exposed via the `#[napi]` macro:

```rust
#[napi]
pub fn parse_task_file(file_path: String) -> Result<Task> { /* ... */ }
```

TypeScript imports from auto-generated bindings:

```typescript
import { parseTaskFile } from "@bindings";
import type { Task } from "@bindings";
```

**Important:** Run `bun run build` after changing `#[napi]` exports to regenerate bindings.

**Error Handling Across Boundary:**
Rust `TdnError` → NAPI serializes to JSON → TypeScript catches as Error.

See detailed explanation in `crates/core/src/lib.rs` (module docs) and `crates/core/src/error.rs`.

### Terminal Styling with ansis

Use `ansis` for terminal colors and formatting:

```typescript
import { bold, dim, red, green } from "ansis";

console.log(red.bold("Error message"));
console.log(bold(title) + "  " + dim(subtitle));
```

Common patterns: `bold` for emphasis, `dim` for secondary info, `red` for errors, `green`/`blue`/`yellow` for status.

### Interactive Prompts with @clack/prompts

Use `@clack/prompts` for user interaction in human mode only:

```typescript
import * as p from "@clack/prompts";

const value = await p.text({ message: "Enter value:" });
if (p.isCancel(value)) {
  p.cancel("Operation cancelled");
  process.exit(0);
}
```

Skip prompts in AI/JSON mode - these modes should be non-interactive.

### Error Handling

Errors should be formatted appropriately for each output mode. Commands typically use the formatter system for error results.

In Rust, use `TdnError` for structured errors that cross the NAPI boundary (see `error.rs` for details).

## Path Aliases

Use these aliases in TypeScript imports:

- `@/*` → `src/*`
- `@bindings` → `bindings/`

```typescript
import { formatOutput } from "@/output/index.ts";
import { parseTaskFile } from "@bindings";
```
