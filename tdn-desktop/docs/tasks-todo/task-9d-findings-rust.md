# Clean Code Review: Phase 1 - Rust Backend

**Date:** 2026-01-16
**Scope:** `src-tauri/src/` - All Rust backend code

## Summary

The Rust codebase is generally well-structured with good documentation, comprehensive test coverage, and consistent error handling patterns. The code follows established Rust idioms and makes good use of modern features like `LazyLock`, `inspect_err`, and proper `#[cfg]` attributes for platform-specific code. Most functions are appropriately sized and focused. The main areas for improvement are a few longer functions that could benefit from extraction, some scattered `unwrap()`/`expect()` calls, and minor opportunities to reduce code duplication.

## Critical Findings

_None identified._ The codebase demonstrates sound engineering practices with no critical issues affecting correctness, security, or maintainability.

## Moderate Findings

### 1. Long `run()` Function with Multiple Responsibilities

**Location:** `src-tauri/src/lib.rs:21-236` (~215 lines)
**Issue:** The main `run()` function handles plugin registration, app setup, and event handling in a single large function. While each section is logically grouped with comments, the function does several distinct things: plugin configuration, setup callback, and run event handling.
**Principle:** Functions should do one thing (Single Responsibility)
**Suggestion:** Consider extracting the plugin registration into a helper like `configure_plugins(builder: Builder) -> Builder` and the setup callback into `setup_app(app: &App) -> Result<(), Box<dyn Error>>`. This would make `run()` a high-level orchestrator:

```rust
pub fn run() {
    let builder = bindings::generate_bindings();
    export_bindings_if_dev();

    let app_builder = configure_plugins(tauri::Builder::default());

    app_builder
        .setup(setup_app)
        .invoke_handler(builder.invoke_handler())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(handle_run_event);
}
```

---

### 2. Nested Loop with Magic Number in Recovery Cleanup

**Location:** `src-tauri/src/commands/recovery.rs:126-206` (~80 lines)
**Issue:** The `cleanup_old_recovery_files()` function has a deeply nested loop with multiple `match` statements and uses a magic number `7` for the day count.
**Principle:** Avoid deep nesting; replace magic numbers with named constants
**Suggestion:**

1. Extract the constant: `const RECOVERY_FILE_RETENTION_DAYS: u64 = 7;`
2. Extract the age-checking logic into a helper function:

```rust
const RECOVERY_FILE_RETENTION_DAYS: u64 = 7;

fn is_file_older_than_days(path: &Path, days: u64) -> Option<bool> {
    let metadata = std::fs::metadata(path).ok()?;
    let modified = metadata.modified().ok()?;
    let modified_secs = modified.duration_since(UNIX_EPOCH).ok()?.as_secs();
    let cutoff = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_secs()
        .saturating_sub(days * 24 * 60 * 60);
    Some(modified_secs < cutoff)
}
```

This would significantly simplify the main loop body.

---

### 3. `unwrap()` on ThreadPoolBuilder in Scanner

**Location:** `src-tauri/src/vault/scanner.rs:192-195`
**Issue:** Uses `.unwrap()` on the thread pool builder, which could panic if thread pool creation fails (unlikely but possible under resource constraints).
**Principle:** Avoid `unwrap()` in production code paths
**Suggestion:** Handle the error gracefully or at minimum use `expect()` with a descriptive message:

```rust
let pool = rayon::ThreadPoolBuilder::new()
    .num_threads(MAX_PARALLEL_THREADS)
    .build()
    .expect("Failed to create thread pool for vault scanning");
```

Or better, return an empty Vec with a warning log if pool creation fails.

---

### 4. Duplicated Status-to-String Conversion Logic

**Location:**

- `src-tauri/src/vault/writer.rs:229-237` (TaskStatus in `create_task_file`)
- `src-tauri/src/vault/writer.rs:482-490` (TaskStatus in `update_task`)
- `src-tauri/src/vault/writer.rs:323-330` (ProjectStatus in `create_project_file`)
- `src-tauri/src/vault/writer.rs:576-583` (ProjectStatus in `update_project`)

