# Task: CLI Boilerplate Setup

Set up the foundational project structure for `tdn-cli/` so we can begin implementing features. This task covers research, tooling decisions, and scaffolding - ending with a working skeleton that can parse a single task file and output in all three modes (human/AI/JSON).

**Goal:** Have a working development environment where we can:
1. Write Rust code for the core library
2. Write TypeScript code for the CLI layer
3. Build and run the CLI locally
4. Run tests for both layers
5. See a simple end-to-end flow working (e.g., `taskdn show <path>` outputting a parsed task)

---

## Phase 1: Research & Tooling Decisions

Before writing any code, we need to resolve the open questions from `cli-tech.md`. This phase is interactive - the user will make final decisions based on research findings.

### 1.1 CLI Framework Evaluation

**Question:** Which CLI framework for the TypeScript layer?

**Options to evaluate:**
- **Commander.js** - Most popular, battle-tested, excellent TypeScript support
- **yargs** - Powerful but heavier, good for complex CLIs
- **@oclif/core** - Enterprise-grade, might be overkill
- **Bun's native `parseArgs`** - Zero dependencies, but less ergonomic

**Research tasks:**
- [ ] Check Commander.js TypeScript DX, subcommand support, help generation
- [ ] Check if Bun's parseArgs is sufficient for our command grammar (verb-first with entity types)
- [ ] Consider: we need subcommands (`list`, `add`, `show`), flags (`--ai`, `--json`), positional args
- [ ] Consider: help text generation, shell completions support

**Decision needed:** Which framework to use?

### 1.2 TUI/Prompt Library Evaluation

**Question:** Which library for interactive prompts (human mode)?

**Options to evaluate:**
- **@inquirer/prompts** - Modern, modular, maintained successor to inquirer.js
- **prompts** - Lightweight, simple API
- **@clack/prompts** - Beautiful defaults, designed for CLIs
- **Bun-native approach** - Custom with readline?

**Research tasks:**
- [ ] Review what prompts we need: fuzzy select (multiple matches), confirmation, multi-field input
- [ ] Check Bun compatibility for each option
- [ ] Consider: Ctrl-C handling, spinner support for long operations

**Decision needed:** Which prompt library to use?

### 1.3 Terminal Output Styling

**Question:** How to handle colors, formatting, spinners?

**Options:**
- **chalk** - De facto standard for colors
- **picocolors** - Much smaller, faster
- **ora** - Spinners
- **Bun's built-in** - Check what Bun provides natively

