# Move Incomplete Tasks to Today

**GitHub Issue:** [#38](https://github.com/dannysmith/taskdn/issues/38)
**Work Directory:** `tdn-desktop/`

## Requirements

Add a command that bulk-reschedules overdue incomplete tasks to today. The command sets the `scheduled` date to today for all tasks matching **all three** criteria:

1. Has a `scheduled` date set
2. Status is NOT `done` or `dropped`
3. The `scheduled` date is strictly before today
4. Not archived — the backend's `listTasks()` only reads direct files in the tasks directory (not subdirectories), so archived tasks in `tasks/archive/` are never returned and require no additional filtering

Completed and dropped tasks keep their original scheduled date.

### Surfaces

The command must be accessible from:

1. **Command palette** — searchable by name/keywords
2. **Button in the Today column header** — visible in the This Week calendar view only, inside the day header of the column representing today

## Implementation Plan

### Step 1: Add `getTasks()` to CommandContext

The existing `CommandContext` exposes `getAreas()` and `getProjects()` but not tasks. The bulk command needs to read all tasks from the TanStack Query cache.

**Files to change:**

- `src/lib/commands/types.ts` — Add `getTasks: () => Task[]` to the `CommandContext` interface, next to `getAreas()` and `getProjects()` in the "Data access" section
- `src/hooks/use-command-context.ts` — Implement `getTasks()` following the exact pattern of `getAreas()`/`getProjects()`:
  ```typescript
  getTasks: () => {
    const tasks = queryClient.getQueryData<Task[]>(vaultQueryKeys.tasks())
    return tasks ?? []
  },
  ```

### Step 2: Add the command

**File:** `src/lib/commands/task-commands.ts`

Add a new `move-incomplete-to-today` command to the `taskCommands` array. This is a **global command** (not scoped to a selected task), so it does NOT use `isTaskCommandAvailable` or `getTargetTask`.

```typescript
{
  id: 'move-incomplete-to-today',
  labelKey: 'commands.moveIncompleteToToday.label',
  descriptionKey: 'commands.moveIncompleteToToday.description',
  icon: CalendarArrowUp,  // from lucide-react
  group: 'tasks',
  keywords: ['move', 'incomplete', 'overdue', 'reschedule', 'today', 'catch up', 'past'],
  surfaces: { commandPalette: true, appMenu: 'Edit' },

  execute: async context => {
    const today = getTodayISO()
    const tasks = context.getTasks()

    const overdueTasks = tasks.filter(task =>
      task.scheduled &&
      task.scheduled < today &&
      task.status !== 'done' &&
      task.status !== 'dropped'
    )

    if (overdueTasks.length === 0) {
      context.showToast(t('commands.moveIncompleteToToday.noTasks'), 'info')
      return
    }

    markMutationStart()

    const results = await Promise.all(
      overdueTasks.map(task =>
        commands.updateTask({
          id: task.id,
          title: null,
          status: null,
          project: null,
          area: null,
          scheduled: today,
          due: null,
          deferUntil: null,
          body: null,
        })
      )
    )

    markMutationComplete()

    // Update cache for successful updates, log failures
    let successCount = 0
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'ok') {
        context.updateTaskInCache(overdueTasks[i].id, result.data)
        successCount++
      } else {
        logger.error('Failed to reschedule task', {
          taskId: overdueTasks[i].id,
          error: result.error,
        })
      }
    }

    if (successCount === 0) {
      context.showToast(t('commands.moveIncompleteToToday.error'), 'error')
    } else {
      context.showToast(
        t('commands.moveIncompleteToToday.success', { count: successCount }),
        'success'
      )
    }
  },
}
```

**Design notes:**

- Uses `Promise.all` to update all tasks in parallel rather than sequentially — the Rust backend handles file writes independently and ~50ms per task would add up for many tasks
- String comparison `task.scheduled < today` works correctly because both are ISO date strings (`YYYY-MM-DD`)
- `markMutationStart()`/`markMutationComplete()` wraps the entire batch to prevent file watcher cache invalidation during the operation
- Partial failure is handled gracefully: successful updates are cached, failures logged, toast reflects actual count

### Step 3: Add i18n strings

**File:** `locales/en.json`

Add these keys:

```json
"commands.moveIncompleteToToday.label": "Move Incomplete Tasks to Today",
"commands.moveIncompleteToToday.description": "Reschedule all overdue incomplete tasks to today",
"commands.moveIncompleteToToday.success": "Moved {{count}} task(s) to today",
"commands.moveIncompleteToToday.noTasks": "No overdue tasks to reschedule",
"commands.moveIncompleteToToday.error": "Failed to reschedule tasks"
```

### Step 4: Add button to the Today column in WeekCalendar

The button should appear in the day header of the column that represents today, only in the This Week calendar view.

**File: `src/components/calendar/DayColumn.tsx`**

- Add an optional `onMoveIncompleteToToday?: () => void` prop to `DayColumnProps`
- When `isCurrentDay` is true AND the prop is provided, render a small icon button in the day header between the day name and the date number. Use a subtle style (`ghost` variant, small size) so it doesn't crowd the header. Use the same `CalendarArrowUp` icon as the command for consistency.

Rough placement in the header:

```tsx
<div className="flex items-center justify-between">
  <span className="text-xs font-medium text-muted-foreground uppercase">
    {format(date, 'EEE')}
  </span>
  <div className="flex items-center gap-1">
    {isCurrentDay && onMoveIncompleteToToday && (
      <Button variant="ghost" size="icon" className="size-6" onClick={onMoveIncompleteToToday}>
        <CalendarArrowUp className="size-3.5" />
      </Button>
    )}
    <span className={cn(/* existing date styles */)}>
      {format(date, 'd')}
    </span>
  </div>
</div>
```

Add a tooltip for discoverability (the existing `Tooltip` component from shadcn/ui).

**File: `src/components/calendar/WeekCalendar.tsx`**

- Import `executeCommand` from the command registry and `commandContext` from `use-command-context`
- When rendering DayColumns, pass `onMoveIncompleteToToday` only for the today column:
  ```typescript
  onMoveIncompleteToToday={isToday(day)
    ? () => executeCommand('move-incomplete-to-today', commandContext)
    : undefined
  }
  ```

This ensures the button triggers the exact same code path as the command palette and keyboard shortcut.

### Step 5: Quality checks

- Run `bun run check:all` to verify TypeScript, ESLint, Prettier, ast-grep, and Rust checks pass
- Manual testing against `dummy-demo-vault/` — the demo vault has tasks with various statuses and scheduled dates that should exercise the filtering logic
