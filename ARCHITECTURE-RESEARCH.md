# Taskdn Architecture Research & Recommendations

**Date:** 2025-12-12
**Purpose:** Validate the Rust SDK → TypeScript SDK → CLI/Desktop architecture

---

## Executive Summary

Your proposed architecture is **sound**. Building a Rust SDK as the foundation, wrapping it with TypeScript bindings (NAPI-RS), and building CLI/Desktop tools on top follows patterns used by SWC, Rspack, and Turbopack.

**Final stack:**
- **Rust SDK** - Core library (parsing, validation, file ops)
- **TypeScript SDK** - NAPI-RS bindings for Node.js/Bun consumers
- **CLI** - TypeScript/Bun (uses TypeScript SDK)
- **Desktop** - Tauri v2 (uses Rust SDK directly)
- **Obsidian Plugin** - TypeScript (uses TypeScript SDK)

---

## 1. Rust SDK

### Critical: serde_yaml is Deprecated

As of March 2024, `serde_yaml` has been deprecated and archived. Use a maintained fork:

| Library | Status |
|---------|--------|
| `serde_norway` | Actively maintained, uses maintained libyaml fork |
| `serde_yaml_ng` | Actively maintained alternative |

### Recommended Dependencies

```toml
[dependencies]
# Frontmatter parsing
gray_matter = "*"               # Frontmatter extraction
serde_norway = "0.9"            # YAML parsing (maintained fork)
serde = { version = "1", features = ["derive"] }

# File watching (optional - consumers may prefer to manage this)
notify = "8"                    # File system notifications
notify-debouncer-mini = "*"     # Event debouncing

# Utilities
thiserror = "1"                 # Error handling
```

**Note:** Verify these crates are actively maintained before depending on them. The ecosystem moves fast.

### Key Design Decisions

**1. Use Synchronous File I/O**

Async provides no performance benefit for file operations:
- Most OSes lack true async file APIs
- `tokio::fs` uses `spawn_blocking` internally anyway
- Simpler code, smaller binaries

```rust
// Simple and fast
use std::fs;
let content = fs::read_to_string(&path)?;
```

Consumers (Tauri, NAPI) can wrap in async contexts if needed.

**2. Stateless Core, Optional State Management**

The SDK should provide both:

```rust
// Stateless parsing (always available)
pub fn parse_task(path: &Path) -> Result<Task, Error>;
pub fn parse_task_from_str(content: &str) -> Result<Task, Error>;
pub fn write_task(path: &Path, task: &Task) -> Result<(), Error>;

// Optional: stateful store for consumers who want caching
pub struct TaskStore {
    tasks: HashMap<PathBuf, Task>,
    // ...
}
```

This gives flexibility - CLI might use stateless functions, desktop app might use the store.

**3. File Watching: Consumer's Choice**

Don't bake file watching deep into the SDK. Instead:
- Provide parsing/writing functions
- Let consumers (Tauri, CLI) manage their own watchers
- Optionally provide a `TaskStore` that handles watching for those who want it

**Reasoning:** CLI doesn't need watching (run → exit). Tauri has its own plugin ecosystem. Different consumers have different needs.

### Project Structure

```
taskdn-rust/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── task.rs         # Task struct, parsing, validation
    ├── project.rs      # Project struct
    ├── area.rs         # Area struct
    ├── parser.rs       # Frontmatter extraction
    ├── store.rs        # Optional: TaskStore with caching
    └── error.rs        # Error types
```

Keep it simple. Single crate to start, split later if needed.

### Performance Expectations

For a vault with 5,000 tasks:
- **Single file parse:** <1ms
- **Full vault scan (parallel):** ~200-500ms with rayon
- **Query by status (in-memory):** <5ms

In-memory `HashMap` is sufficient. No need for SQLite.

---

## 2. TypeScript SDK (NAPI-RS)

### Why NAPI-RS (not WASM)

| Aspect | NAPI-RS | WASM |
|--------|---------|------|
| Performance | ~45% faster | Good but VM overhead |
| File I/O | Full access | Limited (needs JS interop) |
| Type generation | Automatic | Requires extra setup |