**Research tasks:**
- [ ] Check if picocolors is sufficient (we don't need advanced features)
- [ ] Determine if we need spinners for any v1 operations
- [ ] Check Bun's native terminal capabilities

**Decision needed:** Which styling libraries (if any)?

### 1.4 Search Implementation

**Question:** Simple substring or more sophisticated search from the start?

**Context:** The `--query` flag does text search in title/body. Fuzzy matching for entity lookup uses simple substring matching (per spec).

**Options:**
- **Simple substring (case-insensitive)** - Matches spec exactly, trivial to implement
- **Basic fuzzy (e.g., fuse.js)** - Better UX for typos, but spec says no typo tolerance
- **Defer to Rust** - Let the core handle all text matching

**Research tasks:**
- [ ] Re-read spec on fuzzy matching rules - confirms simple substring only
- [ ] Decide if `--query` search should be smarter than entity lookup

**Decision needed:** Keep it simple (substring) or add fuzzy search for `--query`?

---

## Phase 2: Project Initialization

Set up the basic project structure with both TypeScript and Rust components.

### 2.1 Directory Structure

Create the structure outlined in `cli-tech.md`:

```
tdn-cli/
├── package.json
├── tsconfig.json
├── src/                      # TypeScript CLI layer
│   ├── index.ts              # Entry point
│   ├── commands/             # Command implementations (stubs)
│   └── output/               # Human/AI/JSON formatters (stubs)
├── crates/
│   └── core/                 # Rust library
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs        # NAPI exports (stub)
├── bindings/                 # Auto-generated TypeScript types
├── scripts/                  # Build scripts
└── tests/                    # Integration tests
```

- [ ] Create directory structure
- [ ] Initialize `package.json` with Bun
- [ ] Initialize Rust workspace with `cargo init --lib crates/core`
- [ ] Create `.gitignore` covering both Node and Rust artifacts

### 2.2 TypeScript Configuration

- [ ] Create `tsconfig.json` with strict mode, appropriate target
- [ ] Configure path aliases if useful (e.g., `@/` for `src/`)
- [ ] Set up for Bun runtime (check Bun-specific tsconfig options)

### 2.3 Rust Configuration

- [ ] Set up `Cargo.toml` with initial dependencies:
  - `napi` and `napi-derive` for bindings
  - `thiserror` for errors
  - `serde` for serialization
- [ ] Configure for library output with cdylib target
- [ ] Set up `build.rs` if needed for NAPI

---

## Phase 3: NAPI-RS Bindings Setup

This is the critical integration layer. Get a minimal working binding before building anything complex.

### 3.1 Minimal Binding Test

Create a trivial Rust function exposed to TypeScript:

```rust
// crates/core/src/lib.rs
#[napi]
pub fn hello_from_rust() -> String {
    "Hello from Rust!".to_string()
}
```

```typescript
// src/index.ts
import { helloFromRust } from '../bindings';
console.log(helloFromRust());
```

- [ ] Install NAPI-RS dependencies in Rust
- [ ] Configure NAPI-RS build (napi.config.json or similar)
- [ ] Run build to generate TypeScript bindings in `bindings/`
- [ ] Verify TypeScript can import and call the Rust function
- [ ] Document the build command in README

### 3.2 Build Pipeline

- [ ] Create `scripts/build.sh` that:
  - Builds Rust library
  - Generates TypeScript bindings
  - Compiles TypeScript (if needed for type checking)
- [ ] Create `scripts/dev.sh` for development (rebuild on changes?)
- [ ] Test that `bun run src/index.ts` works after build

---

## Phase 4: CLI Skeleton

Build out the TypeScript CLI structure with stubs.

### 4.1 Entry Point & Argument Parsing

Using the chosen CLI framework from Phase 1:

- [ ] Create `src/index.ts` with basic argument parsing
- [ ] Implement `--help` and `--version` flags
- [ ] Implement `--ai` and `--json` global flags
- [ ] Set up subcommand routing (stubs for: list, show, add, context)

### 4.2 Output Formatters

Create the three output mode handlers:

```
src/output/
├── index.ts          # Factory/router based on flags
├── human.ts          # Pretty terminal output
├── ai.ts             # Structured Markdown
└── json.ts           # JSON output
```

- [ ] Create output interface/type that all formatters implement
- [ ] Implement stub formatters that output placeholder text
- [ ] Wire up to CLI flags

### 4.3 Command Stubs

Create stub implementations:

```
src/commands/
├── list.ts
├── show.ts
├── add.ts
├── context.ts
└── index.ts          # Exports all commands
```

- [ ] Each command stub should:
  - Accept appropriate arguments
  - Call placeholder Rust function (or direct stub)
  - Output via the formatter system
- [ ] Implement `show` first as simplest case

---

## Phase 5: Minimal End-to-End Flow

Prove the architecture works with a real (but minimal) implementation.

### 5.1 Rust: Parse Single Task File

Implement just enough Rust to parse one task file:

- [ ] Add `gray_matter` dependency
- [ ] Create basic Task struct (just title, status, path for now)
- [ ] Create function to parse a task file given a path
- [ ] Expose via NAPI: `parseTaskFile(path: string) -> Task | null`
- [ ] Generate TypeScript types for Task

### 5.2 Wire Up `show` Command

- [ ] `show` command accepts a file path
- [ ] Calls Rust `parseTaskFile`
- [ ] Outputs result through formatter:
  - Human: pretty printed
  - AI: Markdown format per spec
  - JSON: structured JSON
- [ ] Handle errors gracefully (file not found, parse error)

### 5.3 Test Against Demo Vault

- [ ] Run `./scripts/reset-dummy-vault.sh`
- [ ] Test: `bun run src/index.ts show ../dummy-demo-vault/tasks/task-review-quarterly-report.md`
- [ ] Verify output in all three modes
- [ ] Verify error handling for bad path

---

## Phase 6: Development Workflow

Set up everything needed for ongoing development.

### 6.1 Testing Infrastructure

- [ ] Set up `bun test` for TypeScript tests
- [ ] Set up `cargo test` for Rust tests
- [ ] Create npm scripts: `test`, `test:ts`, `test:rust`
- [ ] Add first integration test (show command against dummy vault)

### 6.2 Documentation

- [ ] Update `tdn-cli/README.md` with:
  - Development setup instructions
  - Build commands
  - Test commands
  - Architecture overview reference
- [ ] Document any decisions made during this task

### 6.3 Verify Checklist

Before marking complete:

- [ ] `bun run build` works
- [ ] `bun run test` passes
- [ ] `cargo test` passes in crates/core
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
