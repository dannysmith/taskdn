# Task: Command Registry

## Overview

This document defines ALL commands in Taskdn Desktop - their shortcuts, availability conditions, and where they appear (command palette, context menus, app menus). It serves as the single source of truth for requirements before implementation.

**Principle**: Commands are defined once. Keyboard shortcuts, menus, command palette, and context menus all derive from this registry.

## Command Properties

Each command has:

| Property | Description |
|----------|-------------|
| **ID** | Unique identifier (kebab-case) |
| **Label** | User-facing name (translation key) |
| **Shortcut** | Keyboard shortcut in Tauri format (`CmdOrCtrl+1`) or display format (⌘1) |
| **Available** | When the command can be invoked |
| **Surfaces** | Where it appears: Context Menu, Command Palette, App Menu |
| **Multi-select** | Whether it works when multiple items selected (for future) |

### Availability Conditions

- **Always**: Works regardless of context
- **Task selected**: A task item is currently selected (not in editable element) (future: also includes multiple tasks selected)
- **Project selected**: A project is selected in sidebar or project view
- **Area selected**: An area is selected in sidebar or area view
- **Entity selected**: Any of task/project/area is selected
- **Obsidian Setting On**: User has "Show Obsidian Stuff" setting on, Indicating that their three directories are inside an obsidian vault.

### Surface Abbreviations

- **CM**: Context Menu (right-click)
- **CP**: Command Palette (⌘K)
- **AM**: App Menu (macOS menu bar)

---

## UI Behaviors (Not Commands)

These are direct manipulation behaviors, not commands. They don't appear in palette/menus:

| Input | Action | Context |
|-------|--------|---------|
| ↑/↓ | Move selection | Task list focused |
| Enter | Edit selected item | Task selected |
| Escape | Deselect / close | Various |
| Tab | Move focus between panels | — |
| Shift + Tab | Move focus between panels | — |

---

## Global Commands

Always available regardless of context.

### Navigation

| ID | Label | Shortcut | CP | AM |
|----|-------|----------|----|----|
| `navigate-today` | Today | ⌘3 | Yes | View |
| `navigate-this-week` | This Week | ⌘4 | Yes | View |
| `navigate-inbox` | Inbox | ⌘5 | Yes | View |
| `navigate-calendar` | Calendar | ⌘6 | Yes | View |
| `navigate-no-area` | No Area | — | Yes | View |

### Dynamic Navigation

These are generated from current areas/projects (excluding archived areas, done/dropped projects):

| ID Pattern | Label | Shortcut | CP | AM |
|------------|-------|----------|----|----|
| `navigate-area-{id}` | {Area Name} | — | Yes | Go > Areas |
| `navigate-project-{id}` | {Project Name} | — | Yes | Go > Projects |

### UI Toggles

| ID | Label | Shortcut | CP | AM |
|----|-------|----------|----|----|
| `toggle-left-sidebar` | Toggle Left Sidebar | ⌘1 | Yes | View |
| `toggle-right-sidebar` | Toggle Right Sidebar | ⌘2 | Yes | View |
| `toggle-command-palette` | Command Palette | ⌘K | — | View |
| `collapse-all-areas` | Collapse All Areas | — | Yes | View |
| `expand-all-areas` | Expand All Areas | — | Yes | View |

### Application

| ID | Label | Shortcut | CP | AM |
|----|-------|----------|----|----|
| `open-preferences` | Preferences | ⌘, | Yes | Taskdn |
| `toggle-fullscreen` | Toggle Full Screen | ⌃⌘F | Yes | View |

---

## Task Commands

Available when a task is selected (and not in an editable element).

### Creation & Duplication

| ID | Label | Shortcut | CM | CP | AM | Multi |
|----|-------|----------|----|----|-----|-------|
| `create-task` | New Task | ⌘N | — | Yes | File | — |
| `paste-as-tasks` | Paste as Tasks | ⌘V | — | Yes | Edit | — |
| `duplicate-task` | Duplicate | ⇧⌘D | Tasks | Yes | Edit | Yes |

**Notes**:
- `create-task` is highly context-aware (see detailed spec below)
- `paste-as-tasks` creates one task per clipboard line, inserted below selected task
- Standard paste (⌘V) behavior preserved in editable elements

### Reordering

| ID | Label | Shortcut | CM | CP | AM | Multi |
|----|-------|----------|----|----|-----|-------|
| `move-task-up` | Move Up | ⌘↑ | — | Yes | Edit | Yes |
| `move-task-down` | Move Down | ⌘↓ | — | Yes | Edit | Yes |
| `move-task-to-top` | Move to Top | ⌥⌘↑ | — | Yes | Edit | Yes |
| `move-task-to-bottom` | Move to Bottom | ⌥⌘↓ | — | Yes | Edit | Yes |

