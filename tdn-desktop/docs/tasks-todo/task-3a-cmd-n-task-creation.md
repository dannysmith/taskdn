# Task 3a: Fix Cmd+N Task Creation

## Overview

**Goal:** Cmd+N should create a new task in the current view context. When a task is selected, create below it. When nothing is selected, create in the view's default section. The new task should immediately enter edit mode.

**Current Status:** Keyboard handling architecture is complete. The remaining blocker is a **race condition** between task creation and TanStack Query cache updates that prevents edit mode from triggering. See "The Core Problem" section.

---

## Background: Keyboard Architecture

### The Two-Layer Keyboard System

The app has two overlapping systems for handling Cmd+N:

1. **Global Handler** (`src/hooks/use-keyboard-shortcuts.ts`)
   - Attaches to `document` keydown
   - Calls `useTaskCreationStore.getState().triggerCreate()`
   - Acts as fallback when no list has focus

2. **Local Handlers** (in TaskList and OrderedItemList)
   - Attached to component's container via `onKeyDown`
   - Only fire when the container has focus
   - Handle Cmd+N directly with `e.stopPropagation()` to prevent global handler

### The Task Creation Store (`src/store/task-creation-store.ts`)

A Zustand store with a **dual-handler pattern**:

```
User presses Cmd+N
       ↓
Global handler calls triggerCreate()
       ↓
Is there an activeListHandler? ─Yes→ Use it (create after selected task)
       │
       No
       ↓
Is there a viewDefaultHandler? ─Yes→ Use it (create at section end)
       │
       No
       ↓
Do nothing
```

**Key state fields:**
- `viewDefaultHandler` - Registered by views on mount (e.g., ProjectView registers to create in its task list)
- `viewDefaultOnTaskCreated` - Callback to trigger edit mode after creation
- `activeListHandler` - Registered by TaskList when it has a selection
- `activeListSelectedTaskId` - The task to insert after

**Key actions:**
- `registerViewDefault(config)` - Views call on mount
- `activateList(listId, context)` - TaskList calls when it has a selection
- `deactivateList(listId)` - TaskList calls when selection clears
- `triggerCreate()` - Called by global handler, uses priority: activeList → viewDefault

### Component Hierarchy

```
View (TodayView, AreaView, ProjectView, etc.)
├── TaskDndContext (wraps multi-list views for cross-container drag)
│   ├── SectionTaskGroup (collapsible section with header)
│   │   ├── OrderedItemList (if mixed tasks + headings)
│   │   └── TaskList (if tasks only)
│   └── ProjectTaskGroup (project header + tasks)
│       └── TaskList
└── DraggableTaskList (standalone with own DndContext - Inbox, ProjectView)
    └── TaskList (wrapped)
```

### View Default Handlers

| View        | Default Section     | Creates With                    |
|-------------|--------------------|---------------------------------|
| TodayView   | Scheduled for Today | `scheduled: today`              |
| AreaView    | Loose Tasks         | `area: areaId`                  |
| NoAreaView  | Loose Tasks         | No project/area (orphan)        |
| InboxView   | Inbox list          | `status: inbox`                 |
| ProjectView | Project list        | `project: projectId`            |

---

## Implementation Progress

### Completed

- [x] **Phase 1:** Refactored task-creation-store with dual-handler architecture
- [x] **Phase 2:** Added view default registration to TodayView, AreaView, NoAreaView, ProjectView
- [x] **Phase 3:** Added list activation/deactivation to TaskList
- [x] **Phase 4:** Added list activation/deactivation to OrderedItemList
- [x] **Phase 5:** Added `autoEditItemId` prop pattern to DraggableTaskList and TaskList
- [x] Removed legacy `registerContext`/`unregisterContext` usage from DraggableTaskList

### Not Yet Done

- [ ] **InboxView:** Missing view default registration entirely (no `registerViewDefault` call)
- [ ] **Race condition fix:** Task creation works, but edit mode doesn't trigger (see below)
- [ ] Remove debug logging added during investigation

### What Works

| View    | With Selection | Without Selection |
|---------|---------------|-------------------|
| Today   | ✅ Works       | ✅ Works           |
| Project | Task created, no edit mode | Task created, no edit mode |
| Inbox   | Not tested    | Nothing happens (missing registration) |
| Area    | Task created, no edit mode | Task created, no edit mode |

---

## The Core Problem: Race Condition

### Discovery (Session 4)

Debug logging revealed the exact issue. When Cmd+N is pressed:

1. `triggerCreate()` is called ✓
2. `viewDefaultHandler` is found and called ✓
3. Task is created in Rust backend ✓
4. Task ID is returned ✓
5. `viewDefaultOnTaskCreated(taskId)` is called, setting `pendingEditItemId` ✓
6. DraggableTaskList receives `autoEditItemId` prop ✓
7. **Effect tries to find task in `tasks` array → NOT FOUND** ✗

### Console Output Evidence

