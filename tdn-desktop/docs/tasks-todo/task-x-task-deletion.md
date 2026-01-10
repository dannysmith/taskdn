# Task Deletion

## Overview

Implement the ability to delete tasks, with support for both moving to the OS trash/recycle bin and permanent deletion. The default behavior should be trash, configurable via user preferences.

## Requirements

### Delete Command

- Register as a command in the command system (see command registry docs)
- Available in: context menu, app menu, keyboard shortcut (`Cmd+Backspace` / `Ctrl+Backspace`) ONLY WHEN A TASK IS SELECTED.
- Command palette inclusion TBD at implementation time
- Only visible/enabled when one or more tasks are selected
- **No confirmation dialog** — relies on trash for recovery
- Supports single or multiple task deletion (if multi-select has been implemented yet)

### Default Behavior

- **Default**: Move task file(s) to OS trash/recycle bin

### Existing Behavior to Maintain
- **Escape on new task**: When user presses Escape while editing a newly created task's title, the newly created task is deleted. This should be a permanent deletion (not trash) since there's nothing meaningful to recover.

### User Preference

Add a preference toggle:
- **Setting**: "Permanently delete tasks instead of moving to trash"
- **Default**: Off (trash is default)
- When enabled, `Cmd+Backspace` permanently deletes instead of trashing

### Rust Backend Logging

When a task file is deleted or trashed, log:
- Task title
- Full file path
- Operation type (trashed vs permanently deleted)
- If trashed and available: new location in trash

Example log output:
```
INFO: Task trashed: "Fix login bug" | Path: /Users/danny/vault/tasks/fix-login-bug.md | Trash location: ~/.Trash/fix-login-bug.md
INFO: Task permanently deleted: "Untitled" | Path: /Users/danny/vault/tasks/untitled.md
```

---

## Research: Trash/Recycle Bin Implementation

### Tauri's Current State

**No official Tauri plugin exists for trash operations.**

There's an open feature request ([Issue #5680](https://github.com/tauri-apps/tauri/issues/5680)) proposing `trashFile`/`trashDir` functions similar to Electron's `trashItem`, but it remains in "Proposal" status with minimal engagement. A Tauri maintainer acknowledged the request and pointed to the `trash` crate as the existing solution.

The official Tauri File System plugin only offers permanent deletion via `remove()`.

### Recommended Solution: `trash` Crate

The [`trash`](https://github.com/Byron/trash-rs) crate is the standard Rust solution for cross-platform trash operations.

| Metric | Value |
|--------|-------|
| Version | 5.2.5 (Oct 2025) |
| Downloads | 1.2M+ all-time |
| License | MIT |
| Releases | 34 |
| Contributors | 31 |

#### API

```rust
// Cargo.toml
[dependencies]
trash = "5.2"

// Core operations
trash::delete("path/to/file")?;
trash::delete_all(&["file1", "file2"])?;

// Extended operations (Windows/Linux only, NOT macOS)
use trash::os_limited;
os_limited::list()?;            // Enumerate trash contents
os_limited::restore_all(items)?;
os_limited::purge_all(items)?;  // Permanent delete from trash
```

#### Platform Implementations

**macOS** — Two configurable methods via `TrashContextExtMacos` trait:
- `NSFileManager.trashItemAtURL` (default, fast, no permissions needed)
- Finder via AppleScript (enables "Put Back", slower, makes sound, requires permissions)
- Uses `objc2_foundation` for Objective-C bindings
- **Limitation**: Cannot implement `list()`, `restore_all()`, `purge_all()` — [open issue since 2019](https://github.com/Byron/trash-rs/issues/8)

**Windows** — COM/Shell APIs:
- `IFileOperation` with `FOF_ALLOWUNDO` flag
- Handles wide (UTF-16) paths, extended-length prefix stripping
- Full support for list/restore/purge operations
- Some failures reported with shared folders ([Issue #55](https://github.com/Byron/trash-rs/issues/55))

**Linux** — Freedesktop Trash Spec v1.0:
- Most complex implementation
- Handles mount points, cross-device moves, sticky bit validation
- `.Trash/<uid>` and `.Trash-<uid>` folder discovery
- Thread-safety concerns with `libc` mount functions (documented, mitigated with Mutex)
- Full support for list/restore/purge operations

#### Known Limitations

1. **macOS**: Cannot get trash location path or implement list/restore/purge
2. **Linux threading**: Documented undefined behavior risk with concurrent `getmntent` calls (protected by Mutex)
3. **Windows shared folders**: Some deletion failures reported
4. 12 open issues total, mostly enhancement requests

#### Why Use the Crate (Not Copy Code)

1. **Non-trivial complexity** — freedesktop.rs handles mount point detection, cross-device copies, URI encoding, atomic collision prevention. Windows needs COM lifecycle management.
2. **Active maintenance** — 34 releases means ongoing bug fixes and platform updates
3. **Well-tested** — 1.2M+ downloads across production apps
4. **MIT license** — No commercial use concerns
5. **Minimal dependencies** — Core deps: `log`, `libc`, `once_cell`, `scopeguard`, plus platform-specific bindings

### Suggested Rust Implementation

```rust
use std::path::PathBuf;
use trash;
use log::info;

#[tauri::command]
pub fn delete_task(path: PathBuf, title: String, permanent: bool) -> Result<(), String> {
    if permanent {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        info!(
            "Task permanently deleted: \"{}\" | Path: {}",
            title,
            path.display()
        );
    } else {
        trash::delete(&path).map_err(|e| e.to_string())?;
        // Note: Getting trash location is only possible on Windows/Linux via os_limited
        info!(
            "Task trashed: \"{}\" | Path: {}",
            title,
            path.display()
        );
    }
    Ok(())
}
```

Note: Logging the trash location is only possible on Windows and Linux via `trash::os_limited::list()`. On macOS, the trash location cannot be retrieved programmatically through this crate.

### References

- [Tauri Issue #5680 - Move to Trash Feature Request](https://github.com/tauri-apps/tauri/issues/5680)
- [trash-rs GitHub Repository](https://github.com/Byron/trash-rs)
- [trash crate Documentation (docs.rs)](https://docs.rs/trash)
- [Freedesktop Trash Specification v1.0](https://specifications.freedesktop.org/trash-spec/trashspec-1.0.html)
