# Claude Instructions for taskdn-ts

This is the **TypeScript SDK** for Taskdn - NAPI-RS bindings exposing the Rust SDK to Node.js/Bun environments.

See @docs/tasks.md for task management.

## Project Overview

- **Purpose:** Thin TypeScript wrapper around the Rust SDK via NAPI-RS
- **Consumers:** CLI tool (`taskdn-cli/`), Obsidian plugin (`taskdn-obsidian-plugin/`)
- **NOT consumed by:** Tauri Desktop (uses Rust SDK directly)

## Key Principle: Thin Wrapper

All business logic lives in the Rust SDK (`taskdn-rust/`). This package only:

- Exposes the Rust API to JavaScript
- Converts types between Rust and JavaScript
- Generates TypeScript type definitions

**Never add business logic here.** If something can be done in Rust, do it in Rust.

## Directory Structure

```
taskdn-ts/
├── src/lib.rs              # NAPI bindings (the thin wrapper)
├── Cargo.toml              # Rust dependencies
├── build.rs                # NAPI build setup
├── package.json            # npm package config
├── index.js                # Generated JS bindings (after build)
├── index.d.ts              # Generated TS types (after build)
├── README.md               # User-facing documentation
├── CLAUDE.md               # Developer instructions (this file)
└── tests/
    ├── setup.ts            # Test utilities (resetTestVault, TEST_VAULT paths)
    ├── api-snapshot.test.ts    # Snapshot test for generated types
    ├── taskdn.test.ts      # SDK initialization tests
    ├── tasks.test.ts       # Task operation tests
    ├── projects.test.ts    # Project operation tests
    ├── areas.test.ts       # Area operation tests
    └── events.test.ts      # Event processing tests
```

## Commands

```bash
# Install dependencies
bun install

# Debug build (current platform, faster)
bun run build:debug

# Release build (current platform, optimized)
bun run build

# Run tests
bun test

# Run specific test file
bun test tests/tasks.test.ts
```

## Development Rules

1. **Use bun** - This project uses bun, not npm or pnpm
2. **Keep it thin** - No TypeScript business logic; delegate to Rust
3. **Type fidelity** - TypeScript types must exactly match the Taskdn spec
4. **Naming conventions** - Use camelCase for JS (createdAt), snake_case internally in Rust

## API Design

Key patterns:

- Rust `Result<T, Error>` becomes JavaScript exceptions
- All file operations are synchronous (matches Rust SDK design)
- Status enums exposed as string literal unions (`TaskStatus.Ready` = `'ready'`)
- Optional fields use `Option<T>` in Rust, `T | undefined | null` in TypeScript
- File references use a tagged union with `type` field: `'wikilink'`, `'relativePath'`, `'filename'`

## Testing

Tests run against a copy of the demo vault to avoid corrupting the canonical version.

```bash
# Reset the dummy vault (automatically done in beforeEach)
../scripts/reset-dummy-vault.sh

# Run all tests
bun test

# Run with verbose output
bun test --verbose
```

### Test Structure

- **setup.ts** - `resetTestVault()` copies demo-vault to dummy-demo-vault
- **taskdn.test.ts** - Constructor, config getters, watchedPaths
- **tasks.test.ts** - CRUD, status transitions, archive/unarchive
- **projects.test.ts** - CRUD, filtering, getTasksForProject
- **areas.test.ts** - CRUD, filtering, getTasksForArea, getProjectsForArea
- **events.test.ts** - processFileChange for all entity types

## API Consistency

The generated `index.d.ts` is snapshot-tested to catch unintended API changes.

If you change the NAPI bindings:
1. Run `bun test` - it will fail if types changed
2. Review the diff in the test output
3. If intentional: `bun test --update-snapshots`
4. Commit the updated snapshot

## Common Issues

### Build failures

```bash
# Clean and rebuild
rm -f *.node index.js index.d.ts
bun run build:debug
```

### Test failures after Rust SDK changes

If the Rust SDK API changes, update the NAPI bindings in `src/lib.rs` to match, then rebuild.

### Type snapshot mismatch

This is expected when you intentionally change the API. Review the diff and update:

```bash
bun test --update-snapshots
```

## Spec Reference

- Frontmatter fields: `../docs/user-guide/2-the-specification.md`
- Rust SDK API: `../taskdn-rust/src/lib.rs`
- JSON Schema: `../docs/schemas/`
