# Phase 3: TypeScript SDK

Thin TypeScript wrapper around the Rust SDK via NAPI-RS.

## Context & Dependencies

```
┌─────────────────────┐
│     Rust SDK        │  ← crates.io: taskdn
│  (taskdn-rust)      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TypeScript SDK     │  ← You are here
│  (taskdn-ts)        │     npm: @taskdn/sdk
│  NAPI-RS bindings   │
└─────────┬───────────┘
          │
   ┌──────┴──────┐
   ▼             ▼
┌───────┐  ┌──────────┐
│  CLI  │  │ Obsidian │
│ (Bun) │  │  Plugin  │
└───────┘  └──────────┘
```

**Depends on:** Rust SDK (Phase 2) - complete and published at https://crates.io/crates/taskdn

**Consumed by:**
- CLI tool (TypeScript/Bun)
- Obsidian Plugin (TypeScript)

**NOT consumed by:**
- Tauri Desktop (uses Rust SDK directly - NAPI `.node` files don't work in webviews)

---

## Architectural Decision: Separate Directory

**Decision:** Create `taskdn-ts/` as a separate top-level directory in the monorepo.

This matches industry practice from SWC, Rspack, and node-rs (the official NAPI-RS example repo). See research notes below.

**Why not co-locate with taskdn-rust?**
- Different build systems (Cargo vs npm)
- Different CI/CD pipelines (crates.io vs npm publishing)
- Different release cycles
- Matches existing monorepo structure (`taskdn-cli/`, `taskdn-desktop/`, etc.)
- Cleaner separation of concerns

**References:**
- [Shane Osbourne's NAPI-RS workspace guide](https://shane-o.dev/articles/napi-rs-workspace)
- [SWC project structure](https://github.com/swc-project/swc) - `crates/` + `bindings/`
- [node-rs](https://github.com/napi-rs/node-rs) - official NAPI-RS example monorepo

---

## Scope

- NAPI-RS bindings exposing the full Rust SDK API
- Auto-generated TypeScript type definitions
- Works in Node.js and Bun environments
- Thin wrapper - all logic stays in Rust

---

## Technical Decisions

### Use NAPI-RS v3 (not v2, not WASM)

| Aspect | NAPI-RS | WASM |
|--------|---------|------|
| Performance | ~45% faster | Good but VM overhead |
| File I/O | Full access | Limited (needs JS interop) |
| Type generation | Automatic | Requires extra setup |

**Why NAPI-RS:**
- Full file system access (essential for reading/writing task files)
- Automatic TypeScript type generation from `#[napi]` attributes
- Used by SWC, Rspack, Turbopack (proven at scale)
- ~45% faster than WASM for CPU-bound operations

### Thin Wrapper Principle

Keep the TypeScript SDK as minimal as possible:
- All parsing, validation, and file operations happen in Rust
- TypeScript layer just converts types and exposes the API
- No business logic in TypeScript

---

## Project Structure

```
taskdn-ts/
├── .cargo/
│   └── config.toml         # Cross-compilation config
├── .github/
│   └── workflows/
│       └── CI.yml          # Multi-platform build workflow
├── npm/                    # Platform-specific packages (generated)
│   ├── darwin-arm64/
│   ├── darwin-x64/
│   ├── linux-x64-gnu/
│   └── win32-x64-msvc/
├── src/
│   └── lib.rs              # NAPI bindings (thin wrapper)
├── build.rs                # NAPI build setup
├── Cargo.toml              # Rust config
├── package.json            # npm config
├── index.js                # Generated JS bindings
├── index.d.ts              # Generated TS types
├── justfile                # Build commands
├── CLAUDE.md               # AI instructions
└── README.md               # Usage documentation
```

---

## API Surface to Expose

Based on the Rust SDK (`taskdn-rust/src/lib.rs` and operations), we need to expose:

### Core Class

```typescript
export class Taskdn {
  constructor(tasksDir: string, projectsDir: string, areasDir: string);

  // Tasks
  getTask(path: string): Task;
  listTasks(filter?: TaskFilter): Task[];
  countTasks(filter?: TaskFilter): number;
  createTask(task: NewTask): string;  // returns path
  createInboxTask(title: string): string;
  updateTask(path: string, updates: TaskUpdates): void;
  completeTask(path: string): void;
  dropTask(path: string): void;
  startTask(path: string): void;
  blockTask(path: string): void;
  archiveTask(path: string): string;  // returns new path
  unarchiveTask(path: string): string;
  deleteTask(path: string): void;

  // Projects
  getProject(path: string): Project;
  listProjects(filter?: ProjectFilter): Project[];
  createProject(project: NewProject): string;
  updateProject(path: string, updates: ProjectUpdates): void;
  deleteProject(path: string): void;
  getTasksForProject(path: string): Task[];

  // Areas
  getArea(path: string): Area;
  listAreas(filter?: AreaFilter): Area[];
  createArea(area: NewArea): string;
  updateArea(path: string, updates: AreaUpdates): void;
  deleteArea(path: string): void;
  getTasksForArea(path: string): Task[];
  getProjectsForArea(path: string): Project[];

  // File change processing
  processFileChange(path: string, kind: FileChangeKind): VaultEvent | null;

  // Config access
  readonly config: TaskdnConfig;
}
```

### Entity Types

```typescript
// Status enums as string unions
export type TaskStatus = 'inbox' | 'icebox' | 'ready' | 'in-progress' | 'blocked' | 'dropped' | 'done';
export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'dropped' | 'someday' | 'archived';
export type AreaStatus = 'active' | 'archived';

// Main entity types
export interface Task {
  path: string;
  title: string;
  status: TaskStatus;
  createdAt: string;  // ISO date or datetime
  updatedAt: string;
  completedAt?: string;
  due?: string;
  scheduled?: string;  // date only
  deferUntil?: string; // date only
  project?: FileReference;
  area?: FileReference;
  body: string;
  extra: Record<string, unknown>;  // preserved unknown fields
  isArchived: boolean;
  isActive: boolean;
}

export interface Project {
  path: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  area?: FileReference;
  body: string;
  extra: Record<string, unknown>;
}

export interface Area {
  path: string;
  title: string;
  status: AreaStatus;
  createdAt: string;
  updatedAt: string;
  body: string;
  extra: Record<string, unknown>;
}

// File references (preserve format)
export type FileReference =
  | { type: 'wikilink'; target: string; display?: string }
  | { type: 'relativePath'; path: string }
  | { type: 'filename'; name: string };
```

### Builder/Input Types

```typescript
export interface NewTask {
  title: string;
  status?: TaskStatus;
  due?: string;
  scheduled?: string;
  deferUntil?: string;
  project?: FileReference;
  area?: FileReference;
  body?: string;
  filename?: string;
  extra?: Record<string, unknown>;
}

export interface TaskUpdates {
  title?: string;
  status?: TaskStatus;
  due?: string | null;      // null to clear
  scheduled?: string | null;
  deferUntil?: string | null;
  project?: FileReference | null;
  area?: FileReference | null;
}

// Similar for NewProject, ProjectUpdates, NewArea, AreaUpdates...
```

### Filter Types

```typescript
export interface TaskFilter {
  statuses?: TaskStatus[];
  project?: FileReference;
  area?: FileReference;
  hasProject?: boolean;
  hasArea?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  includeArchive?: boolean;
}

// Similar for ProjectFilter, AreaFilter...
```

### Event Types

```typescript
export type FileChangeKind = 'created' | 'modified' | 'deleted';

export type VaultEvent =
  | { type: 'taskCreated'; task: Task }
  | { type: 'taskUpdated'; task: Task }
  | { type: 'taskDeleted'; path: string }
  | { type: 'projectCreated'; project: Project }
  | { type: 'projectUpdated'; project: Project }
  | { type: 'projectDeleted'; path: string }
  | { type: 'areaCreated'; area: Area }
  | { type: 'areaUpdated'; area: Area }
  | { type: 'areaDeleted'; path: string };
```

---

## Implementation

### Cargo.toml

```toml
[package]
name = "taskdn-napi"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
taskdn = { path = "../taskdn-rust" }
napi = { version = "3", default-features = false, features = ["napi9"] }
napi-derive = "3"

[build-dependencies]
napi-build = "2"

[profile.release]
lto = true
```

### build.rs

```rust
extern crate napi_build;

fn main() {
  napi_build::setup();
}
```

### src/lib.rs (Core Pattern)

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;
use taskdn::{Taskdn as CoreTaskdn, TaskdnConfig};

#[napi]
pub struct Taskdn {
    inner: CoreTaskdn,
}

#[napi]
impl Taskdn {
    #[napi(constructor)]
    pub fn new(tasks_dir: String, projects_dir: String, areas_dir: String) -> Result<Self> {
        let config = TaskdnConfig::new(
            tasks_dir.into(),
            projects_dir.into(),
            areas_dir.into(),
        );
        let inner = CoreTaskdn::new(config)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(Self { inner })
    }

    #[napi]
    pub fn get_task(&self, path: String) -> Result<Task> {
        self.inner
            .get_task(&path)
            .map(Task::from)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn list_tasks(&self, filter: Option<TaskFilter>) -> Result<Vec<Task>> {
        let filter = filter.map(Into::into).unwrap_or_default();
        self.inner
            .list_tasks(&filter)
            .map(|tasks| tasks.into_iter().map(Task::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn create_task(&self, task: NewTask) -> Result<String> {
        self.inner
            .create_task(task.into())
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // ... other methods follow same pattern
}

// Type conversions
#[napi(object)]
pub struct Task {
    pub path: String,
    pub title: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
    pub body: String,
    pub is_archived: bool,
    pub is_active: bool,
}

impl From<taskdn::Task> for Task {
    fn from(t: taskdn::Task) -> Self {
        Self {
            path: t.path.to_string_lossy().to_string(),
            title: t.title,
            status: t.status.to_string(),
            created_at: t.created_at.to_string(),
            updated_at: t.updated_at.to_string(),
            completed_at: t.completed_at.map(|d| d.to_string()),
            due: t.due.map(|d| d.to_string()),
            scheduled: t.scheduled.map(|d| d.to_string()),
            defer_until: t.defer_until.map(|d| d.to_string()),
            project: t.project.map(FileReference::from),
            area: t.area.map(FileReference::from),
            body: t.body,
            is_archived: t.is_archived(),
            is_active: t.is_active(),
        }
    }
}

// FileReference as tagged union
#[napi(object)]
pub struct FileReference {
    #[napi(js_name = "type")]
    pub ref_type: String,
    pub target: Option<String>,
    pub display: Option<String>,
    pub path: Option<String>,
    pub name: Option<String>,
}

impl From<taskdn::FileReference> for FileReference {
    fn from(r: taskdn::FileReference) -> Self {
        match r {
            taskdn::FileReference::WikiLink { target, display } => Self {
                ref_type: "wikilink".to_string(),
                target: Some(target),
                display,
                path: None,
                name: None,
            },
            taskdn::FileReference::RelativePath(p) => Self {
                ref_type: "relativePath".to_string(),
                target: None,
                display: None,
                path: Some(p),
                name: None,
            },
            taskdn::FileReference::Filename(n) => Self {
                ref_type: "filename".to_string(),
                target: None,
                display: None,
                path: None,
                name: Some(n),
            },
        }
    }
}
```

### package.json

```json
{
  "name": "@taskdn/sdk",
  "version": "0.1.0",
  "main": "index.js",
  "types": "index.d.ts",
  "files": ["index.js", "index.d.ts"],
  "napi": {
    "name": "taskdn",
    "triples": {
      "defaults": true,
      "additional": [
        "aarch64-apple-darwin"
      ]
    }
  },
  "scripts": {
    "artifacts": "napi artifacts",
    "build": "napi build --platform --release",
    "build:debug": "napi build --platform",
    "prepublishOnly": "napi prepublish -t npm",
    "test": "bun test",
    "version": "napi version"
  },
  "devDependencies": {
    "@napi-rs/cli": "^3.0.0-alpha.62"
  },
  "engines": {
    "node": ">= 18"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Build & Distribution

```bash
# Development build (current platform only)
pnpm build:debug

# Release build (current platform)
pnpm build

# Cross-compile all platforms (CI only)
# Uses GitHub Actions matrix
```

Distribution via npm with platform-specific optional dependencies (standard NAPI-RS pattern).

---

## Error Handling Strategy

Rust `Result<T, Error>` becomes JavaScript exceptions:

```rust
// In Rust
.map_err(|e| Error::from_reason(e.to_string()))

// In TypeScript - throws on error
try {
  const task = sdk.getTask("missing.md");
} catch (e) {
  // e.message = "file not found: missing.md"
}
```

The error message from `taskdn::Error::Display` is preserved.

---

## Key Considerations

- **Error handling:** Convert Rust `Result` to JavaScript exceptions with clear error messages
- **Sync operations:** All file ops are synchronous (matches Rust SDK design)
- **Type fidelity:** Ensure TypeScript types exactly match the Taskdn specification
- **Cross-platform:** Must build for macOS (Intel + ARM), Linux, Windows
- **Naming:** Use camelCase for JS (createdAt), snake_case internally

---

## Notes

- This is intentionally a thin layer - resist adding TypeScript-specific features
- If something can be done in Rust, do it in Rust
- The CLI and Obsidian plugin are the primary consumers
- No file watching in this package - consumers bring their own (chokidar, Tauri watcher, etc.)
