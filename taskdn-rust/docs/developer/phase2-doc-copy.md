# Phase 2: Rust SDK

Core library for parsing, querying, and manipulating task files.

## Context & Dependencies

```
                    ┌─────────────────────┐
                    │     Rust SDK        │  ← You are here
                    │  (taskdn-rust)      │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ TypeScript  │  │   Tauri     │  │   Other     │
     │ SDK (NAPI)  │  │  Desktop    │  │   Rust      │
     └──────┬──────┘  │  (direct)   │  │  consumers  │
            │         └─────────────┘  └─────────────┘
     ┌──────┴──────┐
     │  CLI (Bun)  │
     │  Obsidian   │
     └─────────────┘
```

**This is the foundation.** Everything else depends on this:

- **TypeScript SDK** wraps this via NAPI-RS
- **Tauri Desktop** imports this directly as a Cargo dependency
- **CLI and Obsidian Plugin** use the TypeScript SDK (which uses this)

No external dependencies on other Taskdn components.

---

## Scope

- Parse markdown files with YAML frontmatter
- Validate against the specification
- CRUD operations for tasks, projects, and areas
- Query/filter capabilities (by status, project, area, dates, etc.)
- Resolve file references (WikiLinks, relative paths, filenames)
- Preserve unknown frontmatter fields and markdown body when writing
- Expose safe, ergonomic APIs

---

## Technical Decisions

### Use `gray_matter` for Frontmatter Parsing

**Verified December 2025:** Use `gray_matter` v0.3.2

| Crate         | Status              | Notes                                   |
| ------------- | ------------------- | --------------------------------------- |
| `gray_matter` | **Use this**        | v0.3.2 (July 2025), actively maintained |
| `yaml-rust2`  | Used by gray_matter | Pure Rust YAML 1.2 parser               |
| `serde_yaml`  | **Deprecated**      | Archived March 2024                     |
| `serde_yml`   | **Avoid**           | Unmaintained, has unsoundness issues    |

**Why gray_matter:**

- Handles frontmatter extraction AND YAML parsing
- Uses `yaml-rust2` internally (pure Rust, no C bindings)
- Supports serde deserialization into custom structs
- ~24K downloads/month, actively maintained

### Use Synchronous File I/O

Async provides no performance benefit for file operations:

- Most OSes lack true async file APIs
- `tokio::fs` uses `spawn_blocking` internally anyway
- Simpler code, smaller binaries

Consumers (Tauri, NAPI) can wrap in async contexts if needed.

### SDK Initialization Pattern

Pass configuration once, not on every call:

```rust
pub struct TaskdnConfig {
    pub tasks_dir: PathBuf,
    pub projects_dir: PathBuf,
    pub areas_dir: PathBuf,
}

pub struct Taskdn {
    config: TaskdnConfig,
}

impl Taskdn {
    pub fn new(config: TaskdnConfig) -> Result<Self, Error>;

    pub fn list_tasks(&self) -> Result<Vec<Task>, Error>;
    pub fn get_task(&self, path: &Path) -> Result<Task, Error>;
    pub fn create_task(&self, task: &Task) -> Result<PathBuf, Error>;
    pub fn update_task(&self, path: &Path, updates: TaskUpdates) -> Result<(), Error>;
    // etc.
}
```

### Writing Files: Preserve Unknown Fields

Per the spec, implementations MUST preserve unknown frontmatter fields and the markdown body:

```rust
pub fn update_task(&self, path: &Path, updates: TaskUpdates) -> Result<(), Error> {
    // 1. Read existing file
    // 2. Parse frontmatter (keep raw YAML structure)
    // 3. Update only specified fields
    // 4. Preserve unknown fields
    // 5. Preserve markdown body exactly
    // 6. Write back
}
```

### Resolve File References

The SDK should resolve WikiLinks and paths to actual file paths:

```rust
impl Taskdn {
    /// Resolves "[[Project Name]]", "./projects/foo.md", or "foo.md"
    /// to an actual PathBuf within the configured directories
    pub fn resolve_reference(&self, reference: &str) -> Result<PathBuf, Error>;
}
```

### File Watching: Optional / Consumer's Choice

Don't bake file watching deep into the SDK:

- Provide parsing/writing functions
- Let consumers (Tauri, CLI) manage their own watchers if needed
- CLI doesn't need watching (run → exit)
- Tauri has its own plugin ecosystem

---

## Dependencies

```toml
[dependencies]
# Frontmatter parsing (includes yaml-rust2)
gray_matter = "0.3"
serde = { version = "1", features = ["derive"] }

# File watching (optional)
notify = "8"
notify-debouncer-mini = "*"

# Utilities
thiserror = "1"
rayon = "1"  # Parallel file parsing
```

---

## Project Structure

```
taskdn-rust/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── config.rs       # TaskdnConfig
    ├── task.rs         # Task struct, parsing, validation
    ├── project.rs      # Project struct
    ├── area.rs         # Area struct
    ├── parser.rs       # Frontmatter extraction via gray_matter
    ├── writer.rs       # File writing with field preservation
    ├── reference.rs    # WikiLink/path resolution
    └── error.rs        # Error types
```

---

## Performance Targets

For a vault with 5,000 tasks:

- **Single file parse:** <1ms
- **Full vault scan (parallel with rayon):** ~200-500ms
- **Query by status (in-memory filter):** <5ms

In-memory `HashMap` is sufficient. No SQLite needed.

---

## Key Requirements

- Must be **extremely** performant (hence Rust)
- Strong type system matching the spec exactly
- Efficient batch operations across multiple files
- Memory-efficient for large numbers of files
- Automatic `updated-at` timestamp updates on writes
- Automatic `completed-at` timestamp when status changes to `done` or `dropped`
- Shippable as a cargo package (not a standalone executable - that's the CLI's job)

---

## Notes

- Soft deletion: Move completed/dropped tasks to archive subdirectory
- Error handling: Return `Result` everywhere, let consumers decide how to handle invalid files
- The spec is the source of truth: `docs/user-guide/2-the-specification.md`
- JSON schemas for validation are in `docs/schemas/`
