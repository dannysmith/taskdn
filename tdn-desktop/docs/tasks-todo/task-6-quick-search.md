# Task: Quick Search

Users must be able to quickly search for and open any task using a command palette-like interface. Requirements:

- Support fuzzy matching by filename or title
- Prioritize recently updated or created tasks
- Accessible via a keyboard shortcut

The goal is to hit a shortcut and very quickly find and open any item in the app.

---

## Decisions

- **Scope**: Tasks only (projects/areas already accessible via Command Palette navigation)
- **Shortcut**: `Cmd+P` (VSCode-style "go to file")
- **Action**: Open task only (no inline quick actions)
- **Separate from Command Palette**: Command Palette = actions, Quick Search = finding things
- **Empty state**: Show nothing until user starts typing (no "recent tasks" list)
- **Filtering**: Use cmdk's built-in filtering (no external fuzzy library)
- **Display limit**: Cap displayed results sensibly (e.g., 50) for performance

## Result Display

Each result shows:

- Title
- Project name (if any)
- Area name (if any)
- Status (text/icon, NOT a checkbox - could be confused as clickable)
- Due date (if any)
- Defer-until date (if any)
- Scheduled date (if any)

## Implementation Plan

### Phase 1: Extract Navigation Logic

The `getViewForTask()` function in `src/hooks/use-deep-link.ts:95-130` determines which view to show when opening a task. This logic needs to be shared with Quick Search.

**Extract to**: `src/lib/task-navigation.ts`

```typescript
// Determines the correct view/selection for a task
export function getSelectionForTask(
  task: Task,
  projects: Project[],
  areas: Area[]
): Selection
```

**Update consumers**:

- `src/hooks/use-deep-link.ts` - import and use extracted function
- Quick Search will also use this

### Phase 2: UI Store Addition

Add Quick Search modal state to `src/store/ui-store.ts`:

```typescript
quickSearchOpen: boolean
setQuickSearchOpen: (open: boolean) => void
```

### Phase 3: Quick Search Component

Create `src/components/quick-search/QuickSearch.tsx`:

**Structure**:

```
CommandDialog (Cmd+P trigger)
├── CommandInput (search box)
└── CommandList
    ├── CommandEmpty ("No tasks found")
    └── CommandGroup (hidden when search is empty)
        └── CommandItem[] (filtered tasks, max 50)
            └── QuickSearchResult (title, metadata row)
```

**Data source**: Read from TanStack Query cache:

- Tasks via `queryClient.getQueryData(vaultQueryKeys.tasks())`
- Projects/Areas for resolving wikilinks to display names

**Filtering & sorting**:

- Use cmdk's built-in filtering (matches on CommandItem's `value` prop)
- Set each item's `value` to task title for matching
- Pre-sort tasks by `updatedAt` descending before rendering (cmdk preserves order)
- Limit displayed items to 50

**Empty state behavior**:

- Track search input value in local state
- When search is empty: render nothing (no CommandGroup, no CommandEmpty)
- When search has text but no matches: show CommandEmpty ("No tasks found")
- This gives "nothing until you type" UX while still showing feedback for no-match queries

**Result component** (`QuickSearchResult.tsx`):

- Display title prominently
- Metadata row: project | area | status | due | defer | scheduled
- Resolve project/area wikilinks (e.g., `[[Project Name]]`) to display names
- Use existing status styling patterns (text/icon, no checkbox)
- Compact layout for scanning

### Phase 4: Register Shortcut

Add to command registry (in `src/lib/commands/ui-commands.ts`):

```typescript
{
  id: 'quick-search',
  labelKey: 'commands.quickSearch.label',
  shortcut: 'CmdOrCtrl+P',
  surfaces: { commandPalette: false }, // Only via shortcut, not in palette
  execute: () => useUIStore.getState().setQuickSearchOpen(true),
}
```

### Phase 5: Wire Up Navigation

When user selects a task:

1. Call `getSelectionForTask()` to determine correct view
2. Call `useNavigationStore.getState().setSelection(selection)`
3. Call `useTaskDetailStore.getState().openTask(taskId)`
4. Close Quick Search modal

### Phase 6: Mount Component

Add `<QuickSearch />` to `src/components/layout/MainWindow.tsx` alongside `<CommandPalette />`

## Files to Create/Modify

**New files**:

- `src/lib/task-navigation.ts` - extracted navigation logic
- `src/lib/task-navigation.test.ts` - tests for navigation logic
- `src/components/quick-search/QuickSearch.tsx` - main component
- `src/components/quick-search/QuickSearchResult.tsx` - result item component

**Modified files**:

- `src/hooks/use-deep-link.ts` - use extracted `getSelectionForTask`
- `src/store/ui-store.ts` - add `quickSearchOpen` state
- `src/lib/commands/ui-commands.ts` - add `quick-search` command
- `src/components/layout/MainWindow.tsx` - mount `<QuickSearch />`
- `locales/en.json` - add translation keys

## Testing

- Unit test `getSelectionForTask()` logic (various task/project/area combinations)
- Manual test: Cmd+P opens modal, typing filters results, selecting navigates correctly
- Manual test: Empty search shows nothing, no-match search shows "No tasks found"
