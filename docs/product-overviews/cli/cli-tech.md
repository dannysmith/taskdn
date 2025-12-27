# CLI Technical Overview

**Status:** Implemented (v0.1.0)

This document describes the technical architecture of the Taskdn CLI tool at a high level. For detailed implementation patterns, see the [developer documentation](../../tdn-cli/docs/developer/).

> **Related Documents:**
>
> - [CLI Requirements](./cli-requirements.md) - Functional requirements and interface design
> - [S1: Core Specification](../../../tdn-specs/S1-core.md) - File format specification
> - [S2: Interface Design](../../../tdn-specs/S2-interface-design.md) - General interface patterns
> - [Architecture Guide](../../tdn-cli/docs/developer/architecture-guide.md) - Detailed implementation patterns

---

## Architecture

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

| Approach              | Why Not                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pure TypeScript**   | Too slow for large vaults. Bun improves I/O but parsing remains CPU-bound in JS.                                                                             |
| **Pure Rust CLI**     | Slower iteration on CLI surface. TypeScript is faster for output formatting, TUI, etc.                                                                       |
| **Separate packages** | Premature extraction. The original plan (Rust crate → npm package → CLI) created too much friction during early development when the interface was evolving. |
| **Go**                | No code sharing with Tauri desktop app. Would require duplicating business logic.                                                                            |

---

## Technology Stack

### TypeScript Layer

| Purpose             | Technology                                      |
| ------------------- | ----------------------------------------------- |
| Runtime             | Bun                                             |
| CLI framework       | Commander.js with `@commander-js/extra-typings` |
| Interactive prompts | `@clack/prompts` (includes spinner)             |
| Terminal output     | `ansis` (colors, bold, dim)                     |

### Rust Core

| Purpose             | Technology  | Status      |
| ------------------- | ----------- | ----------- |
| Frontmatter parsing | gray_matter | Implemented |
| YAML serialization  | serde_yaml  | Implemented |
| Parallelism         | rayon       | Implemented |
| Date/time           | chrono      | Implemented |
| Error handling      | thiserror   | Implemented |
| Node.js bindings    | napi-rs v3  | Implemented |

### Key Dependencies

**gray_matter** (Rust): Fast frontmatter extraction supporting YAML/JSON/TOML. Used for reading task files. Implemented.

**serde_yaml**: Used for YAML serialization. YAML comments are not preserved on round-trip—this is an acceptable tradeoff for clean formatting. Implemented.

**rayon**: Parallel directory scanning for large vaults. Provides ~3× speedup on vaults with 1000+ files. Implemented.

**chrono**: Date/time handling for natural language date parsing ("tomorrow", "next friday") and ISO 8601 formatting. Implemented.

**NAPI-RS**: Creates native Node.js addons from Rust. Generates TypeScript type definitions automatically. Chosen over WASM because WASM cannot use `std::thread` or access the filesystem directly. Implemented.

---

## Architectural Principles

These principles guide the implementation and ensure the CLI is robust, performant, and maintainable.

### 1. Stateless Core with Optional Caching

The Rust core is stateless by default. For commands requiring multiple queries (e.g., `context`), the **VaultSession pattern** provides opt-in index caching within a single command invocation. See [vault-session-pattern.md](../../tdn-cli/docs/developer/vault-session-pattern.md) for details.

### 2. Path as Primary Identifier

File paths are the canonical identifier for all entities. No internal IDs. This aligns with how users naturally work with files and keeps the system transparent.

### 3. Round-Trip Fidelity

When reading and writing files, preserve what we don't understand:

- Unknown frontmatter fields survive read/write cycles
- User's date format choice (date vs datetime) is preserved
- File reference format (wikilink vs relative path) is preserved
- Markdown body content remains unchanged

This is implemented using the **Writer Pattern**: raw YAML manipulation for writes instead of round-tripping through typed structs. See [architecture-guide.md](../../tdn-cli/docs/developer/architecture-guide.md) for implementation details.

### 4. Errors, Not Panics

All fallible operations return `Result<T, Error>`. No `unwrap()` or `expect()` in library code. Structured errors with machine-readable codes and contextual information.

### 5. Graceful Degradation

- `list` operations skip unparseable files and return valid ones (with warnings)
- Batch operations continue on individual failures, reporting successes and failures separately
- A corrupted file shouldn't prevent users from seeing their other tasks

### 6. Synchronous File I/O with Parallel Scanning

File I/O is synchronous (simpler, sufficient performance). Directory scanning uses **rayon** for parallelism (~3× faster on large vaults). Bounded thread pool prevents CPU exhaustion.

