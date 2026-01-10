# Task 3a: Fix Cmd+N Task Creation

IMPORTANT: this whole approach was proven to be overly complex and difficult. 

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

| View        | Default Section     | Creates With             |
| ----------- | ------------------- | ------------------------ |
| TodayView   | Scheduled for Today | `scheduled: today`       |
| AreaView    | Loose Tasks         | `area: areaId`           |
| NoAreaView  | Loose Tasks         | No project/area (orphan) |
| InboxView   | Inbox list          | `status: inbox`          |
| ProjectView | Project list        | `project: projectId`     |

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

| View    | With Selection             | Without Selection                      |
| ------- | -------------------------- | -------------------------------------- |
| Today   | ✅ Works                   | ✅ Works                               |
| Project | Task created, no edit mode | Task created, no edit mode             |
| Inbox   | Not tested                 | Nothing happens (missing registration) |
| Area    | Task created, no edit mode | Task created, no edit mode             |

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

### Reference Implementation

**Good news:** `useUpdateTask` and `useDeleteTask` in `src/services/vault.ts` already implement optimistic updates correctly. Use these as the canonical pattern.

### Query Cache Structure (IMPORTANT)

The vault uses **separate queries**, not a single nested object:

| Query Key                | Returns     | Constant                    |
| ------------------------ | ----------- | --------------------------- |
| `['vault', 'tasks']`     | `Task[]`    | `vaultQueryKeys.tasks()`    |
| `['vault', 'projects']`  | `Project[]` | `vaultQueryKeys.projects()` |
| `['vault', 'areas']`     | `Area[]`    | `vaultQueryKeys.areas()`    |
| `['vault', 'tasks', id]` | `Task`      | `vaultQueryKeys.task(id)`   |

**There is no single `['vault']` query.** Always use `vaultQueryKeys.tasks()` for the task list.

### How Optimistic Updates Work

```typescript
const mutation = useMutation({
  mutationFn: createTask,

  onMutate: async newTaskData => {
    // 1. Cancel any outgoing refetches to avoid overwriting our optimistic update
    await queryClient.cancelQueries({ queryKey: vaultQueryKeys.tasks() })

    // 2. Snapshot current data for rollback
    const previousTasks = queryClient.getQueryData<Task[]>(
      vaultQueryKeys.tasks()
    )

    // 3. Generate temp ID (caller provides this - see "Temp ID Flow" below)
    const tempId = newTaskData.tempId

    // 4. Optimistically add the new task to the cache
    const tempTask: Task = {
      id: tempId,
      title: newTaskData.title ?? '',
      status: newTaskData.status ?? 'next',
      path: `temp://${tempId}`, // Placeholder path
      body: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      due: newTaskData.due ?? null,
      scheduled: newTaskData.scheduled ?? null,
      deferUntil: newTaskData.deferUntil ?? null,
      area: newTaskData.area ?? null,
      project: newTaskData.project ?? null,
    }

    queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), old =>
      old ? [...old, tempTask] : [tempTask]
    )

    return { previousTasks, tempId }
  },

  onSuccess: (realTask, variables, context) => {
    // 5. Replace temp task with real data from server
    queryClient.setQueryData<Task[]>(
      vaultQueryKeys.tasks(),
      old => old?.map(t => (t.id === context?.tempId ? realTask : t)) ?? []
    )
    // Also set individual task cache
    queryClient.setQueryData(vaultQueryKeys.task(realTask.id), realTask)
  },

  onError: (err, variables, context) => {
    // 6. Rollback on error
    if (context?.previousTasks) {
      queryClient.setQueryData(vaultQueryKeys.tasks(), context.previousTasks)
    }
  },
})
```

### Required Fields for Temp Task

The `Task` type requires all these fields. The temp task must include them with reasonable defaults:

```typescript
interface Task {
  id: string // Use temp UUID from caller
  title: string // From options, or empty string
  status: TaskStatus // From options, or 'next'
  path: string // Placeholder: `temp://${tempId}`
  body: string // Empty string
  createdAt: string | null // Current ISO date
  updatedAt: string | null // Current ISO date
  completedAt: string | null // null
  due: string | null // From options
  scheduled: string | null // From options
  deferUntil: string | null // From options
  area: string | null // From options
  project: string | null // From options
}
```

### Implementation Plan

#### Step 1: Add Optimistic Updates to useCreateTask

Location: `src/services/vault.ts` (lines ~206-237)

Modify `useCreateTask` to accept a `tempId` from the caller and use optimistic updates:

1. Accept `tempId` in the mutation options
2. In `onMutate`: cancel queries, snapshot, add temp task to cache
3. In `onSuccess`: replace temp task with real task, update individual task cache
4. In `onError`: rollback to previous data

Reference `useUpdateTask` (lines 257-302) for the exact pattern.

#### Step 2: Update View Handlers - The Temp ID Flow

**Critical:** The view must generate the temp ID upfront so it can update both the order store and set `pendingEditItemId` synchronously.

```typescript
// In view's handleCreateTask:
const handleCreateTask = async (afterTaskId: string | null) => {
  // 1. Generate temp ID BEFORE mutation
  const tempId = crypto.randomUUID()

  // 2. Update order store immediately with temp ID
  const currentOrder = orderedTasks.map(t => t.id)
  const insertIndex = afterTaskId
    ? currentOrder.indexOf(afterTaskId) + 1
    : currentOrder.length
  const newOrder = [
    ...currentOrder.slice(0, insertIndex),
    tempId,
    ...currentOrder.slice(insertIndex),
  ]
  useDisplayOrderStore.getState().setProjectTaskOrder(projectId, newOrder)

  // 3. Start mutation (this adds temp task to cache via onMutate)
  createTask.mutate(
    { ...taskOptions, tempId },
    {
      onSuccess: realTask => {
        // 4. Replace temp ID with real ID in order store
        const order =
          useDisplayOrderStore.getState().projectTaskOrder[projectId]
        if (order) {
          const updatedOrder = order.map(id =>
            id === tempId ? realTask.id : id
          )
          useDisplayOrderStore
            .getState()
            .setProjectTaskOrder(projectId, updatedOrder)
        }
      },
      onError: () => {
        // 5. Remove temp ID from order store on failure
        const order =
          useDisplayOrderStore.getState().projectTaskOrder[projectId]
        if (order) {
          const revertedOrder = order.filter(id => id !== tempId)
          useDisplayOrderStore
            .getState()
            .setProjectTaskOrder(projectId, revertedOrder)
        }
      },
    }
  )

  // 6. Return temp ID immediately for edit mode
  return tempId
}
```

**Result:** The temp ID is in both the order store AND the query cache immediately, so `orderedTasks` includes the new task and edit mode works.

#### Step 3: Add InboxView Registration

Location: `src/components/views/inbox-view.tsx`

InboxView is missing `registerViewDefault` entirely. Add:

```typescript
// Add state
const [pendingEditItemId, setPendingEditItemId] = React.useState<string | null>(null)

