# CLI Technical Overview

This document describes the technical architecture for the Taskdn CLI tool.

> **Related Documents:**
>
> - [CLI Requirements](./cli-requirements.md) - Functional requirements and interface design
> - [S1: Core Specification](../../../tdn-specs/S1-core.md) - File format specification
> - [S2: Interface Design](../../../tdn-specs/S2-interface-design.md) - General interface patterns

---

## Architecture Decision

The CLI uses a **consolidated hybrid architecture**: a TypeScript/Bun CLI with an embedded Rust core library, connected via NAPI-RS bindings.

```
taskdn-cli/
├── package.json              # Bun project
├── src/                      # TypeScript CLI layer
│   ├── index.ts              # Entry point, argument parsing
│   ├── commands/             # Command implementations
│   └── output/               # Human/AI/JSON formatters
├── crates/
│   └── core/                 # Rust library + NAPI bindings
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs        # NAPI exports
│           ├── vault.rs      # Vault operations
│           ├── parser.rs     # YAML/Markdown parsing
│           ├── writer.rs     # File writing with round-trip fidelity
│           ├── query.rs      # Filtering and querying
│           └── ...
└── bindings/                 # Auto-generated TypeScript types
```

### Why This Architecture

**Performance:** Rust handles all file I/O and parsing. Benchmarks from similar tools (SWC, Biome, Oxc) show NAPI-RS bindings are 3-20x faster than pure JavaScript for markdown/YAML parsing. Target performance: single file parse <1ms, 5000-file vault scan <500ms.

**Development Velocity:** TypeScript for the CLI surface (argument parsing, output formatting, interactive prompts) enables rapid iteration. Rust core changes require rebuild (~5-15s incremental), but the CLI layer iterates instantly.

**Single Project Context:** Everything lives in one directory. No cross-package versioning, no publishing during development, no context-switching between repositories.

**Clean Extraction Path:** When the desktop app needs the Rust core, we extract it to a shared workspace crate. The code stays the same; only the organization changes.

### Why Not Other Approaches

| Approach              | Why Not                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure TypeScript**   | Too slow for large vaults. Bun improves I/O but parsing remains CPU-bound in JS.                                                                             |
| **Pure Rust CLI**     | Slower iteration on CLI surface. TypeScript is faster for output formatting, TUI, etc.                                                                       |
| **Separate packages** | Premature extraction. The original plan (Rust crate → npm package → CLI) created too much friction during early development when the interface was evolving. |
| **Go**                | No code sharing with Tauri desktop app. Would require duplicating business logic.                                                                            |

---

## Technology Stack

### TypeScript Layer

| Purpose             | Technology                            |
| ------------------- | ------------------------------------- |
| Runtime             | Bun                                   |
| CLI framework       | TBD (commander, yargs, or @boune/cli) |
| Interactive prompts | TBD (inquire.js or similar)           |
| Terminal output     | TBD (chalk, ora for spinners)         |

### Rust Core

| Purpose                      | Technology               |
| ---------------------------- | ------------------------ |
| Frontmatter parsing          | gray_matter              |
| YAML round-trip writing      | yaml-edit                |
| Parallelism                  | rayon                    |
| Date/time                    | chrono                   |
| Error handling               | thiserror                |
| Node.js bindings             | napi-rs                  |

### Key Dependencies

**gray_matter** (Rust): Fast frontmatter extraction supporting YAML/JSON/TOML. Used for reading task files.

**yaml-edit**: Lossless YAML parsing using syntax trees. Critical for preserving user formatting, comments position, and field order when updating files.

**NAPI-RS**: Creates native Node.js addons from Rust. Generates TypeScript type definitions automatically. Chosen over WASM because WASM cannot use `std::thread` or access the filesystem directly.

---

## Architectural Principles

These principles emerged from prior SDK work and should guide implementation.

### 1. Stateless Core

The Rust core holds configuration but not cached data. Every query reads from disk. This allows:

- CLI gets fresh reads (appropriate for short-lived process)
- Desktop app can implement its own caching strategy
- Simpler reasoning, fewer stale-state bugs

### 2. Path as Primary Identifier

File paths are the canonical identifier for all entities. No internal IDs. This aligns with how users naturally work with files and keeps the system transparent.

### 3. Round-Trip Fidelity

When reading and writing files, preserve what we don't understand:

- Unknown frontmatter fields must survive read/write cycles
- User's date format choice (date vs datetime) must be preserved
- File reference format (wikilink vs relative path) must be preserved
- Markdown body content must remain unchanged

This is critical because users will extend files with custom fields (`tags`, `priority`, etc.) and other tools may add their own metadata.

### 4. Errors, Not Panics

All fallible operations return `Result<T, Error>`. No `unwrap()` or `expect()` in library code. The core will be embedded in both CLI and desktop app—panics are unacceptable.

### 5. Graceful Degradation

- `list` operations skip unparseable files and return valid ones (with warnings)
- Batch operations continue on individual failures, reporting successes and failures separately
- A corrupted file shouldn't prevent users from seeing their other tasks

### 6. Synchronous File I/O

Async provides no performance benefit for filesystem operations (tokio::fs uses spawn_blocking internally). Synchronous code is simpler to write and reason about. Consumers can wrap in async contexts if needed.

---

## Key Implementation Patterns

### The Double-Option Pattern

For update operations, distinguish "don't change this field" from "clear this field":

- `None` = don't change
- `Some(None)` = explicitly clear
- `Some(Some(value))` = set to value

The TypeScript layer should expose this as separate methods (e.g., `.setDue(date)` vs `.clearDue()`) for ergonomics.

