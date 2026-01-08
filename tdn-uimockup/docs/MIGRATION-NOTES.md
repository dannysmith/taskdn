# Migration Notes: taskdn-experiment → tdn-desktop

This document provides guidance for migrating UI components from this exploration codebase into the production Tauri app.

## Overview

This codebase contains:
- **React components** for a personal task management app (areas → projects → tasks)
- **Drag-and-drop** throughout (sidebar, task lists, kanban boards, calendars)
- **Multiple view modes** (list, kanban, calendar) with view-specific ordering
- **Inline editing** (task titles, heading titles, dates)

All components have descriptive JSDoc comments explaining their purpose and usage patterns.

---

## Component Inventory

### Layout Components (`layout/`)

| Component     | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| MainContent   | View router - switches between views based on sidebar selection     |
| ViewHeader    | Top bar with title, status badges/pill, and list/kanban/cal toggle  |
| ContentArea   | Scrollable content wrapper with consistent padding                  |
| DetailSideBar | Sliding right panel for TaskDetailPanel (controlled by Zustand)     |

### View Components (`views/`)

| Component    | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| TodayView    | Today's focus: scheduled, overdue, and newly-available tasks          |
| WeekView     | Week calendar or kanban view of tasks scheduled/due this week         |
| InboxView    | Unprocessed inbox tasks awaiting triage                               |
| CalendarView | Month calendar with drag-drop scheduling                              |
| AreaView     | All projects and tasks within a life area (list or kanban)            |
| ProjectView  | Tasks within a single project (list or kanban)                        |
| NoAreaView   | Orphan projects and tasks not assigned to any area                    |

### Task Components (`tasks/`)

| Component          | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| TaskDetailPanel    | Full task editor in right sidebar (title, dates, project, notes)  |
| TaskList           | Draggable task list (for use inside TaskDndContext)               |
| DraggableTaskList  | Standalone task list with its own DnD context                     |
| TaskItem           | Pure presentational task row (no DnD awareness)                   |
| TaskListItem       | Task row with sortable wrapper (used by TaskList)                 |
| SortableTaskItem   | TaskItem with dnd-kit sortable bindings                           |
| TaskStatusCheckbox | Things 3-style status checkbox with color/icon per status         |
| TaskStatusPill     | Colored status badge with optional dropdown to change status      |
| SectionTaskGroup   | Collapsible section with task list (used in TodayView)            |
| ProjectTaskGroup   | Collapsible project header with task list (used in AreaView)      |
| ProjectHeader      | Project row header with status indicator and expand toggle        |
| OrderedItemList    | Mixed list of tasks + headings with drag-drop (TodayView)         |
| SectionHeader      | Header row for collapsible sections                               |
| TaskDndContext     | Shared DnD context for cross-container task movement              |
| MilkdownEditor     | Rich markdown editor for task notes (ProseMirror-based)           |
| LazyMilkdownEditor | Code-split wrapper with loading skeleton                          |

### Card Components (`cards/`)

| Component   | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| TaskCard    | Visual card for kanban/calendar (default or compact size)           |
| ProjectCard | Summary card with progress bar (used in AreaView project grid)      |
| AreaCard    | Summary card for life areas (future dashboard use)                  |

### Kanban Components (`kanban/`)

| Component        | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| KanbanBoard      | Horizontal status columns for project/week views                 |
| AreaKanbanBoard  | Status columns with project swimlanes for area views             |
| KanbanColumn     | Single status column (expandable/collapsible)                    |
| SortableKanbanCard | TaskCard with dnd-kit sortable bindings                        |
| KanbanDndContext | DnD context for kanban (status changes, reordering)              |

### Calendar Components (`calendar/`)

| Component       | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| MonthCalendar   | Full month grid with drag-drop scheduling                          |
| MonthDayCell    | Single day cell in month grid (compact TaskCards)                  |
| WeekCalendar    | 7-day column layout with drag-drop scheduling                      |
| DayColumn       | Single day column in week view (full TaskCards + due section)      |
| SortableTaskCard | TaskCard with calendar-specific drag data                         |
| TaskCardDragPreview | Floating card shown during drag                                |

