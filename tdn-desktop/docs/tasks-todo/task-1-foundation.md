# Task 1: Foundation

## Purpose

Bring over all structural pieces from the UI mockup (`../tdn-uimockup`) that don't require entity data. After this phase, the app compiles with correct styling, types, and structure but shows an empty shell - no tasks, projects, or areas displayed yet.

This phase sets up the scaffolding so that subsequent phases can focus on data and integration without structural concerns.

## Background

The UI mockup contains ~90+ production-quality React components. Rather than pulling everything in at once (which would break due to missing data), we first extract the foundational pieces that are independent of entity data.

## Scope

### CSS Tokens

Merge the mockup's custom Taskdn tokens from `tdn-uimockup/src/index.css` into `src/theme-variables.css`:

- Icon colors (`--icon-today`, `--icon-week`, `--icon-inbox`, `--icon-calendar`, `--icon-folder`)
- Status colors (`--status-inbox`, `--status-ready`, `--status-in-progress`, `--status-blocked`, `--status-done`, etc.)
- Entity accent colors (`--entity-project`, `--entity-area`)
- Date colors (`--date-due`, `--date-overdue`)
- Area type colors (`--area-type-1` through `--area-type-6`)
- Heading colors (`--heading-blue`, `--heading-teal`, `--heading-purple`, etc.)
- Progress indicator color (`--progress`)

Include both light and dark mode variants.

### Type Definitions

Copy from `tdn-uimockup/src/types/`:

- `data.ts` - Core entity types (Task, Project, Area, AppData)
- `navigation.ts` - Selection types for sidebar/view routing
- `headings.ts` - Heading types for TodayView sections
- `sidebar-order.ts` - Drag ID types for sidebar DnD
- `calendar-order.ts` - Calendar ordering types

Note: These types are temporary. Once Task 2 generates types via tauri-specta from Rust structs, the entity types (`data.ts`) will be replaced. Navigation and UI-specific types will remain.

### Config Files

Copy from `tdn-uimockup/src/config/`:

- `status.ts` - Status labels, colors, icons for tasks and projects
- `heading-colors.ts` - Heading color definitions

### UI Primitive Components

Review `tdn-uimockup/src/components/ui/` and copy components not already in `tdn-desktop/src/components/ui/`:

Likely candidates:
- `empty-state.tsx` - Placeholder for empty views
- `view-toggle.tsx` - List/kanban/calendar toggle
- `date-button.tsx` - Date picker trigger with popover
- `searchable-select.tsx` - Combobox with search
- `progress-circle.tsx` - SVG circular progress
- `collapsible-notes.tsx` - Expandable notes section
- `markdown-preview.tsx` - Read-only markdown renderer

Compare existing components - some may need updates to match mockup versions.

### Layout Components

Adapt mockup layout components to work with desktop's existing `MainWindow`:

From `tdn-uimockup/src/components/layout/`:
- `ViewHeader.tsx` - Top bar with title, status badges, view toggle
- `ContentArea.tsx` - Scrollable content wrapper
- `DetailSideBar.tsx` - Sliding right panel (integrate with existing `RightSideBar`)

The desktop already has `MainWindow`, `LeftSideBar`, `RightSideBar`. The goal is to integrate mockup patterns without duplicating structure.

### Zustand Stores

Copy from `tdn-uimockup/src/store/`:

- `task-detail-store.ts` - Controls which task is open in detail panel
- `view-mode-store.ts` - Persists list/kanban/calendar selection per view

These are independent of entity data and can be used immediately.

### Navigation State

The mockup uses local state for sidebar selection. Consider whether this should:
- Remain as local state in the app shell
- Move to a Zustand store for persistence
- Use URL-based routing (probably overkill for desktop)

For now, local state matching the mockup pattern is fine.

## Integration Points

### MainWindow Adaptation

Current structure:
```
MainWindow
├── TitleBar
├── ResizablePanelGroup
│   ├── LeftSideBar (empty)
│   ├── MainWindowContent (empty)
│   └── RightSideBar (empty)
└── Overlays (CommandPalette, PreferencesDialog, Toaster)
```

Target structure after this phase:
```
MainWindow
├── TitleBar
├── ResizablePanelGroup
│   ├── LeftSideBar → (ready for AppSidebar in Task 3)
│   ├── MainWindowContent
│   │   ├── ViewHeader
│   │   └── ContentArea → (ready for views in Task 3)
│   └── RightSideBar / DetailSideBar → (ready for TaskDetailPanel in Task 3)
└── Overlays
```

### Existing ui-store

The desktop has `src/store/ui-store.ts` with:
- `leftSidebarVisible`, `rightSidebarVisible`
- `commandPaletteOpen`, `preferencesOpen`

New stores should coexist. `task-detail-store` controls *what* is in the right sidebar; `ui-store.rightSidebarVisible` controls *whether* it's shown.

## Out of Scope

- Entity data (tasks, projects, areas)
- Components that render entity data (views, task lists, etc.)
- Rust backend changes
- TanStack Query setup

## Checklist

- [ ] Merge CSS tokens into theme-variables.css
- [ ] Copy type definitions
- [ ] Copy config files
- [ ] Copy/update UI primitive components
- [ ] Adapt layout components
- [ ] Copy Zustand stores
- [ ] Verify app compiles and runs
- [ ] Run `bun run check:all`

## Dependencies

None - this is the first phase.

## Next Phase

Task 2: Data Layer - Build the Rust backend and TanStack Query infrastructure.
