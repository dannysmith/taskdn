# Task: URL Scheme

https://github.com/dannysmith/taskdn/issues/19

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

## Implementation Plan

### Phase 1: Tauri Deep Link Setup

1. **Install deep-link plugin**
   ```bash
   bun run tauri add deep-link
   ```

2. **Configure URL scheme in `tauri.conf.json`**
   - Register `taskdn` as the custom protocol
   - Configure for macOS (and Windows/Linux if needed)

3. **Add capability permissions** for deep-link plugin

4. **Create Rust handler** for incoming deep link events
   - Parse URL into command and parameters
   - Emit event to frontend with parsed data

### Phase 2: URL Parsing

1. **Create URL parser module** (`src/lib/deep-link.ts`)
   - Parse `taskdn://` URLs
   - Extract command (`open` or `new`)
   - Parse and validate parameters
   - Handle URL decoding

2. **Define TypeScript types** for parsed URLs
   ```typescript
   type DeepLinkCommand =
     | { type: 'open-path'; path: string }
     | { type: 'open-view'; view: NavId | 'no-area' }
     | { type: 'new'; options: CreateTaskFromUrlOptions }
   ```

### Phase 3: `open` Command Implementation

1. **Path resolution**
   - Look up entity by file path in loaded data
   - Determine entity type (task/project/area)
   - Return null if not found

2. **View navigation logic**
   - For tasks: determine correct view based on status/project/area
   - For projects/areas: navigate directly to entity view

3. **Entity selection**
   - For tasks: call `openTask()` to select and show detail panel
   - For projects/areas: set navigation selection

4. **Window focus**
   - Use Tauri window API to bring window to front
   - Only focus if entity was found

### Phase 4: `new` Command Implementation

1. **Parameter validation**
   - Validate status values
   - Validate date formats (ISO only)
   - URL-decode all string values

2. **Project/Area resolution**
   - Case-insensitive title matching
   - First match wins for duplicates

3. **Task creation**
   - Call existing `createTask` command with resolved options
   - Handle title default ("New Task")

4. **Post-creation behavior**
   - Navigate to appropriate view
   - Open detail panel
   - Focus title field with text selected

5. **Add `title` to focusable fields**
   - Extend `FocusableField` type to include `'title'`
   - Implement title focusing in `TaskDetailPanel`

### Phase 5: Update Existing Features

1. **Update `copy-local-url` command**
   - Change from `taskdn://{type}/{id}` to `taskdn://open?path=<encoded-path>`
   - Update in `src/lib/commands/entity-commands.ts`

2. **Update translations**
   - Any user-facing strings for deep link features

### Phase 6: Testing

1. **Manual testing**
   - Test all URL formats from terminal: `open "taskdn://..."`
   - Test with Obsidian integration
   - Test invalid URLs (should do nothing)

2. **Unit tests**
   - URL parsing logic
   - Parameter validation
   - Project/area title matching

### Phase 7: Documentation

1. **Update user guide** with URL scheme reference

---

## Technical Notes

### Existing Infrastructure

- **Navigation store**: `src/store/navigation-store.ts` — handles view switching
- **Task detail store**: `src/store/task-detail-store.ts` — handles task selection and panel
- **Entity commands**: `src/lib/commands/entity-commands.ts` — has `copy-local-url` to update
- **Create task**: `CreateTaskOptions` type in `src-tauri/src/vault/entities.rs`

### Deep Link Plugin

Tauri v2 deep-link plugin: https://v2.tauri.app/plugin/deep-link/

The plugin emits events when the app receives a deep link URL. We listen in Rust and forward to the frontend.

### Focus Title Implementation

Current `FocusableField` type: `'scheduled' | 'due' | 'defer' | 'status' | null`

Need to:
1. Add `'title'` to the type
2. Implement focusing logic in `TaskDetailPanel` for the title textarea
3. Select all text when focusing title

---

## Open Questions (Resolved)

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
