# Task: Context Menus Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for context menu structure per entity type.

## Overview

Implement native Tauri context menus for tasks, projects, and areas. Right-clicking on any entity shows relevant actions from the command registry.

## Prerequisites

- Task 8 complete (command system with `surfaces.contextMenu` property)
- Task 9 complete (task commands implemented)

## Current State

**What exists:**

- Context menu utilities in `src/lib/context-menu.ts` with `showContextMenu()`, `showEditContextMenu()`, `showTextInputContextMenu()`
- Command system with `surfaces` property pattern already in use
- Task commands from Task 9: `set-scheduled-today`, `edit-scheduled-date`, `edit-due-date`, `edit-defer-date`, `edit-status`, `copy-task-title`, `duplicate-task`
- TanStack Query preferences system with Rust backend

**What's missing:**

- Entity file operation commands (reveal-in-finder, open-in-default-app, copy-file-path, etc.)
- `open-in-obsidian` command
- Obsidian setting in preferences
- Context menu builders that dynamically construct menus from commands
- `onContextMenu` handlers attached to UI components
- Platform-specific label handling

---

## Phase 1: Obsidian Setting in Preferences

Add a toggle to preferences controlling Obsidian feature visibility.

### 1.1 Rust Backend Changes

**File: `src-tauri/src/types.rs`**

Add field to `AppPreferences`:

```rust
pub struct AppPreferences {
    // ... existing fields
    /// Whether to show Obsidian-related features (Open in Obsidian menu item, etc.)
    /// Indicates user's vault directories are inside an Obsidian vault
    pub show_obsidian_features: Option<bool>,
}
```

Update `Default` impl to include `show_obsidian_features: None` (defaults to false/hidden).

### 1.2 Frontend Preferences Service

**File: `src/services/preferences.ts`**

Update default preferences to include `show_obsidian_features: null`.

### 1.3 Preferences UI

**File: `src/components/preferences/GeneralPane.tsx`** (or new IntegrationsPane)

Add a toggle switch:

- Label: "Show Obsidian Features"
- Description: "Enable if your task/project/area directories are inside an Obsidian vault"
- Persists to preferences via `useSavePreferences()`

### 1.4 Expose Setting in CommandContext

**File: `src/hooks/use-command-context.ts`**

Add method to `CommandContext`:

```typescript
isObsidianEnabled: () => boolean
```

This reads from TanStack Query preferences cache.

### Checkpoint - Phase 1

- [ ] Preferences UI shows toggle
- [ ] Setting persists between sessions
- [ ] `commandContext.isObsidianEnabled()` returns correct value

---

## Phase 2: Entity File Operation Commands

Create commands that work on any entity (task, project, area) for file operations.

### 2.1 New File: `src/lib/commands/entity-commands.ts`

Commands to implement:

| Command ID            | Action                                       | Surfaces             |
| --------------------- | -------------------------------------------- | -------------------- |
| `reveal-in-finder`    | Open file's parent folder in OS file manager | CM: all, CP: yes     |
| `open-in-default-app` | Open .md file with system default app        | CM: all, CP: yes     |
| `open-in-obsidian`    | Open file via `obsidian://open?path=` URL    | CM: all (if enabled) |
| `copy-file-path`      | Copy absolute file path to clipboard         | CM: all, CP: yes     |
| `copy-local-url`      | Copy `taskdn://` URL to clipboard            | CM: all, CP: yes     |
| `copy-as-markdown`    | Copy entity as Markdown (title + content)    | CM: all, CP: yes     |

### 2.2 Command Context: Target Entity

Commands need access to the entity being operated on. Add to `CommandContext`:

```typescript
interface CommandContext {
  // ... existing

  // Context menu target (set before showing menu, cleared after)
  contextMenuTarget: Entity | null
  setContextMenuTarget: (entity: Entity | null) => void
  getContextMenuTarget: () => Entity | null
}

type Entity = Task | Project | Area
```

This allows commands to access the target without modifying their signatures.

### 2.3 Tauri Opener Plugin (Already Included)

The project already has `tauri-plugin-opener` which provides all needed functionality:

**reveal-in-finder**: Use `revealItemInDir()` from `@tauri-apps/plugin-opener`
**open-in-default-app**: Use `openPath()` from `@tauri-apps/plugin-opener`
**open-in-obsidian**: Use `openUrl()` with `obsidian://open?path=<encoded_path>`

No new Rust code needed - just call the JS APIs from the opener plugin.

### 2.4 Clipboard Operations

For copy commands, use `navigator.clipboard.writeText()` (web API) - no Rust needed.

### 2.5 Platform-Specific Labels

Use i18n with platform detection:

```typescript
// In entity-commands.ts
const isMac = navigator.platform.includes('Mac')

{
  id: 'reveal-in-finder',
  labelKey: isMac ? 'commands.revealInFinder' : 'commands.revealInExplorer',
  // ...
}
```

Or use a single key with platform interpolation in locales.

