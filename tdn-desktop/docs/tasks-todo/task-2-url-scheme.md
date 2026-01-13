# Task: URL Scheme

https://github.com/dannysmith/taskdn/issues/19

**Status: Implementation Complete** - Ready for documentation and final testing.

## Overview

Taskdn Desktop supports a `taskdn://` URL scheme for deep linking into the app. This enables:

- Opening tasks, projects, and areas from external tools (Obsidian, Alfred, Raycast, etc.)
- Navigating directly to views (Today, Inbox, Calendar, etc.)
- Creating new tasks with pre-filled fields

The scheme follows conventions from [Obsidian URI](https://help.obsidian.md/Extending+Obsidian/Obsidian+URI) and [Things URL Scheme](https://culturedcode.com/things/support/articles/2803573/).

---

## URL Scheme Reference

### Commands

| Command | Purpose |
|---------|---------|
| `taskdn://open` | Open an entity or navigate to a view |
| `taskdn://new` | Create a new task |

---

### `open` Command

Opens an existing task, project, area, or navigates to a view.

#### Open by File Path

```
taskdn://open?path=<url-encoded-absolute-path>
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | URL-encoded absolute path to a `.md` file |

**Behavior by entity type:**

| Entity | View Opened | Selection |
|--------|-------------|-----------|
| Task (status: inbox) | Inbox | Task selected, detail panel opens |
| Task (in project) | Project view | Task selected, detail panel opens |
| Task (in area, no project) | Area view | Task selected, detail panel opens |
| Task (no area, no project) | No Area view | Task selected, detail panel opens |
| Project | Project view | — |
| Area | Area view | — |

**Examples:**

```
taskdn://open?path=%2FUsers%2Fdanny%2Fvault%2Ftasks%2Fmy-task.md
taskdn://open?path=%2FUsers%2Fdanny%2Fvault%2Fprojects%2Fwebsite-redesign.md
```

**Error handling:** If the path is invalid or does not point to a valid task/project/area file, the URL is silently ignored. The app does not come to foreground.

#### Open by View

```
taskdn://open?view=<view-name>
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `view` | Yes | View identifier (lowercase, kebab-case) |

**Supported views:**

| View Name | Description |
|-----------|-------------|
| `today` | Today view |
| `this-week` | This Week view |
| `inbox` | Inbox view |
| `calendar` | Calendar view |
| `no-area` | No Area view (orphan tasks/projects) |

**Examples:**

```
taskdn://open?view=today
taskdn://open?view=this-week
taskdn://open?view=inbox
```

**Error handling:** Invalid view names are silently ignored. The app does not come to foreground.

---

### `new` Command

Creates a new task and opens it for editing.

```
taskdn://new?title=<title>&status=<status>&...
```

| Parameter | Required | Format | Description |
|-----------|----------|--------|-------------|
| `title` | No | URL-encoded string | Task title. Defaults to "New Task" if omitted. |
| `status` | No | Lowercase kebab-case | Task status. Defaults to `inbox`. |
| `due` | No | ISO date (`YYYY-MM-DD`) | Due date |
| `scheduled` | No | ISO date (`YYYY-MM-DD`) | Scheduled date |
| `defer-until` | No | ISO date (`YYYY-MM-DD`) | Defer until date |
| `project` | No | URL-encoded string | Project title (case-insensitive match) |
| `area` | No | URL-encoded string | Area title (case-insensitive match) |
| `body` | No | URL-encoded string | Task notes (supports Markdown, newlines) |

**Valid status values:**

- `inbox` (default)
- `icebox`
- `ready`
- `in-progress`
- `blocked`
- `dropped`
- `done`

**Behavior:**

1. Creates the task with provided (valid) parameters
2. Invalid parameters are silently ignored
3. Navigates to the appropriate view (same logic as `open`)
4. Opens the detail panel
5. Focuses the title field with text selected

**View selection after creation:**

| Condition | View Opened |
|-----------|-------------|
| Status is `inbox` | Inbox |
| Project provided (and valid) | Project view |
| Area provided (and valid, no project) | Area view |
| Otherwise | No Area view |

**Examples:**

```
# Simple inbox task
taskdn://new?title=Buy%20groceries

# Task with project
taskdn://new?title=Update%20homepage&project=Website%20Redesign

# Task with dates
taskdn://new?title=Review%20PR&due=2025-01-20&scheduled=2025-01-15

# Task with body content
taskdn://new?title=Meeting%20notes&body=Discussed%3A%0A-%20Budget%0A-%20Timeline

# Minimal (creates "New Task" in inbox)
taskdn://new
```

**Project/Area matching:**

- Match is case-insensitive
- If multiple entities have the same title, first match wins
- If no match found, parameter is ignored (task created without that association)

---

### General Behavior

#### Window Focus

- Valid URLs: Bring app to foreground and focus window
- Invalid URLs: Do nothing, app stays in background

#### URL Encoding

All parameter values must be URL-encoded. Standard percent-encoding applies:

| Character | Encoded |
|-----------|---------|
| Space | `%20` |
| Newline | `%0A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `&` | `%26` |
| `=` | `%3D` |

---

## Implementation Summary

### Completed Work

**Files Created:**
- `src/lib/deep-link.ts` - URL parsing module with types and validation
- `src/lib/deep-link.test.ts` - 26 unit tests for URL parsing
- `src/hooks/use-deep-link.ts` - React hook for handling deep link events

**Files Modified:**
- `src-tauri/src/lib.rs` - Deep-link plugin registration (after single-instance)
- `src-tauri/tauri.conf.json` - Added `taskdn` scheme configuration
- `src-tauri/capabilities/desktop.json` - Added `deep-link:default` permission
- `src/App.tsx` - Added `useDeepLink()` hook at app root
- `src/store/task-detail-store.ts` - Added `'title'` to `FocusableField` type
- `src/components/tasks/task-detail-panel.tsx` - Implemented title focusing with text selection
- `src/lib/commands/entity-commands.ts` - Updated `copy-local-url` to use new URL format

**Packages Added:**
- `tauri-plugin-deep-link` (Rust)
- `@tauri-apps/plugin-deep-link` (JavaScript)

### Testing Notes

- **macOS limitation**: Deep links only work with a bundled .app, not in `tauri dev` mode
- **Build command**: `bun run tauri build --debug --bundles app`
- **Testing method**: Paste URLs directly in browser address bar (works reliably)
- The `open "taskdn://..."` terminal command may not work on all systems

### Remaining Work

1. **Documentation** - Add URL scheme reference to user guide
2. **Obsidian integration docs** - Document how to use with Obsidian plugin

---

## Design Decisions (Resolved)

These questions were discussed and resolved during planning:

1. **URL format**: Path-based (`taskdn://open?path=`) to match Obsidian
2. **Project/Area matching**: Title-based, case-insensitive, first match wins
3. **View names**: Kebab-case (`this-week`, `no-area`)
4. **Focus after new**: Title field focused with text selected
5. **Body content**: URL-encoded, supports Markdown/newlines, no max length
6. **Error handling**: Silent ignore, don't bring app to foreground for invalid URLs
7. **ID-based opening**: Not supported (IDs are path hashes, not permanent)
8. **Window focus**: Bring to foreground for valid URLs
9. **Date formats**: ISO only (`YYYY-MM-DD`)
10. **Case sensitivity**: Lowercase only for views/status
11. **Empty title**: Defaults to "New Task"
