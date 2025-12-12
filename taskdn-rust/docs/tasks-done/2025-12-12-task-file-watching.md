# Task 9: File Change Processing & Optional Watching

Provide tools for consumers to handle file system changes, with an optional bundled watcher.

**Status: READY**

## Design Rationale

Most consumers already have file watching infrastructure:
- **Tauri**: `tauri-plugin-fs-watch`
- **Obsidian**: `vault.on('modify', ...)` API
- **Node.js**: `chokidar`, `fs.watch`
- **CLI**: Doesn't need watching (one-shot commands)

The SDK's value isn't raw file watching—it's **making sense of changes**:
- Is this file in a relevant directory?
- Is it a valid `.md` file?
- What type of entity is it (task/project/area)?
- What's the parsed content?

Therefore: **processing logic in core, watcher as optional convenience**.

## Scope

### Part 1: Change Processing (Core, No Dependencies)

Module: `src/events.rs`

- [ ] Define `FileChangeKind` enum (Created, Modified, Deleted)
- [ ] Define `VaultEvent` enum with typed variants per entity
- [ ] Implement `Taskdn::process_file_change()` method
- [ ] Implement `Taskdn::watched_paths()` helper
- [ ] Write tests for all event types and edge cases

### Part 2: Optional Watcher (Feature Flag)

Module: `src/watcher.rs` (behind `watch` feature)

- [ ] Implement `FileWatcher` struct wrapping `notify`
- [ ] Debounce rapid changes (configurable, default 500ms)
- [ ] Auto-filter to `.md` files
- [ ] Implement `Taskdn::watch()` convenience method
- [ ] Write integration tests

## API Design

### Core API (always available)

```rust
/// What kind of change occurred (from your watcher)
pub enum FileChangeKind {
    Created,
    Modified,
    Deleted,
}

/// Typed vault events with parsed content
pub enum VaultEvent {
    TaskCreated(Task),
    TaskUpdated(Task),
    TaskDeleted { path: PathBuf },
    ProjectCreated(Project),
    ProjectUpdated(Project),
    ProjectDeleted { path: PathBuf },
    AreaCreated(Area),
    AreaUpdated(Area),
    AreaDeleted { path: PathBuf },
}

impl Taskdn {
    /// Process a file change into a typed vault event.
    ///
    /// Returns `Ok(None)` if the file isn't relevant:
    /// - Not in tasks/projects/areas directory
    /// - Not a `.md` file
    /// - Not a valid Taskdn entity
    pub fn process_file_change(
        &self,
        path: &Path,
        kind: FileChangeKind,
    ) -> Result<Option<VaultEvent>, Error>;

    /// Returns paths that should be watched.
    /// Useful for setting up your own watcher.
    pub fn watched_paths(&self) -> Vec<PathBuf>;
}
```

### Optional Watcher API (requires `watch` feature)

```rust
#[cfg(feature = "watch")]
pub struct FileWatcher {
    // ...
}

#[cfg(feature = "watch")]
pub struct WatchConfig {
    /// Debounce duration (default: 500ms)
    pub debounce: Duration,
}

#[cfg(feature = "watch")]
impl Taskdn {
    /// Start watching for file changes.
    ///
    /// The callback receives fully typed `VaultEvent`s, not raw paths.
    pub fn watch<F>(&self, callback: F) -> Result<FileWatcher, Error>
    where
        F: Fn(VaultEvent) + Send + 'static;

    /// Start watching with custom configuration.
    pub fn watch_with_config<F>(
        &self,
        config: WatchConfig,
        callback: F,
    ) -> Result<FileWatcher, Error>
    where
        F: Fn(VaultEvent) + Send + 'static;
}

#[cfg(feature = "watch")]
impl FileWatcher {
    /// Stop watching and clean up resources.
    pub fn stop(self);
}
```

## Cargo.toml

```toml
[features]
default = []
watch = ["dep:notify", "dep:notify-debouncer-mini"]

[dependencies]
notify = { version = "8", optional = true }
notify-debouncer-mini = { version = "0.5", optional = true }
```

## Usage Examples

### Tauri (uses own watcher)

```rust
let taskdn = Taskdn::new(&config)?;
let paths = taskdn.watched_paths();

// Set up tauri-plugin-fs-watch
for path in paths {
    watcher.watch(&path)?;
}

// Handle events
watcher.on_event(|path, kind| {
    let kind = match kind {
        FsEventKind::Create => FileChangeKind::Created,
        FsEventKind::Modify => FileChangeKind::Modified,
        FsEventKind::Remove => FileChangeKind::Deleted,
    };

    if let Some(event) = taskdn.process_file_change(&path, kind)? {
        app_handle.emit("vault-change", &event)?;
    }
    Ok(())
});
```

### Simple Consumer (uses bundled watcher)

```rust
let taskdn = Taskdn::new(&config)?;

let watcher = taskdn.watch(|event| {
    match event {
        VaultEvent::TaskCreated(task) => println!("New task: {}", task.title),
        VaultEvent::TaskUpdated(task) => println!("Updated: {}", task.title),
        VaultEvent::TaskDeleted { path } => println!("Deleted: {:?}", path),
        // ...
    }
})?;

// Later...
watcher.stop();
```

## Testing Strategy

### Core (process_file_change)
- Task/project/area in correct directory → returns typed event
- File outside watched directories → returns None
- Non-.md file → returns None
- Invalid frontmatter → returns Error
- Deleted file → returns delete event with path

### Watcher (integration tests)
- File create triggers callback
- File modify triggers callback (debounced)
- File delete triggers callback
- Rapid changes are debounced
- Non-.md files are ignored
- Subdirectories are watched recursively