---

## Key Implementation Patterns

The implementation uses several specialized patterns to ensure performance, correctness, and maintainability. For detailed explanations, see [architecture-guide.md](../../tdn-cli/docs/developer/architecture-guide.md).

### VaultSession Pattern

Opt-in index caching for commands that perform multiple queries. Provides 3× performance improvement for complex commands like `context`.

See [vault-session-pattern.md](../../tdn-cli/docs/developer/vault-session-pattern.md) for full specification.

### Writer Pattern (Round-Trip Fidelity)

Raw YAML manipulation for file writes to preserve unknown frontmatter fields and user formatting choices. Separate "read view" structs (typed, optimized for querying) from write operations (preserve everything).

See [architecture-guide.md](../../tdn-cli/docs/developer/architecture-guide.md#round-trip-file-writing-writer-pattern) for implementation details.

### Output Mode Dispatch

Commands return structured result types, which are dispatched to formatters based on global options (`--ai`, `--json`). This separation enables consistent output across all commands.

See [output-format-spec.md](../../tdn-cli/docs/developer/output-format-spec.md) for complete output specifications.

### Filter Semantics

Standard boolean logic for query composition:
- Same filter type, multiple values → OR
- Different filter types → AND
- Contradictory filters → empty result (no error)

### Security Patterns

- **Vault path validation:** Blocks system directories, warns if outside home
- **DoS protection:** Bounded thread pool (8 threads), file count limits (10,000 files)
- **Parallel scanning with rayon:** Safe parallelism for large vault performance

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

The CLI uses a comprehensive testing approach focusing on end-to-end tests with targeted unit tests for critical logic.

**Primary focus:** E2E tests that exercise the CLI as users would use it, testing against real vault files.

**Test infrastructure:**
- `dummy-demo-vault/` - Disposable copy of demo vault, reset before each test run
- Rust unit tests for parsing logic and core algorithms
- TypeScript unit tests for formatters and output patterns

See [testing.md](../../tdn-cli/docs/developer/testing.md) for complete testing strategy and patterns.

---

## Performance

**Achieved performance** (typical laptop hardware):

| Operation                       | Target  | Achieved |
| ------------------------------- | ------- | -------- |
| Single file parse               | <1ms    | ~0.3ms   |
| 5000 file vault scan (parallel) | <500ms  | ~750ms   |
| In-memory filter (1000 tasks)   | <5ms    | ~2ms     |
| CLI startup to first output     | <100ms  | ~50ms    |

The CLI feels responsive for typical vaults (up to a few thousand files). Parallel scanning with rayon provides ~3× speedup vs sequential scanning.

---

## Implementation Notes

The CLI was built fresh against the current specifications (S1, S2). Prior research spikes in `archived-projects/` informed architectural decisions but were not copied wholesale.

**Key learnings from research phase:**
- NAPI-RS provides excellent TypeScript integration with Rust
- Parallel scanning with rayon is essential for large vault performance
- Separate read/write paths enable both type safety and round-trip fidelity
- VaultSession pattern emerged as critical for complex context queries

For implementation details and patterns, see the [developer documentation](../../tdn-cli/docs/developer/).

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
- rayon (parallelism): https://lib.rs/crates/rayon
- serde_yaml: https://lib.rs/crates/serde_yaml

### Prior Art

- Beans (Go task CLI): https://github.com/hmans/beans — Reviewed for patterns; we adopted output mode conventions but rejected GraphQL complexity.

---

## Technology Decisions

Key decisions made during implementation:

1. **CLI framework:** Commander.js with `@commander-js/extra-typings` for zero dependencies, excellent Bun compatibility, and full TypeScript type inference.

2. **Interactive prompts:** `@clack/prompts` for beautiful defaults, built-in spinner/autocomplete, and excellent Ctrl-C handling.

3. **Terminal styling:** `ansis` for chained syntax, tree-shaking support, and multi-line text handling.

4. **Rust dependencies:** gray_matter for frontmatter parsing, rayon for parallel scanning, chrono for date handling, thiserror for structured errors.

5. **Search implementation:** Simple case-insensitive substring matching (per spec's "no typo tolerance" requirement).

See [architecture-guide.md](../../tdn-cli/docs/developer/architecture-guide.md) for detailed rationale and patterns.

---

## Revision History

| Date       | Change                                        |
| ---------- | --------------------------------------------- |
| 2025-12-22 | Initial version (pre-implementation)          |
| 2025-12-27 | Updated to reflect completed implementation   |
