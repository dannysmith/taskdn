# Task: Task-Specific Commands Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for the complete list of task commands, shortcuts, and availability conditions.

## Overview

This task implements task-specific commands - those that are only available when a task is selected. These enable keyboard-driven task management similar to Things.

## Prerequisites

- Task 6 complete (shortcut infrastructure)
- Task 8 in progress or complete (command system extensions)

## Scope

### Task Commands to Implement

| Command               | Shortcut | Description                  | Status |
| --------------------- | -------- | ---------------------------- | ------ |
| `set-scheduled-today` | ⌘T       | Set scheduled date to today  | Done   |
| `copy-task-title`     | ⌘C       | Copy task title to clipboard | Done   |
| `duplicate-task`      | ⌘'       | Duplicate selected task      | Done   |
| `edit-scheduled-date` | ⌘D       | Open scheduled date picker   | Done   |
| `edit-due-date`       | ⇧⌘D      | Open due date picker         | Done   |
| `edit-defer-date`     | ⌃⇧⌘D     | Open defer until date picker | Done   |
| `edit-status`         | ⌘S       | Open status dropdown         | Done   |

### Out of Scope (Deferred)

These commands were originally planned but deferred to a future task:

- `paste-as-tasks` (⌘V) - Create tasks from clipboard lines
- Movement commands (⌘↑↓, ⌥⌘↑↓) - Requires task ordering system

---

## Phase 1: Immediate Action Commands - COMPLETE

### What Was Implemented

Three commands that perform immediate actions without requiring new UI:

1. **`set-scheduled-today` (⌘T)** - Sets the selected task's scheduled date to today
2. **`copy-task-title` (⌘C)** - Copies task title to clipboard (only when not in editable element)
3. **`duplicate-task` (⌘')** - Creates a copy of the task and opens it in detail panel

### Files Changed

| File                                | Change                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/commands/types.ts`         | Added `isTaskCommandAvailable()` helper                                    |
| `src/lib/commands/types.ts`         | Added `updateTaskInCache`, `addTaskToCache` to CommandContext              |
| `src/hooks/use-command-context.ts`  | Implemented `selectedTaskId`, `getSelectedTask`, `openTask`, cache methods |
| `src/lib/commands/task-commands.ts` | NEW - All three Phase 1 commands                                           |
| `src/lib/commands/index.ts`         | Registered task commands                                                   |
| `src/lib/menu.ts`                   | Added Edit menu (required for ⌘C/⌘V to work in inputs)                     |
| `locales/en.json`                   | Added Edit menu translations                                               |

### Key Implementation Pattern: Cache Updates

**Important learning**: Commands that modify data must update the TanStack Query cache after Tauri commands succeed. The mutation hooks (`useUpdateTask`, `useCreateTask`) handle this automatically, but commands bypass hooks and call Tauri directly.

Solution: Added cache update methods to `CommandContext`:

```typescript
// In types.ts
interface CommandContext {
  // ... other methods
  updateTaskInCache: (taskId: string, updatedTask: Task) => void
  addTaskToCache: (task: Task) => void
}

// Usage in command execute():
const result = await commands.updateTask({ ... })
if (result.status === 'ok') {
  context.updateTaskInCache(task.id, result.data)  // Update cache!
}
```

### Availability Check

All task commands share this availability logic (in `isTaskCommandAvailable()`):

1. Must have a selected task (`context.selectedTaskId`)
2. Must NOT be in an editable element (input, textarea, select, contenteditable)

This ensures standard ⌘C/⌘V work normally in text inputs.

### Checkpoint - All Pass

- [x] `⌘T` sets selected task's scheduled date to today
- [x] `⌘C` copies task title when task selected (not in input)
- [x] `⌘'` duplicates task and opens the new task
- [x] Standard ⌘C/⌘V/⌘A work in inputs/textareas (required adding Edit menu)

---

## Phase 2: Date/Status Picker Commands - COMPLETE

**Goal**: Commands that open pickers/dropdowns for editing.

### What Was Implemented

Four commands that open the detail panel and auto-open the relevant picker:

1. **`edit-scheduled-date` (⌘D)** - Opens scheduled date picker
2. **`edit-due-date` (⇧⌘D)** - Opens due date picker
3. **`edit-defer-date` (⌃⇧⌘D)** - Opens defer until picker
4. **`edit-status` (⌘S)** - Opens status dropdown with keyboard navigation from current value

### Shortcut Notes

Original shortcuts `⌥⌘D` (due) and `⇧⌥⌘D` (defer) were changed because macOS intercepts `⌥⌘D` system-wide to show/hide the Dock. New shortcuts:

- `⇧⌘D` for due date (matches Things app convention)
- `⌃⇧⌘D` for defer date

### Files Changed

| File                                         | Change                                          |
| -------------------------------------------- | ----------------------------------------------- |
| `src/lib/commands/task-commands.ts`          | Added 4 picker commands with focusField() calls |
| `src/store/task-detail-store.ts`             | Added pendingFocusField state and focusField()  |
| `src/components/tasks/task-detail-panel.tsx` | Handle pendingFocusField to auto-open pickers   |
| `src/components/ui/date-button.tsx`          | Added controlled open/onOpenChange props        |
| `src/components/tasks/task-status-pill.tsx`  | Converted to RadioGroup for proper keyboard nav |

### Checkpoint - All Pass

- [x] `⌘D` opens detail panel with scheduled date picker focused/open
- [x] `⇧⌘D` opens detail panel with due date picker focused/open
- [x] `⌃⇧⌘D` opens detail panel with defer date picker focused/open
- [x] `⌘S` opens detail panel with status dropdown open (keyboard nav from current value)

---

## Success Criteria

1. All implemented task commands work when task selected
2. Commands don't fire when in input/textarea/select
3. Standard ⌘C/⌘V/⌘A preserved in editable elements
4. Date pickers open via keyboard shortcut (Phase 2)
5. Status dropdown opens via keyboard shortcut (Phase 2)

## Reference

Things keyboard shortcuts: https://culturedcode.com/things/support/articles/2785159/
