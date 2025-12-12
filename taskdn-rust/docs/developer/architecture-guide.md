# taskdn-rust Architecture Guide

## Overview

`taskdn-rust` is a library crate that provides the core functionality for working with Taskdn's markdown-based task management system. It is designed to be consumed by:

- **TypeScript SDK** via NAPI-RS bindings
- **Tauri Desktop App** as a direct Cargo dependency
- **Other Rust consumers**

## Design Principles

1. **No panics in library code** - All fallible operations return `Result<T, Error>`
2. **Synchronous I/O** - Simpler code, consumers can wrap in async if needed
3. **Preserve unknown fields** - When writing files, preserve any fields not in the spec
4. **Performance first** - Target <1ms for single file parse, ~200-500ms for 5000 files

## Module Structure

```
src/
├── lib.rs        # Public API, Taskdn struct
├── config.rs     # TaskdnConfig - paths to task/project/area directories
├── error.rs      # Error enum using thiserror
├── task.rs       # Task struct, TaskStatus enum, validation
├── project.rs    # Project struct, ProjectStatus enum
├── area.rs       # Area struct
├── parser.rs     # Frontmatter extraction using gray_matter
├── writer.rs     # File writing with field preservation
└── reference.rs  # WikiLink and path resolution
```

## Key Types

### `Taskdn`

The main entry point. Constructed with a `TaskdnConfig`, provides methods like:
- `list_tasks()` - List all tasks in the tasks directory
- `get_task(path)` - Read and parse a single task
- `create_task(task)` - Create a new task file
- `update_task(path, updates)` - Update specific fields in a task

### `TaskdnConfig`

Configuration passed at initialization:
- `tasks_dir: PathBuf` - Directory containing task files
- `projects_dir: PathBuf` - Directory containing project files
- `areas_dir: PathBuf` - Directory containing area files

### `Error`

All errors in the library. Variants include:
- `ReadFile` / `WriteFile` - I/O errors
- `ParseFrontmatter` - YAML parsing failures
- `MissingField` - Required field not present
- `InvalidField` - Field value doesn't match spec
- `UnresolvedReference` - WikiLink or path couldn't be resolved
- `PathNotFound` / `NotADirectory` - Configuration errors

## Dependencies

| Crate | Purpose |
|-------|---------|
| `gray_matter` | Frontmatter extraction and YAML parsing |
| `serde` | Serialization/deserialization |
| `thiserror` | Error type derivation |
| `rayon` | Parallel file processing |

## Error Handling

Use `thiserror` for all error types. Every error should contain enough context to be actionable:

```rust
#[error("failed to parse frontmatter in {path}: {message}")]
ParseFrontmatter { path: PathBuf, message: String }
```

No `unwrap()` or `expect()` in library code except where invariants are guaranteed by construction.

## Testing Strategy

- **Unit tests** - In each module's `#[cfg(test)]` section
- **Integration tests** - In `tests/` directory, use `dummy-demo-vault`
- **Property-based tests** - Consider for parsing/writing roundtrips

## Performance Considerations

- Use `rayon` for parallel file scanning
- Avoid unnecessary allocations in hot paths
- Prefer iterators over collecting into intermediate `Vec`s
- Target: single file parse <1ms, 5000 files ~200-500ms
