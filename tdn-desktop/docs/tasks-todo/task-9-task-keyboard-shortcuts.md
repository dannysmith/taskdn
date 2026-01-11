# Task: Task-Specific Commands Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for the complete list of task commands, shortcuts, and availability conditions.

## Overview

This task implements all task-specific commands - those that are only available when a task is selected. These enable keyboard-driven task management similar to Things.

## Prerequisites

- Task 6 complete (shortcut infrastructure)
- Task 8 in progress or complete (command system extensions)

## Scope

### Task Commands to Implement

From the registry, these commands require "task selected" availability:

| Command               | Shortcut | Description                       |
| --------------------- | -------- | --------------------------------- |
| `paste-as-tasks`      | ⌘V       | Create tasks from clipboard lines |
| `duplicate-task`      | ⇧⌘D      | Duplicate selected task           |
| `move-task-up`        | ⌘↑       | Move task up in list              |
| `move-task-down`      | ⌘↓       | Move task down in list            |
| `move-task-to-top`    | ⌥⌘↑      | Move task to top of list          |
| `move-task-to-bottom` | ⌥⌘↓      | Move task to bottom of list       |
| `edit-scheduled-date` | ⌘D       | Open scheduled date picker        |
| `set-scheduled-today` | ⌘T       | Set scheduled date to today       |
| `edit-due-date`       | ⌥⌘D      | Open due date picker              |
| `edit-defer-date`     | ⇧⌥⌘D     | Open defer until date picker      |
| `edit-status`         | ⌘S       | Open status dropdown              |
| `copy-task-title`     | ⌘C       | Copy task title to clipboard      |

### Availability Logic

All task commands share this availability check:

```typescript
isAvailable: context => {
  // Must have a selected task
  if (!context.selectedTaskId) return false

  // Must not be in an editable element
  const activeEl = document.activeElement
  if (
    activeEl instanceof HTMLInputElement ||
    activeEl instanceof HTMLTextAreaElement ||
    activeEl instanceof HTMLSelectElement ||
    (activeEl instanceof HTMLElement && activeEl.isContentEditable)
  ) {
    return false
  }

  return true
}
```

### Implementation Details

#### `paste-as-tasks` (⌘V)

```typescript
execute: async context => {
  const clipboardText = await navigator.clipboard.readText()
  const lines = clipboardText.split('\n').filter(line => line.trim())

  if (lines.length === 0) return

  // Create tasks below selected task
  const selectedTask = context.getSelectedTask()
  for (const line of lines) {
    await context.createTaskBelow(selectedTask.id, { title: line.trim() })
  }

  context.showToast(t('tasks.pastedCount', { count: lines.length }))
}
```

**Note**: Does NOT open any task for editing after creation.

#### `duplicate-task` (⇧⌘D)

```typescript
execute: async context => {
  const task = context.getSelectedTask()
  const newTask = await context.duplicateTask(task.id)
  context.selectTask(newTask.id)
}
```

#### Movement Commands (⌘↑↓, ⌥⌘↑↓) [CURRENTLY WORKS IN TASK LISTS]

```typescript
// move-task-up
execute: context => {
  const task = context.getSelectedTask()
  context.moveTaskUp(task.id)
}

// move-task-to-top
execute: context => {
  const task = context.getSelectedTask()
  context.moveTaskToTop(task.id)
}
```

**Note**: Movement behavior depends on current view:

- In project view: moves within project
- In area view: moves within visible list
- In Today/This Week: moves within scheduled order

#### Date Commands (⌘D, ⌘T, ⌥⌘D, ⇧⌥⌘D)

```typescript
// edit-scheduled-date - opens date picker
execute: context => {
  const task = context.getSelectedTask()
  context.openDatePicker(task.id, 'scheduled')
}

// set-scheduled-today - immediate action
execute: context => {
  const task = context.getSelectedTask()
  const today = new Date().toISOString().split('T')[0]
  context.updateTask(task.id, { scheduledDate: today })
  context.showToast(t('tasks.scheduledToday'))
}
```

#### `edit-status` (⌘S)

```typescript
execute: context => {
  const task = context.getSelectedTask()
  context.openStatusDropdown(task.id)
}
```

#### `copy-task-title` (⌘C)

```typescript
execute: async context => {
  const task = context.getSelectedTask()
  await navigator.clipboard.writeText(task.title)
  context.showToast(t('tasks.titleCopied'))
}
```

