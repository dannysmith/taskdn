# Phase 6: Desktop App

Cross-platform Tauri desktop application.

## Context & Dependencies

```
┌─────────────────────┐
│     Rust SDK        │
│  (taskdn-rust)      │
└─────────┬───────────┘
          │
          │  (direct Cargo dependency)
          │
          ▼
┌─────────────────────┐
│   Tauri Desktop     │  ← You are here
│  (taskdn-desktop)   │
│                     │
│  ┌───────────────┐  │
│  │ Rust Backend  │◄─┼── uses taskdn-rust directly
│  └───────┬───────┘  │
│          │ IPC      │
│  ┌───────▼───────┐  │
│  │   Frontend    │  │
│  │   (webview)   │  │
│  └───────────────┘  │
└─────────────────────┘
```

**Depends on:** Rust SDK (Phase 2) must be complete first.

**Important:** Uses the **Rust SDK directly**, NOT the TypeScript SDK.
- NAPI-RS produces `.node` files which only work in Node.js/Bun
- Tauri's frontend runs in a webview, not Node.js
- The Rust SDK is imported as a Cargo dependency in `src-tauri/Cargo.toml`

---

## Scope

- Things-like UI/UX for day-to-day task management
- Cross-platform Tauri v2 app (macOS, Linux, Windows)
- URL scheme support (`taskdn://`)
- Global keyboard shortcut for quick task capture
- Native notifications and reminders
- File watching for external changes

---

## Architecture

### Rust Backend (src-tauri/)

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2", features = ["shell-open"] }
taskdn-rust = { path = "../../taskdn-rust" }
```

The Rust backend:
- Imports `taskdn-rust` as a direct dependency
- Exposes SDK functionality via Tauri commands
- Handles file watching and state management
- Sends events to frontend when files change

### Frontend (webview)

The frontend:
- Calls Tauri commands via IPC
- Renders the UI (React/Vue/Svelte - TBD)
- Receives events when files change externally
- No direct file system access (all via Tauri commands)

### IPC Flow

```
User clicks "Complete Task"
        │
        ▼
Frontend calls: invoke('complete_task', { path })
        │
        ▼
Rust Backend: taskdn_rust::complete_task(path)
        │
        ▼
File updated on disk
        │
        ▼
File watcher detects change
        │
        ▼
Rust Backend emits event to frontend
        │
        ▼
Frontend updates UI
```

---

## Technical Decisions

### Tauri v2

Use Tauri v2 (stable as of 2024):
- Improved IPC performance (custom protocols)
- Better permission system
- Multi-webview support
- Plugin architecture

### State Management

**Backend State:**
- Single `Taskdn` instance (from Rust SDK)
- File watcher for vault changes
- Emit events on changes

**Frontend State:**
- React/Zustand or similar for UI state
- Listen to backend events
- Re-fetch data on change events

### File Watching

Use `tauri-plugin-fs-watch` or implement via `notify` in the Rust backend:

```rust
// Emit event when files change
app.emit_all("tasks-changed", TasksChangedPayload { paths })?;
```

Frontend listens:

```typescript
listen('tasks-changed', (event) => {
  refetchTasks();
});
```

---

## Project Structure

```
taskdn-desktop/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json      # File system permissions
│   └── src/
│       ├── main.rs
│       ├── commands.rs       # Tauri commands
│       └── state.rs          # App state management
├── src/                      # Frontend
│   ├── App.tsx
│   ├── components/
│   └── hooks/
├── package.json
└── vite.config.ts
```

---

## Key Features

### Quick Capture (Global Shortcut)

- Global keyboard shortcut (e.g., `Cmd+Shift+T`)
- Opens minimal capture window
- Optional: Apple Intelligence integration for task enrichment

### URL Scheme

```
taskdn://add?title=New%20Task&project=Work
taskdn://open?path=/path/to/task.md
taskdn://list?status=in-progress
```

### Notifications & Reminders

- Native OS notifications for due tasks
- Badge count for overdue items
- Optional: Calendar integration

---

## UI/UX Goals

Inspired by Things:
- Clean, minimal interface
- Keyboard-driven navigation
- Quick capture
- Today/Upcoming/Anytime views
- Project and Area organization

---

## Permissions (Tauri v2)

```json
// src-tauri/capabilities/default.json
{
  "identifier": "main-capability",
  "permissions": [
    "fs:read-all",
    "fs:write-all",
    "shell:open",
    "notification:default"
  ]
}
```

Configure scoped file system access to the configured directories only.

---

## Notes

- Existing Tauri template can be used as starting point
- May reuse components from Astro Editor for markdown editing
- This is the "flagship" interface - invest in polish
- Consider dark mode from the start
