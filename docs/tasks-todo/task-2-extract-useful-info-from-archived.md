# Task: Extract useful info from archived projects.

We spent a fair amount of time working on the Rust and TS SDKs archived in `archived-projects/` We're probably going to still need a Rust SDK to make building the Tauri app easier. And Rust has a major advantage that it is extremely fast at reading and writing files and at processing uh and parseing those files. However, our original plan to start with building the Rust SDK, then build TypeScript bindings, then build a CLI, is ridiculous. We're going to build the CLI first, so we have to now make some decisions on how we want to go about doing this.

I guess it feels to me that perhaps a sensible way of doing this would be to build the CLI using TypeScript, but with an underlying Rust engine inside of it, which deals with all of the um kind of lower level stuff. And then as we build that we can explore which parts of the CLI behavior should stay in the CLI layer and which parts it makes sense to push down into the Rust layer. That way we can end up with um a Rust system which is used by the CLI. And then perhaps we could extract that into a cargo package Which could then be used by both the CLI and the desktop app. The problem with this though is that I'd rather write the write the CLI in TypeScript because it'll be faster to build And easier to maintain. Which would mean some sort of bindings from tS to Rust. And now we're getting back into complicated territory here.

## Phase 1 - Explore Archived Projects

Uh what I want you to do in this task is firstly go and look at the two archived projects, fully explore them and how they work, and I want you to pick out any really valuable or important decisions that you think we made while building them specifically about things like efficiency um and safety and all of those things. What I'm really looking for here is any lessons or learnings or brilliant ideas we stumbled upon while we were developing those archived projects Which are gonna save us a whole load of thinking and effort and trial and error further down the line when we implement this time around. And then I'd like you to write those things to the end of this task doc. Use subagents if you need. Ultrathink

## Phase 2 - Research on approach

When you've done that I want you to think carefully about our options for how we progress from here in terms of developing the CLI in a way that it's still performant and it allows us to extract an SDK that we can use it in the desktop app later. You can research online with sub agents as much as you need. Ultrathink. let's really explore options so that we don't go down the wrong path again.

---

# Phase 1 Findings: Valuable Insights from Archived Projects

## Executive Summary

The archived Rust SDK (`taskdn-rust`) and TypeScript SDK (`taskdn-ts`) represent **production-quality, well-engineered code**. They were archived not due to technical flaws but because building SDKs before finalizing specifications and interface design was premature. The patterns, decisions, and learnings documented here will save significant time in future implementations.

---

## 1. Core Architectural Decisions Worth Preserving

### 1.1 Stateless Architecture
The SDK holds configuration but **not cached data**. Every query reads from disk. This:
- Allows consumers to implement caching optimal for their use cases
- CLI wants fresh reads; desktop apps might cache aggressively
- Simpler to reason about, fewer bugs from stale state

### 1.2 Path as Identifier
File paths are the primary identifier for all entities—no internal IDs. This aligns with how users naturally work with files and makes the system transparent.

### 1.3 Preserve What We Don't Understand
**Critical requirement**: Unknown frontmatter fields and the markdown body are preserved exactly on write. Users will extend the system with custom fields like `tags`, `priority`, `custom-field`. Round-trip fidelity is essential.

### 1.4 Errors, Not Panics
All fallible operations return `Result<T, Error>`. No `unwrap()` or `expect()` in library code. Essential for code that will be embedded in other applications.

### 1.5 Synchronous File I/O
Async provides no performance benefit for file operations on most OSes (`tokio::fs` uses `spawn_blocking` internally anyway). Simpler code, smaller binaries. Consumers can wrap in async contexts if needed.

---

## 2. Type System Design Patterns

### 2.1 The Double-Option Pattern for Updates
Distinguishes "don't change" from "explicitly clear":
```rust
pub struct TaskUpdates {
    // None = don't change, Some(x) = set to x
    pub title: Option<String>,

    // None = don't change, Some(None) = clear, Some(Some(x)) = set
    pub due: Option<Option<DateTimeValue>>,
}
```
Builder methods make this ergonomic:
```rust
TaskUpdates::new()
    .title("New title")  // Set
    .clear_project()     // Explicitly clear
```

### 2.2 Date/DateTime Format Preservation
`DateTimeValue` enum preserves user's original format:
```rust
pub enum DateTimeValue {
    Date(NaiveDate),        // YYYY-MM-DD
    DateTime(NaiveDateTime), // YYYY-MM-DDTHH:MM:SS
}
```
If user wrote `due: 2025-01-15`, we write back `due: 2025-01-15`, not `due: 2025-01-15T00:00:00`.

### 2.3 FileReference Format Preservation
```rust
pub enum FileReference {
    WikiLink { target: String, display: Option<String> },
    RelativePath(String),
    Filename(String),
}
```
`[[My Project]]` stays as `[[My Project]]`, not `my-project.md`.

