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
| `duplicate-task`      | ⇧⌘D      | Duplicate selected task      | Done   |
| `edit-scheduled-date` | ⌘D       | Open scheduled date picker   | Todo   |
| `edit-due-date`       | ⌥⌘D      | Open due date picker         | Todo   |
| `edit-defer-date`     | ⇧⌥⌘D     | Open defer until date picker | Todo   |
| `edit-status`         | ⌘S       | Open status dropdown         | Todo   |

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
3. **`duplicate-task` (⇧⌘D)** - Creates a copy of the task and opens it in detail panel

### Files Changed

| File                                | Change                                            |
| ----------------------------------- | ------------------------------------------------- |
| `src/lib/commands/types.ts`         | Added `isTaskCommandAvailable()` helper           |
| `src/lib/commands/types.ts`         | Added `updateTaskInCache`, `addTaskToCache` to CommandContext |
| `src/hooks/use-command-context.ts`  | Implemented `selectedTaskId`, `getSelectedTask`, `openTask`, cache methods |
| `src/lib/commands/task-commands.ts` | NEW - All three Phase 1 commands                  |
| `src/lib/commands/index.ts`         | Registered task commands                          |
| `src/lib/menu.ts`                   | Added Edit menu (required for ⌘C/⌘V to work in inputs) |
| `locales/en.json`                   | Added Edit menu translations                      |

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
- [x] `⇧⌘D` duplicates task and opens the new task
- [x] Standard ⌘C/⌘V/⌘A work in inputs/textareas (required adding Edit menu)

---

## Phase 2: Date/Status Picker Commands - TODO

**Goal**: Commands that open pickers/dropdowns for editing.

### Approach

Open task detail panel and programmatically focus/open the relevant field. Uses existing UI components.

### Commands to Implement

| Command               | Shortcut | Implementation                           |
| --------------------- | -------- | ---------------------------------------- |
| `edit-scheduled-date` | ⌘D       | Open detail panel, focus scheduled field |
| `edit-due-date`       | ⌥⌘D      | Open detail panel, focus due field       |
| `edit-defer-date`     | ⇧⌥⌘D     | Open detail panel, focus defer field     |
| `edit-status`         | ⌘S       | Open detail panel, focus status dropdown |

### Implementation Plan

1. Add `pendingFocusField` state to `task-detail-store`
2. Add commands that set this field and open the detail panel
3. Update `TaskDetailPanel` to react to `pendingFocusField` and auto-focus/open

### Files to Change

| File                                         | Change                                 |
| -------------------------------------------- | -------------------------------------- |
| `src/lib/commands/task-commands.ts`          | Add 4 picker commands                  |
| `src/store/task-detail-store.ts`             | Add pendingFocusField state            |
| `src/components/tasks/task-detail-panel.tsx` | Handle auto-focus on pendingFocusField |

### Checkpoint

- [ ] `⌘D` opens detail panel with scheduled date picker focused/open
- [ ] `⌥⌘D` opens detail panel with due date picker focused/open
- [ ] `⇧⌥⌘D` opens detail panel with defer date picker focused/open
- [ ] `⌘S` opens detail panel with status dropdown open

---

## Success Criteria

1. All implemented task commands work when task selected
2. Commands don't fire when in input/textarea/select
3. Standard ⌘C/⌘V/⌘A preserved in editable elements
4. Date pickers open via keyboard shortcut (Phase 2)
5. Status dropdown opens via keyboard shortcut (Phase 2)

## Reference

Things keyboard shortcuts: https://culturedcode.com/things/support/articles/2785159/
