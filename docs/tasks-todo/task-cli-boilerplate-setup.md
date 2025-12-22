# Task: CLI Boilerplate Setup

Set up the foundational project structure for `tdn-cli/` so we can begin implementing features. This task covers research, tooling decisions, and scaffolding - ending with a working skeleton that can parse a single task file and output in all three modes (human/AI/JSON).

**Goal:** Have a working development environment where we can:

1. Write Rust code for the core library
2. Write TypeScript code for the CLI layer
3. Build and run the CLI locally
4. Run tests for both layers
5. See a simple end-to-end flow working (e.g., `taskdn show <path>` outputting a parsed task)

---

## Phase 1: Research & Tooling Decisions ✅

Decisions made 2025-12-22 based on research into Bun compatibility, bundle size, TypeScript DX, and feature requirements.

### 1.1 CLI Framework ✅

**Decision:** Commander.js with `@commander-js/extra-typings`

**Rationale:**

- Zero dependencies
- Perfect Bun compatibility (no known issues)
- Excellent TypeScript support with extra-typings package for full type inference
- Clean subcommand API, auto-generated help text
- 244M weekly downloads, actively maintained (v14 released 2025)

**Rejected alternatives:**

- **yargs** - Critical Bun compatibility issues (regex parsing errors, version check failures)
- **@oclif/core** - ts-node conflicts with Bun, overkill for our needs (28 dependencies)
- **Bun native parseArgs** - No subcommand support, no help generation, too low-level