NAPI-RS wins because you need file system access.

### Architecture

```
taskdn-ts/
├── Cargo.toml          # NAPI-RS setup
├── src/
│   └── lib.rs          # Thin wrapper around taskdn-rust
├── package.json
└── index.d.ts          # Auto-generated TypeScript types
```

**Key principle:** Keep the TypeScript SDK as a thin wrapper. All logic stays in Rust.

```rust
// taskdn-ts/src/lib.rs
use napi_derive::napi;
use taskdn_rust::{Task as CoreTask};

#[napi(object)]
pub struct Task {
    pub title: String,
    pub status: String,
    // ... mirror the Rust struct
}

impl From<CoreTask> for Task {
    fn from(t: CoreTask) -> Self { /* conversion */ }
}

#[napi]
pub fn parse_task_file(path: String) -> napi::Result<Task> {
    let task = taskdn_rust::parse_task(path.as_ref())?;
    Ok(task.into())
}
```

NAPI-RS auto-generates TypeScript types from the `#[napi]` attributes.

---

## 3. CLI (TypeScript/Bun)

Uses the TypeScript SDK. Bun compiles to standalone executable.

```bash
# Build
bun build --compile --minify --outfile taskdn

# Cross-compile
bun build --compile --target=bun-darwin-arm64 --outfile taskdn-macos
bun build --compile --target=bun-linux-x64 --outfile taskdn-linux
bun build --compile --target=bun-windows-x64 --outfile taskdn.exe
```

**Binary size:** ~50-100MB (includes Bun runtime)
**Startup:** ~50-100ms

### Output Modes

```typescript
program
  .option('--json', 'Strict JSON output')
  .option('--ai', 'Token-efficient output for AI agents')
```

---

## 4. Tauri Desktop

### SDK Choice: Use Rust SDK Directly

**Important clarification:** In Tauri, you **must** use the Rust SDK, not the TypeScript SDK.

The TypeScript SDK (NAPI-RS) produces `.node` files for Node.js. These won't load in a browser/webview. Tauri's frontend is a webview.

**Architecture:**
```
Frontend (webview) ←IPC→ Rust Backend ← uses → taskdn-rust
```

This is fine. Your Tauri template already handles IPC. Just add `taskdn-rust` as a Cargo dependency in `src-tauri/Cargo.toml`:

```toml
[dependencies]
taskdn-rust = { path = "../taskdn-rust" }
```

Then expose what you need via Tauri commands.

---

## 5. Gotchas & Edge Cases

### File Watching
- **Linux inotify limits:** May fail with thousands of files
- **Editor differences:** Vim, VS Code emit different event patterns
- **Debouncing essential:** Files often trigger multiple events

### NAPI-RS
- Rust enums with data need wrapper types
- Can't use `&mut self` in async functions (use `Arc<RwLock<T>>`)

### Cross-Platform
- Use `PathBuf`, not strings
- Be consistent with line endings (LF)

---

## 6. Implementation Order

1. **Rust SDK** - Core parsing, validation, file ops
2. **TypeScript SDK** - NAPI-RS wrapper
3. **CLI** - TypeScript/Bun using TS SDK
4. **Desktop** - Tauri using Rust SDK directly
5. **Obsidian Plugin** - TypeScript using TS SDK

---

## Key Libraries Reference

### Rust
| Purpose | Library |
|---------|---------|
| YAML parsing | `serde_norway` (maintained fork) |
| Frontmatter | `gray_matter` |
| Serialization | `serde` |
| File watching | `notify` v8 |
| Debouncing | `notify-debouncer-mini` |
| Error handling | `thiserror` |
| Parallelism | `rayon` |

### TypeScript
| Purpose | Library |
|---------|---------|
| NAPI bindings | `napi-rs` v3 |
| CLI framework | `commander` |
| Interactive prompts | `@clack/prompts` |
| Tables | `cli-table3` |
| Colors | `picocolors` |