**Issue:** The same `match` statements converting `TaskStatus`/`ProjectStatus` enums to kebab-case strings are duplicated across 4 locations.
**Principle:** DRY (Don't Repeat Yourself) - Needless Repetition is a code smell
**Suggestion:** Add a method to the status enums:

```rust
impl TaskStatus {
    pub fn as_kebab_str(&self) -> &'static str {
        match self {
            TaskStatus::Inbox => "inbox",
            TaskStatus::Icebox => "icebox",
            TaskStatus::Ready => "ready",
            TaskStatus::InProgress => "in-progress",
            TaskStatus::Blocked => "blocked",
            TaskStatus::Dropped => "dropped",
            TaskStatus::Done => "done",
        }
    }
}
```

Then use `status.as_kebab_str()` throughout the codebase.

---

### 5. Repeated Read-Lock Pattern in `get_entity_raw_content`

**Location:** `src-tauri/src/vault/manager.rs:382-418`
**Issue:** The function acquires three separate read locks (`self.inner.read()`) with identical patterns for task/project/area. Each lock is acquired and released separately within the match arms.
**Principle:** Reduce cognitive complexity; prefer single acquisition patterns
**Suggestion:** Acquire the lock once and use a match to extract the path:

```rust
pub fn get_entity_raw_content(&self, entity_type: &str, id: &str) -> Result<String, VaultError> {
    self.ensure_configured()?;

    let inner = self.inner.read();
    let path = match entity_type {
        "task" => inner.index.get_task(id).map(|t| t.path.clone()),
        "project" => inner.index.get_project(id).map(|p| p.path.clone()),
        "area" => inner.index.get_area(id).map(|a| a.path.clone()),
        _ => return Err(VaultError::validation_error(
            "entity_type",
            format!("Unknown entity type: {entity_type}"),
        )),
    };
    drop(inner); // Release lock before file I/O

    let entity_type_display = entity_type.to_title_case(); // Or simple match
    let path = path.ok_or_else(|| VaultError::entity_not_found(entity_type_display, id))?;

    std::fs::read_to_string(&path).map_err(|e| VaultError::read_error(&path, e.to_string()))
}
```

## Minor Findings

### 1. `expect()` in Development-Only Path

**Location:** `src-tauri/src/commands/config.rs:72`
**Issue:** Uses `expect("Failed to find repo root")` which could panic. While this is only in debug builds, it's still preferable to handle gracefully.
**Principle:** Explicit error handling over panics
**Suggestion:** Consider returning empty paths with a warning log if repo root cannot be found, similar to the release build behavior.

---

### 2. `VaultDirs` Struct Location

**Location:** `src-tauri/src/commands/preferences.rs:33-38`
**Issue:** The `VaultDirs` struct is defined in `preferences.rs` but is conceptually a type that could belong with other shared types.
**Principle:** Code organization - related types should be co-located
**Suggestion:** Consider moving `VaultDirs` to `types.rs` for consistency with other shared types like `AppPreferences`. However, since it's only used internally within preferences loading, the current location is acceptable.

---

### 3. Long Functions in `writer.rs`

**Location:**

- `create_task_file`: lines 208-300 (~92 lines)
- `update_task`: lines 471-562 (~91 lines)
- `update_project`: lines 565-648 (~83 lines)

**Issue:** These functions are longer than typical clean code guidelines suggest (~50 lines for Rust).
**Principle:** Functions should be small
**Assessment:** These functions follow a clear linear flow (build frontmatter, set fields, serialize, write) and are not complex. The length is primarily due to the many optional fields being handled. Splitting them would likely make the code harder to follow, not easier. **This is acceptable per the "don't be dogmatic" guideline** - the functions have good internal structure and clear purpose.

---

### 4. Commented Code Note

**Location:** None found
**Assessment:** The codebase is clean of commented-out code. Good practice observed.

---

### 5. TODO/FIXME Comments

**Location:** None found in Rust code
**Assessment:** No technical debt markers found in the Rust codebase.

## Observations

### Patterns Done Well

1. **Atomic File Operations**: All file writes use the atomic write pattern (temp file + rename), preventing corruption. This is consistently implemented across `preferences.rs`, `recovery.rs`, and `vault/writer.rs`.

2. **Error Handling Consistency**: The codebase uses a consistent pattern of typed errors (`VaultError`, `RecoveryError`, `CliConfigError`) with builder methods and proper `Display` implementations.

3. **Modern Rust Idioms**: Good use of:
   - `LazyLock` for static regex (types.rs:16)
   - `inspect_err` for logging errors (preferences.rs:66)
   - `is_none_or` for clean conditional checks (recovery.rs:161)
   - Modern format strings `"{variable}"` throughout

4. **RAII Pattern**: The `WriteFlagGuard` in manager.rs (lines 601-616) demonstrates proper RAII for ensuring the write flag is always reset, even on panic.

5. **Security Measures**: Well-documented security constants (`MAX_FILES_PER_SCAN`, `MAX_PARALLEL_THREADS`) and input validation throughout.

6. **Test Coverage**: Most modules have comprehensive unit tests covering happy paths, edge cases, and error conditions.

7. **Platform-Specific Code**: Clean use of `#[cfg]` attributes for platform-specific behavior (quick_pane.rs, manager.rs).

8. **Documentation**: Module-level doc comments explain purpose and design decisions. Public API is well-documented.

### Architectural Notes

- The separation between internal frontmatter structs (kebab-case for YAML) and public structs (camelCase for TypeScript) in `entities.rs` is a good pattern for handling serialization differences.

- The event-driven bridge between Rust and React (VAULT_CHANGED_EVENT) is well-implemented with proper debouncing.

- The module structure (commands/, vault/, utils/) provides clear separation of concerns.

## Files Reviewed

- [x] `lib.rs` - Main entry point, plugin setup (~237 lines)
- [x] `main.rs` - Minimal launcher (~7 lines)
- [x] `types.rs` - Shared types and validation (~453 lines)
- [x] `bindings.rs` - Tauri-specta bindings (~69 lines)
- [x] `commands/mod.rs` - Module exports (~12 lines)
- [x] `commands/preferences.rs` - Preferences management (~150 lines)
- [x] `commands/recovery.rs` - Emergency data recovery (~207 lines)
- [x] `commands/config.rs` - CLI config and app info (~94 lines)
- [x] `commands/quick_pane.rs` - Quick pane window management (~408 lines)
- [x] `commands/notifications.rs` - Native notifications (~47 lines)
- [x] `commands/vault.rs` - Vault CRUD commands (~181 lines)
- [x] `vault/mod.rs` - Vault module exports (~34 lines)
- [x] `vault/error.rs` - Vault error types (~321 lines)
- [x] `vault/scanner.rs` - File scanning infrastructure (~535 lines)
- [x] `vault/wikilink.rs` - WikiLink parsing utilities (~193 lines)
- [x] `vault/manager.rs` - VaultManager with file watching (~1004 lines)
- [x] `vault/entities.rs` - Entity structs and types (~391 lines)
- [x] `vault/writer.rs` - File writing with round-trip fidelity (~923 lines)
- [x] `utils/mod.rs` - Utility module exports (~4 lines)
- [x] `utils/platform.rs` - Cross-platform utilities (~136 lines)

**Total:** 20 files, ~5,416 lines of Rust code reviewed
