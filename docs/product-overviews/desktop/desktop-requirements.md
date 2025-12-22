# Desktop App - Requirements & Overview

Cross-platform Tauri desktop application.

## Context & Dependencies

**Depends on:** CLI's embedded Rust core must be extracted to a shared workspace crate first.

**Important:** Uses the **Rust core directly**, NOT via NAPI-RS bindings.

- NAPI-RS produces `.node` files which only work in Node.js/Bun
- Tauri's frontend runs in a webview, not Node.js
- The Rust core will be imported as a Cargo dependency in `src-tauri/Cargo.toml`

See [CLI Technical Overview](../cli/cli-tech.md#sdk-extraction-for-desktop-app) for the extraction plan.

---

## Scope

- Things-like UI/UX for day-to-day task management
- Cross-platform Tauri v2 app (macOS, Linux, Windows)
- URL scheme support (`taskdn://`)
- Global keyboard shortcut for quick task capture
- Native notifications and reminders
- File watching for external changes

---

## Key Features

### Quick Capture (Global Shortcut)

- Global keyboard shortcut (e.g., `Cmd+Shift+T`)
- Opens minimal capture window
- Optional: Apple Intelligence integration for task enrichment

### URL Scheme

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

## Task Ordering & Reordering

Planning views (today, project planning) need manual task reordering. This is a UI concern, not a task property—the same task might be #1 in "today" but #5 in its project view.