### Checkpoint - Phase 2

- [ ] All 6 entity commands exist and are registered
- [ ] Commands appear in command palette (when entity selected)
- [ ] `reveal-in-finder` opens Finder/Explorer to file location
- [ ] `open-in-default-app` opens file in default .md handler
- [ ] `open-in-obsidian` only available when setting enabled
- [ ] Copy commands work correctly

---

## Phase 3: Context Menu Builder System

Create infrastructure to dynamically build context menus from the command registry.

### 3.1 Context Menu Module Structure

Replace simple `src/lib/context-menu.ts` with:

```
src/lib/context-menu/
├── index.ts              # Re-exports
├── types.ts              # ContextMenuGroup, etc.
├── build-menu.ts         # buildEntityContextMenu()
├── show-menu.ts          # showTaskContextMenu(), showProjectContextMenu(), showAreaContextMenu()
└── predefined.ts         # Keep existing showEditContextMenu(), showTextInputContextMenu()
```

### 3.2 Build Menu from Commands

**File: `src/lib/context-menu/build-menu.ts`**

```typescript
async function buildEntityContextMenu(
  entityType: 'task' | 'project' | 'area',
  entity: Entity,
  context: CommandContext
): Promise<Menu>
```

Logic:

1. Get all commands where `surfaces.contextMenu` includes `entityType`
2. Filter by `isAvailable(context)`
3. Filter out `open-in-obsidian` if `!context.isObsidianEnabled()`
4. Group by `group` property
5. Add separators between groups
6. Build Tauri Menu with items

### 3.3 Context Menu Group Ordering

Define explicit group order for context menus:

```typescript
const CONTEXT_MENU_GROUP_ORDER = [
  'file', // reveal, open, obsidian
  'dates', // scheduled, due, defer (tasks only)
  'status', // edit status (tasks only)
  'actions', // duplicate (tasks only)
  'clipboard', // copy title, path, url, markdown
]
```

Commands need a `contextMenuGroup` property (or reuse `group` with this order).

### 3.4 Entity-Specific Show Functions

```typescript
async function showTaskContextMenu(
  task: Task,
  context: CommandContext
): Promise<void>
async function showProjectContextMenu(
  project: Project,
  context: CommandContext
): Promise<void>
async function showAreaContextMenu(
  area: Area,
  context: CommandContext
): Promise<void>
```

Each:

1. Calls `context.setContextMenuTarget(entity)`
2. Builds menu via `buildEntityContextMenu()`
3. Shows menu via `menu.popup()`
4. Note: Target cleanup happens when command executes or menu dismissed

### Checkpoint - Phase 3

- [ ] `buildEntityContextMenu()` produces correct menu structure
- [ ] Groups separated by dividers
- [ ] Commands filtered by availability
- [ ] Obsidian command conditionally included

---

## Phase 4: Attach Context Menus to UI Components

Add `onContextMenu` handlers to task, project, and area components.

### 4.1 Task Components

**Primary: `src/components/tasks/task-item.tsx`**

This is the pure presentational component used by TaskListItem. Add:

```tsx
onContextMenu={(e) => {
  e.preventDefault()
  e.stopPropagation()
  showTaskContextMenu(task, commandContext)
}}
```

Need to pass `commandContext` or use a hook. Options:

- Pass context as prop (adds prop drilling)
- Use `useCommandContext()` hook in TaskItem
- Create a wrapper hook `useTaskContextMenu(task)`

Recommend: Create `useTaskContextMenu(task)` that returns `handleContextMenu` callback.

**Also consider:** `task-detail-panel.tsx` - right-click on panel header could show same menu.

### 4.2 Project Components

**File: `src/components/sidebar/draggable-project.tsx`**

Add `onContextMenu` to `SidebarMenuButton` or wrapper div.

### 4.3 Area Components

**File: `src/components/sidebar/draggable-area.tsx`**

Add `onContextMenu` to area header element.

### 4.4 Context Menu Hooks

Create convenience hooks:

```typescript
// src/hooks/use-entity-context-menu.ts
function useTaskContextMenu(task: Task): {
  onContextMenu: (e: React.MouseEvent) => void
}
function useProjectContextMenu(project: Project): {
  onContextMenu: (e: React.MouseEvent) => void
}
function useAreaContextMenu(area: Area): {
  onContextMenu: (e: React.MouseEvent) => void
}
```

These encapsulate the preventDefault, context setting, and menu showing.

### Checkpoint - Phase 4

- [ ] Right-click on task shows task context menu
- [ ] Right-click on project in sidebar shows project context menu
- [ ] Right-click on area in sidebar shows area context menu
- [ ] Context menus don't interfere with drag-and-drop

---

## Phase 5: Update Task Commands for Context Menu

Existing task commands from Task 9 need `surfaces.contextMenu` added.

### 5.1 Update `src/lib/commands/task-commands.ts`

Add to each command:

```typescript
surfaces: {
  commandPalette: true,
  contextMenu: ['task'],  // Only show in task context menu
}
```

