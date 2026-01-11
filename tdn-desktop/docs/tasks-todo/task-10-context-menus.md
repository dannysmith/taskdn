# Task: Context Menus Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for context menu structure per entity type.

## Overview

Implement native Tauri context menus for tasks, projects, and areas. Right-clicking on any entity shows relevant actions from the command registry.

## Prerequisites

- Task 8 complete (commands exist with `surfaces.contextMenu` property)
- Task 9 complete (task commands implemented)

## Context Menu Structure

From the registry:

### Task Context Menu

```
Reveal in Finder
Open in Default App
Open in Obsidian          (if Obsidian Setting On)
─────────────

Edit Scheduled Date       ⌘D
Set Scheduled to Today    ⌘T
Edit Due Date             ⇧⌘D
Edit Defer Until          ⌃⇧⌘D
Edit Status               ⌘S
─────────────
Duplicate                 ⌘'
─────────────
Copy Title                ⌘C
Copy Path                 ⌥⌘C
Copy Local URL
Copy as Markdown
```

### Project Context Menu

```
Reveal in Finder
Open in Default App
Open in Obsidian          (if Obsidian Setting On)
─────────────
Copy Path
Copy Local URL
Copy as Markdown
```

### Area Context Menu

```
Reveal in Finder
Open in Default App
Open in Obsidian          (if Obsidian Setting On)
─────────────
Copy Path
Copy Local URL
Copy as Markdown
```

## Implementation Approach

### Using Tauri's Menu API

```typescript
import {
  Menu,
  MenuItem,
  Submenu,
  PredefinedMenuItem,
} from '@tauri-apps/api/menu'

async function showTaskContextMenu(task: Task, context: CommandContext) {
  const showObsidian = context.isObsidianSettingOn()

  const menu = await Menu.new({
    items: [
      // File operations
      await MenuItem.new({
        text: t('contextMenu.revealInFinder'),
        action: () => executeCommand('reveal-in-finder', context, task),
      }),
      await MenuItem.new({
        text: t('contextMenu.openInDefaultApp'),
        action: () => executeCommand('open-in-default-app', context, task),
      }),
      ...(showObsidian
        ? [
            await MenuItem.new({
              text: t('contextMenu.openInObsidian'),
              action: () => executeCommand('open-in-obsidian', context, task),
            }),
          ]
        : []),

      await PredefinedMenuItem.new({ item: 'Separator' }),

      // Date commands
      await MenuItem.new({
        text: t('contextMenu.editScheduledDate'),
        accelerator: 'CmdOrCtrl+D',
        action: () => executeCommand('edit-scheduled-date', context, task),
      }),
      // ... more items
    ],
  })

  await menu.popup()
}
```

### Command Integration

Commands with `surfaces.contextMenu` should be included:

```typescript
function getContextMenuCommands(
  entityType: 'task' | 'project' | 'area',
  context: CommandContext
): AppCommand[] {
  return getAllCommands(context).filter(cmd => {
    if (!cmd.surfaces?.contextMenu) return false
    return cmd.surfaces.contextMenu.includes(entityType)
  })
}
```

### Building Menus from Commands

```typescript
async function buildContextMenu(
  commands: AppCommand[],
  entity: Entity,
  context: CommandContext
): Promise<Menu> {
  const items: (MenuItem | PredefinedMenuItem)[] = []

  // Group commands by category
  const groups = groupBy(commands, cmd => cmd.group || 'default')

  for (const [groupName, groupCommands] of Object.entries(groups)) {
    if (items.length > 0) {
      items.push(await PredefinedMenuItem.new({ item: 'Separator' }))
    }

    for (const cmd of groupCommands) {
      items.push(
        await MenuItem.new({
          text: t(cmd.labelKey),
          accelerator: cmd.shortcut,
          enabled: !cmd.isAvailable || cmd.isAvailable(context),
          action: () => executeCommand(cmd.id, context, entity),
        })
      )
    }
  }

  return Menu.new({ items })
}
```

### Triggering Context Menus

```typescript
// In component
<div
  onContextMenu={(e) => {
    e.preventDefault()
    showTaskContextMenu(task, commandContext)
  }}
>
  {/* task content */}
</div>
```

### Platform-Specific Labels

| Action                | macOS                 | Windows                     |
| --------------------- | --------------------- | --------------------------- |
| `reveal-in-finder`    | "Reveal in Finder"    | "Reveal in Explorer"        |
| `open-in-default-app` | "Open in Default App" | "Open with Default Program" |

Use i18n keys that resolve differently per platform, or detect platform at runtime.

## Entity-Specific Context

Commands need to know which entity they're operating on:

```typescript
// Option 1: Pass entity to executeCommand
executeCommand('copy-file-path', context, { entity: task })

// Option 2: Set selected entity before showing menu
context.setSelectedEntity(task)
await menu.popup()

// Option 3: Commands read from context
execute: context => {
  const entity = context.getContextMenuTarget()
  // operate on entity
}
```

Recommend Option 2 or 3 for cleaner command implementations.

## Implementation Steps

1. Create `src/lib/context-menu/` module
2. Implement menu builders for each entity type
3. Add `onContextMenu` handlers to entity components
4. Ensure commands can access target entity
5. Handle Obsidian visibility based on setting
6. Add platform-specific label handling
7. Test all menu items trigger correct actions

## Files to Create/Change

| File                                        | Change                       |
| ------------------------------------------- | ---------------------------- |
| `src/lib/context-menu/index.ts`             | New - context menu utilities |
| `src/lib/context-menu/task-menu.ts`         | New - task context menu      |
| `src/lib/context-menu/project-menu.ts`      | New - project context menu   |
| `src/lib/context-menu/area-menu.ts`         | New - area context menu      |
| `src/components/task-list/TaskListItem.tsx` | Add onContextMenu            |
| `src/components/sidebar/ProjectItem.tsx`    | Add onContextMenu            |
| `src/components/sidebar/AreaItem.tsx`       | Add onContextMenu            |
| `locales/en.json`                           | Add contextMenu translations |

## Edge Cases

### Right-Click on Empty Space

- In task list: No menu, or "New Task" only
- In sidebar whitespace: No menu, or collapse/expand options

### Multiple Selection (Future)

When multi-select is implemented, context menu should:

- Show commands that work on multiple items
- Hide commands that only work on single items
- Show count in menu title (e.g., "3 tasks selected")

## Success Criteria

1. Right-click on task shows task context menu
2. Right-click on project shows project context menu
3. Right-click on area shows area context menu
4. All menu items execute correct commands
5. Obsidian option only shows when setting is on
6. Keyboard shortcuts shown in menu items
7. Platform-appropriate labels (Finder vs Explorer)
