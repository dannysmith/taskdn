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

The mockup uses `useAppData()` with synchronous mutations. Our data layer uses TanStack Query with async mutations. **Components will need refactoring, not just find-replace.**

## Integration Process

For each component:

1. Copy file from `tdn-uimockup/src/components/` to `tdn-desktop/src/components/`
2. Update import paths
3. Replace `useAppData()` with `useVaultData()` + individual mutation hooks
4. **Refactor handlers that create entities to use `async/await` with `mutateAsync`**
5. **Use `getState()` for any Zustand store values in handlers** (see Task 2 for pattern)
6. Add error handling (try/catch, toast notifications)
7. Test the component works with real data

**Example refactoring:**

```typescript
// Before (mockup)
const handleAddTask = useCallback(() => {
  const newTaskId = createTask({ scheduled: today })
  setPendingEditItemId(newTaskId)
}, [createTask, today])

// After (TanStack Query + getState pattern)
const createTaskMutation = useCreateTask()

const handleAddTask = useCallback(async () => {
  const { today } = useViewStore.getState() // Not subscribed - avoids re-renders
  try {
    const newTask = await createTaskMutation.mutateAsync({ scheduled: today })
    const { setPendingEditItemId } = useTaskDetailStore.getState()
    setPendingEditItemId(newTask.id)
  } catch (error) {
    toast.error('Failed to create task')
  }
}, [createTaskMutation]) // Stable deps - only the mutation
```

This refactoring is straightforward but not purely mechanical. Budget time for it.

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
- **Project view task ordering (per project)**
- **Area view task ordering (per area)**
- **Kanban column ordering (per project/area)**

**Persistence Strategy:**

Order persistence follows the same Rust + TanStack Query pattern as preferences (see `docs/developer/data-persistence.md`):

1. **Rust struct** defines the data shape (`DisplayOrderState`)
2. **Tauri commands** (`load_display_order`, `save_display_order`) handle file I/O with atomic writes
3. **TanStack Query hook** (`useDisplayOrder`) wraps the commands for caching and invalidation
4. **Order hooks** (`useSidebarOrder`, `useTodayOrder`, etc.) are thin wrappers that derive from and update this data

This ensures consistency with the app's data patterns and gets atomic writes for free.

**Rust Struct:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct DisplayOrderState {
    // Global orders
    pub sidebar_order: SidebarOrder,
    pub today_order: HashMap<String, Vec<String>>,    // sectionId → itemIds
    pub inbox_order: Vec<String>,
    pub calendar_order: HashMap<String, Vec<String>>, // date → taskIds

    // Per-entity orders (keyed by project/area ID)
    pub project_task_orders: HashMap<String, Vec<String>>,
    pub area_task_orders: HashMap<String, Vec<String>>,
    pub kanban_column_orders: HashMap<String, HashMap<String, Vec<String>>>,
}
```

**Frontend Hook:**

```typescript
// src/services/display-order.ts
export function useDisplayOrder() {
  return useQuery({
    queryKey: ['display-order'],
    queryFn: async () => unwrapResult(await commands.loadDisplayOrder()),
  })
}