**Important**: This only fires when a task is selected AND not in an editable element. Standard ⌘C behavior is preserved in inputs/textareas.

### CommandContext Extensions

Add these methods to support task commands:

```typescript
interface CommandContext {
  // Selection
  selectedTaskId: string | null
  getSelectedTask: () => Task
  selectTask: (taskId: string) => void

  // Task operations
  createTaskBelow: (afterTaskId: string, data: Partial<Task>) => Promise<Task>
  duplicateTask: (taskId: string) => Promise<Task>
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>

  // Movement
  moveTaskUp: (taskId: string) => void
  moveTaskDown: (taskId: string) => void
  moveTaskToTop: (taskId: string) => void
  moveTaskToBottom: (taskId: string) => void

  // UI
  openDatePicker: (taskId: string, field: 'scheduled' | 'due' | 'defer') => void
  openStatusDropdown: (taskId: string) => void
}
```

## Interaction with Existing Handlers

### `create-task` (⌘N)

Already implemented with context-aware behavior. The command should wrap the existing logic:

| Context                          | Behavior                                |
| -------------------------------- | --------------------------------------- |
| Task selected in list            | Create below selected, open for editing |
| Task list focused, none selected | Create at bottom, open for editing      |
| In area view                     | Create in area's default location       |
| In project view                  | Create in project                       |
| Global                           | Create in Inbox                         |

### Component-Level Handlers

Some components may have their own handlers that should take precedence:

```typescript
// In TaskListItem or similar
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    // Component handles Enter for editing
    e.stopPropagation()
    startEditing()
  }
}}
```

The global shortcut handler respects `e.defaultPrevented` and skips commands when a component has already handled the event.

## Phased Implementation Plan

### Current State (from exploration)

- **CommandContext**: Has navigation, toast, preferences. NO task-specific methods.
- **task-detail-store**: Has `openTaskId` - can serve as "selected task" for commands.
- **Vault mutations**: `useCreateTask`, `useUpdateTask`, `useDeleteTask` exist with optimistic updates.
- **TaskUpdate**: Supports `title`, `status`, `project`, `area`, `scheduled`, `due`, `deferUntil`, `body`.
- **No backend** for `duplicateTask` or `moveTask` ordering - but duplicate can be done client-side.

---

### Phase 1: Foundation + Immediate Action Commands

**Goal**: Establish task command infrastructure and implement commands that need no new UI.

#### 1.1 Extend CommandContext (types.ts + use-command-context.ts)

Add to `CommandContext` interface:
```typescript
// Task selection (reads from task-detail-store)
selectedTaskId: string | null
getSelectedTask: () => Task | null

// Task mutations (wraps useUpdateTask via direct commands call)
updateTaskScheduled: (taskId: string, date: string | null) => Promise<void>
```

Add shared availability helper:
```typescript
// Helper for task commands - checks selected task + not in editable element
export function isTaskCommandAvailable(): boolean
```

#### 1.2 Create task-commands.ts

Implement these commands (no new UI needed):

| Command               | Shortcut | Implementation                                                |
| --------------------- | -------- | ------------------------------------------------------------- |
| `set-scheduled-today` | ⌘T       | `commands.updateTask({ id, scheduled: todayISO })`            |
| `copy-task-title`     | ⌘C       | `navigator.clipboard.writeText(task.title)` + toast           |
| `duplicate-task`      | ⇧⌘D      | `commands.createTask(...)` with same data, then open new task |

#### 1.3 Register in command system

- Add to `src/lib/commands/index.ts`
- Ensure shortcuts work via global handler

#### Files to Change (Phase 1)
| File                                | Change                                        |
| ----------------------------------- | --------------------------------------------- |
| `src/lib/commands/types.ts`         | Add task-related CommandContext methods       |
| `src/hooks/use-command-context.ts`  | Implement selectedTaskId, getSelectedTask, updateTaskScheduled |
| `src/lib/commands/task-commands.ts` | NEW - set-scheduled-today, copy-task-title, duplicate-task |
| `src/lib/commands/index.ts`         | Register task commands                        |

#### Checkpoint
- [ ] `⌘T` sets selected task's scheduled date to today
- [ ] `⌘C` copies task title when task selected (not in input)
- [ ] `⇧⌘D` duplicates task and opens the new task
- [ ] Standard ⌘C/⌘V still work in inputs/textareas

---

### Phase 2: Date/Status Picker Commands

**Goal**: Commands that open pickers/dropdowns for editing.

