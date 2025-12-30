# Desktop Data Architecture Research

Research notes from exploring architectural approaches for the Taskdn Desktop data layer. This document captures findings and recommendations for how to handle state management, file watching, and the Rust/React boundary.

## Context

The CLI app (`tdn-cli`) uses Rust for file reading/writing with a `VaultSession` pattern that lazily builds a `VaultIndex` for efficient querying. The desktop app needs similar functionality but with different lifecycle requirements:

- **CLI**: Single command → build index → query → exit (short-lived)
- **Desktop**: App starts → user works for hours → files change → needs to stay in sync (long-lived)

## Current CLI Architecture

### Key Components

**VaultIndex** (`vault_index.rs`): Internal structure that pre-computes all relationships:

```rust
struct VaultIndex {
    tasks: Vec<Task>,
    projects: Vec<Project>,
    areas: Vec<Area>,

    // Name lookups (case-insensitive)
    area_by_name: HashMap<String, usize>,
    project_by_name: HashMap<String, usize>,

    // Exact title lookups (O(1) for exact matches)
    task_by_exact_title: HashMap<String, Vec<usize>>,

    // Path lookup for tasks
    task_by_path: HashMap<String, usize>,

    // Relationship indices
    tasks_by_project: HashMap<usize, Vec<usize>>,
    tasks_by_area: HashMap<usize, Vec<usize>>,
    projects_by_area: HashMap<usize, Vec<usize>>,
}
```

**VaultSession** (`vault_session.rs`): Wrapper that lazily builds and caches the index:

```rust
pub struct VaultSession {
    config: VaultConfig,
    index: OnceLock<VaultIndex>,  // Built on first access
}
```

**Key Design Decisions in CLI**:
- Parallel scanning with rayon (8 threads max)
- Hybrid search: O(1) exact match via HashMap, O(n) substring fallback
- Lazy index building (only when first query needs it)
- Round-trip fidelity for writes (preserves unknown frontmatter fields)
- Atomic writes with fsync for durability

### Performance Characteristics

- 5000 files: ~750ms to build full index (with rayon parallelization)
- Hybrid search: O(1) for exact matches, O(n) for substring
- Memory: ~5-10MB for 5000 files

## Desktop App Infrastructure

The desktop app already has established patterns:

### State Management ("Onion" Pattern)

```
useState (Component) → Zustand (Global UI) → TanStack Query (Persistent Data)
```

- **TanStack Query**: For data from Tauri backend, with caching and refetching
- **Zustand**: For transient global state (panel visibility, modals)
- **useState**: For component-local presentation state

### Tauri Bridge

- **tauri-specta**: Auto-generates TypeScript bindings from Rust commands
- **Event system**: Rust → React via `app.emit()` / `listen()`
- **Commands**: React → Rust via typed invoke

## Recommended Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    FILES ON DISK                             │
│  /vault/tasks/*.md  /vault/projects/*.md  /vault/areas/*.md  │
└───────────────┬──────────────────────────────┬───────────────┘
                │ file watcher (notify)        │ writes
                ▼                              │
┌──────────────────────────────────────────────┴───────────────┐
│                    RUST BACKEND                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  VaultManager                                           │ │
│  │  ├─ VaultIndex (reuse patterns from CLI)                │ │
│  │  ├─ File watcher (notify-debouncer-full)                │ │
│  │  └─ Event emitter (→ frontend)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          │                                   │
│  Tauri Commands:         │ Tauri Events:                     │
│  - list_tasks()          │ - vault-changed                   │
│  - get_task(id)          │ - entity-updated                  │
│  - update_task(...)      │ - entity-created                  │
│  - search(query)         │ - entity-deleted                  │
└───────────────┬──────────┴───────────────────────────────────┘
                │ IPC
┌───────────────▼──────────────────────────────────────────────┐
│                   REACT FRONTEND                             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  TanStack Query                                          ││
│  │  - Caches query results                                  ││
│  │  - Invalidated by Tauri events                           ││
│  │  - Optimistic updates for UI responsiveness              ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Zustand                                                 ││
│  │  - UI state only (sidebars, modals, selection)           ││
│  │  - NO entity data here                                   ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### State Flow

| Operation | Flow |
|-----------|------|
| **Read** | Component → TanStack Query → (if stale) → Tauri command → Rust index |
| **Write** | Component → TanStack mutation → Tauri command → Rust writes file → Rust updates index → Emits event → TanStack invalidates |
| **External change** | File watcher → Rust rebuilds index → Emits event → TanStack invalidates |

### Key Principle

**The Rust VaultIndex is authoritative**. TanStack Query is a cache of query results. When files change (internally or externally), Rust rebuilds the index and emits events to invalidate the cache.

## File Watching Research

### Tauri Plugin Options

Tauri v2 provides file watching through `tauri-plugin-fs` with the `watch` feature:

```typescript
import { watch } from '@tauri-apps/plugin-fs';

const unwatch = await watch(
  'vault/',
  (event) => { /* handle change */ },
  { delayMs: 500, recursive: true }
);
```

### Rust-side with `notify` Crate

For more control, use `notify-debouncer-full` in the Rust backend:

```rust
use notify_debouncer_full::{notify::*, new_debouncer, DebounceEventResult};
use std::time::Duration;