export function useUpdateDisplayOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: DisplayOrderState) => commands.saveDisplayOrder(order),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['display-order'] }),
  })
}
```

**Save Triggers:**

- On app quit (via Tauri window close event)
- Periodic saves (every 5 minutes)
- Debounced save after order changes (500ms)

**Stale Data Handling:**

On load:

1. Load from disk via Tauri command
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

## Concurrent Edit Handling

**Scenario:** User is editing a task in the detail panel. External tool modifies the same file. File watcher triggers reload.

**Strategy for MVP: Last write wins.**

- If user has unsaved changes and file changes externally, the external change overwrites
- No conflict detection or dirty flag protection
- This is acceptable for MVP - most users won't have multiple editors open
- Can add dirty flag / conflict detection in future if needed

In practice, this means:

- User edits title in detail panel → triggers mutation → file written
- External edit happens → file watcher fires → cache invalidates → UI reloads fresh data
- If user was mid-edit (typing but not saved), their changes are lost

This is a known limitation, not a bug to fix now.

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
3. Replace useAppData with useVaultData + mutation hooks
4. Refactor create handlers to async/await pattern
5. Add error handling
6. Test in isolation
7. Test in context

## Current Progress

### What's Done ✅

**Sidebar:**

- [x] Copy sidebar components (app-sidebar.tsx, draggable-area.tsx, draggable-project.tsx)
- [x] Integrate with MainWindow's LeftSideBar slot
- [x] Wire navigation state (navigation-store.ts)
- [x] Visual DnD works (reorder areas, reorder projects, move projects between areas)
- [x] Fixed project filtering bug (wikilink vs ID matching)
- [x] Fixed styling (fill container, consistent icons, removed internal collapse)

**InboxView:**

- [x] InboxView component with task list
- [x] Keyboard navigation (arrows, Enter to edit, Space to toggle, Escape)
- [x] Cmd+N creates new task with immediate focus/edit mode
- [x] Async mutations work correctly with mutateAsync

**Task Components (partial):**

- [x] task-status-checkbox.tsx
- [x] task-item.tsx (with inline editing, selection, metadata display)
- [x] task-list.tsx (DraggableTaskList with dnd-kit)
- [x] date-utils.ts (formatRelativeDate, isOverdue, isToday)

**Dependencies:**

- [x] @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers already added

### What's Broken/Incomplete ⚠️

**Disk persistence for order (deferred):**

- Order is session-persistent (survives component unmount via Zustand)
- Order is lost on app restart (disk persistence not yet implemented)
- Architecture is ready - just needs Rust commands + TanStack Query hooks

### What Was Fixed ✅ (2026-01-09)

**ProjectView & Wikilink Matching:**

1. **Fixed wikilink vs ID matching bug in vault.ts**
   - `getTasksByProjectId`, `getProjectsByAreaId`, `getAreaDirectTasks`, `getProjectCompletion`, `getTaskCounts`
   - Wikilinks use TITLES (e.g., `[[Japan Trip 2025]]`), not hash IDs
   - Now correctly looks up entity by ID, then matches by title

2. **Added ProjectStatusPill** (src/components/projects/project-status-pill.tsx)
   - Status dropdown for changing project status in ViewHeader
   - Defaults to "Active" (in-progress) when no status set

3. **Added CollapsibleNotesSection** (src/components/ui/collapsible-notes.tsx)
   - Expandable notes panel for project description + body
   - Uses LazyMilkdownPreview for formatted markdown rendering
   - Shows collapsed preview (first 1-2 lines) when collapsed

4. **Added useProjectOrder hook** (src/hooks/use-project-order.ts)
   - Per-project task ordering using Zustand display-order-store
   - Session-persistent ordering

5. **Completed markdown-preview CSS** (src/App.css)
   - Added missing rules for blockquote, links, hr, strong, pre code

**State Management & Mutations:**

1. **Added `update_project` Rust command** (src-tauri/src/commands/vault.rs)
   - Follows `update_task` pattern
   - Uses existing `ProjectUpdate` struct
   - Updates area, status, title, description, dates, body

2. **Added `useUpdateProject` hook** (src/services/vault.ts)
   - Full optimistic updates with rollback
   - Follows `useUpdateTask` pattern

3. **Created `display-order-store.ts` (Zustand)**
   - `sidebarAreaOrder`, `sidebarProjectOrder` for sidebar
   - `inboxOrder` for inbox view
   - Session-persistent (survives component unmount)

4. **Fixed `use-sidebar-order.ts`**
   - Now uses Zustand store instead of useState
   - `moveProjectToArea()` now calls `useUpdateProject.mutate()` to persist area change

5. **Fixed `use-inbox-order.ts`**
   - Now uses Zustand store instead of useState

**TaskDetailPanel & Milkdown (2026-01-09):**

1. **Added Milkdown dependencies**
   - @milkdown/kit, @milkdown/react, @milkdown/components, @milkdown/utils

2. **Added TaskStatusPill component** (src/components/tasks/task-status-pill.tsx)
   - Status dropdown for changing task status
   - Uses status config from config/status.ts

3. **Added MilkdownEditor** (src/components/tasks/milkdown-editor.tsx)
   - Full markdown editor with GFM support
   - `[]` shortcut creates task lists
   - Paste URL over selected text creates links
   - Cmd/Ctrl+click opens links

4. **Added LazyMilkdownEditor** (src/components/tasks/lazy-milkdown-editor.tsx)
   - Code-split lazy loader for Milkdown

5. **Added TaskDetailPanel** (src/components/tasks/task-detail-panel.tsx)
   - Full task editing interface in right sidebar
   - Edit title, status, project, area, dates, body
   - Wired into RightSideBar component

6. **Added Milkdown CSS** (src/App.css)
   - ~200 lines of styling for editor and preview

7. **Fixed external file changes not updating UI**
   - Added `useVaultInitialization()` call in App.tsx
   - Sets up listener for `vault-changed` events from Rust file watcher

8. **Fixed items jumping when typing in body**
   - Added mutation debouncing in vault.ts
   - `markMutationComplete()` prevents our own writes from triggering cache invalidation
   - 500ms debounce window after mutations

**TodayView Implementation (2026-01-09):**

1. **Added useTodayOrder hook** (src/hooks/use-today-order.ts)
   - Per-section task ordering using Zustand display-order-store
   - Three sections: scheduled-today, overdue-due-today, became-available-today
   - Supports mixed tasks + headings with type-safe ResolvedOrderedItem
   - Session-persistent ordering

2. **Added SectionHeader component** (src/components/tasks/section-header.tsx)
   - Collapsible header with expand/collapse chevron
   - Optional icon, title, task count badge
   - Optional "+ Task" and "+ Heading" buttons

3. **Added SectionTaskGroup component** (src/components/tasks/section-task-group.tsx)
   - Two modes: task-only (tasks array) or mixed items (orderedItems with headings)
   - Integrates OrderedItemList for mixed mode
   - EmptySectionDropZone for cross-section drag targets

4. **Added TodayView component** (src/components/views/today-view.tsx)
   - Three sections: Scheduled for Today, Overdue or Due Today, Became Available Today
   - "Scheduled for Today" supports inline headings for organization
   - Cross-section drag-and-drop via TaskDndContext
   - Dragging to "Scheduled for Today" sets scheduled date to today
   - Creating tasks in sections sets appropriate dates
   - Shows project/area context name on tasks (via getTaskContextName)
   - Empty state when no tasks match

5. **Added TaskDndContext** (src/components/tasks/task-dnd-context.tsx)
   - Shared DndContext for cross-container task movement
   - Handles both task and heading drags
   - Cross-container hover state for CSS gap animation
   - TaskDragPreview and HeadingDragPreview overlays

6. **Added OrderedItemList** (src/components/tasks/ordered-item-list.tsx)
   - Renders mixed tasks + headings with DnD support
   - Inline heading editing with color picker
   - Cross-container gap animation for drag feedback

7. **Added Heading components** (src/components/headings/)
   - heading-list-item.tsx - Sortable heading row with inline editing
   - heading-color-picker.tsx - Color selection dropdown
   - heading-drag-preview.tsx - Drag overlay for headings
   - index.ts - Barrel exports

8. **Updated display-order-store.ts**
   - Added TodaySectionId type
   - Added todaySectionOrder state and setTodaySectionOrder action
   - Added todayHeadings storage and CRUD actions

9. **Added heading types** (src/types/headings.ts)
   - Heading interface (id, title, color)
   - HeadingColor type with 8 color options
   - isHeadingId/toHeadingId/parseHeadingId utilities for "heading:" prefix

10. **Fixed contextName display**
    - getTaskContextName now correctly handles WikiLink format (e.g., "[[My Project]]")
    - Uses .includes(title) matching like ProjectView

**Card Components (2026-01-09):**

1. **Added TaskCard** (src/components/cards/task-card.tsx)
   - Visual card for tasks used in Kanban and Calendar views
   - Two sizes: default (full metadata) and compact (checkbox + title)
   - Four variants: default, overdue, deferred, done
   - Inline title editing, date pickers, status pill
   - Container queries for responsive behavior

2. **Added ProjectCard** (src/components/cards/project-card.tsx)
   - Summary card for AreaView project grids
   - Shows progress bar, task counts, status badge
   - Uses ProgressCircle for visual completion indicator

3. **Added AreaCard** (src/components/cards/area-card.tsx)
   - Summary card for area overviews
   - Shows area type badge with consistent color hashing
   - Project counts and folder icon

**Kanban Components (2026-01-09):**

1. **Added KanbanDndContext** (src/components/kanban/kanban-dnd-context.tsx)
   - Drag-and-drop context for Kanban boards
   - Handles status changes, reordering, swimlane changes
   - DragOverlay with TaskCard preview
   - Helper functions: createKanbanTaskData, createEmptyColumnData, createEmptySwimlaneData

2. **Added KanbanColumn** (src/components/kanban/kanban-column.tsx)
   - Single status column with collapsible header
   - SortableKanbanCard wrapper for drag-drop
   - Empty column drop zone with visual feedback
   - Add task button

3. **Added KanbanBoard** (src/components/kanban/kanban-board.tsx)
   - Horizontal board with status columns
   - Column collapse state management via useCollapsedColumns hook
   - DEFAULT_STATUS_ORDER and DEFAULT_EXPANDED_STATUSES constants
   - Task creation with auto-focus

4. **Added AreaKanbanBoard** (src/components/kanban/area-kanban-board.tsx)
   - Kanban board with project swimlanes for area views
   - ProjectSwimlane and LooseTasksSwimlane components
   - Drag between swimlanes to change task's project
   - useAreaCollapsedColumns hook

5. **Added useKanbanOrder hook** (src/hooks/use-kanban-order.ts)
   - Per-view, per-column task ordering using Zustand
   - Session-persistent ordering

6. **Updated display-order-store.ts**
   - Added kanbanColumnOrder storage
   - Added setKanbanColumnOrder action

**ProjectView & WeekView Kanban Mode (2026-01-09):**

1. **Wired ProjectView kanban mode** (src/components/views/project-view.tsx)
   - Added useViewMode('project') for list/kanban toggle
   - Added useCollapsedColumns for column state
   - Added useKanbanOrder for per-column ordering
   - Handlers: handleStatusChange, handleScheduledChange, handleDueChange
   - View switches between DraggableTaskList and KanbanBoard

2. **Wired WeekView kanban mode** (src/components/views/week-view.tsx)
   - Added useViewMode('this-week') for calendar/kanban toggle
   - Filters tasks to those with scheduled/due dates in current week
   - Added getProjectName/getAreaName helpers for WikiLink format
   - Navigation handlers for clicking project/area names in kanban cards
   - View switches between WeekCalendar and KanbanBoard

3. **Added ViewToggle to MainWindowContent** (src/components/layout/MainWindowContent.tsx)
   - HeaderViewToggle helper component uses useViewMode hook
   - ViewToggle passed via actions prop to ViewHeader
   - Shows toggle for: this-week (calendar/kanban), project (list/kanban), area (list/kanban)

4. **Fixed Kanban DnD "snap back" bug** (src/components/kanban/kanban-dnd-context.tsx)
   - Set dropAnimation={null} on DragOverlay
   - Prevents overlay animating back to original position when moving between columns

**AreaView Implementation (2026-01-09):**

1. **Added loose tasks helpers** (src/components/tasks/task-dnd-context.tsx)
   - `getLooseTasksProjectId(areaId)` - Creates pseudo-project ID for area-direct tasks
   - `isLooseTasksProjectId(projectId)` - Checks if ID is loose tasks pseudo-ID
   - `getAreaIdFromLooseTasksProjectId(projectId)` - Extracts areaId from pseudo-ID

2. **Added ProjectHeader component** (src/components/tasks/project-header.tsx)
   - Collapsible header row for projects in list views
   - Shows expand/collapse chevron, status indicator, title, status badge
   - Click to expand/collapse, double-click to navigate to project

3. **Added ProjectTaskGroup component** (src/components/tasks/project-task-group.tsx)
   - Collapsible project header with task list underneath
   - EmptyProjectDropZone for cross-project drag-and-drop
   - Used in AreaView list mode

4. **Added useAreaOrder hook** (src/hooks/use-area-order.ts)
   - Per-area task ordering using Zustand display-order-store
   - Session-persistent ordering for loose tasks

5. **Updated display-order-store.ts**
   - Added `areaTaskOrder` state and `setAreaTaskOrder` action

6. **Added AreaView component** (src/components/views/area-view.tsx)
   - Two view modes: list and kanban
   - List mode: CollapsibleNotesSection + Active Projects grid + ProjectTaskGroup for each project + SectionTaskGroup for loose tasks
   - Kanban mode: AreaKanbanBoard with project swimlanes
   - Cross-project drag-and-drop via TaskDndContext
   - Dragging between projects updates task.project WikiLink

7. **Wired AreaView into MainWindowContent**
   - AreaView renders when selection.type === 'area'
   - ViewToggle shows for area views (list/kanban modes)

### Future: Disk Persistence for Order

When needed:

- Rust `DisplayOrderState` struct
- `load_display_order`/`save_display_order` commands
- TanStack Query wrapper
- Save on quit, periodic, debounced after changes

## Remaining Checklist

### Core Setup

- [x] Add DnD dependencies (dnd-kit)
- [x] Add Milkdown dependencies
- [x] Set up order persistence system (session-level via Zustand; disk persistence deferred)
- [ ] Set up heading persistence system

### UI Components Deferred from Task 1

These components were skipped during Task 1 (Foundation) because they depend on Milkdown:

- [x] `collapsible-notes.tsx` - Expandable notes panel for areas/projects (uses LazyMilkdownPreview)
- [x] Uses existing LazyMilkdownPreview from lazy-milkdown-editor.tsx (no separate markdown-preview.tsx needed)

### Sidebar

- [x] Copy sidebar components
- [x] Integrate with MainWindow
- [x] Wire navigation state
- [x] moveProjectToArea calls updateProject mutation (persists to vault)
- [x] Order hooks use Zustand store (session-persistent)

### Views

- [x] InboxView (working, order session-persistent)
- [x] TodayView (three sections: Scheduled, Overdue/Due, Became Available)
- [x] ProjectView (list mode) - uses useProjectOrder hook, status pill, collapsible notes
- [x] ProjectView (kanban mode) - uses KanbanBoard, useKanbanOrder, view toggle in header
- [x] AreaView (list mode) - uses ProjectTaskGroup, SectionTaskGroup, TaskDndContext for cross-project DnD
- [x] AreaView (kanban mode) - uses AreaKanbanBoard with project swimlanes
- [ ] NoAreaView
- [x] WeekView (calendar mode) - 7-day column layout with DnD scheduling
- [x] WeekView (kanban mode) - filters to this week's tasks, view toggle in header
- [x] CalendarView - month grid with DnD scheduling

### Task Components

- [x] TaskItem, TaskList (partial - DraggableTaskList done)
- [x] TaskStatusCheckbox
- [x] TaskStatusPill
- [x] TaskDetailPanel (full editing interface in right sidebar)
- [x] MilkdownEditor integration (lazy-loaded, with task list shortcuts)
- [x] SectionHeader (collapsible header with icon, title, count, + buttons)
- [x] SectionTaskGroup (section with draggable task list, supports headings)
- [x] TaskDndContext (shared context for cross-container DnD)
- [x] OrderedItemList (mixed tasks + headings with DnD)

### Heading Components

- [x] HeadingListItem (sortable heading row with inline editing)
- [x] HeadingColorPicker (color selection dropdown)
- [x] HeadingDragPreview (drag overlay)

### Card Components

- [x] TaskCard (for kanban/calendar views)
- [x] ProjectCard (for area view grids)
- [x] AreaCard (for area overview grids)

### Kanban

- [x] KanbanBoard, KanbanColumn
- [x] AreaKanbanBoard
- [x] KanbanDndContext
- [x] Cross-column DnD (status changes)

### Calendar

- [x] MonthCalendar, MonthDayCell
- [x] WeekCalendar, DayColumn
- [x] DraggableTaskCard (SortableTaskCard + TaskCardDragPreview)
- [x] Drag-to-schedule functionality (uses pointerWithin collision detection)

### Order Hooks

- [x] useSidebarOrder uses Zustand store (session-persistent)
- [x] useInboxOrder uses Zustand store (session-persistent)
- [x] display-order-store.ts created (Zustand store for all order state)
- [x] useTodayOrder with Zustand (per-section task ordering)
- [x] useCalendarOrder hook (per-day task ordering for calendar views)
- [x] useProjectOrder with Zustand (per-project task ordering)
- [x] useAreaOrder with Zustand (per-area task ordering)
- [x] useKanbanOrder with Zustand (per-view column ordering)
- [ ] Disk persistence layer (Rust commands + TanStack Query) - deferred

### Final Integration

- [ ] All views accessible from sidebar
- [x] TaskDetailPanel opens from any context (clicking chevron opens panel, shows right sidebar)
- [ ] All DnD operations persist to correct location (order→settings, entity changes→vault)
- [ ] Order persists across restarts
- [x] External file changes update UI (via useVaultInitialization + file watcher)
- [x] Run `bun run check:all` (passing)

## Dependencies

- Task 1 (Foundation) - Layout, types, stores
- Task 2 (Data Layer) - useVaultData hook and all mutations

## Next Phase

Task 4: Hardening - Testing, polish, and edge case handling.
