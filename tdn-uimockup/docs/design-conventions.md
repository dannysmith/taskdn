# Design Conventions

This document defines the visual and interaction conventions for Taskdn. The UI should:

- Feel clean and uncluttered
- Be visually consistent with itself
- Be predictable, intuitive, and learnable
- Feel fast
- Be keyboard-first — task apps are one of the few systems where even non-power users rely on the keyboard
- Use design patterns, interactions, shortcuts, and icons consistent with widely-used task management apps

---

## Entities

### Area

An ongoing responsibility or life domain. Never "finished."

| Property    | Description                                    |
| ----------- | ---------------------------------------------- |
| title       | Name of the area                               |
| status      | `active`, `archived`                           |
| type        | Category (e.g., "life-area", "work", "client") |
| description | Brief summary                                  |
| notes       | Markdown body content                          |

### Project

A finishable collection of tasks with a clear outcome.

| Property    | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| title       | Name of the project                                             |
| status      | `planning`, `ready`, `in-progress`, `paused`, `blocked`, `done` |
| areaId      | Parent area (optional)                                          |
| description | Brief summary                                                   |
| startDate   | When work begins                                                |
| endDate     | Target completion                                               |
| notes       | Markdown body content                                           |

### Task

A single actionable item.

| Property   | Description                                                             |
| ---------- | ----------------------------------------------------------------------- |
| title      | What needs to be done                                                   |
| status     | `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done` |
| projectId  | Parent project (optional)                                               |
| areaId     | Direct area (optional, overrides project's area)                        |
| due        | Deadline                                                                |
| scheduled  | When to work on it                                                      |
| deferUntil | Hide until this date                                                    |
| notes      | Markdown body content                                                   |

---

## Colors

### Status Colors

| Status      | Color       | Meaning                 |
| ----------- | ----------- | ----------------------- |
| inbox       | Blue        | Needs processing        |
| planning    | Blue        | Being planned           |
| icebox      | Light blue  | Frozen/deferred         |
| ready       | Grey        | Waiting to start        |
| in-progress | Amber       | Active work             |
| paused      | Light amber | Temporarily on hold     |
| blocked     | Dark red    | Stuck, needs resolution |
| dropped     | Light red   | Abandoned               |
| done        | Green       | Complete                |

### Entity Accent Colors

| Entity  | Color  | Usage                              |
| ------- | ------ | ---------------------------------- |
| Project | Purple | Subtle tint on project UI elements |
| Area    | Teal   | Subtle tint on area UI elements    |

### Date Colors

| Token         | Color    | Usage                              |
| ------------- | -------- | ---------------------------------- |
| date-due      | Soft red | Due dates (not overdue)            |
| date-overdue  | Dark red | Overdue due dates, hover state     |

### Area Type Colors

Six color slots for user-defined area types. Colors are assigned automatically via hash of the type string.

| Token        | Color  |
| ------------ | ------ |
| area-type-1  | Green  |
| area-type-2  | Blue   |
| area-type-3  | Purple |
| area-type-4  | Amber  |
| area-type-5  | Red    |
| area-type-6  | Teal   |

### UI Colors

| Purpose             | Color      |
| ------------------- | ---------- |
| Primary/Accent      | Blue       |
| Destructive actions | Bright red |
| Inactive/disabled   | Grey       |

---

## Icons

### Entity Icons

| Entity  | Icon            | Notes                                     |
| ------- | --------------- | ----------------------------------------- |
| Area    | Folder or Box   | Container metaphor                        |
| Project | Progress Circle | Shows completion percentage as filled arc |
| Task    | Status Checkbox | Rounded square, varies by status          |

### Task Status Icons

| Status      | Visual                 |
| ----------- | ---------------------- |
| ready       | Empty rounded square   |
| in-progress | Border with center dot |
| done        | Filled with checkmark  |
| blocked     | Filled with X          |
| dropped     | Grey with X            |
| icebox      | Border with snowflake  |
| inbox       | Border with inbox icon |

### Project Status Icons

| Status                       | Icon                      |
| ---------------------------- | ------------------------- |
| planning, ready, in-progress | Progress Circle (shows %) |
| paused                       | CirclePause               |
| blocked                      | Ban                       |
| done                         | CircleCheck               |

### UI Icons

| Icon         | Meaning                       |
| ------------ | ----------------------------- |
| Flag         | Priority / due date indicator |
| Calendar     | Date reference                |
| ChevronRight | Expand/collapse               |
| Sun          | Today view                    |
| CalendarDays | This Week view                |
| Inbox        | Inbox view                    |

---

## Container Query Breakpoints

We use container queries (`@container`) for component-level responsive design. This allows cards and panels to adapt based on their container width, not the viewport.

### Custom Breakpoints

Defined in `src/index.css`, these extend Tailwind's default container breakpoints for compact UI:

| Breakpoint | Size   | Use Case                                   |
| ---------- | ------ | ------------------------------------------ |
| `@4xs`     | 80px   | Ultra-compact (calendar day cells)         |
| `@5xs`     | 120px  | Task card row layout transitions           |
| `@6xs`     | 140px  | Task card compact threshold                |
| `@7xs`     | 180px  | Area/project cards expand                  |
| `@8xs`     | 200px  | Area/project cards switch to row layout    |

### Standard Breakpoints

Tailwind's built-in container breakpoints are also available:

| Breakpoint  | Size   |
| ----------- | ------ |
| `@3xs`      | 256px  |
| `@2xs`      | 288px  |
| `@xs`       | 320px  |
| `@sm`       | 384px  |

### Arbitrary Breakpoints

For one-off cases, use arbitrary values: `@[280px]:flex-row`

### Usage Pattern

```tsx
// Mark element as container query context
<div className="@container">
  {/* Child elements can use container breakpoints */}
  <div className="flex-col @5xs:flex-row gap-1.5 @6xs:gap-2">
    <span className="text-2xs @6xs:text-xs">...</span>
  </div>
</div>
```

---

## Components

### Cards

- **TaskCard** — Compact task display with status pill, project, dates
- **ProjectCard** — Project overview with progress bar, task count, area
- **AreaCard** — Area summary with project count

### List Items

- **TaskListItem** — Task row with checkbox, title, metadata; title is inline-editable
- **ProjectListItem** — Expandable project row containing tasks

### Lists

- **TaskList** — Ordered list of tasks, supports selection and reordering

### Views

- **KanbanBoard** — Column-per-status view with collapsible columns; supports drag-drop between statuses
- **CalendarView** — Month/week views showing scheduled tasks; drag tasks to reschedule

### Panels

- **TaskDetailPanel** — Right sidebar for editing task details (status, dates, project, area, notes)

---

## Interactions

### Selection & Navigation

- Arrow keys move selection through lists
- Enter on a selected item opens it for editing
- Escape clears selection or cancels editing

### Keyboard Shortcuts

- `Cmd+Up` / `Cmd+Down` — Reorder selected item
- `Cmd+Enter` — Complete task (toggle done)
- `Delete` / `Backspace` — Delete selected item (with confirmation if needed)

### Drag & Drop

- Tasks can be dragged to reorder within a list
- Tasks can be dragged between projects
- Projects can be dragged between areas

### Inline Editing

- Task titles are editable in place (click or press Enter)
- Editing should feel instant — no modal dialogs for title changes

---

## Dates

### Display Rules

- **Scheduled dates**: Shown in grey, calendar icon
- **Due dates**: Shown in red with flag icon; darker red if overdue
- **Relative format**: Use human-readable relative dates if within two weeks ("Today", "Tomorrow", "Mon", "in 5 days")
- **Absolute format**: Use short date format beyond two weeks ("Jan 15", "Mar 3")

### Behavior

- All displayed dates should be clickable to open a date picker
- Clearing a date removes it (nullable)
