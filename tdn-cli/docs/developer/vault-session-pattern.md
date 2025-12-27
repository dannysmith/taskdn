# VaultSession Pattern

This document explains the VaultSession pattern - our approach to efficient vault querying through index reuse.

## The Problem

Early versions of the CLI had three performance issues:

1. **Full vault scans for fuzzy lookups** - Each `find_*_by_title()` call scanned all files instead of using an index (500ms per lookup on 5000 files)
2. **Sequential entity lookups** - Commands like `update` tried tasks → projects → areas sequentially, causing up to 3 full scans (1500ms)
3. **Index rebuilding** - Each query built and discarded a fresh index instead of reusing it across multiple queries

For commands performing multiple queries, this meant 2000ms+ of redundant work on medium-sized vaults.

## The Solution: VaultSession

The VaultSession pattern introduces a lightweight session object that:

1. **Owns the VaultConfig** (eliminating unnecessary clones)
2. **Lazily builds and caches a VaultIndex** (built once, reused for all queries)
3. **Provides all query operations** through session methods

### Architecture

```
TypeScript Command
       ↓
   create_vault_session(config) ← Config moved into session
       ↓
   VaultSession { config, index: OnceLock }
       ↓
   find_tasks_by_title(session, query)  ← First call: builds index
   find_projects_by_title(session, query) ← Subsequent calls: reuses index
   get_area_context(session, "Work")     ← Reuses same index
```

**Rust implementation:**

```rust
pub struct VaultSession {
    config: VaultConfig,           // Owned config (no cloning)
    index: OnceLock<VaultIndex>,  // Lazy index (built on first use)
}

impl VaultSession {
    fn get_or_build_index(&self) -> &VaultIndex {
        self.index.get_or_init(|| VaultIndex::build(&self.config))
    }
}
```

The `OnceLock` ensures the index is built exactly once, even if called from multiple methods. After the first query, all subsequent queries use the cached index.

**TypeScript usage:**

```typescript
// Command creates session once
const config = getVaultConfig();
const session = createVaultSession(config);

// All queries use the same session (and same index)
const taskResult = lookupTask(query, config, session);
const projectResult = lookupProject(query, config, session);
const areaResult = lookupArea(query, config, session);
```

## When to Use Session vs. Simple Functions

The codebase provides two APIs:

### Use Session-Based API When:

- **Command performs multiple queries** (context, update, fuzzy entity lookup)
- **Performance is critical** (large vaults, interactive commands)
- **Relationship traversal** (area → projects → tasks)

Example: The `update` command tries tasks, then projects, then areas for fuzzy matching. With a session, this is 1 index build + 3 fast lookups instead of 3 full scans.

### Use Simple Functions When:

- **Single operation, no queries** (parsing one file with `parseTaskFile()`)
- **Full scan is acceptable** (listing all tasks with `scanTasks()`)
- **Path-based lookup** (no index needed - direct file read)

Example: The `show` command can take an explicit path. In this case it should just parse that file. No session needed.

## How Lazy Index Building Works

The index is built on the **first query that needs it**, not when the session is created:

1. `create_vault_session(config)` - Creates session, index is empty
2. `find_tasks_by_title(session, "foo")` - **Triggers index build**, performs query
3. `get_area_context(session, "Work")` - **Reuses existing index**, performs query

This lazy approach means:

- Simple commands that only do path lookups pay no index cost
- Index is only built if needed
- Once built, all subsequent queries are fast

## Memory and Staleness Considerations

### Memory Usage

The VaultIndex holds all entities in memory:

- 5000 files ≈ 5-10 MB of RAM
- Index is dropped when command exits

### Staleness

**Current design:**

- All CLI commands are **one-shot processes** (start, run, exit)
- Session lives for command duration only
- No staleness issues - fresh index per command invocation

**Future considerations:**

If we add long-running processes (daemon, watch mode, desktop app), we'll need either:

1. **Manual refresh**: `session.refresh()` on file changes
2. **Rebuild session**: Create new session after detecting changes
3. **File watching**: Auto-rebuild on vault modifications

The session pattern supports all these approaches without API changes.

## Migration Pattern for New Commands

When adding a new command that needs vault queries:

1. **Determine if session is needed** (multiple queries? context traversal?)
2. **Create session early** in command action
3. **Pass session to helper functions** that do lookups
4. **Let session drop** when command exits

Example command structure:

```typescript
export const myCommand = new Command('my-command').action((query, options, command) => {
  const config = getVaultConfig();
  const session = createVaultSession(config); // Create once

  // Use session for all queries
  const result = findTasksByTitle(session, query);
  const context = getAreaContext(session, 'Work');

  // Session automatically dropped when function exits
});
```

## Available Session Functions

All these functions use the session's cached index:

**Entity search:**

- `find_tasks_by_title(session, query)`
- `find_projects_by_title(session, query)`
- `find_areas_by_title(session, query)`
- `find_entity_by_title(session, query)` - searches all types in one pass

**Relationship queries:**

- `get_tasks_in_area(session, area_name)`
- `get_projects_in_area(session, area_name)`

**Context queries:**

- `get_area_context(session, area_name)`
- `get_project_context(session, project_name)`
- `get_task_context(session, path_or_title)`

## Related Patterns

**Parallelization** (`scan_directory`):

- Complements VaultSession by making the initial index build 3× faster
- Uses rayon to parse files in parallel (2500ms → 750ms for 5000 files)
- Independent optimization that benefits both session and non-session code

**Entity lookup helpers** (`entity-lookup.ts`):

- Accept optional session parameter for flexibility
- Create temporary session if not provided (backward compatible)
- Encourage session reuse through API design