### Format Preservation Types

Use enum types that preserve user's original format choice:

**DateTimeValue:** Preserves whether user wrote `2025-01-15` (date only) or `2025-01-15T10:30:00` (datetime). Write back in the same format.

**FileReference:** Preserves whether user wrote `[[Project Name]]` (wikilink), `./projects/file.md` (relative path), or `file.md` (filename only).

### Parsed vs Full Entity Separation

Separate parsing from file-path concerns:

- `ParsedTask` = content only (for parsing from string, testing without filesystem)
- `Task` = file path + content (for actual file operations)

This enables testing the parser without filesystem access.

### Filter Semantics

Filters combine using standard boolean logic:

- **Same field, multiple values = OR:** `status=ready,in-progress` means ready OR in-progress
- **Different fields = AND:** `status=ready` AND `project=Q1`
- **Unset fields don't constrain:** Omitting status filter returns all statuses

### Batch Results

For operations on multiple files, don't abort on first failure. Process everything, report results:

```
BatchResult {
  succeeded: [...],
  failed: [(path, error), ...]
}
```

### Non-Exhaustive Enums

Status enums should be marked non-exhaustive to allow adding new statuses without breaking existing compiled code.

---

## SDK Extraction for Desktop App

When the Tauri desktop app is ready, extract the Rust core to a shared workspace crate.

**Current structure:**

```
taskdn-cli/
└── crates/
    └── core/           # Embedded Rust library
```

**After extraction:**

```
taskdn/
├── Cargo.toml          # Workspace root
├── crates/
│   └── taskdn-core/    # Shared library (extracted from CLI)
├── taskdn-cli/
│   └── native/         # NAPI bindings, imports taskdn-core
└── taskdn-desktop/
    └── src-tauri/      # Tauri app, imports taskdn-core directly
```

The Rust code itself doesn't change—only the Cargo.toml dependencies and directory structure. This is a straightforward refactor when the time comes.

**Quick start for desktop:** Before full extraction, the Tauri app can use a path dependency:

```toml
# taskdn-desktop/src-tauri/Cargo.toml
[dependencies]
taskdn-core = { path = "../../taskdn-cli/crates/core" }
```

---

## Distribution

The CLI will be distributed as a standalone binary using `bun build --compile`. This bundles:

- Bun runtime
- TypeScript code
- Native Rust addon (.node file)

Cross-compilation is supported for macOS (arm64, x64), Linux (x64, arm64), and Windows (x64).

Binary size will be approximately 50MB (Bun runtime is the majority). This is acceptable for a developer tool.

---

## Testing Strategy

### Unit Tests

- Rust core: standard `#[cfg(test)]` modules
- TypeScript layer: bun test

### Integration Tests

- Use `dummy-demo-vault/` (reset from `demo-vault/` before each test run)
- Test full CLI commands with real files
- Cover both human and AI output modes

### Round-Trip Tests

Parse file → write file → parse again → assert identical. Critical for verifying fidelity preservation.

### API Snapshot Tests

Snapshot the generated TypeScript bindings to catch unintentional API changes.

---

## Performance Targets

| Operation                         | Target  |
| --------------------------------- | ------- |
| Single file parse                 | <1ms    |
| 5000 file vault scan (parallel)   | <500ms  |
| In-memory filter (1000 tasks)     | <5ms    |
| CLI startup to first output       | <100ms  |

These are goals, not hard requirements. The key constraint is that the CLI should feel responsive for typical use (vaults up to a few thousand files).

---

## Archived Project References

The `archived-projects/` directory contains prior work that informed these decisions. Useful references when implementing:

| Path                                              | What to Reference                          |
| ------------------------------------------------- | ------------------------------------------ |
| `taskdn-rust/src/types/`                          | Type definitions (Task, Project, Area)     |
| `taskdn-rust/src/parser.rs`                       | Frontmatter parsing approach               |
| `taskdn-rust/src/writer.rs`                       | Round-trip writing with format preservation|
| `taskdn-rust/src/filter.rs`                       | Filter implementation and semantics        |
| `taskdn-rust/docs/developer/architecture-guide.md`| Detailed architectural decisions           |
| `taskdn-ts/src/lib.rs`                            | NAPI-RS binding patterns                   |
| `taskdn-ts/package.json`                          | Multi-platform npm publishing setup        |

**Do not copy wholesale.** The archived code predates the current specifications. Use it as reference for patterns and solutions to specific problems, but implement fresh against the current specs.

---

## External References

### NAPI-RS

- Documentation: https://napi.rs/
- GitHub: https://github.com/napi-rs/napi-rs

### Bun

- Standalone binaries: https://bun.sh/docs/bundler/executables
- File I/O: https://bun.sh/docs/api/file-io

### Rust Libraries

- gray_matter (frontmatter): https://lib.rs/crates/gray_matter
- yaml-edit (round-trip YAML): https://crates.io/crates/yaml-edit
- rayon (parallelism): https://lib.rs/crates/rayon

### Prior Art

- Beans (Go task CLI): https://github.com/hmans/beans — Reviewed for patterns; we adopted output mode conventions but rejected GraphQL complexity.

---

## Open Questions

To be resolved before or during implementation:

1. **CLI framework choice:** Commander, yargs, @boune/cli, or custom with Bun's parseArgs?
2. **TUI library:** For interactive prompts in human mode.
3. **Exact project structure:** Script organization, dev workflow tooling.
4. **Search implementation:** Simple substring matching initially, or full-text search from the start?

---

## Revision History

| Date       | Change                                  |
| ---------- | --------------------------------------- |
| 2025-12-22 | Initial version based on Phase 2 research |