### Date Editing

| ID | Label | Shortcut | CM | CP | AM | Multi |
|----|-------|----------|----|----|-----|-------|
| `edit-scheduled-date` | Edit Scheduled Date | ⌘D | Tasks | Yes | Edit | No |
| `set-scheduled-today` | Set Scheduled to Today | ⌘T | Tasks | Yes | Edit | Yes |
| `edit-due-date` | Edit Due Date | ⌥⌘D | Tasks | Yes | Edit | No |
| `edit-defer-date` | Edit Defer Until | ⇧⌥⌘D | Tasks | Yes | Edit | No |

**Note**: In future: `set-scheduled-today` will work on multiple tasks, but date editors (dropdown) can only edit one.

### Status

| ID | Label | Shortcut | CM | CP | AM | Multi |
|----|-------|----------|----|----|-----|-------|
| `edit-status` | Edit Status | ⌘S | Tasks | Yes | Edit | No |

### Clipboard

| ID | Label | Shortcut | CM | CP | AM | Multi |
|----|-------|----------|----|----|-----|-------|
| `copy-task-title` | Copy Title | ⌘C | Tasks | Yes | Edit | No |
| `copy-task-path` | Copy Path | ⌥⌘C | Tasks | Yes | Edit | No |

**Note**: Standard copy (⌘C) behavior preserved in editable elements.

---

## Entity File Operations

Available when any entity (task, project, or area) is selected. These appear in context menus for all entity types.

| ID | Label | Shortcut | CM | CP | AM | Notes |
|----|-------|----------|----|----|-----|-------|
| `reveal-in-finder` | Reveal in Finder | — | All | Yes | File | "Reveal in Explorer" on Windows |
| `open-in-default-app` | Open in Default App | — | All | Yes | File | Opens .md in system default |
| `open-in-obsidian` | Open in Obsidian | — | All | Yes | File | Only if in Obsidian vault |
| `copy-file-path` | Copy Path | — | All | Yes | Edit | Full absolute path |
| `copy-local-url` | Copy Local URL | — | All | Yes | Edit | `taskdn://` URL |
| `copy-as-markdown` | Copy as Markdown | — | All | Yes | Edit | Full file contents + path |

---

## Standard Commands

These are standard OS commands. The app menu includes them, but behavior may be context-dependent.

| ID | Label | Shortcut | AM | Notes |
|----|-------|----------|----|-------|
| `undo` | Undo | ⌘Z | Edit | Standard behavior |
| `redo` | Redo | ⇧⌘Z | Edit | Standard behavior |
| `cut` | Cut | ⌘X | Edit | Standard behavior |
| `copy` | Copy | ⌘C | Edit | `copy-task-title` when task selected |
| `paste` | Paste | ⌘V | Edit | `paste-as-tasks` when task selected |
| `select-all` | Select All | ⌘A | Edit | Standard behavior |

---

## Window Commands

Handled by OS/Tauri. Included in menus for completeness.

| ID | Label | Shortcut | AM |
|----|-------|----------|----|
| `minimize-window` | Minimize | ⌘M | Window |
| `zoom-window` | Zoom | — | Window |
| `close-window` | Close Window | ⌘W | Window |
| `bring-all-to-front` | Bring All to Front | — | Window |

---

## App Menu Structure

```
Taskdn
├── About Taskdn
├── ─────────────
├── Preferences... (⌘,)
├── ─────────────
├── Hide Taskdn (⌘H)
├── Hide Others (⌥⌘H)
├── Show All
├── ─────────────
└── Quit Taskdn (⌘Q)

File
├── New Task (⌘N)
├── ─────────────
├── Reveal in Finder
├── Open in Default App
├── Open in Obsidian
├── ─────────────
└── Close Window (⌘W)

Edit
├── Undo (⌘Z)
├── Redo (⇧⌘Z)
├── ─────────────
├── Cut (⌘X)
├── Copy (⌘C)
├── Copy Path (⌥⌘C)
├── Paste (⌘V)
├── ─────────────
├── Duplicate (⇧⌘D)
├── ─────────────
├── Edit Scheduled Date (⌘D)
├── Set Scheduled to Today (⌘T)
├── Edit Due Date (⌥⌘D)
├── Edit Defer Until (⇧⌥⌘D)
├── Edit Status (⌘S)
├── ─────────────
├── Move Up (⌘↑)
├── Move Down (⌘↓)
├── Move to Top (⌥⌘↑)
├── Move to Bottom (⌥⌘↓)
├── ─────────────
└── Select All (⌘A)

View
├── Toggle Left Sidebar (⌘1)
├── Toggle Right Sidebar (⌘2)
├── ─────────────
├── Today (⌘3)
├── This Week (⌘4)
├── Inbox (⌘5)
├── Calendar (⌘6)
├── No Area
├── ─────────────
├── Collapse All Areas
├── Expand All Areas
├── ─────────────
├── Enter Full Screen (⌃⌘F)
└── Command Palette (⌘K)

Go
├── Areas ▸
│   ├── {Area 1}
│   ├── {Area 2}
│   └── ...
└── Projects ▸
    ├── {Project 1}
    ├── {Project 2}
    └── ...

Window
├── Minimize (⌘M)
├── Zoom
├── ─────────────
└── Bring All to Front

Help
├── Taskdn Help
└── Report Issue...
```