```
[triggerCreate] Using viewDefaultHandler
[Task created] {id: "e472b2d3baa93329"}
[triggerCreate] viewDefaultHandler returned: "e472b2d3baa93329"
[triggerCreate] Calling viewDefaultOnTaskCreated
[ProjectView] onTaskCreated callback: "e472b2d3baa93329"
[DraggableTaskList] autoEditItemId set: "e472b2d3baa93329"
[DraggableTaskList] tasks count: 4
[DraggableTaskList] Found at index: -1  ← NOT FOUND!
```

The task count stayed at 4 even though a new task was just created. The task exists in the backend, but `useVaultData()` (TanStack Query) hasn't refetched yet.

### Root Cause

When we create a task, we update **two sources of truth**:

1. **Display order store** (Zustand) - updated synchronously
2. **Vault data** (TanStack Query) - updated asynchronously via invalidation/refetch

The `orderedTasks` array that components receive is derived from the **intersection** of both:
- Tasks that exist in the order array AND
- Tasks that exist in the query cache

Timeline:
1. Task created in backend
2. Order store updated (sync) - new task ID added to order
3. `pendingEditItemId` set (sync)
4. Query invalidated but not yet refetched
5. `orderedTasks` = order ∩ queryCache → new task NOT included (not in cache yet)
6. DraggableTaskList tries to find task → fails
7. Later: query refetches, but `pendingEditItemId` was already processed

### Why TodayView Works

TodayView uses `SectionTaskGroup` → `OrderedItemList`/`TaskList`. Due to timing differences in how React batches state updates and renders, the query cache happens to update before the auto-edit effect runs. This is fragile and could break.

---

## Solution: TanStack Query Optimistic Updates

The correct fix is to use TanStack Query's optimistic update pattern. When we create a task, we immediately add it to the query cache **before** the mutation completes, ensuring the task exists in `orderedTasks` by the time we try to edit it.

### How Optimistic Updates Work

```typescript
const mutation = useMutation({
  mutationFn: createTask,

  onMutate: async (newTaskData) => {
    // 1. Cancel any outgoing refetches to avoid overwriting our optimistic update
    await queryClient.cancelQueries({ queryKey: ['vault'] })

    // 2. Snapshot current data for rollback
    const previousData = queryClient.getQueryData(['vault'])

    // 3. Optimistically add the new task to the cache
    queryClient.setQueryData(['vault'], (old) => ({
      ...old,
      tasks: [...old.tasks, {
        id: crypto.randomUUID(), // Temporary ID
        ...newTaskData,
        // Set reasonable defaults for required fields
      }]
    }))

    return { previousData }
  },

  onSuccess: (realTask, variables, context) => {
    // 4. Replace temp task with real data from server
    queryClient.setQueryData(['vault'], (old) => ({
      ...old,
      tasks: old.tasks.map(t =>
        t.id === variables.tempId ? realTask : t
      )
    }))
  },

  onError: (err, variables, context) => {
    // 5. Rollback on error
    if (context?.previousData) {
      queryClient.setQueryData(['vault'], context.previousData)
    }
  },
})
```

### Implementation Plan

#### Step 1: Understand Current Mutation Implementation

Read and understand how `useCreateTask` currently works:
- File: `src/services/vault.ts` (or similar)
- What does it return?
- How does it invalidate the cache?
- What's the query key structure?

#### Step 2: Add Optimistic Updates to useCreateTask

Modify the `useCreateTask` mutation hook to:

1. Generate a temporary task ID in `onMutate`
2. Optimistically add the task to the vault query cache
3. Return the temp ID so the caller can use it immediately
4. In `onSuccess`, replace the temp task with the real one (matching by temp ID)
5. In `onError`, rollback to previous data

**Key consideration:** The temp task must have all required fields with reasonable defaults so it can be rendered in the list. Check the `Task` type for required fields.

#### Step 3: Update View Handlers to Use Temp ID

The `handleCreateTask` functions in views currently do:
```typescript
const newTask = await createTask.mutateAsync({...})
// Update order store
return newTask.id
```

After the change, the optimistic task appears in the cache immediately (before `mutateAsync` resolves), so the flow becomes:
```typescript
const result = createTask.mutate({...}, {
  onSuccess: (realTask) => {
    // Order store update and edit mode trigger happen here
  }
})
```

Or we may need to coordinate the temp ID with the view:
```typescript
const tempId = crypto.randomUUID()
createTask.mutate({ ...taskData, tempId }, {
  onSuccess: (realTask) => {
    // Replace tempId with realTask.id in order store if needed
  }
})
// Immediately set pendingEditItemId to tempId
setPendingEditItemId(tempId)
```

#### Step 4: Handle Order Store Coordination

The display order store needs to have the task ID when the task is created. With optimistic updates:

