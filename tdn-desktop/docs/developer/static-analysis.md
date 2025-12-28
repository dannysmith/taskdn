# Static Analysis

All static analysis tools configured in this app and how to use them.

## Quick Reference

| Tool           | Purpose                  | Command                  | In check:all |
| -------------- | ------------------------ | ------------------------ | ------------ |
| TypeScript     | Type checking            | `bun run typecheck`      | Yes          |
| ESLint         | Syntax, style, TS rules  | `bun run lint`           | Yes          |
| Prettier       | Code formatting          | `bun run format:check`   | Yes          |
| ast-grep       | Architecture patterns    | `bun run ast:lint`       | Yes          |
| React Compiler | Automatic memoization    | Build-time               | Yes          |
| cargo fmt      | Rust formatting          | `bun run rust:fmt:check` | Yes          |
| clippy         | Rust linting             | `bun run rust:clippy`    | Yes          |
| Vitest         | Frontend tests           | `bun run test:run`       | Yes          |
| cargo test     | Rust tests               | `bun run rust:test`      | Yes          |
| knip           | Unused code detection    | `bun run knip`           | No           |
| jscpd          | Duplicate code detection | `bun run jscpd`          | No           |

## Running All Checks

```bash
bun run check:all    # Must pass before commits
bun run fix:all      # Auto-fix what can be fixed
```

## Tool Details

### ESLint

Handles syntax, style, and TypeScript-specific rules.

```bash
bun run lint        # Check for issues
bun run lint:fix    # Auto-fix issues
```

Configuration in `eslint.config.js`.

### Prettier

Consistent code formatting.

```bash
bun run format:check   # Check formatting
bun run format         # Fix formatting
```

Configuration in `prettier.config.js`.

### ast-grep

Enforces architectural patterns ESLint can't detect. Catches violations like Zustand destructuring and hooks in wrong directories.

```bash
bun run ast:lint    # Scan for violations
bun run ast:fix     # Auto-fix where possible
```

**Key rules:**

- No Zustand destructuring (causes render cascades)
- Hooks must be in `hooks/` directory
- No store subscriptions in `lib/`

See [writing-ast-grep-rules.md](./writing-ast-grep-rules.md) for creating new rules.

### React Compiler

Handles memoization automatically at build time. You do **not** need to manually add:

- `useMemo` for computed values
- `useCallback` for function references
- `React.memo` for components

The compiler analyzes code and adds memoization where beneficial.

**Note:** The `getState()` pattern is still critical - it avoids store subscriptions, not memoization. See [state-management.md](./state-management.md).

### Rust Tooling

```bash
bun run rust:fmt:check   # Check formatting
bun run rust:fmt         # Fix formatting
bun run rust:clippy      # Lint with clippy
bun run rust:clippy:fix  # Auto-fix clippy warnings
bun run rust:test        # Run Rust tests
```

### knip (Periodic Cleanup)

Detects unused exports, dependencies, and files. Not in `check:all` - use periodically.

```bash
bun run knip
```

### jscpd (Periodic Cleanup)

Detects duplicated code blocks. Not in `check:all` - use periodically.

```bash
bun run jscpd
```

Use the `/cleanup` command for guided analysis and cleanup of both knip and jscpd findings.

## CI Integration

`check:all` runs in CI. Ensure it passes locally before pushing:

```bash
bun run check:all
```

## Adding New Rules

**ESLint:** Add rules to `eslint.config.js`

**ast-grep:** Create YAML files in `.ast-grep/rules/`. See [writing-ast-grep-rules.md](./writing-ast-grep-rules.md).

**Prettier:** Modify `prettier.config.js`