---

## Context Menu Structure

### Task Context Menu

Right-click on any task:

```
Reveal in Finder
Open in Default App
Open in Obsidian
─────────────

Edit Scheduled Date (⌘D)
Set Scheduled to Today (⌘T)
Edit Due Date (⌥⌘D)
Edit Defer Until (⇧⌥⌘D)
Edit Status (⌘S)
─────────────
Duplicate (⇧⌘D)
─────────────
Copy Title (⌘C)
Copy Path (⌥⌘C)
Copy Local URL
Copy as Markdown
```

### Project Context Menu

Right-click on any project (sidebar or project view):

```
Reveal in Finder
Open in Default App
Open in Obsidian
─────────────
Copy Path
Copy Local URL
Copy as Markdown
```

### Area Context Menu

Right-click on any area (sidebar or area view):

```
Reveal in Finder
Open in Default App
Open in Obsidian
─────────────
Copy Path
Copy Local URL
Copy as Markdown
```

---

## Detailed Command Specs

### `create-task` (⌘N)

Highly context-aware task creation:

| Context | Behavior |
|---------|----------|
| Task selected in list | Create new task immediately below, open for editing |
| Task list focused, none selected | Create at bottom of list, open for editing |
| In area view (no task selected) | Create in area's default location |
| In project view (no task selected) | Create in project |
| Global (no list context) | Create in Inbox |

**Implementation note**: Existing logic in the app handles all this. The command should wrap that logic.

### `paste-as-tasks` (⌘V when task selected)

- Reads clipboard text
- Splits by newlines
- Creates one task per non-empty line
- Inserts all below currently selected task
- Does NOT open any for editing
- Tasks created in same location as if created with ⌘N at that position

### `copy-task-title` (⌘C when task selected)

- Only activates when task is selected AND not in editable element
- Copies the task's title (not filename, not full content)
- Standard ⌘C behavior preserved in inputs/textareas

---

## Shortcut Reference (Quick Lookup)

| Shortcut | Command |
|----------|---------|
| ⌘, | Preferences |
| ⌘1 | Toggle Left Sidebar |
| ⌘2 | Toggle Right Sidebar |
| ⌘3 | Today |
| ⌘4 | This Week |
| ⌘5 | Inbox |
| ⌘6 | Calendar |
| ⌘K | Command Palette |
| ⌘N | New Task |
| ⌘C | Copy (Title when task selected) |
| ⌘V | Paste (As Tasks when task selected) |
| ⌘D | Edit Scheduled Date |
| ⌘T | Set Scheduled to Today |
| ⌘S | Edit Status |
| ⌘↑ | Move Up |
| ⌘↓ | Move Down |
| ⇧⌘D | Duplicate |
| ⇧⌘Z | Redo |
| ⌥⌘C | Copy Path |
| ⌥⌘D | Edit Due Date |
| ⌥⌘↑ | Move to Top |
| ⌥⌘↓ | Move to Bottom |
| ⇧⌥⌘D | Edit Defer Until |
| ⌃⌘F | Toggle Full Screen |
| ⌘Z | Undo |
| ⌘X | Cut |
| ⌘A | Select All |
| ⌘M | Minimize |
| ⌘W | Close Window |
| ⌘H | Hide App |
| ⌘Q | Quit |

---

## Open Questions

1. **Help menu**: What should "Taskdn Help" link to? Documentation site?
2. **Report Issue**: Should this open GitHub issues or a feedback form?

---

## Implementation Notes

This document defines requirements. Implementation tasks will reference this document:

- **Task 6**: Keyboard shortcut infrastructure (parsing, matching, unified handler)
- **Task 8**: Command palette enhancements (contextual commands display)
- **Task 9**: Task-specific shortcuts implementation
- **Task 10**: Context menus (native Tauri menus)
- **Task 11**: App menus (macOS menu bar)

The implementation should:
1. Define commands with a `surfaces` property indicating where they appear
2. Use `isAvailable()` for context-dependent commands
3. Include a `supportsMultiSelect` flag for future multi-select support
