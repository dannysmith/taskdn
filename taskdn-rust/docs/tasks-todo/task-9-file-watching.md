# Task 9: File Watching (Optional Feature)

Implement optional file watching capability using `notify`.

**Status: OPTIONAL** - This may be deferred to consumers (Tauri, CLI). Decision pending.

## Scope

### File Watcher Module (`src/watcher.rs`)
- [ ] Write failing tests for file change detection
- [ ] Implement file watcher using `notify` crate
- [ ] Debounce rapid changes using `notify-debouncer-mini`
- [ ] Emit events for create, modify, delete, rename
- [ ] Watch tasks_dir, projects_dir, areas_dir
- [ ] Filter to only `.md` files
- [ ] Provide callback-based API

## API Design

```rust
pub struct FileWatcher {
    // ...
}

pub enum FileEvent {
    Created(PathBuf),
    Modified(PathBuf),
    Deleted(PathBuf),
    Renamed { from: PathBuf, to: PathBuf },
}

impl Taskdn {
    pub fn watch<F>(&self, callback: F) -> Result<FileWatcher, Error>
    where
        F: Fn(FileEvent) + Send + 'static;
}

impl FileWatcher {
    pub fn stop(self);
}
```

## Cargo Feature Flag

```toml
[features]
default = []
watch = ["notify", "notify-debouncer-mini"]

[dependencies]
notify = { version = "8", optional = true }
notify-debouncer-mini = { version = "*", optional = true }
```

## Arguments For Including

- Consumers (Tauri, CLI) would all need to implement this anyway
- Unified behavior across all consumers
- Tested once, used everywhere

## Arguments Against

- Adds complexity and dependencies
- Different consumers may have different needs (debounce timing, etc.)
- Tauri has its own plugin ecosystem
- CLI doesn't need watching at all

## Notes

- If implemented, make it an optional feature flag
- The core SDK should work fine without watching
- Consider providing just the building blocks, not a complete solution