1. Generate temp ID before mutation
2. Add temp ID to order store immediately
3. Set `pendingEditItemId` to temp ID
4. Task appears in `orderedTasks` immediately (temp ID in order + temp task in cache)
5. DraggableTaskList finds task, enters edit mode
6. When mutation completes, replace temp ID with real ID in order store
7. Query cache already has real task (from `onSuccess`)

#### Step 5: Add InboxView Registration

InboxView is missing `registerViewDefault`. Add it following the same pattern as ProjectView:

```typescript
// In InboxView
const [pendingEditItemId, setPendingEditItemId] = useState<string | null>(null)

useEffect(() => {
  useTaskCreationStore.getState().registerViewDefault({
    handler: handleCreateTask,
    onTaskCreated: (taskId) => setPendingEditItemId(taskId),
  })
  return () => useTaskCreationStore.getState().registerViewDefault(null)
}, [handleCreateTask])

// Pass to DraggableTaskList
<DraggableTaskList
  autoEditItemId={pendingEditItemId}
  onAutoEditConsumed={() => setPendingEditItemId(null)}
  ...
/>
```

#### Step 6: Test All Views

After implementation, verify:

| View    | With Selection | Without Selection | Empty View |
|---------|---------------|-------------------|------------|
| Inbox   | Creates after, edit mode | Creates at end, edit mode | Creates, edit mode |
| Project | Creates after, edit mode | Creates at end, edit mode | Creates, edit mode |
| Today   | Creates after, edit mode | Creates in Scheduled, edit mode | Creates, edit mode |
| Area    | Creates after (in project), edit mode | Creates in Loose Tasks, edit mode | Creates, edit mode |
| NoArea  | Creates after, edit mode | Creates in Loose Tasks, edit mode | Creates, edit mode |

#### Step 7: Cleanup

1. Remove all debug `console.log` statements added during investigation
2. Remove the polling retry code from DraggableTaskList (if any was added)
3. Run `bun run check:all` to ensure no lint/type issues
4. Test edge cases: rapid Cmd+N, Escape to cancel, switching views mid-creation

---

## Files to Modify

### Core Changes
- `src/services/vault.ts` (or wherever `useCreateTask` is defined) - Add optimistic update logic
- `src/components/views/inbox-view.tsx` - Add missing view default registration

### View Handler Updates (if needed for temp ID coordination)
- `src/components/views/project-view.tsx`
- `src/components/views/today-view.tsx`
- `src/components/views/area-view.tsx`
- `src/components/views/no-area-view.tsx`

### Cleanup
- `src/store/task-creation-store.ts` - Remove debug logging
- `src/hooks/use-keyboard-shortcuts.ts` - Remove debug logging
- `src/components/tasks/task-list.tsx` - Remove debug logging, remove polling if added

---

## Success Criteria

1. Cmd+N works in ALL list views (Inbox, Project, Today, Area, NoArea)
2. With task selected: creates after that task, enters edit mode immediately
3. Without selection: creates in view's default section, enters edit mode immediately
4. Empty view: creates task, enters edit mode immediately
5. Cancel (Escape) before confirming deletes the new empty task
6. No race conditions or timing-dependent behavior
7. Existing functionality preserved (drag-drop, reordering, etc.)

---

## Session History

### Sessions 1-3 (2026-01-09)
- Implemented dual-handler architecture in task-creation-store
- Added view default registration to all views except InboxView
- Added list activation/deactivation to TaskList and OrderedItemList
- Added `autoEditItemId` prop pattern to DraggableTaskList
- Discovered that Cmd+N creates tasks but edit mode doesn't trigger
- Initial hypothesis: registration or handler issues

### Session 4 (2026-01-09)
- Added comprehensive debug logging
- Identified the actual problem: race condition between task creation and query cache
- Tasks are created successfully, but not in the cache when we try to find them
- TodayView works due to timing luck, not correctness
- Documented the root cause and designed optimistic updates solution

### Session 5 (Next)
- Implement TanStack Query optimistic updates in useCreateTask
- Add InboxView view default registration
- Test all views
- Remove debug logging

---

## Technical Notes

### Debug Logging Locations (to remove later)

Current debug logging exists in:
- `src/store/task-creation-store.ts` - `triggerCreate` logs state snapshot
- `src/hooks/use-keyboard-shortcuts.ts` - Cmd+N handler entry/exit
- `src/components/tasks/task-list.tsx` - TaskList activation, DraggableTaskList autoEdit
- `src/components/views/project-view.tsx` - View default registration

### Query Cache Structure

The vault query likely returns:
```typescript
{
  tasks: Task[],
  projects: Project[],
  areas: Area[],
}
```

When adding optimistic updates, we only modify the `tasks` array. The query key is probably `['vault']` or similar.

### Temp ID Considerations

- Use `crypto.randomUUID()` for temp IDs
- Temp IDs must not collide with real IDs (UUID ensures this)
- Store temp ID → real ID mapping if needed for order store update
- Consider: should order store use temp ID initially, then swap? Or wait for real ID?
