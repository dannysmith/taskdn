# Testing Guide

This document explains our approach to testing in tdn-cli.

## Overview

We use a layered testing strategy:

| Type                   | Location                      | Runner       | Purpose                      |
| ---------------------- | ----------------------------- | ------------ | ---------------------------- |
| Rust unit tests        | Co-located in `*.rs`          | `cargo test` | Test Rust functions          |
| TS unit tests          | `tests/unit/`                 | `bun test`   | Test formatters, utilities   |
| TS binding smoke tests | `tests/unit/bindings.test.ts` | `bun test`   | Verify NAPI bindings work    |
| E2E tests              | `tests/e2e/`                  | `bun test`   | Test CLI commands end-to-end |

**E2E tests are the primary focus.** They serve as an executable specification of CLI behavior.

## Running Tests

```bash
bun run test          # Run all tests (TS + Rust)
bun run test:ts       # Run TypeScript tests only
bun run test:rust     # Run Rust tests only
```

## Directory Structure

```
tests/
├── fixtures/
│   └── vault/           # Test fixture files (committed)
│       ├── tasks/
│       ├── projects/
│       └── areas/
├── e2e/
│   ├── show.test.ts     # One file per command
│   ├── list.test.ts
│   └── ...
├── unit/
│   ├── formatters.test.ts
│   ├── bindings.test.ts
│   └── ...
└── helpers/
    └── cli.ts           # CLI test utilities
```

## Test Types

### Rust Unit Tests

Co-located in the same file as the code being tested. Use `tempfile` for file-based tests.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn parses_minimal_task() {
        let content = "---\ntitle: Test\nstatus: ready\n---\n";
        let file = create_temp_file(content);
        let task = parse_task_file(file.path()).unwrap();
        assert_eq!(task.title, "Test");
    }
}
```

### TypeScript Unit Tests

For pure functions like formatters. Located in `tests/unit/`.

```typescript
// tests/unit/formatters.test.ts
import { describe, test, expect } from "bun:test";
import { humanFormatter } from "@/output/human";

describe("humanFormatter", () => {
  test("formats task title in bold", () => {
    const result = humanFormatter.format({ type: "task", task: mockTask });
    expect(stripAnsi(result)).toContain("My Task Title");
  });
});
```

### Binding Smoke Tests

A few tests to verify the Rust↔TypeScript boundary works correctly.

```typescript
// tests/unit/bindings.test.ts
import { describe, test, expect } from "bun:test";
import { parseTaskFile } from "@bindings";

describe("NAPI bindings", () => {
  test("parseTaskFile returns Task object", () => {
    const task = parseTaskFile("tests/fixtures/vault/tasks/minimal.md");
    expect(task.title).toBeDefined();
    expect(task.status).toBeDefined();
  });
});
```

### E2E Tests

Test the CLI as users would use it. These are the most important tests.

```typescript
// tests/e2e/show.test.ts
import { describe, test, expect } from "bun:test";
import { runCli } from "../helpers/cli";

describe("taskdn show", () => {
  describe("with valid task path", () => {
    test("outputs task title", async () => {
      const { stdout, exitCode } = await runCli(["show", "tests/fixtures/vault/tasks/minimal.md"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Minimal Task");
    });

    test("with --ai outputs structured markdown", async () => {
      const { stdout } = await runCli(["show", "tests/fixtures/vault/tasks/minimal.md", "--ai"]);
      expect(stdout).toContain("## Minimal Task");
      expect(stdout).toContain("- **status:**");
    });

    test("with --json outputs valid JSON with summary", async () => {
      const { stdout } = await runCli(["show", "tests/fixtures/vault/tasks/minimal.md", "--json"]);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
      expect(output.task.title).toBe("Minimal Task");
    });
  });

  describe("with nonexistent path", () => {
    test("exits with code 1", async () => {
      const { exitCode } = await runCli(["show", "/nonexistent/path.md"]);
      expect(exitCode).toBe(1);
    });
  });
});
```

## Test Fixtures

Located in `tests/fixtures/vault/`. These are committed files designed specifically for testing.

**Principles:**

- Each fixture tests something specific
- Keep fixtures minimal - only include what the test needs
- Name files descriptively (`minimal.md`, `full-metadata.md`, `with-body.md`)
- For write operations, create temp directories per-test

**Why not use demo-vault?**

- demo-vault may change for demo purposes
- Test fixtures need stability
- We need edge cases that don't belong in demos

## CLI Test Helper

The `tests/helpers/cli.ts` module provides utilities for running the CLI:

```typescript
import { runCli } from "../helpers/cli";

// Run a command and get output
const { stdout, stderr, exitCode } = await runCli(["show", "path/to/task.md"]);

// Run with flags
const { stdout } = await runCli(["show", "task.md", "--ai"]);

// Output is automatically stripped of ANSI colors
expect(stdout).toContain("Task Title");
```

## Writing Good E2E Tests

1. **Structure as specification** - Tests should read as documentation of CLI behavior
2. **Use descriptive describe/test names** - `describe('with --json flag')` not `describe('json')`
3. **Test all output modes** - Human, AI, and JSON modes may have different behavior
4. **Test error cases** - Invalid paths, malformed files, bad arguments
5. **Check exit codes** - 0 for success, 1 for errors, 2 for usage errors

## Interactive Prompts

Interactive prompts (via @clack/prompts) are harder to test automatically. Our approach:

1. Test the logic that runs after prompts (the functions prompts call)
2. Keep interactive code thin - just collect input and call testable functions
3. Manual testing for prompt UX
4. Consider PTY-based testing later if needed

## When to Write Which Test

| Scenario               | Test Type                        |
| ---------------------- | -------------------------------- |
| New Rust parsing logic | Rust unit test                   |
| New output formatter   | TS unit test                     |
| New CLI command        | E2E test                         |
| New command flag       | E2E test                         |
| Bug fix                | E2E test reproducing the bug     |
| Refactoring            | Existing tests should still pass |
