# Claude Instructions for taskdn-rust

See @docs/ for full documentation.
See @docs/tasks.md for instructions on task management.
See `../docs/user-guide/1-philosophy.md` and `../docs/user-guide/2-the-specification.md` for details of the overall specification and project (will be outside project root if we're working in `taskdn-rust/`).

## Project Overview

Rust library for parsing, querying, and manipulating Taskdn task files.

## Core Rules

### New Sessions

- Read @docs/tasks.md for task management
- Review `docs/developer/architecture-guide.md` for essential patterns
- Consult specialized guides when working on specific features
- Check git status and project structure

### Development Practices

**CRITICAL:** Follow these strictly:

1. **Read Before Editing**: Always read files first to understand context
2. **Follow Established Patterns**: Use patterns from this file and `docs/developer`
3. **Senior Architect Mindset**: Consider performance, maintainability, testability

---

## Rust Code Standards

This is a **library crate**, not a binary. All code must be suitable for consumption by other Rust code, NAPI-RS bindings, and Tauri.

### Error Handling

**No panics in library code.** Return `Result<T, Error>` for all fallible operations.

```rust
// ❌ NEVER in library code
let value = something.unwrap();
let value = something.expect("msg");

// ✅ Propagate errors
let value = something?;

// ✅ Or handle explicitly
let value = match something {
    Ok(v) => v,
    Err(e) => return Err(e.into()),
};
```

**Exception:** `unwrap()` is acceptable in:
- Tests
- Cases where the invariant is guaranteed by construction (add a comment explaining why)

Use `thiserror` for error types. Each error variant should contain enough context to be actionable:

```rust
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("failed to parse frontmatter in {path}: {source}")]
    ParseError { path: PathBuf, source: yaml_rust2::ScanError },

    #[error("missing required field '{field}' in {path}")]
    MissingField { path: PathBuf, field: &'static str },
}
```

### API Design

Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/). Key points:

**Naming conventions:**
- `as_*` — cheap reference-to-reference conversion (borrows, no allocation)
- `to_*` — expensive conversion (may allocate)
- `into_*` — takes ownership, returns owned type

**Function parameters:**
```rust
// For paths - accept anything path-like
fn read_task(path: impl AsRef<Path>) -> Result<Task, Error>

// For strings you'll only read
fn parse(content: &str) -> Result<Task, Error>

// For strings you need to own/store
fn new(title: impl Into<String>) -> Self
```

**Return types:**
- Return `&str` not `&String`
- Return `&[T]` not `&Vec<T>`
- Use `Option<T>` for optional values, not sentinel values

**Implement standard traits** on all public types:
- `Debug` — always (required for good error messages)
- `Clone` — unless there's a reason not to
- `PartialEq, Eq` — for value types
- `Default` — when there's a sensible default
- `Display` — for types users might want to print

Use `#[must_use]` on functions where ignoring the return value is likely a bug.

**Document all public items:**
```rust
/// Parses a task file from its content string.
///
/// # Errors
/// Returns `Error::MissingField` if required frontmatter fields are absent.
/// Returns `Error::ParseError` if the YAML frontmatter is malformed.
pub fn parse_task(content: &str) -> Result<Task, Error>
```

### Common Patterns

**Prefer iterators over index loops:**
```rust
// ❌
for i in 0..vec.len() {
    process(&vec[i]);
}

// ✅
for item in &vec {
    process(item);
}
```

**Use `?` with `Option` in functions returning `Option`:**
```rust
fn get_title(&self) -> Option<&str> {
    let frontmatter = self.frontmatter.as_ref()?;
    frontmatter.title.as_deref()
}
```

**Avoid premature `collect()`:**
```rust
// ❌ Allocates intermediate Vec
let filtered: Vec<_> = items.iter().filter(|x| x.valid).collect();
for item in filtered { ... }

// ✅ Lazy evaluation
for item in items.iter().filter(|x| x.valid) { ... }
```

### Clippy

We use strict clippy settings. The `Cargo.toml` should include:

```toml
[lints.clippy]
pedantic = { level = "warn", priority = -1 }
unwrap_used = "warn"
expect_used = "warn"
```

When you must silence a lint, add a comment explaining why:
```rust
#[allow(clippy::unwrap_used)] // Safe: regex is compile-time constant
static WIKILINK_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"...").unwrap());
```

### Testing

**TDD approach:** Write failing tests before implementation.

Structure:
- Unit tests in the same file as the code (`#[cfg(test)]` module)
- Integration tests in `tests/` directory
- Test helpers in `tests/common/mod.rs` if needed

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_task() {
        let content = r#"---
title: Test
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
---
Body content
"#;
        let task = parse_task(content).unwrap();
        assert_eq!(task.title, "Test");
    }

    #[test]
    fn parse_missing_required_field_returns_error() {
        let content = "---\nstatus: inbox\n---"; // missing title, created-at, updated-at
        assert!(parse_task(content).is_err());
    }
}
```

### Performance

Per phase2 doc targets:
- Single file parse: <1ms
- 5000 file scan (parallel): 200-500ms
- Query (in-memory): <5ms

Use `rayon` for parallel file operations. Avoid unnecessary allocations in hot paths.