// Add registration effect (similar to ProjectView lines 270-284)
React.useEffect(() => {
  useTaskCreationStore.getState().registerViewDefault({
    handler: handleCreateTask,
    onTaskCreated: (taskId) => setPendingEditItemId(taskId),
  })
  return () => useTaskCreationStore.getState().registerViewDefault(null)
}, [handleCreateTask])

// Update DraggableTaskList props (around line 152-163)
<DraggableTaskList
  // ... existing props
  autoEditItemId={pendingEditItemId}
  onAutoEditConsumed={() => setPendingEditItemId(null)}
/>
```

#### Step 4: Update Other Views

Apply the same temp ID flow pattern to:

- `src/components/views/project-view.tsx`
- `src/components/views/today-view.tsx`
- `src/components/views/area-view.tsx`
- `src/components/views/no-area-view.tsx`

Each view's `handleCreateTask` needs to:

1. Generate temp ID upfront
2. Update its order store immediately
3. Use `mutate()` instead of `mutateAsync()`
4. Replace temp ID with real ID in `onSuccess`
5. Revert order store in `onError`
6. Return temp ID immediately

#### Step 5: Test All Views

After implementation, verify:

| View    | With Selection                        | Without Selection                 | Empty View         |
| ------- | ------------------------------------- | --------------------------------- | ------------------ |
| Inbox   | Creates after, edit mode              | Creates at end, edit mode         | Creates, edit mode |
| Project | Creates after, edit mode              | Creates at end, edit mode         | Creates, edit mode |
| Today   | Creates after, edit mode              | Creates in Scheduled, edit mode   | Creates, edit mode |
| Area    | Creates after (in project), edit mode | Creates in Loose Tasks, edit mode | Creates, edit mode |
| NoArea  | Creates after, edit mode              | Creates in Loose Tasks, edit mode | Creates, edit mode |

#### Step 6: Cleanup

1. Remove all debug `console.log` statements added during investigation
2. Run `bun run check:all` to ensure no lint/type issues
3. Test edge cases (see below)

---

## Edge Cases to Test

### 1. Rapid Successive Cmd+N

User presses Cmd+N twice rapidly before first mutation completes.

**Expected behavior:**

- Two temp tasks appear immediately
- First mutation completes → first temp ID replaced with real ID
- Second mutation completes → second temp ID replaced with real ID
- Both tasks editable

**Why it should work:** Each call generates a unique temp ID. The order store and cache updates are independent.

### 2. Editing During Mutation

User starts typing in the new task while mutation is still pending.

**Expected behavior:**

- User types with temp ID task
- Mutation completes, temp ID → real ID swap
- Focus and editing state preserved

**Potential issue:** If `editingTaskId` state holds the temp ID and we swap to real ID, the component might lose track.

**Mitigation:** The task row component should receive the task object (with its ID), not just use `editingTaskId` for comparison. When the ID in the `tasks` array changes, React will re-render but preserve focus because it's the same DOM element (same array position).

### 3. Escape to Cancel

User presses Escape before confirming the new task.

**Expected behavior:**

- TaskList's `handleCancelEdit` is called
- Calls `onDeleteTask(tempId)`
- `useDeleteTask` removes the temp task from cache
- Order store should also remove the temp ID

**Implementation note:** The delete mutation will fail for a temp task (no real file exists). Handle this gracefully - the optimistic delete already removed it from cache, so the error is benign. Consider checking if the path starts with `temp://` and skipping the backend call.

