# Task: Command Palette & Command Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for the complete list of commands to implement.

## Overview

This task implements all commands defined in the registry and enhances the command palette to display them correctly. It builds on Task 6's shortcut infrastructure.

## Prerequisites

- Task 6 complete (shortcut parsing/matching utilities exist)
- Task 7 reviewed (command registry defines what to implement)

## Scope

### 1. Update Existing Commands

Convert existing commands to use Tauri accelerator format:

```typescript
// Before
{ id: 'toggle-left-sidebar', shortcut: '⌘+1', ... }

// After
{ id: 'toggle-left-sidebar', shortcut: 'CmdOrCtrl+1', ... }
```

Files to update:

- `src/lib/commands/navigation-commands.ts`
- `src/lib/commands/window-commands.ts`

### 2. Add Command Properties

Extend `AppCommand` type to support registry properties:

```typescript
interface AppCommand {
  // Existing
  id: string
  labelKey: string
  shortcut?: string
  execute: (context: CommandContext) => void | Promise<void>
  isAvailable?: (context: CommandContext) => boolean

  // New
  surfaces?: {
    commandPalette?: boolean // Default: true
    contextMenu?: EntityType[] // e.g., ['task', 'project', 'area']
    appMenu?: string // Menu location, e.g., 'Edit', 'View'
  }
  supportsMultiSelect?: boolean // For future multi-select
}
```

### 3. Implement New Commands

#### Global Navigation Commands

| Command              | Notes                         |
| -------------------- | ----------------------------- |
| `navigate-today`     | Set active view to Today      |
| `navigate-this-week` | Set active view to This Week  |
| `navigate-inbox`     | Set active view to Inbox      |
| `navigate-calendar`  | Set active view to Calendar   |
| `navigate-no-area`   | Set active view to No Area    |
| `collapse-all-areas` | Collapse all areas in sidebar |
| `expand-all-areas`   | Expand all areas in sidebar   |

#### Dynamic Navigation Commands

Generate commands for each active area/project:

```typescript
// Generate at runtime based on current areas/projects
function getDynamicNavigationCommands(context: CommandContext): AppCommand[] {
  const areas = context.getAreas().filter(a => a.status !== 'archived')
  const projects = context
    .getProjects()
    .filter(p => p.status !== 'done' && p.status !== 'dropped')

  return [
    ...areas.map(area => ({
      id: `navigate-area-${area.id}`,
      labelKey: area.title, // Direct title, not translation key
      group: 'areas',
      execute: () => context.navigateToArea(area.id),
    })),
    ...projects.map(project => ({
      id: `navigate-project-${project.id}`,
      labelKey: project.title,
      group: 'projects',
      execute: () => context.navigateToProject(project.id),
    })),
  ]
}
```

#### Application Commands

| Command                  | Notes                                                   |
| ------------------------ | ------------------------------------------------------- |
| `open-help`              | Opens https://tdn.danny.is/desktop/overview/ in browser |
| `toggle-command-palette` | Already exists, ensure in registry                      |

### 4. Command Palette Enhancements

#### Contextual Command Display

Commands should appear/hide based on context:

```typescript
// In command palette rendering
const visibleCommands = allCommands.filter(cmd => {
  // Check isAvailable
  if (cmd.isAvailable && !cmd.isAvailable(context)) return false

  // Check surface visibility
  if (cmd.surfaces?.commandPalette === false) return false

  return true
})
```

#### Grouping

Commands should be grouped in the palette:

- Navigation (Today, This Week, etc.)
- Areas (dynamic)
- Projects (dynamic)
- Settings
- Window

### 5. Extend CommandContext

Add methods needed by new commands:

```typescript
interface CommandContext {
  // Existing
  openPreferences: () => void
  showToast: (message: string, type?: ToastType) => void

  // New
  navigateToView: (view: ViewType) => void
  navigateToArea: (areaId: string) => void
  navigateToProject: (projectId: string) => void
  getAreas: () => Area[]
  getProjects: () => Project[]
  collapseAllAreas: () => void
  expandAllAreas: () => void
  openExternalUrl: (url: string) => void
}
```

## Implementation Steps

1. Update `AppCommand` type with new properties
2. Convert existing command shortcuts to Tauri format
3. Implement static navigation commands
4. Implement dynamic area/project command generation
5. Extend `CommandContext` with needed methods
6. Update command palette to filter by `surfaces.commandPalette`
7. Update command palette grouping
8. Add tests for new commands

## Files to Change

| File                                                | Change                                |
| --------------------------------------------------- | ------------------------------------- |
| `src/lib/commands/types.ts`                         | Add `surfaces`, `supportsMultiSelect` |
| `src/lib/commands/navigation-commands.ts`           | Update format, add new commands       |
| `src/lib/commands/window-commands.ts`               | Update format                         |
| `src/lib/commands/index.ts`                         | Add dynamic command generation        |
| `src/hooks/use-command-context.ts`                  | Extend context                        |
| `src/components/command-palette/CommandPalette.tsx` | Update filtering/grouping             |

## Success Criteria

1. All commands from registry are implemented
2. Command palette shows correct commands based on context
3. Dynamic navigation to any area/project works
4. Commands use Tauri accelerator format for shortcuts
5. Shortcuts display correctly in palette (formatted for platform)

## Additional Work & Bugfixes

Bugs...

- [x] The command palette needs to be wider. Probably about half as wide again. 
- [x] Selecting an area in the command palette fails with error "command navigate-area-xxxxxxxxxxxxx" not found. I assume this is because we're using a generated ID rather than the actual title/name of the area? (NoArea works fine)
- [x] Same as above but for projects
- [x] Areas and projects don't seem to be fuzzy searchable - they don't appear in results.
- [ ] Keyboard navigation within the palette should be fast and not-janky. Currently moving down regularly really fast with the arrow key causes the selected item to jump back up a little bit. I suspect this is some sort of react rendering issue um or react reactivity issue or something. We need to work out why that is and make sure it's smooth. The shad CI documentation for this will possibly help. 
- [ ] We currently have no implementation for Collapse / Expand all areas in sidebar. We should add that assuming it's not a big job.
- [ ] We should think about the order that we display things in here. currently toggle left sidebar and toggle right sidebar. Uh collapse areas and expand areas are the only things visible when it opens. And they are certainly not gonna be the things that users want to do the most. I feel like the toggle left and right collapse areas, expand areas should actually belong in the other group. navigation should just contain everything it currently does and possibly all the areas too. And I almost think we can move create task into other as well. Oh wait, actually We should just try and rationalise these a little bit. I've just noticed there's a window group. Like I I feel like that probably belongs alongside your sidebar movement and all the rest of it. Anyway, just think about the best way to organise this. 
- [ ] There is a "Test toast notification"  command we should get rid of.
