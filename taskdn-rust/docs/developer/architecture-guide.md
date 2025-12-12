# taskdn-rust Architecture Guide

This document explains the design philosophy and key patterns of the `taskdn-rust` library. For exhaustive API details, see the rustdoc documentation (`cargo doc --open`).

---

## Overview

`taskdn-rust` is a library crate for working with Taskdn's markdown-based task management system. It provides parsing, querying, and CRUD operations for task/project/area files.

### Consumers

- **TypeScript SDK** — Via NAPI-RS bindings
- **Tauri Desktop App** — Direct Cargo dependency
- **CLI** — Via TypeScript SDK
- **Other Rust consumers**

---

## Design Philosophy

### 1. Stateless

The SDK holds configuration, not cached data. Every query reads from disk. Consumers manage their own caching and in-memory state.

**Why:** Different consumers have different caching needs. A CLI wants fresh reads; a desktop app might cache aggressively. By staying stateless, we don't impose a caching strategy.

### 2. Path as Identifier

File paths are the primary identifier for all entities. There are no internal IDs.

**Why:** Users manage these files directly in their filesystem and editors. Paths are the natural identifier they understand and work with.

### 3. Explicit Over Implicit

Operations do exactly what they say. The only hidden side effects are documented automatic timestamp updates (`created_at`, `updated_at`, `completed_at`).

### 4. Preserve What We Don't Understand

Unknown frontmatter fields and the markdown body are preserved exactly on write.

**Why:** Users customize their files with fields like `tags`, `priority`, `custom-field`. We must not lose this data. Round-trip fidelity is critical.

### 5. Errors, Not Panics

All fallible operations return `Result<T, Error>`. No `unwrap()` or `expect()` in library code. This is a hard requirement for library code that will be embedded in other applications.

### 6. Extensible Without Breaking

Use `#[non_exhaustive]` on enums and `Default` on structs so new fields/variants can be added without breaking downstream code.

---

## Key Patterns

### The Three Entity Types

Tasks, Projects, and Areas all follow the same patterns:

| Concept | Pattern |
|---------|---------|
| Parsed entity | `Task`, `Project`, `Area` |
| Content-only parse result | `ParsedTask`, `ParsedProject`, `ParsedArea` |
| Creation data | `NewTask`, `NewProject`, `NewArea` |
| Partial updates | `TaskUpdates`, `ProjectUpdates`, `AreaUpdates` |
| Query filter | `TaskFilter`, `ProjectFilter`, `AreaFilter` |

Once you understand one entity type, the others work identically.

### Parsed vs Full Entity

We separate "parsed content" from "entity with path":

```rust
// Parse content from any source (string, stream, etc.)
let parsed = ParsedTask::parse(content)?;

// Associate with a path to get a full entity
let task = parsed.with_path("/path/to/file.md");
```

**Why:** `Task` always represents a file on disk with a valid path. `ParsedTask` is for parsing content from any source (testing, streaming, etc.) without requiring a filesystem.

### The Double-Option Pattern for Updates

Updates use `Option<Option<T>>` to distinguish "don't change" from "set to None":

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
    .title("New title")     // Set title
    .due(some_date)         // Set due date
    .clear_project()        // Clear project (set to None)
```

### Date vs DateTime Preservation

The spec allows both date (`YYYY-MM-DD`) and datetime (`YYYY-MM-DDTHH:MM:SS`) formats. We preserve the original format for round-tripping:

```rust
pub enum DateTimeValue {
    Date(NaiveDate),
    DateTime(NaiveDateTime),
}
```

**Why:** If a user wrote `due: 2025-01-15`, we write back `due: 2025-01-15`, not `due: 2025-01-15T00:00:00`.

### FileReference Format Preservation

References to other files can be WikiLinks, relative paths, or bare filenames:

```rust
pub enum FileReference {
    WikiLink { target: String, display: Option<String> },
    RelativePath(String),
    Filename(String),
}
```

**Why:** We preserve the format the user chose. `[[My Project]]` stays as `[[My Project]]`, not `my-project.md`.

### Filter Semantics

Filters use AND between different fields, OR within lists:

```rust
TaskFilter::new()
    .with_statuses([Ready, InProgress])  // Ready OR InProgress
    .in_project("[[Project A]]")          // AND in this project
    .due_before(today)                    // AND due before today
