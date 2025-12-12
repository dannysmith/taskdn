# Phase 3: TypeScript SDK

Thin TypeScript wrapper around the Rust SDK via NAPI-RS.

## Context & Dependencies

```
┌─────────────────────┐
│     Rust SDK        │
│  (taskdn-rust)      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TypeScript SDK     │  ← You are here
│  (taskdn-ts)        │
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

**Depends on:** Rust SDK (Phase 2) must be complete first.

**Consumed by:**
- CLI tool (TypeScript/Bun)
- Obsidian Plugin (TypeScript)

**NOT consumed by:**
- Tauri Desktop (uses Rust SDK directly - NAPI `.node` files don't work in webviews)

---

## Scope

- NAPI-RS bindings to the Rust SDK
- Auto-generated TypeScript type definitions
- Works in Node.js and Bun environments
- Thin wrapper - all logic stays in Rust

---

## Technical Decisions

### Use NAPI-RS (not WASM)

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

## Architecture

```
taskdn-ts/
├── Cargo.toml          # NAPI-RS configuration
├── src/
│   └── lib.rs          # Thin wrapper around taskdn-rust
├── package.json
├── index.js            # Generated JavaScript bindings
└── index.d.ts          # Auto-generated TypeScript types
```

### Example Implementation

```rust
// taskdn-ts/src/lib.rs
use napi_derive::napi;
use taskdn_rust::Taskdn as CoreTaskdn;

#[napi]
pub struct Taskdn {
    inner: CoreTaskdn,
}

#[napi]
impl Taskdn {
    #[napi(constructor)]
    pub fn new(tasks_dir: String, projects_dir: String, areas_dir: String) -> napi::Result<Self> {
        let config = taskdn_rust::TaskdnConfig {
            tasks_dir: tasks_dir.into(),
            projects_dir: projects_dir.into(),
            areas_dir: areas_dir.into(),
        };
        let inner = CoreTaskdn::new(config)?;
        Ok(Self { inner })
    }

    #[napi]
    pub fn list_tasks(&self) -> napi::Result<Vec<Task>> {
        let tasks = self.inner.list_tasks()?;
        Ok(tasks.into_iter().map(Into::into).collect())
    }

    // ... other methods
}

#[napi(object)]
pub struct Task {
    pub path: String,
    pub title: String,
    pub status: String,
    // ... mirror Rust struct
}

impl From<taskdn_rust::Task> for Task {
    fn from(t: taskdn_rust::Task) -> Self {
        // Convert Rust types to NAPI-compatible types
    }
}
```

### Generated TypeScript API

NAPI-RS automatically generates types like:

```typescript
export class Taskdn {
    constructor(tasksDir: string, projectsDir: string, areasDir: string);
    listTasks(): Task[];
    getTask(path: string): Task;
    createTask(task: NewTask): string;
    updateTask(path: string, updates: TaskUpdates): void;
    // ...
}

export interface Task {
    path: string;
    title: string;
    status: string;
    // ...
}
```

---

## Dependencies

### Rust (Cargo.toml)

```toml
[package]
name = "taskdn-ts"

[lib]
crate-type = ["cdylib"]

[dependencies]
taskdn-rust = { path = "../taskdn-rust" }
napi = { version = "2", features = ["napi-derive"] }
napi-derive = "2"

[build-dependencies]
napi-build = "2"
```

### JavaScript (package.json)

```json
{
  "name": "@taskdn/sdk",
  "main": "index.js",
  "types": "index.d.ts",
  "napi": {
    "name": "taskdn",
    "triples": {
      "additional": [
        "aarch64-apple-darwin",
        "x86_64-apple-darwin",
        "x86_64-unknown-linux-gnu",
        "x86_64-pc-windows-msvc"
      ]
    }
  }
}
```

---

## Build & Distribution

```bash
# Development build
npm run build

# Release build for current platform
npm run build -- --release

# Cross-compile for all platforms (CI)
# Uses GitHub Actions matrix to build .node files for each target
```

Distribution via npm with platform-specific optional dependencies (standard NAPI-RS pattern).

---

## Key Considerations

- **Error handling:** Convert Rust `Result` to JavaScript exceptions with clear error messages
- **Async support:** NAPI-RS supports async functions if needed, but sync is fine for file ops
- **Type fidelity:** Ensure TypeScript types exactly match the Taskdn specification
- **Cross-platform:** Must build for macOS (Intel + ARM), Linux, Windows

---

## Notes

- This is intentionally a thin layer - resist adding TypeScript-specific features
- If something can be done in Rust, do it in Rust
- The CLI and Obsidian plugin are the primary consumers