let mut debouncer = new_debouncer(
    Duration::from_millis(500),
    None,
    |result: DebounceEventResult| {
        match result {
            Ok(events) => { /* process events */ }
            Err(errors) => { /* handle errors */ }
        }
    }
).unwrap();

debouncer.watch("./vault", RecursiveMode::Recursive).unwrap();
```

**`notify-debouncer-full` Features**:
- Consolidates rename From/To events into single events
- Updates paths for events that occurred before a rename
- Eliminates duplicate create events
- Reduces multiple directory deletion notifications to one

### Recommendation

Use `notify-debouncer-full` in Rust backend because:
- File watcher can directly trigger index rebuild
- Keeps all file logic in one place
- Smart rename tracking (important for task file moves)

## TanStack Query Integration

### Query Key Strategy

Use entity IDs, not file paths:

```typescript
// Good - stable across renames, hierarchical
['tasks']                          // All task queries
['tasks', 'list']                  // Task list
['tasks', 'list', { status }]      // Filtered list
['tasks', taskId]                  // Single task
['projects', projectId]            // Single project

// Bad - breaks on rename
['file', '/path/to/task.md']
```

### Event-Driven Invalidation

```typescript
function useVaultSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unlisten = listen('vault-changed', () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] })
    })
    return () => { unlisten.then(fn => fn()) }
  }, [queryClient])
}
```

### Optimistic Updates Pattern

```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Task) => commands.updateTask({ task }),

    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', newTask.id] });
      const previousTask = queryClient.getQueryData(['tasks', newTask.id]);
      queryClient.setQueryData(['tasks', newTask.id], newTask);
      return { previousTask };
    },

    onError: (err, newTask, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(['tasks', newTask.id], context.previousTask);
      }
    },

    onSettled: () => {
      // File watcher will handle invalidation via events
    },
  });
}
```

## Index Lifecycle

### Startup Behavior

**Decision**: Load full index on app startup (blocking). Users expect to see their tasks immediately. For most vaults (<1000 files), this will be under 200ms. For very large vaults, a loading indicator can be shown.

### Rebuild Strategy

**Decision**: Start with full rebuild on external file changes. Optimize to incremental updates only if profiling shows it's needed.

```rust
struct VaultManager {
    config: VaultConfig,
    index: RwLock<VaultIndex>,
    watcher: Debouncer<...>,
}

impl VaultManager {
    fn on_external_change(&self, paths: Vec<PathBuf>) {
        let new_index = VaultIndex::build(&self.config);
        *self.index.write() = new_index;
        self.emit_vault_changed();
    }
}
```

Full rebuild with rayon is fast (~750ms for 5000 files). Incremental updates add significant complexity for relationship management and risk index corruption.

### Avoiding Re-indexing Loops

When our app writes a file, the file watcher will detect the change. To avoid redundant re-indexing:

**Pattern: Track "our writes" and update index directly**

```rust
struct VaultManager {
    index: RwLock<VaultIndex>,
    pending_writes: Mutex<HashSet<PathBuf>>,  // Files we're writing
    // ...
}