```

Unset fields don't constrain results (None means "don't filter on this").

---

## Archive: Physical vs Logical

This is a subtle distinction that matters:

| Entity | "Archived" meaning |
|--------|-------------------|
| Task | **Physical location:** file is in `tasks/archive/` subdirectory |
| Area | **Status value:** `status: archived` in frontmatter |

Tasks use physical archiving because completed tasks are often numerous and users want them out of the main directory. Areas use status because there are few of them and physical location doesn't matter.

---

## Opt-in Directory Scanning

For projects and areas directories, the SDK supports opt-in behavior via `taskdn-type`:

- If ANY file in `projects/` has `taskdn-type: project`, only files with that field are included in `list_projects()`
- Same pattern for areas with `taskdn-type: area`
- If no files have the field, all `.md` files are included (default)

**Use case:** Users can have mixed content (meeting notes, reference docs) alongside project files without pollution.

---

## Error Handling Philosophy

### Single Operations → Result

```rust
fn get_task(&self, path: impl AsRef<Path>) -> Result<Task, Error>;
```

### Batch Operations → BatchResult

For operations that can partially succeed:

```rust
pub struct BatchResult<T> {
    pub succeeded: Vec<T>,
    pub failed: Vec<(PathBuf, Error)>,
}
```

**Why:** Batch updates shouldn't abort entirely if one file has issues. The consumer decides how to handle partial success.

### List Operations → Skip Invalid

`list_tasks()` silently skips unparseable files and returns valid ones. Use `validate_all_tasks()` for strict validation.

**Why:** A corrupted file shouldn't prevent users from seeing their other tasks.

---

## File Change Processing

The SDK separates "file watching" from "change interpretation":

```rust
// Core API: interpret a change (always available)
fn process_file_change(&self, path: &Path, kind: FileChangeKind)
    -> Result<Option<VaultEvent>, Error>;

// Optional: bundled watcher (behind "watch" feature)
fn watch<F>(&self, callback: F) -> Result<FileWatcher, Error>;
```

**Why:** Most consumers already have file watching (Tauri, Obsidian, chokidar). The SDK's value is interpreting changes into typed events, not raw watching. The bundled watcher is for consumers without existing infrastructure.

---

## Automatic Timestamp Management

| Field | Behavior |
|-------|----------|
| `created_at` | Set on `create_task()` |
| `updated_at` | Set on every `update_task()` |
| `completed_at` | Set when status becomes `Done` or `Dropped` |

The SDK never modifies the markdown body or unknown frontmatter fields.

---

## Naming Conventions

| Pattern | Meaning |
|---------|---------|
| `get_*` | Fetch single item |
| `list_*` | Fetch multiple with filter |
| `create_*` | Create new, returns path |
| `update_*` | Modify existing |
| `delete_*` | Remove permanently |
| `*_for_*` | Get related items (`get_tasks_for_project`) |

---

## Module Structure

```
src/
├── lib.rs           # Public API, re-exports
├── config.rs        # TaskdnConfig
├── error.rs         # Error, BatchResult
├── types/           # Entity types (Task, Project, Area)
├── filter.rs        # Filters and matching logic
├── parser.rs        # Frontmatter parsing
├── writer.rs        # File writing with preservation
├── events.rs        # VaultEvent, process_file_change
├── watcher.rs       # FileWatcher (watch feature)
├── operations/      # SDK method implementations
└── validation.rs    # ValidationWarning
```

---

## Performance

| Operation | Target | Notes |
|-----------|--------|-------|
| Single file parse | <1ms | Actually ~8µs |
| 5,000 file scan | 200-500ms | Parallel via rayon |
| In-memory filter | <5ms | Actually ~27µs for 1000 tasks |

The SDK uses `rayon` for parallel file parsing in list operations. File paths are collected first, then parsed in parallel.

---

## Testing Strategy

- **Unit tests:** In each module's `#[cfg(test)]` block
- **Integration tests:** In `tests/` using `dummy-demo-vault`
- **Round-trip tests:** Parse → write → parse produces identical results
- **Benchmarks:** In `benches/` using criterion

Test against the demo vault which covers all spec scenarios.