### 2.4 Parsed vs Full Entity Separation
- `ParsedTask` = content-only (for parsing from string)
- `Task` = file path + content (for file operations)

This enables testing without filesystem access:
```rust
let parsed = ParsedTask::parse(content)?;
let task = parsed.with_path("/path/to/file.md");
```

### 2.5 Non-Exhaustive Enums
`#[non_exhaustive]` on status enums allows adding new statuses without breaking downstream binaries. Essential for forward compatibility.

---

## 3. Error Handling Excellence

### 3.1 Dual Error Variants for Context
```rust
#[error("failed to parse {}: {message}", path.display())]
Parse { path: PathBuf, message: String },

#[error("failed to parse content: {message}")]
ContentParse { message: String },
```
When parsing from file, include path. When parsing content directly (testing), omit path. Better error messages.

### 3.2 BatchResult for Partial Success
```rust
pub struct BatchResult<T> {
    pub succeeded: Vec<T>,
    pub failed: Vec<(PathBuf, Error)>,
}
```
Batch operations shouldn't abort entirely if one file has issues. Consumer decides how to handle partial success.

### 3.3 Skip Invalid Files in List Operations
`list_tasks()` silently skips unparseable files and returns valid ones. Use `validate_all_tasks()` for strict validation. A corrupted file shouldn't prevent users from seeing their other tasks.

---

## 4. Efficiency Patterns

### 4.1 Dependency Choices
| Dependency | Purpose | Why |
|------------|---------|-----|
| `gray_matter` 0.3 | Frontmatter + YAML parsing | Pure Rust, actively maintained, combines extraction + parsing |
| `rayon` | Parallel file parsing | Standard, lightweight data parallelism |
| `chrono` | Date/time handling | Mature, standard Rust choice |
| `thiserror` | Error type derivation | Cleaner than manual impl |

**Notably absent**: No async/tokio (unnecessary complexity), no SQLite (HashMap sufficient).

### 4.2 Performance Achieved
- Single file parse: **~8µs** (target <1ms) ✓
- 5,000 file scan (parallel): **200-500ms** ✓
- In-memory filter (1000 tasks): **~27µs** (target <5ms) ✓

### 4.3 Filter Implementation
AND between different fields, OR within status lists:
```rust
TaskFilter::new()
    .with_statuses([Ready, InProgress])  // Ready OR InProgress
    .in_project("[[Project A]]")          // AND in this project
    .due_before(today)                    // AND due before today
```
Unset fields don't constrain results. Intuitive and powerful.

---

## 5. API Design Patterns

### 5.1 Naming Conventions
| Pattern | Meaning |
|---------|---------|
| `get_*` | Fetch single item |
| `list_*` | Fetch multiple with filter |
| `create_*` | Create new, returns path |
| `update_*` | Modify existing |
| `delete_*` | Remove permanently |
| `*_for_*` | Get related items (`get_tasks_for_project`) |

### 5.2 Builder Pattern for Creation
```rust
NewTask::new("My task")
    .with_status(TaskStatus::Ready)
    .with_due("2025-01-15")
    .in_project("[[Project A]]")
```
Ergonomic, discoverable, extensible without breaking changes.

### 5.3 Event Processing Architecture
Separation of concerns:
```rust
// Core: interpret a change (always available)
fn process_file_change(&self, path: &Path, kind: FileChangeKind)
    -> Result<Option<VaultEvent>, Error>;

// Optional: bundled watcher (behind feature flag)
fn watch<F>(&self, callback: F) -> Result<FileWatcher, Error>;
```
Most consumers have their own file watching (Tauri, Obsidian, chokidar). SDK's value is interpreting changes into typed events.

---

## 6. Archive vs Status Distinction

A subtle but important distinction:

| Entity | "Archived" meaning |
|--------|-------------------|
| **Task** | Physical location: file is in `tasks/archive/` subdirectory |
| **Area** | Status value: `status: archived` in frontmatter |

Tasks use physical archiving because completed tasks are numerous. Areas use status because there are few of them.

---

## 7. Opt-in Directory Scanning

For projects/areas directories, the SDK supports opt-in behavior via `taskdn-type`:
- If ANY file has `taskdn-type: project`, only files with that field are included
- If no files have the field, all `.md` files are included (default)

**Use case**: Users can have mixed content (meeting notes, reference docs) alongside project files.

---

## 8. NAPI-RS Binding Insights (from TypeScript SDK)

### 8.1 NAPI-RS vs WASM
NAPI-RS was chosen over WASM because:
- **~45% faster** for CPU-bound operations
- **Full file system access** (essential for reading/writing task files)
- **Automatic TypeScript type generation** from `#[napi]` attributes

### 8.2 Thin Wrapper Principle
All business logic stayed in Rust. TypeScript layer only:
- Converted types between Rust and JavaScript
- Exposed API with JavaScript-friendly naming (camelCase)
- Generated type definitions