impl VaultManager {
    fn update_task(&self, path: &Path, updates: TaskUpdate) -> Result<Task> {
        // 1. Mark this path as "our write"
        self.pending_writes.lock().insert(path.to_path_buf());

        // 2. Write file to disk
        let task = write_task_file(path, updates)?;

        // 3. Directly update the in-memory index (don't wait for watcher)
        self.index.write().update_task(task.clone());

        // 4. Emit event for frontend immediately
        self.emit_task_updated(&task);

        // 5. Schedule removal from pending_writes after watcher debounce period
        spawn(async {
            sleep(Duration::from_millis(600)).await; // > debounce delay
            self.pending_writes.lock().remove(path);
        });

        Ok(task)
    }

    fn on_watcher_event(&self, paths: Vec<PathBuf>) {
        let pending = self.pending_writes.lock();
        let external_changes: Vec<_> = paths.iter()
            .filter(|p| !pending.contains(*p))
            .collect();

        if external_changes.is_empty() {
            return; // All changes were from us, already handled
        }

        // External change detected - rebuild index
        self.rebuild_index();
    }
}
```

**Key insight**: When *we* write a file, we update the index directly and emit events immediately (no 500ms delay). The watcher event arrives later and gets ignored. When *external tools* write files, the watcher triggers a full rebuild.

## Code Sharing

### CLI Rust Components

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| `Task`, `Project`, `Area` structs | Yes | Core data types |
| Parsing (gray_matter + serde) | Yes | Same frontmatter format |
| `VaultIndex` structure | Yes | Same indexing needs |
| `VaultSession` (OnceLock) | Adapt | Need RwLock for mutability |
| Writer (atomic_write) | Yes | Same write requirements |
| WikiLink parsing | Yes | Same format |
| NAPI exports | No | Tauri has its own IPC |

### Decision: Copy-Paste Now, Extract Later

**Decision**: Copy-paste the core parsing/writing code from CLI to desktop. Extract a shared `taskdn-core` crate later when patterns stabilize.

**Rationale**:
- The CLI is relatively stable; the desktop is greenfield
- During active desktop development, we want to iterate fast without worrying about CLI compatibility
- Extracting a shared crate couples the projects - changes to shared code require testing both
- The risk of divergence is manageable; the S1 spec rarely changes

**What to copy**:
- Entity structs (`Task`, `Project`, `Area`)
- Frontmatter parsing (gray_matter + serde)
- Writer utilities (atomic writes, round-trip fidelity)
- WikiLink parsing

**What NOT to copy**:
- NAPI bindings (not needed for Tauri)
- `VaultSession` (desktop needs different lifecycle management)
- CLI-specific output formatting

**Future extraction**: When both projects stabilize and the desktop patterns are proven, extract the truly shared code (parsing, entity types, writer) into an internal workspace crate. This refactor will be straightforward because we'll know exactly what needs to be shared.

## Conflict Handling

### Decision: Last Write Wins (MVP)

**Decision**: Files on disk are the source of truth. If a file is edited externally while our app is open, the watcher triggers a re-index which updates the UI. For simultaneous edits, last write wins.

**Rationale**:
- For a personal task manager, simultaneous edits to the same file are rare
- The watcher ensures the UI reflects the disk state within ~500ms
- Simple and predictable behavior

**Future enhancement** (if needed): Optimistic locking. When user starts editing in our app, remember the file's mtime. On save, check if mtime changed. If so, show a dialog: "This file was modified externally. Overwrite or reload?"

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Index location | Rust (VaultManager) | Performance, proven CLI patterns |
| File watching | notify-debouncer-full in Rust | Direct index access, smart debouncing |
| Startup | Blocking load, full index | Users expect immediate data |
| Rebuild strategy | Full rebuild on external changes | Simple, fast enough (~750ms/5000 files) |
| Our writes | Direct index update, ignore watcher | Instant UI feedback, no loops |
| Conflicts | Last write wins | Simple, file is source of truth |
| Code sharing | Copy-paste now, extract later | Fast iteration, avoid coupling |

## Sources

- Tauri v2 File System Plugin: https://v2.tauri.app/plugin/file-system/
- Tauri Events Documentation: https://v2.tauri.app/develop/calling-frontend/
- notify-debouncer-full: https://docs.rs/notify-debouncer-full
- TanStack Query Invalidation: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
- TanStack Query Optimistic Updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
