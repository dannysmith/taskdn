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

| Package | Purpose |
|---------|---------|
| `commander` | CLI framework |
| `@commander-js/extra-typings` | TypeScript type inference for Commander |
| `@clack/prompts` | Interactive prompts + spinner |
| `ansis` | Terminal colors and text formatting |

Total: 4 packages (minimal dependency footprint)

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
- [ ] Initialize `package.json` with Bun (`bun init`)
- [ ] Initialize Rust workspace with `cargo init --lib crates/core`
- [ ] Create `.gitignore` covering both Node and Rust artifacts

### 2.2 TypeScript Dependencies

Install the libraries decided in Phase 1:

```bash
# Runtime dependencies
bun add commander @commander-js/extra-typings @clack/prompts ansis

# Dev dependencies (types, etc.)
bun add -d @types/node
```

- [ ] Install Commander.js and extra-typings for CLI framework
- [ ] Install @clack/prompts for interactive prompts and spinners
- [ ] Install ansis for terminal colors and formatting
- [ ] Verify all packages install correctly with Bun

### 2.3 TypeScript Configuration

- [ ] Create `tsconfig.json` with strict mode, appropriate target
- [ ] Configure path aliases if useful (e.g., `@/` for `src/`)
- [ ] Set up for Bun runtime (check Bun-specific tsconfig options)

### 2.4 Rust Configuration

- [ ] Set up `Cargo.toml` with initial dependencies:
  - `napi` and `napi-derive` for bindings
  - `thiserror` for errors
  - `serde` for serialization
- [ ] Configure for library output with cdylib target
- [ ] Set up `build.rs` if needed for NAPI

### 2.5 Ancillary Tooling Setup [MANUAL BY USER]

- [ ] Set up Prettier, ESLint, and Clippy
- [ ] Set up commands to run formatters, including `check:all` command
- [ ] Initialize CLAUDE.md, README.md, docs/ etc

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
import { helloFromRust } from '../bindings'
console.log(helloFromRust())
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
