# taskdn-uimockup

React frontend prototype for Taskdn Desktop app. This codebase contains a React UI designed for migration into the Taskdn Tauri desktop application. Although an attempt has been made to ensure the react code in here is as close to production ready as possible, and care and attention has been put into the UI design. This is still a prototype.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/MIGRATION-NOTES.md](docs/MIGRATION-NOTES.md) | Component inventory, integration sequence, and migration guidance |
| [docs/design-conventions.md](docs/design-conventions.md) | Colors, icons, interactions, and visual standards |

All React components have JSDoc comments explaining their purpose and usage patterns.

Screenshots of the app can be found in `screenshots/`

## Tech Stack

- **React 19** + TypeScript
- **Vite 7** with `@tailwindcss/vite` (Tailwind CSS v4)
- **shadcn/ui** (base-nova style) using `@base-ui/react` primitives
- **Icons**: `lucide-react`
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Markdown editing**: `@milkdown/kit`
- **State**: Zustand stores + React Context

## Commands

```bash
bun dev          # Start dev server
bun run build    # Type-check and build
bun run lint     # ESLint
```

## Directory Structure

```
src/
├── components/
│   ├── ui/           # shadcn primitives + custom components
│   ├── layout/       # App shell (ViewHeader, ContentArea, DetailSideBar, MainContent)
│   ├── views/        # Page views (Today, Week, Inbox, Calendar, Area, Project, NoArea)
│   ├── cards/        # Visual cards (TaskCard, ProjectCard, AreaCard)
│   ├── tasks/        # Task components (TaskList, TaskItem, TaskDetailPanel, etc.)
│   ├── kanban/       # Kanban boards (KanbanBoard, KanbanColumn, AreaKanbanBoard)
│   ├── calendar/     # Calendar views (MonthCalendar, WeekCalendar)
│   ├── sidebar/      # Navigation (LeftSidebar, DraggableArea, DraggableProject)
│   ├── projects/     # Project UI (ProjectStatusPill, ProjectStatusBadges)
│   └── headings/     # Heading rows (HeadingListItem, HeadingColorPicker)
├── config/           # Status colors/labels, heading colors
├── context/          # AppDataContext (entity data + CRUD)
├── store/            # Zustand stores (task-detail, view-mode)
├── data/             # Mock data and lookup helpers
├── hooks/            # Order management hooks (useSidebarOrder, useTodayOrder, etc.)
├── lib/              # Utilities (cn, date formatting)
├── types/            # TypeScript types (data.ts, navigation.ts, headings.ts)
└── assets/           # Images
```

## Key Patterns

### CSS Variables

Theme tokens in `src/index.css` using OKLCH colors. Dark mode via `.dark` class.

### Component Discovery

- **By entity**: Search `task-`, `project-`, `area-` prefixes
- **By feature**: Check subdirectories (`kanban/`, `calendar/`, `tasks/`)
- **UI primitives**: Always check `components/ui/` first

## State Management

### Zustand Stores (`store/`)

```typescript
// Task detail panel visibility
task-detail-store: { openTaskId, openTask(), closeTask() }

// View mode per view type (list/kanban/calendar)
view-mode-store: { modes, setViewMode(), useViewMode() }
```

### React Context (`context/`)

```typescript
// Entity data and mutations
AppDataContext: { areas, projects, tasks, ...lookups, ...mutations }
```

### Order Hooks (`hooks/`)

Display ordering separate from entity data:
- `useSidebarOrder` — Area/project order in sidebar
- `useTodayOrder` — Task/heading order in TodayView
- `useInboxOrder` — Task order in InboxView
- `useCalendarOrder` — Task order per calendar day

## Component Categories

### View Components (`views/`)

Each view renders a different perspective on tasks:

| Component | Purpose |
|-----------|---------|
| TodayView | Scheduled + overdue + newly-available tasks |
| WeekView | Week calendar or kanban of upcoming tasks |
| InboxView | Unprocessed tasks awaiting triage |
| CalendarView | Month calendar with drag-drop scheduling |
| AreaView | All projects/tasks in an area |
| ProjectView | Single project's tasks |
| NoAreaView | Orphan projects/tasks without an area |

### Task Components (`tasks/`)

| Component | Purpose |
|-----------|---------|
| TaskDetailPanel | Full editor in right sidebar |
| TaskList | Draggable task list (needs TaskDndContext) |
| TaskItem | Pure presentational task row |
| TaskListItem | Task row with sortable wrapper |
| TaskStatusCheckbox | Status checkbox with color/icon per status |
| TaskDndContext | Shared drag context for cross-container moves |

### Kanban Components (`kanban/`)

| Component | Purpose |
|-----------|---------|
| KanbanBoard | Status columns for project/week views |
| AreaKanbanBoard | Status columns with project swimlanes |
| KanbanColumn | Single collapsible status column |
| KanbanDndContext | Drag context for status changes |

### Calendar Components (`calendar/`)

| Component | Purpose |
|-----------|---------|
| MonthCalendar | Month grid with drag-drop scheduling |
| WeekCalendar | 7-day columns with drag-drop |
| MonthDayCell | Single day in month grid |
| DayColumn | Single day in week view |

## Notes for Migration

- Components marked with `TODO(tauri-integration)` have heavy `useAppData()` usage
- Replace `useAppData()` with TanStack Query hooks during migration
- Order hooks can remain in Zustand/local state
- All drag-and-drop uses `@dnd-kit` (not react-beautiful-dnd)
- All views support keyboard navigation (arrows, Enter, Space, Cmd+N)

See [docs/MIGRATION-NOTES.md](docs/MIGRATION-NOTES.md) for the complete component inventory and recommended integration sequence.
