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

// After (TanStack Query)
const createTaskMutation = useCreateTask()

const handleAddTask = useCallback(async () => {
  try {
    const newTask = await createTaskMutation.mutateAsync({ scheduled: today })
    setPendingEditItemId(newTask.id)
  } catch (error) {
    toast.error('Failed to create task')
  }
}, [createTaskMutation, today])
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['display-order'] }),
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
- [ ] useProjectOrder with persistence (per-project task ordering)
- [ ] useAreaOrder with persistence (per-area task ordering)
- [ ] useKanbanOrder with persistence (per-view column ordering)

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
