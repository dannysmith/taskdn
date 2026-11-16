# Static Analysis

All static analysis tools configured in this app and how to use them.

## Quick Reference

| Tool           | Purpose                  | Command                  | In check:all |
| -------------- | ------------------------ | ------------------------ | ------------ |
| TypeScript     | Type checking            | `bun run typecheck`      | Yes          |
| Oxlint         | Syntax, style, TS rules  | `bun run lint`           | Yes          |
| Oxfmt          | Code formatting          | `bun run format:check`   | Yes          |
| ast-grep       | Architecture patterns    | `bun run ast:lint`       | Yes          |
| React Compiler | Every component compiles | `bun run compiler:check` | Yes          |
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

### Oxlint

Handles syntax, style and TypeScript rules, type-aware through tsgolint (`options.typeAware` in the config). It also runs the React Compiler's rules natively (`react/purity`, `react/set-state-in-effect` and so on). Warnings fail the check.

```bash
bun run lint        # Check for issues
bun run lint:fix    # Auto-fix issues
```

Configuration in `.oxlintrc.json`. Disable comments are `// oxlint-disable-next-line rule-name -- reason`. A suppressed `react-hooks/*` or `react/*` compiler rule makes the React Compiler skip the whole component, so fix the code instead where you can.

### Oxfmt

Consistent code formatting. Markdown and TOML aren't formatted: Oxfmt would lose the aligned comments in `Cargo.toml` and in TOML examples in the docs.

```bash
bun run format:check   # Check formatting
bun run format         # Fix formatting
```

Configuration in `.oxfmtrc.json`.

### ast-grep

Enforces architectural patterns Oxlint can't detect. Catches violations like Zustand destructuring and hooks in wrong directories.

```bash
bun run ast:lint    # Scan for violations
bun run ast:fix     # Auto-fix where possible
```

**Key rules:**

- No Zustand destructuring (causes render cascades)
- Hooks must be in `hooks/` directory
- No store subscriptions in `lib/`
- No `useQueryClient()` hook in `lib/` (use singleton import instead)
- No raw `invoke()` calls (use type-safe `commands` from tauri-bindings)

See [writing-ast-grep-rules.md](./writing-ast-grep-rules.md) for creating new rules.

### React Compiler

Handles memoization automatically at build time. You do **not** need to manually add:

- `useMemo` for computed values
- `useCallback` for function references
- `React.memo` for components

The compiler analyzes code and adds memoization where beneficial. It silently skips any component or hook it can't compile (try/finally, conditionals or `?.` inside a try/catch, and anything that breaks the Rules of React), so `bun run compiler:check` (`scripts/react-compiler-check.ts`) fails if anything in `src/` is skipped. The fix is usually to move async or try/catch logic out of the component into a plain function, or to handle errors on the promise.

**Note:** The `getState()` pattern is still critical - it avoids store subscriptions, not memoization. See [state-management.md](./state-management.md).

### Rust Tooling

```bash
bun run rust:fmt:check   # Check formatting
bun run rust:fmt         # Fix formatting
bun run rust:clippy      # Lint with clippy (all targets, tests included)
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

Use the `codebase-hygiene` skill (`.claude/skills/codebase-hygiene/` at the repo root) for guided analysis and cleanup of both knip and jscpd findings.

## CI Integration

`check:all` runs in CI. Ensure it passes locally before pushing:

```bash
bun run check:all
```

## Adding New Rules

**Oxlint:** Add rules to `.oxlintrc.json`

**ast-grep:** Create YAML files in `.ast-grep/rules/`. See [writing-ast-grep-rules.md](./writing-ast-grep-rules.md).

**Oxfmt:** Modify `.oxfmtrc.json`