Commands to update:

- `set-scheduled-today`
- `edit-scheduled-date`
- `edit-due-date`
- `edit-defer-date`
- `edit-status`
- `copy-task-title`
- `duplicate-task`

### 5.2 Group Assignment

Assign `contextMenuGroup` for proper ordering:

- `edit-scheduled-date`, `set-scheduled-today`, `edit-due-date`, `edit-defer-date` → `'dates'`
- `edit-status` → `'status'`
- `duplicate-task` → `'actions'`
- `copy-task-title` → `'clipboard'`

### Checkpoint - Phase 5

- [ ] Task context menu shows all task commands
- [ ] Commands grouped correctly with separators
- [ ] Shortcuts displayed next to command labels

---

## Phase 6: Translations and Polish

### 6.1 Locale Files

**File: `locales/en.json`**

Add translations:

```json
{
  "commands": {
    "revealInFinder": "Reveal in Finder",
    "revealInExplorer": "Reveal in Explorer",
    "openInDefaultApp": "Open in Default App",
    "openWithDefaultProgram": "Open with Default Program",
    "openInObsidian": "Open in Obsidian",
    "copyFilePath": "Copy Path",
    "copyLocalUrl": "Copy Local URL",
    "copyAsMarkdown": "Copy as Markdown"
  },
  "preferences": {
    "showObsidianFeatures": "Show Obsidian Features",
    "showObsidianFeaturesDescription": "Enable if your directories are inside an Obsidian vault"
  }
}
```

### 6.2 Platform Detection

Ensure labels adapt:

- macOS: "Reveal in Finder", "Open in Default App"
- Windows/Linux: "Reveal in Explorer", "Open with Default Program"

### Checkpoint - Phase 6

- [ ] All strings translated
- [ ] Platform-appropriate labels shown

---

## Files Summary

### New Files

| File                                   | Purpose                        |
| -------------------------------------- | ------------------------------ |
| `src/lib/context-menu/index.ts`        | Module exports                 |
| `src/lib/context-menu/types.ts`        | Type definitions               |
| `src/lib/context-menu/build-menu.ts`   | Build menus from commands      |
| `src/lib/context-menu/show-menu.ts`    | Entity-specific show functions |
| `src/lib/context-menu/predefined.ts`   | Migrated from context-menu.ts  |
| `src/lib/commands/entity-commands.ts`  | Entity file operation commands |
| `src/hooks/use-entity-context-menu.ts` | Context menu handler hooks     |

### Modified Files

| File                                           | Change                                         |
| ---------------------------------------------- | ---------------------------------------------- |
| `src-tauri/src/types.rs`                       | Add `show_obsidian_features` to AppPreferences |
| `src/services/preferences.ts`                  | Update default preferences                     |
| `src/components/preferences/GeneralPane.tsx`   | Add Obsidian toggle                            |
| `src/hooks/use-command-context.ts`             | Add `isObsidianEnabled`, `contextMenuTarget`   |
| `src/lib/commands/task-commands.ts`            | Add `surfaces.contextMenu`                     |
| `src/lib/commands/index.ts`                    | Register entity commands                       |
| `src/components/tasks/task-item.tsx`           | Add onContextMenu                              |
| `src/components/sidebar/draggable-project.tsx` | Add onContextMenu                              |
| `src/components/sidebar/draggable-area.tsx`    | Add onContextMenu                              |
| `locales/en.json`                              | Add translations                               |

### Deleted Files

| File                      | Reason                           |
| ------------------------- | -------------------------------- |
| `src/lib/context-menu.ts` | Migrated to context-menu/ module |

---

## Dependencies

- **tauri-plugin-opener**: Already included in `Cargo.toml`. Provides `revealItemInDir()`, `openPath()`, and `openUrl()` for file/URL operations.

---

## Edge Cases

### Drag vs Right-Click

- Ensure right-click doesn't trigger drag
- Context menu should work even when drag-and-drop is active

### Menu Dismissal

- Clear `contextMenuTarget` when menu is dismissed without selection
- Tauri Menu API may not provide dismiss callback - may need workaround

### Obsidian URL Encoding

- File paths with spaces need URL encoding: `encodeURIComponent(path)`
- Format: `obsidian://open?path=%2Fhome%2Fuser%2Fmy%20vault%2Fpath%2Fto%2Fnote.md`

### Tasks in Different Views

- Context menu should work on tasks in: Today, This Week, Inbox, Project views, Area views
- All use same TaskItem component, so handler placement there covers all cases

---

## Success Criteria

1. Right-click on task shows task context menu with all task commands + entity commands
2. Right-click on project shows project context menu
3. Right-click on area shows area context menu
4. All menu items execute correct commands
5. Obsidian option only shows when setting is enabled
6. Keyboard shortcuts shown next to command labels in menu
7. Platform-appropriate labels (Finder vs Explorer)
8. Commands operate on the right-clicked entity, not necessarily the "selected" entity
