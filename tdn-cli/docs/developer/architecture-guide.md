# Architecture Guide

This document explains the high-level architecture and key patterns in tdn-cli. It's intended as a reference for developers (including AI coding agents) to ensure consistency across the codebase.

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

### Output Modes

The CLI supports three output modes controlled by global flags:

- **Human mode** (default): Colored, formatted for terminal reading
- **AI mode** (`--ai`): Structured Markdown for LLM consumption
- **JSON mode** (`--json`): Machine-readable JSON with `summary` field

Commands use the formatter system rather than formatting output directly:

```typescript
import { formatOutput } from "@/output/index.ts";
import type { GlobalOptions, TaskResult } from "@/output/index.ts";

// In command action:
const result: TaskResult = { type: "task", task };
console.log(formatOutput(result, globalOpts));
```

Each formatter (`human.ts`, `ai.ts`, `json.ts`) implements the `Formatter` interface and handles all result types.

### Command Structure

Commands are defined in `src/commands/` and registered in `src/index.ts`:

```typescript
// src/commands/example.ts
import { Command } from "@commander-js/extra-typings";

export const exampleCommand = new Command("example")
  .description("Brief description")
  .argument("<required>", "Argument description")
  .option("--flag", "Option description")
  .action((arg, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    // Implementation
  });
```

Access global options (`--ai`, `--json`) via `command.optsWithGlobals()`.

### Rust-TypeScript Boundary

Rust functions are exposed via the `#[napi]` macro:

```rust
// crates/core/src/task.rs
#[napi]
pub fn parse_task_file(file_path: String) -> Result<Task> {
    // Implementation
}
```

NAPI-RS generates TypeScript types in `bindings/index.d.ts`. Import from `@bindings`:

```typescript
import { parseTaskFile } from "@bindings";
import type { Task } from "@bindings";
```

After changing Rust code, run `bun run build` to regenerate bindings.

### Terminal Styling with ansis

Use `ansis` for terminal colors and formatting:

```typescript
import { bold, dim, red, green } from "ansis";

// Chained syntax
console.log(red.bold("Error message"));

// Individual functions
console.log(bold(title) + "  " + dim(subtitle));
```

Prefer named imports for tree-shaking. Common patterns:

- `bold` for emphasis (titles, important values)
- `dim` for secondary information (paths, labels)
- `red` for errors
- `green`, `blue`, `yellow` for status indicators

### Interactive Prompts with @clack/prompts

Use `@clack/prompts` for user interaction in human mode only:

```typescript
import * as p from "@clack/prompts";

// Always check for cancellation
const value = await p.text({ message: "Enter value:" });
if (p.isCancel(value)) {
  p.cancel("Operation cancelled");
  process.exit(0);
}

// Spinner for long operations
const s = p.spinner();
s.start("Loading...");
// ... work
s.stop("Done");
```

Skip prompts in AI/JSON mode - these modes should be non-interactive.

### Error Handling

Errors should be formatted appropriately for each output mode:

```typescript
if (mode === "json") {
  console.log(JSON.stringify({ error: true, message }, null, 2));
} else if (mode === "ai") {
  console.log(`## Error\n\n- **message:** ${message}`);
} else {
  console.error(red(`Error: ${message}`));
}
process.exit(1);
```

In Rust, use `napi::Result` and `napi::Error` for errors that cross the boundary:

```rust
Err(Error::new(Status::GenericFailure, "Error message"))
```

## Path Aliases

Use these aliases in TypeScript imports:

- `@/*` → `src/*`
- `@bindings` → `bindings/`

```typescript
import { formatOutput } from "@/output/index.ts";
import { parseTaskFile } from "@bindings";
```