### 4. Mutation Failure

Backend fails to create the task (e.g., filesystem error).

**Expected behavior:**

- `onError` callback fires
- Query cache rolled back (temp task removed)
- Order store reverted (temp ID removed)
- User sees error notification
- Edit mode cancelled

### 5. View Navigation During Creation

User presses Cmd+N, then immediately navigates to another view.

**Expected behavior:**

- Original view unmounts, unregisters its handler
- Mutation continues in background
- New view mounts, registers its handler
- When mutation completes, `onSuccess` still runs (closure captures the order store setter)

**Note:** The created task will appear in its destination (based on project/area/status), even if user navigated away.

---

## Files to Modify

### Core Changes

- `src/services/vault.ts` (lines 206-237) - Add optimistic update logic to `useCreateTask`
- `src/components/views/inbox-view.tsx` - Add missing view default registration

### View Handler Updates (temp ID flow)

- `src/components/views/project-view.tsx` - Update `handleCreateTask`
- `src/components/views/today-view.tsx` - Update `handleCreateTask`
- `src/components/views/area-view.tsx` - Update `handleCreateTask`
- `src/components/views/no-area-view.tsx` - Update `handleCreateTask`

### Cleanup (remove debug logging)

- `src/store/task-creation-store.ts` (lines 303-309, 313, 327, 330, 333-334, 342)
- `src/components/tasks/task-list.tsx` (lines 244, 256, 266, 272, 353, 359)
- `src/components/views/project-view.tsx` (lines 271, 275, 281)

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

### Session 5 (2026-01-09)

- Thoroughly reviewed implementation plan with codebase exploration
- **Identified critical issues:**
  - Query key examples were wrong (used `['vault']` instead of `vaultQueryKeys.tasks()`)
  - Missing required fields specification for temp task object
  - Temp ID → real ID replacement in order store not detailed
- **Confirmed:**
  - `useUpdateTask` and `useDeleteTask` already use optimistic updates (good reference)
  - InboxView is indeed missing registration entirely
  - Query structure uses separate queries, not nested object
- Updated task doc with corrections

### Session 6 (Next)

- Implement the plan as documented
- Start with `useCreateTask` optimistic updates
- Then update view handlers with temp ID flow
- Add InboxView registration
- Test all edge cases
- Remove debug logging

---

## Technical Notes

### Debug Logging Locations (to remove)

```
src/store/task-creation-store.ts:303-309, 313, 327, 330, 333-334, 342
src/components/tasks/task-list.tsx:244, 256, 266, 272, 353, 359
src/components/views/project-view.tsx:271, 275, 281
```

### Temp ID Flow Summary

```
1. View generates tempId = crypto.randomUUID()
2. View updates order store with tempId (sync)
3. View calls createTask.mutate({ ...options, tempId })
4. useCreateTask.onMutate adds temp task to cache (sync)
5. orderedTasks now includes temp task (order ∩ cache works!)
6. View returns tempId → pendingEditItemId set
7. DraggableTaskList finds task, enters edit mode
8. [async] Mutation completes
9. useCreateTask.onSuccess replaces temp task with real task in cache
10. View's onSuccess callback replaces tempId with realId in order store
```

### Why This Works

The key insight is that **both** sources of truth get the temp ID synchronously:

- Order store: updated in step 2 (before mutation)
- Query cache: updated in step 4 (in `onMutate`, before async work)

So when `orderedTasks` is computed (order ∩ cache), the temp task is in both places.