### 8.3 FileReference as Tagged Union
Rust enum exposed as object with `type` field:
```typescript
{ type: 'wikilink', target: 'Project Name' }
{ type: 'relativePath', path: './projects/file.md' }
{ type: 'filename', name: 'file.md' }
```

### 8.4 Multi-Platform Publishing
Platform-specific npm packages as optionalDependencies:
```
taskdn-sdk (main package)
├── taskdn-sdk-darwin-arm64
├── taskdn-sdk-darwin-x64
├── taskdn-sdk-linux-x64-gnu
└── taskdn-sdk-win32-x64-msvc
```
npm automatically installs only the binary for user's platform.

### 8.5 API Snapshot Testing
Snapshot test of generated `index.d.ts` catches unintended API changes. Essential for maintaining stability.

---

## 9. Clever Solutions to Tricky Problems

### 9.1 Filename Generation
Smart filename generation from titles:
- Lowercase, spaces to hyphens
- Remove special characters
- Collapse multiple hyphens
- **Truncate at word boundaries** (hyphen positions) when too long
- Fallback to "untitled" for garbage input

### 9.2 Extra Fields Serialization
Sort extra fields alphabetically for deterministic output—ensures consistent file diffs.

### 9.3 Smart Timestamp Updates
| Field | Behavior |
|-------|----------|
| `created_at` | Set on `create_task()` only |
| `updated_at` | Set on every `update_task()` |
| `completed_at` | Set when status becomes `Done` or `Dropped` |

### 9.4 YAML String Escaping
Comprehensive detection of characters requiring quoting (`:`, `#`, newlines, number-like strings), with proper escape sequences.

---

## 10. Testing Strategy Worth Preserving

### 10.1 Dummy Vault Pattern
Reset a `dummy-demo-vault` from canonical `demo-vault` before each test. Protects the canonical version while allowing destructive tests.

### 10.2 Test Organization
- Unit tests in-file (`#[cfg(test)]` modules)
- Integration tests in `tests/` directory using dummy vault
- Round-trip tests (parse → write → parse produces identical results)
- Benchmarks in `benches/` with criterion

### 10.3 API Snapshot Testing
Snapshot test of generated types catches breaking changes early.

---

## 11. Things That Could Be Improved

### 11.1 No Response Streaming
Returns full `Vec<Task>` even for large queries. Consider pagination or streaming for huge vaults.

### 11.2 YAML Comment Loss
`serde_yaml` limitation—comments in YAML frontmatter are not preserved. Unavoidable without custom parser.

### 11.3 No Transactional Guarantees
Individual file writes are atomic, but multi-file operations aren't transactional.

### 11.4 Option<Option<T>> Complexity
The double-option pattern works but can be confusing. JavaScript consumers had to use `undefined` vs `null` carefully.

---

## 12. Key Takeaways for Future Implementation

1. **Round-trip fidelity is critical**: Preserve unknown fields and formatting choices.

2. **Format preservation matters**: DateTimeValue and FileReference enums enable round-tripping without losing user choices.

3. **Stateless architecture scales**: Allows consumers to implement optimal caching.

4. **Builder patterns are worth the code**: Makes API discoverable and ergonomic.

5. **Separate parse from file concerns**: `ParsedTask` vs `Task` enables testing without filesystem.

6. **Smart type choices prevent bugs**: Double-option pattern prevents accidental field clears.

7. **Parallel file I/O matters**: Rayon parallelization makes 5000-file scans fast.

8. **Error context is essential**: Include path in error messages.

9. **Non-exhaustive enums enable evolution**: Adding new statuses won't break binaries.

10. **Feature gates keep dependencies minimal**: Optional watching via feature flag.

11. **Test against copies**: Dummy vault pattern prevents test pollution.

12. **Snapshot test APIs**: Catches breaking changes early.

---

## 13. Files to Reference

**Rust SDK (architecture patterns, type design, algorithms)**:
- Architecture guide: `archived-projects/taskdn-rust/docs/developer/architecture-guide.md`
- Type definitions: `archived-projects/taskdn-rust/src/types/`
- Parser: `archived-projects/taskdn-rust/src/parser.rs`
- Writer: `archived-projects/taskdn-rust/src/writer.rs`
- Filter implementation: `archived-projects/taskdn-rust/src/filter.rs`
- Benchmarks: `archived-projects/taskdn-rust/benches/benchmarks.rs`

**TypeScript SDK (NAPI-RS bindings, type conversion, testing)**:
- Binding code: `archived-projects/taskdn-ts/src/lib.rs`
- Type definitions: `archived-projects/taskdn-ts/index.d.ts`
- Tests: `archived-projects/taskdn-ts/tests/`
- Publishing docs: `archived-projects/taskdn-ts/docs/developer/npm-publishing.md`