#### Approach Decision

**Option A**: Open task detail panel and programmatically focus the field
- Pros: Uses existing UI, no new components
- Cons: Forces detail panel open, might feel disruptive

**Option B**: Create floating picker triggered by command
- Pros: Non-intrusive, can work anywhere
- Cons: More UI work, duplicate components

**Recommended**: Option A for initial implementation - simpler, uses existing components.

#### 2.1 Add UI store methods

```typescript
// In ui-store or task-detail-store
pendingFocusField: 'scheduled' | 'due' | 'defer' | 'status' | null
setPendingFocusField: (field: ...) => void
```

#### 2.2 Implement picker commands

| Command               | Shortcut | Implementation                              |
| --------------------- | -------- | ------------------------------------------- |
| `edit-scheduled-date` | ⌘D       | Open detail panel, focus scheduled field    |
| `edit-due-date`       | ⌥⌘D      | Open detail panel, focus due field          |
| `edit-defer-date`     | ⇧⌥⌘D     | Open detail panel, focus defer field        |
| `edit-status`         | ⌘S       | Open detail panel, focus status dropdown    |

#### 2.3 Update TaskDetailPanel

React to `pendingFocusField` and auto-focus/open the relevant picker when set.

#### Files to Change (Phase 2)
| File                                      | Change                              |
| ----------------------------------------- | ----------------------------------- |
| `src/lib/commands/task-commands.ts`       | Add 4 picker commands               |
| `src/store/task-detail-store.ts`          | Add pendingFocusField state         |
| `src/components/tasks/task-detail-panel.tsx` | Handle auto-focus on pendingFocusField |

#### Checkpoint
- [ ] `⌘D` opens detail panel with scheduled date picker focused/open
- [ ] `⌥⌘D` opens detail panel with due date picker focused/open
- [ ] `⇧⌥⌘D` opens detail panel with defer date picker focused/open
- [ ] `⌘S` opens detail panel with status dropdown open

---

### Phase 3: Clipboard & Movement Commands

**Goal**: Remaining commands including paste-as-tasks and movement.

#### 3.1 paste-as-tasks (⌘V)

More complex - needs to:
1. Read clipboard text
2. Split into lines
3. Create tasks in appropriate location (depends on current view context)

May need to understand task ordering/positioning system first.

| Command          | Shortcut | Implementation                                   |
| ---------------- | -------- | ------------------------------------------------ |
| `paste-as-tasks` | ⌘V       | Parse clipboard lines, create tasks sequentially |

#### 3.2 Movement Commands (May Defer)

These depend on how task ordering works in the app:

| Command               | Shortcut | Notes                                  |
| --------------------- | -------- | -------------------------------------- |
| `move-task-up`        | ⌘↑       | Needs task ordering system             |
| `move-task-down`      | ⌘↓       | Needs task ordering system             |
| `move-task-to-top`    | ⌥⌘↑      | Needs task ordering system             |
| `move-task-to-bottom` | ⌥⌘↓      | Needs task ordering system             |

**Note**: Task movement may require backend support or a dedicated ordering store. The task doc mentions "[CURRENTLY WORKS IN TASK LISTS]" - need to investigate if there's existing movement logic we can leverage.

#### Checkpoint
- [ ] `⌘V` creates tasks from clipboard lines (when task selected, not in input)
- [ ] Movement commands work (if implemented)

---

## Files to Change (Summary)

| File                                         | Phase | Change                                    |
| -------------------------------------------- | ----- | ----------------------------------------- |
| `src/lib/commands/types.ts`                  | 1     | Add task-related CommandContext methods   |
| `src/hooks/use-command-context.ts`           | 1     | Implement task context methods            |
| `src/lib/commands/task-commands.ts`          | 1,2,3 | NEW - all task commands                   |
| `src/lib/commands/index.ts`                  | 1     | Register task commands                    |
| `src/store/task-detail-store.ts`             | 2     | Add pendingFocusField for picker commands |
| `src/components/tasks/task-detail-panel.tsx` | 2     | Handle auto-focus on field                |

## Success Criteria

1. All task commands from registry work when task selected
2. Commands don't fire when in input/textarea/select
3. Standard ⌘C/⌘V preserved in editable elements
4. Date pickers open via keyboard shortcut
5. Status dropdown opens via keyboard shortcut
6. Task movement works across all views (if implemented)

## Reference

Things keyboard shortcuts: https://culturedcode.com/things/support/articles/2785159/
