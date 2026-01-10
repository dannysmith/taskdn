# Task: App Menus Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for the complete app menu structure.

## Overview

Implement the macOS application menu bar with all menus defined in the command registry. This builds on the existing menu infrastructure in `src/lib/menu.ts`.

## Prerequisites

- Task 8 complete (commands exist)
- Task 9 complete (task commands exist)
- Task 10 helpful but not required (shared patterns)

## Menu Structure

From the registry:

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
└── Taskdn Help (opens docs site)
```

## Implementation Approach

### Current Infrastructure

The app already has `src/lib/menu.ts` with basic menu setup. Extend this to include all menus.

### Menu Item States

Many menu items should be disabled based on context:

```typescript
// Task-specific items disabled when no task selected
await MenuItem.new({
  text: t('menu.edit.duplicate'),
  accelerator: 'CmdOrCtrl+Shift+D',
  enabled: hasSelectedTask(),
  action: () => executeCommand('duplicate-task', context),
})
```

### Dynamic Enable/Disable

Menu items need to update their enabled state. Options:

**Option A: Rebuild menu on state change**

```typescript
// Listen for selection changes
useEffect(() => {
  rebuildAppMenu()
}, [selectedTaskId])
```

**Option B: Use Tauri's menu item references**

```typescript
// Store references to items that need updating
const duplicateItem = await MenuItem.new({ ... })
menuItemRefs.set('duplicate-task', duplicateItem)

// Update when state changes
function updateMenuStates() {
  const duplicateItem = menuItemRefs.get('duplicate-task')
  duplicateItem.setEnabled(hasSelectedTask())
}
```

Option B is more performant but requires managing refs.

### Dynamic Submenus (Go > Areas/Projects)

```typescript
async function buildGoMenu(context: CommandContext): Promise<Submenu> {
  const areas = context.getAreas().filter(a => a.status !== 'archived')
  const projects = context
    .getProjects()
    .filter(p => p.status !== 'done' && p.status !== 'dropped')

  const areasSubmenu = await Submenu.new({
    text: t('menu.go.areas'),
    items: await Promise.all(
      areas.map(area =>
        MenuItem.new({
          text: area.title,
          action: () => executeCommand(`navigate-area-${area.id}`, context),
        })
      )
    ),
  })

  const projectsSubmenu = await Submenu.new({
    text: t('menu.go.projects'),
    items: await Promise.all(
      projects.map(project =>
        MenuItem.new({
          text: project.title,
          action: () =>
            executeCommand(`navigate-project-${project.id}`, context),
        })
      )
    ),
  })

  return Submenu.new({
    text: t('menu.go'),
    items: [areasSubmenu, projectsSubmenu],
  })
}
```

Dynamic menus need rebuilding when areas/projects change.

### Standard macOS Items

Use Tauri's predefined items for standard behavior:

```typescript
import { PredefinedMenuItem } from '@tauri-apps/api/menu'

// App menu
await PredefinedMenuItem.new({ item: 'About', text: 'About Taskdn' })
await PredefinedMenuItem.new({ item: 'Separator' })
await PredefinedMenuItem.new({ item: 'Hide' })
await PredefinedMenuItem.new({ item: 'HideOthers' })
await PredefinedMenuItem.new({ item: 'ShowAll' })
await PredefinedMenuItem.new({ item: 'Separator' })
await PredefinedMenuItem.new({ item: 'Quit' })

// Edit menu
await PredefinedMenuItem.new({ item: 'Undo' })
await PredefinedMenuItem.new({ item: 'Redo' })
await PredefinedMenuItem.new({ item: 'Cut' })
await PredefinedMenuItem.new({ item: 'Copy' })
await PredefinedMenuItem.new({ item: 'Paste' })
await PredefinedMenuItem.new({ item: 'SelectAll' })

// Window menu
await PredefinedMenuItem.new({ item: 'Minimize' })
await PredefinedMenuItem.new({ item: 'Zoom' })
await PredefinedMenuItem.new({ item: 'CloseWindow' })
```

### Routing Through Commands

All custom menu items should route through the command system:

```typescript
await MenuItem.new({
  text: t('menu.view.today'),
  accelerator: 'CmdOrCtrl+3',
  action: () => executeCommand('navigate-today', context),
})
```

This ensures consistent behavior whether triggered via menu, keyboard, or command palette.

### Help Menu

```typescript
await MenuItem.new({
  text: t('menu.help.taskdnHelp'),
  action: () => {
    // Open in default browser
    open('https://tdn.danny.is/desktop/overview/')
  },
})
```

## Implementation Steps

1. Review and extend existing `src/lib/menu.ts`
2. Add all menu items from registry
3. Implement dynamic Go menu with areas/projects
4. Add enabled/disabled state management
5. Wire all items through `executeCommand()`
6. Add menu item translations
7. Test all menu items work correctly
8. Handle menu rebuilding on data changes

## Files to Change

| File                                           | Change                    |
| ---------------------------------------------- | ------------------------- |
| `src/lib/menu.ts`                              | Extend with all menus     |
| `src/hooks/use-main-window-event-listeners.ts` | Handle menu state updates |
| `locales/en.json`                              | Add menu translations     |

## Menu State Management

### Items That Need Dynamic State

| Menu Item               | Enabled When                          |
| ----------------------- | ------------------------------------- |
| Reveal in Finder        | Entity selected                       |
| Open in Default App     | Entity selected                       |
| Open in Obsidian        | Entity selected + Obsidian setting on |
| Duplicate               | Task selected                         |
| Edit Scheduled Date     | Task selected                         |
| Set Scheduled to Today  | Task selected                         |
| Edit Due Date           | Task selected                         |
| Edit Defer Until        | Task selected                         |
| Edit Status             | Task selected                         |
| Move Up/Down/Top/Bottom | Task selected                         |
| Copy Title              | Task selected                         |
| Copy Path               | Entity selected                       |

### State Update Triggers

- Task selection changes
- View changes (area vs project vs today)
- Obsidian setting changes
- Areas/projects list changes (for Go menu)

## Platform Considerations

### macOS Only (For Now)

This task focuses on macOS. Windows/Linux app menus work differently:

- Windows: Menu bar inside window, or system tray
- Linux: Varies by desktop environment

These _may_ be implemented in the future.

### Keyboard Shortcut Display

Tauri handles displaying accelerators in menus. Use the same format as command shortcuts:

- `CmdOrCtrl+1` displays as `⌘1` on Mac, `Ctrl+1` on Windows

## Success Criteria

1. All menu items from registry are present
2. Menu items trigger correct commands
3. Task-specific items disabled when no task selected
4. Go menu shows current areas and projects
5. Help opens documentation in browser
6. Standard items (Undo, Redo, etc.) work correctly
7. Accelerators match command shortcuts
