# Task 3: UI Integration

## Purpose

Bring over all UI components from the mockup (`../tdn-uimockup`) and connect them to the real data layer built in Task 2. After this phase, the app is feature-complete with all views, interactions, and persistence working.

This phase leverages the substantial work already done in the mockup. The components are production-quality - we're wiring them to real data, not rebuilding them.

## Background

The UI mockup contains:
- 7 view components (Today, Week, Inbox, Calendar, Area, Project, NoArea)
- Full sidebar with draggable areas and projects
- Task components (lists, cards, detail panel)
- Kanban boards with DnD
- Calendar views with drag-to-schedule
- Order hooks for display ordering
- Inline editing, keyboard navigation

All of this uses `useAppData()` from the mockup's `AppDataContext`. Task 2's `useVaultData()` hook provides the same API, so migration is largely mechanical.

## Integration Process

For each component:
1. Copy file from `tdn-uimockup/src/components/` to `tdn-desktop/src/components/`
2. Update import paths (alias may differ)
3. Replace `import { useAppData } from '@/context/app-data-context'` with `import { useVaultData } from '@/hooks/use-vault-data'`
4. Replace `useAppData()` calls with `useVaultData()`
5. Test the component works with real data

## Scope

### 1. Sidebar Components

**Files to copy:**
- `sidebar/left-sidebar.tsx` (AppSidebar)
- `sidebar/draggable-area.tsx`
- `sidebar/draggable-project.tsx`

**Integration:**
- Wire to MainWindow's LeftSideBar slot
- Connect selection state to view routing
- Verify DnD works with real mutations

**DnD Actions:**
- `moveProjectToArea` - Changes project's areaId
- `reorderProjectsInArea` - Local order state (see Order Persistence below)
- `reorderAreas` - Local order state

### 2. View Components

Copy all from `views/`:
- `inbox-view.tsx` - Simplest, good first test
- `today-view.tsx` - Sections, headings support
- `project-view.tsx` - List + kanban modes
- `area-view.tsx` - Projects + tasks grouped
- `no-area-view.tsx` - Orphan handling
- `week-view.tsx` - Calendar + kanban modes
- `calendar-view.tsx` - Month grid