### Sidebar Components (`sidebar/`)

| Component        | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| AppSidebar       | Main navigation with areas, projects, and nav items              |
| DraggableArea    | Collapsible area section with drag-drop for reordering           |
| DraggableProject | Project row with drag-drop (reorder, move between areas)         |
| ProjectStatusIndicator | Progress circle or status icon for projects                 |

### Project Components (`projects/`)

| Component           | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| ProjectStatusPill   | Colored badge with optional dropdown (used in ViewHeader)     |
| ProjectStatusBadges | Compact status counts for areas (blocked: 1, in-progress: 3)  |

### Heading Components (`headings/`)

| Component          | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| HeadingListItem    | Inline heading row for organizing daily tasks (TodayView)      |
| HeadingColorPicker | Popover with 6 color options for headings                      |
| HeadingDragPreview | Floating preview during heading drag                           |

### Custom UI Components (`ui/` - non-shadcn)

| Component           | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| ProgressCircle      | SVG circular progress indicator                               |
| ViewToggle          | List/kanban/calendar icon toggle group                        |
| DateButton          | Date picker trigger with calendar popover                     |
| SearchableSelect    | Combobox dropdown with search filtering                       |
| CollapsibleNotes    | Expandable notes panel with markdown preview                  |
| MarkdownPreview     | Read-only markdown renderer (shares Milkdown chunk)           |
| EmptyState          | Centered placeholder for empty views                          |

---

## Key Hooks (`hooks/`)

| Hook             | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| useSidebarOrder  | Manages area/project display order (separate from entity data)    |
| useTodayOrder    | Manages task/heading order in TodayView scheduled section         |
| useInboxOrder    | Manages task order in InboxView                                   |
| useCalendarOrder | Manages task order within each calendar day                       |

These hooks maintain display ordering independently of entity data, allowing user-defined ordering without modifying task records.

---

## State Management

### Zustand Stores (`store/`)

```
task-detail-store: { openTaskId, openTask(), closeTask() }
  - Controls DetailSideBar visibility
  - Used by all clickable task elements

view-mode-store: { modes, setViewMode(), useViewMode() }
  - Persists list/kanban/calendar selection per view type
  - Keys: 'area', 'project', 'week'
```

### React Context (`context/`)

```
AppDataContext: { areas, projects, tasks, ...helpers, ...mutations }
  - All entity data and CRUD operations
  - TODO: Replace with TanStack Query during migration
```

---

## Integration Sequence

### Phase 1: UI Primitives
Copy with minimal changes:
- All `ui/` custom components
- `config/status.ts`, `config/heading-colors.ts`
- Zustand stores (already standalone)

### Phase 2: Layout Shell
- `layout/` components
- Wire DetailSideBar to task-detail-store

### Phase 3: Views (recommended order)
1. **InboxView** - Simplest, good for testing query setup
2. **ProjectView** - Single entity + child tasks
3. **TodayView** - Date filtering, heading support
4. **AreaView** - Multiple entities, more complex
5. **WeekView/CalendarView** - Most complex

For each view:
1. Copy component and dependencies
2. Replace `useAppData()` with TanStack Query hooks
3. Replace mutations with `useMutation` hooks

---

## CSS Tokens

Custom tokens in `index.css`:
- Status colors: `--status-inbox`, `--status-done`, etc.
- Icon colors: `--icon-today`, `--icon-calendar`, etc.
- Date colors: `--date-scheduled`, `--date-due`, `--date-overdue`
- Entity colors: `--entity-project`, `--entity-area`

See `docs/design-conventions.md` for full reference.

---

## Notes

- Components marked `TODO(tauri-integration)` have heavy `useAppData()` usage
- Order hooks can remain in Zustand/local state; entity mutations use TanStack Query
- All view components support keyboard navigation (arrows, Enter, Space, Cmd+N)
- Drag-and-drop uses @dnd-kit throughout (not react-beautiful-dnd)
