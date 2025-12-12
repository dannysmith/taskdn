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
├── src/lib.rs          # NAPI bindings (the thin wrapper)
├── Cargo.toml          # Rust dependencies
├── build.rs            # NAPI build setup
├── package.json        # npm package config
├── index.js            # Generated JS bindings (after build)
└── index.d.ts          # Generated TS types (after build)
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
```

## Development Rules

1. **Use bun** - This project uses bun, not npm or pnpm
2. **Keep it thin** - No TypeScript business logic; delegate to Rust
3. **Type fidelity** - TypeScript types must exactly match the Taskdn spec
4. **Naming conventions** - Use camelCase for JS (createdAt), snake_case internally in Rust

## API Design

See `../docs/tasks-todo/task-3-typescript-sdk.md` for the full API surface to expose.

Key patterns:

- Rust `Result<T, Error>` becomes JavaScript exceptions
- All file operations are synchronous (matches Rust SDK design)
- Status enums exposed as string literal unions

## Testing

Test against the demo vault:

```bash
# Reset the dummy vault first
../scripts/reset-dummy-vault.sh

# Then run tests against dummy-demo-vault/
bun test
```

## Spec Reference

- Frontmatter fields: `../docs/user-guide/2-the-specification.md`
- Rust SDK API: `../taskdn-rust/src/lib.rs`