**Integration:**
- Create view router in MainWindowContent (like mockup's MainContent)
- Pass navigation callbacks for entity linking

### 3. Task Components

Copy all from `tasks/`:
- `task-item.tsx` - Pure presentation
- `task-list-item.tsx` - With sortable wrapper
- `sortable-task-item.tsx` - DnD bindings
- `task-list.tsx` - Draggable list container
- `task-status-checkbox.tsx` - Status checkbox
- `task-status-pill.tsx` - Status dropdown
- `task-detail-panel.tsx` - Right sidebar editor
- `task-dnd-context.tsx` - Shared drag context
- `section-task-group.tsx` - Collapsible sections
- `project-task-group.tsx` - Project groupings
- `project-header.tsx` - Expandable header
- `section-header.tsx` - Section headers
- `ordered-item-list.tsx` - Mixed tasks + headings
- `lazy-milkdown-editor.tsx` - Code-split editor
- `milkdown-editor.tsx` - Markdown editor

**Dependencies:**
- `@dnd-kit/core`, `@dnd-kit/sortable` - Already in mockup deps
- `@milkdown/kit` - Markdown editor

### 4. Kanban Components

Copy all from `kanban/`:
- `kanban-board.tsx`
- `kanban-column.tsx`
- `area-kanban-board.tsx`
- `kanban-dnd-context.tsx`

**DnD Actions:**
- Moving task between columns → status change
- Reordering within column → local order state

### 5. Calendar Components

Copy all from `calendar/`:
- `month-calendar.tsx`
- `week-calendar.tsx`
- `month-day-cell.tsx`
- `day-column.tsx`
- `draggable-task-card.tsx`

**DnD Actions:**
- Dragging task to different day → `updateTaskScheduled`

### 6. Card Components

Copy from `cards/`:
- `task-card.tsx` - For kanban/calendar
- `project-card.tsx` - For area view grids
- `area-card.tsx` - If used

### 7. Project Components

Copy from `projects/`:
- `project-status-pill.tsx`
- `project-status-badges.tsx`

### 8. Heading Components

Copy from `headings/`:
- `heading-list-item.tsx`
- `heading-color-picker.tsx`
- `heading-drag-preview.tsx`

### 9. Order Hooks

Copy from `hooks/`:
- `use-sidebar-order.ts`
- `use-today-order.ts`
- `use-inbox-order.ts`
- `use-calendar-order.ts`

These manage display ordering separate from entity data.

## Order Persistence

The order hooks maintain in-memory state for:
- Sidebar area/project ordering
- Today view task ordering (per section)
- Inbox task ordering
- Calendar day ordering

**Persistence Strategy:**
- Store to app data directory (not markdown files)
- Persist on app quit + periodic saves (every 5 minutes)
- Handle stale data: if entities no longer exist, discard stale order entries
- Storage format: JSON in `app_data/display-order.json`

**Implementation:**
```typescript
interface DisplayOrderState {
  sidebarOrder: { areas: string[], projectsByArea: Record<string, string[]> }
  todayOrder: Record<string, string[]>  // sectionId → itemIds
  inboxOrder: string[]
  calendarOrder: Record<string, string[]>  // date → taskIds
}
```

On load:
1. Load from disk
2. Filter out IDs that no longer exist in vault
3. Merge new entities at end of lists

On external vault change:
1. Re-filter order state to remove deleted entities
2. Add any new entities

## Heading Persistence

TodayView supports inline headings for organizing tasks. These are UI-only constructs (not in markdown files).

**Persistence Strategy:**
- Same as order persistence - store in app data directory
- Part of `display-order.json` or separate `headings.json`
- Each heading has: id, title, color, containerId (which section)

**On external vault change:**
- Headings remain (they're not tied to specific tasks)
- If section is empty, keep headings (user might want them)

## DnD Integration

The mockup's DnD calls mutation functions:
```typescript
// Sidebar
moveProjectToArea(projectId, fromAreaId, toAreaId)
// → calls updateProjectArea(projectId, toAreaId)

// Kanban
// Moving task to different column
// → calls updateTaskStatus(taskId, newStatus)

// Calendar
// Dragging task to different day
// → calls updateTaskScheduled(taskId, newDate)
```

With `useVaultData()` providing these mutations backed by real persistence, DnD should work without changes to the DnD code itself.

## Dependencies to Add

Check `tdn-uimockup/package.json` for packages to add to desktop:
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/modifiers`
- `@milkdown/kit` (and related milkdown packages)
- `date-fns` (if not already present)

## Testing Strategy

### Manual Testing with dummy-demo-vault
1. Point app at `dummy-demo-vault`
2. Test each view renders correctly
3. Test DnD operations persist correctly
4. Test external file changes update UI
5. Reset vault between test runs: `./scripts/reset-dummy-vault.sh`

### Integration Tests
- Component renders with mock data
- Mutation hooks trigger correctly
- Order state persists across reloads

## Suggested Integration Order

Recommended sequence (dependencies → dependents):

1. **Sidebar** - Establishes navigation, needed for everything else
2. **InboxView** - Simplest view, validates full stack
3. **Task components** - Needed by all views
4. **TaskDetailPanel** - Core editing interface
5. **ProjectView (list mode)** - Next simplest
6. **TodayView** - Key daily driver view
7. **AreaView** - More complex grouping
8. **NoAreaView** - Similar to AreaView
9. **Kanban components** - After list views work
10. **ProjectView (kanban mode)** - Uses kanban
11. **AreaView (kanban mode)** - Uses kanban
12. **Calendar components** - Most complex
13. **WeekView** - Uses calendar + kanban
14. **CalendarView** - Month view

Within each:
1. Copy component files
2. Update imports
3. Swap useAppData → useVaultData
4. Test in isolation
5. Test in context

## Checklist

### Core Setup
- [ ] Add DnD dependencies (dnd-kit)
- [ ] Add Milkdown dependencies
- [ ] Set up order persistence system
- [ ] Set up heading persistence system

### Sidebar
- [ ] Copy sidebar components
- [ ] Integrate with MainWindow
- [ ] Wire navigation state
- [ ] Test area/project DnD

### Views
- [ ] InboxView
- [ ] TodayView (with headings)
- [ ] ProjectView (list mode)
- [ ] ProjectView (kanban mode)
- [ ] AreaView (list mode)
- [ ] AreaView (kanban mode)
- [ ] NoAreaView
- [ ] WeekView (calendar mode)
- [ ] WeekView (kanban mode)
- [ ] CalendarView

### Task Components
- [ ] TaskItem, TaskListItem, TaskList
- [ ] TaskStatusCheckbox, TaskStatusPill
- [ ] TaskDetailPanel
- [ ] TaskDndContext
- [ ] Section components
- [ ] MilkdownEditor integration

### Kanban
- [ ] KanbanBoard, KanbanColumn
- [ ] AreaKanbanBoard
- [ ] KanbanDndContext
- [ ] Cross-column DnD (status changes)

### Calendar
- [ ] MonthCalendar, MonthDayCell
- [ ] WeekCalendar, DayColumn
- [ ] Drag-to-schedule functionality

### Order Hooks
- [ ] useSidebarOrder with persistence
- [ ] useTodayOrder with persistence
- [ ] useInboxOrder with persistence
- [ ] useCalendarOrder with persistence

### Final Integration
- [ ] All views accessible from sidebar
- [ ] TaskDetailPanel opens from any context
- [ ] All DnD operations persist
- [ ] Order persists across restarts
- [ ] External file changes update UI
- [ ] Run `bun run check:all`

## Dependencies

- Task 1 (Foundation) - Layout, types, stores
- Task 2 (Data Layer) - useVaultData hook and all mutations

## Next Phase

Task 4: Hardening - Testing, polish, and edge case handling.