**Shell completions:** Deferred to v2+. When needed, evaluate [bombshell-dev/tab](https://github.com/bombshell-dev/tab) (from Clack's creators).

### 1.2 TUI/Prompt Library ✅

**Decision:** @clack/prompts

**Rationale:**

- Beautiful defaults matching our "human mode" aesthetic goals
- Built-in spinner (no separate library needed)
- Built-in autocomplete for fuzzy select scenarios
- Excellent Ctrl-C handling with `isCancel()` guard pattern
- `group()` prompts perfect for multi-field input (`taskdn add` with no args)
- Confirmed Bun compatibility
- 171 kB bundle size acceptable (CLI distributes as ~50MB binary anyway)

**Rejected alternatives:**

- **@inquirer/prompts** - Needs plugin for fuzzy search, throws errors on Ctrl-C (less elegant)
- **prompts** - Lighter but no built-in spinners, less polished UX
- **Bun readline** - Too much work to build fuzzy select, keyboard nav, etc.

### 1.3 Terminal Output Styling ✅

**Decision:** ansis (colors/formatting) + Clack spinner (for long operations)

**Rationale for ansis:**

- Chained syntax: `red.bold('text')` vs nested `pc.bold(pc.red('text'))`
- Named imports for tree-shaking: `import { red, bold } from 'ansis'`
- Handles multi-line text correctly (picocolors breaks at newlines)
- Excellent TypeScript autocomplete
- Modern chalk replacement recommended by e18e community
- ~15-20 kB bundle

**Rationale for Clack spinner:**

- Already bundled with @clack/prompts
- Works standalone outside interactive prompts
- Use for human-mode operations that might take noticeable time (vault scanning)
- Skip spinner in AI mode (no progress indicators needed)

**Terminal rendering approach:** Start with manual formatting using ansis. Build simple formatters ourselves rather than adding table/box libraries. The output formats in the spec are styled text with alignment, not true tables.

**Rejected alternatives:**

- **picocolors** - No chained syntax, doesn't handle multi-line edge case
- **chalk** - 101 kB (14x larger), slower, no advantages over ansis
- **ora** - Clack spinner sufficient, no need for separate library
- **Bun.color()** - Only colors, no text formatting (bold/dim/underline)

### 1.4 Search Implementation ✅

**Decision:** Simple substring matching (case-insensitive), implemented in Rust core

**Rationale:**

- Spec explicitly states "no typo tolerance" for fuzzy matching
- `--query` text search should follow same rules for consistency
- Rust core handles all text matching (single implementation, tested in one place)
- Can revisit if users request smarter search in future versions

### Summary: Runtime Dependencies

| Package                       | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `commander`                   | CLI framework                           |
| `@commander-js/extra-typings` | TypeScript type inference for Commander |
| `@clack/prompts`              | Interactive prompts + spinner           |
| `ansis`                       | Terminal colors and text formatting     |

Total: 4 packages (minimal dependency footprint)

---

## Phase 2: Project Initialization ✅

Set up the basic project structure with both TypeScript and Rust components.

Completed 2025-12-22.

### 2.1 Directory Structure ✅

Created structure (slightly simplified from original plan - scripts/ and tests/ deferred):

```
tdn-cli/
├── package.json
├── tsconfig.json
├── Cargo.toml              # Workspace root
├── src/                    # TypeScript CLI layer
│   ├── index.ts            # Entry point
│   ├── commands/           # Command implementations (empty)
│   └── output/             # Human/AI/JSON formatters (empty)
├── crates/
│   └── core/               # Rust library
│       ├── Cargo.toml
│       ├── build.rs
│       └── src/
│           └── lib.rs      # NAPI exports
└── bindings/               # Auto-generated (gitignored)
```

- [x] Create directory structure
- [x] Initialize `package.json` with Bun
- [x] Initialize Rust workspace with crates/core
- [x] Create `.gitignore` covering both Node and Rust artifacts

### 2.2 TypeScript Dependencies ✅

- [x] Install Commander.js and extra-typings for CLI framework
- [x] Install @clack/prompts for interactive prompts and spinners
- [x] Install ansis for terminal colors and formatting
- [x] Verify all packages install correctly with Bun

### 2.3 TypeScript Configuration ✅

- [x] Create `tsconfig.json` with strict mode, appropriate target
- [x] Path aliases skipped (not needed for this project size)
- [x] Set up for Bun runtime

### 2.4 Rust Configuration ✅

- [x] Set up `Cargo.toml` with dependencies: napi v3, napi-derive v3, thiserror, serde
- [x] Configure for library output with cdylib target
- [x] Set up `build.rs` for NAPI

### 2.5 Ancillary Tooling Setup ✅

- [x] Set up Prettier, ESLint (flat config), and Clippy
- [x] Set up `check` (all), `check:ts`, `check:rust`, `fix` commands
- [x] Initialize CLAUDE.md, README.md

---

## Phase 3: NAPI-RS Bindings Setup ✅

This is the critical integration layer. Get a minimal working binding before building anything complex.

Completed 2025-12-22.

### 3.1 Minimal Binding Test ✅

Implemented `helloFromRust()` in Rust, verified TypeScript can call it:

```
$ bun run src/index.ts
✓ All dependencies loaded successfully
✓ Rust binding works: Hello from Rust!
```

- [x] Install NAPI-RS dependencies in Rust (napi v3, napi-derive v3, napi-build v2)
- [x] Configure NAPI-RS build (config in package.json "napi" key)
- [x] Run build to generate TypeScript bindings in `bindings/`
- [x] Verify TypeScript can import and call the Rust function
- [x] Document the build command in README

### 3.2 Build Pipeline ✅

Using npm scripts instead of shell scripts (cleaner for cross-platform):

- `bun run build` - Release build with NAPI bindings
- `bun run build:dev` - Debug build
- `bun run check` - Full check (TS + Rust)

- [x] Build pipeline generates Rust library + TypeScript bindings
- [x] `bun run src/index.ts` works after build

---

## Phase 4: CLI Skeleton ✅

Build out the TypeScript CLI structure with stubs.

Completed 2025-12-22.

### 4.1 Entry Point & Argument Parsing ✅

- [x] Create `src/index.ts` with basic argument parsing
- [x] Implement `--help` and `--version` flags
- [x] Implement `--ai` and `--json` global flags
- [x] Set up subcommand routing (list, show, add, context)

### 4.2 Output Formatters ✅

Created output mode handlers:

```
src/output/
├── index.ts          # Factory/router based on flags
├── types.ts          # OutputMode, Formatter, GlobalOptions types
├── human.ts          # Pretty terminal output (ansis colors)
├── ai.ts             # Structured Markdown
└── json.ts           # JSON output with summary field
```

- [x] Create output interface/type that all formatters implement
- [x] Implement stub formatters that output placeholder text
- [x] Wire up to CLI flags via `formatOutput()` helper

### 4.3 Command Stubs ✅

Created stub implementations:

```
src/commands/
├── list.ts           # List with filters (--status, --project, --due, etc.)
├── show.ts           # Show single entity
├── add.ts            # Add with options, interactive mode stub
├── context.ts        # Context with vault overview in AI mode
└── index.ts          # Exports all commands
```

- [x] Each command accepts appropriate arguments
- [x] Commands output via the formatter system
- [x] All three output modes (human/ai/json) working

---

## Phase 5: Minimal End-to-End Flow ✅

Prove the architecture works with a real (but minimal) implementation.

Completed 2025-12-22.

### 5.1 Rust: Parse Single Task File ✅

Implemented task parser in `crates/core/src/task.rs`:

- [x] Add `gray_matter` and `serde_yaml` dependencies
- [x] Create Task struct with all frontmatter fields from spec
- [x] Create `parse_task_file(path: String) -> Result<Task>` function
- [x] Expose via NAPI with auto-generated TypeScript types
- [x] TaskStatus enum with all 7 status values

### 5.2 Wire Up `show` Command ✅

- [x] `show` command accepts a file path
- [x] Calls Rust `parseTaskFile` with error handling
- [x] Outputs result through formatter:
  - Human: colored output with title, status, metadata, body
  - AI: Structured Markdown with all fields
  - JSON: Full task object with summary
- [x] Handle errors gracefully (file not found, parse error)

### 5.3 Test Against Demo Vault ✅

Verified against `dummy-demo-vault/tasks/implement-auth-endpoint.md`:

- [x] Human mode: colored output with proper formatting
- [x] AI mode: structured Markdown per spec
- [x] JSON mode: full task object
- [x] Error handling: proper exit code 1 and error message for bad path

---

## Phase 6: Development Workflow

Set up everything needed for ongoing development.

### 6.1 Testing Infrastructure

#### Testing Strategy (decided 2025-12-22)

**Test Types & Approach:**

| Type                   | Location                      | Purpose                      | Notes                                                 |
| ---------------------- | ----------------------------- | ---------------------------- | ----------------------------------------------------- |
| Rust unit tests        | Co-located in `*.rs` files    | Test pure Rust functions     | Use `tempfile` for file-based tests. Already working. |
| Rust integration tests | N/A                           | Skip                         | Unit tests + E2E cover this adequately                |
| TS unit tests          | `tests/unit/`                 | Test formatters, utilities   | Pure function tests                                   |
| TS binding smoke tests | `tests/unit/bindings.test.ts` | Verify NAPI bindings work    | Just a few tests to ensure Rust↔TS boundary works     |
| E2E tests              | `tests/e2e/`                  | Test CLI commands end-to-end | **Primary focus** - these serve as CLI specification  |

**E2E Test Design:**

- **Runner:** Bun's built-in test runner (fast, no extra deps)
- **Execution:** Run against source (`bun run src/index.ts`) for fast iteration. Structure helpers so we could point at binary later.
- **Output assertions:** Strip ANSI colors, test content. Can add color assertions later when colorization is finalized.
- **Structure:** One file per command, grouped with `describe` blocks. Tests should read as CLI specification.

**Test Fixtures:**

Create dedicated `tests/fixtures/vault/` with purpose-built files:

```
tests/fixtures/vault/
├── tasks/
│   ├── minimal.md           # Just title + status
│   ├── full-metadata.md     # All optional fields
│   ├── with-body.md         # Has markdown body
│   └── each-status/         # One file per status value
├── projects/
└── areas/
```

**Why dedicated fixtures (not demo-vault):**

- Stability: exists only for tests, won't change for other reasons
- Intentionality: each file tests something specific
- Edge cases: can include pathological cases
- For write operations: use temp directories per-test

**Interactive Prompts:**

- Defer comprehensive testing for now
- Test the logic that prompts call, not the prompts themselves
- Consider PTY-based testing later if needed

#### Checklist

- [ ] Set up `bun test` for TypeScript tests
- [ ] Set up `cargo test` for Rust tests (already working)
- [ ] Create npm scripts: `test`, `test:ts`, `test:rust`
- [ ] Create `tests/fixtures/vault/` with test files
- [ ] Create CLI test helper (runs CLI, captures output, strips colors)
- [ ] Add E2E tests for `show` command
- [ ] Add unit tests for formatters
- [ ] Add binding smoke tests
- [x] Write `docs/developer/testing.md` explaining approach

### 6.2 Documentation

- [ ] Write `docs/developer/architecture-guide.md` (in `tdn-cli`) - This should Briefly explain the high level architecture, Briefly explain about testing and reference the `testing.md` We created earlier. And it should also explain the various dependencies we've brought in and when and how to use them. This is a document which we will expand over time and it's intended for humans and in particular AI coding agents to read fairly regularly so that they can check that any work they've done matches the most important design patterns here. We don't need to include exhaustive code examples in here, But we can use short illustrative examples where they'd be helpful in explaining a non-obvious pattern. This document will obviously expand and become more important over time as we bring in more and more abstractions into the code base.
- [ ] Update `tdn-cli/README.md` and `tdn-cli/CLAUDE.md` as nececarry. Keep them short, clear and useful.
- [ ] Update `../docs/product-overviews/cli-tech.md` with the major architectural decisions and library choices that we have made so far. Remember this is a very high level document.
- [ ] Document any important decisions made during this task at the end of this task doc.

### 6.3 Verify Checklist

Before marking complete:

- [ ] `bun run build` works
- [ ] `bun run check` passes
- [ ] All tests pass
- [ ] `bun run src/index.ts --help` shows help
- [ ] `bun run src/index.ts show <path>` works for all output modes
- [ ] `bun run src/index.ts show <bad-path>` shows appropriate error
- [ ] TypeScript types for Rust structs are generated and usable

---

## Notes

- **Scope boundary:** This task ends with a working `show` command. We're not implementing `list`, `add`, or other commands - just proving the architecture.
- **Spec compliance:** The `show` output format should match the spec in `cli-requirements.md` section "AI Mode Output Specification" and "Show Command".
- **Demo vault:** Always test against `dummy-demo-vault/`, never the canonical `demo-vault/`.
- **Archived code:** Reference `archived-projects/taskdn-rust/` and `archived-projects/taskdn-ts/` for patterns, but implement fresh against current specs.
