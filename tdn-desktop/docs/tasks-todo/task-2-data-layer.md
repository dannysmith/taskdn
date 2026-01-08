# Task 2: Data Layer

## Purpose

Build the complete data infrastructure: Rust backend with VaultManager, Tauri commands, file watching, and TanStack Query layer. After this phase, we have a fully functional data API ready for the UI components to consume.

This is the core technical work of the project. The UI mockup's `AppDataContext` defines the interface we need - this phase implements that interface with real file persistence.

## Background

The UI mockup uses `AppDataContext` (React Context) with ~15 mutation functions and ~10 lookup functions, all operating on in-memory mock data. Our goal is to provide the same (or refined) API backed by:

1. **Rust VaultManager** - Reads/writes markdown files, maintains in-memory index
2. **Tauri Commands** - Expose operations to the frontend
3. **TanStack Query** - Caches data, handles mutations with optimistic updates
4. **Event System** - File watcher triggers cache invalidation

Reference: `../docs/product-overviews/desktop/desktop-data-architecture-research.md`

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    FILES ON DISK                             │
│  /vault/tasks/*.md  /vault/projects/*.md  /vault/areas/*.md  │
└───────────────┬──────────────────────────────┬───────────────┘
                │ file watcher (notify)        │ writes
                ▼                              │
┌──────────────────────────────────────────────┴───────────────┐
│                    RUST BACKEND                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  VaultManager                                           │ │
│  │  ├─ VaultIndex (relationships, lookups)                 │ │
│  │  ├─ File watcher (notify-debouncer-full)                │ │
│  │  └─ Event emitter (→ frontend)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Tauri Commands          Tauri Events                        │
│  ├─ list_tasks()         ├─ vault-changed                    │
│  ├─ get_task(id)         ├─ task-updated                     │
│  ├─ update_task(...)     └─ task-created                     │
│  └─ create_task(...)                                         │
└───────────────┬──────────────────────────────────────────────┘
                │ IPC
┌───────────────▼──────────────────────────────────────────────┐
│                   REACT FRONTEND                             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  TanStack Query                                          ││
│  │  ├─ Queries (useTasks, useProjects, useAreas, etc.)      ││
│  │  ├─ Mutations (useUpdateTask, useCreateTask, etc.)       ││
│  │  └─ Event listener → invalidateQueries()                 ││
│  └──────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Data Hooks (adapter layer)                              ││
│  │  └─ Matches AppDataContext API for easy component swap   ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## Scope

### 1. Rust VaultManager

Port and adapt code from the CLI (`tdn-cli/src/rust/`):

**Entity Structs**
- `Task` - All fields per S1 spec
- `Project` - All fields per S1 spec
- `Area` - All fields per S1 spec

**VaultIndex** (adapted from CLI's `vault_index.rs`)
- Pre-computed relationship indices
- O(1) lookups by ID
- Tasks by project, tasks by area, projects by area

**VaultManager** (new, adapted from CLI's `vault_session.rs`)
```rust
struct VaultManager {
    config: VaultConfig,
    index: RwLock<VaultIndex>,  // RwLock for concurrent access
    watcher: Debouncer<...>,
    pending_writes: Mutex<HashSet<PathBuf>>,  // Avoid re-index loops
}
```

**File Operations**
- Parallel scanning with rayon
- gray_matter for frontmatter parsing
- Round-trip fidelity (preserve unknown fields)
- Atomic writes (write to temp, rename)

**File Watching**
- `notify-debouncer-full` crate
- 500ms debounce
- Smart rename tracking
- Emit `vault-changed` event to frontend

**Write Loop Prevention**
- Track "our writes" in `pending_writes`
- Update index directly on our writes (no watcher delay)
- Ignore watcher events for our files

### 2. Tauri Commands

Generate TypeScript bindings via tauri-specta.

**Read Commands**
```rust
#[tauri::command]
#[specta::specta]
fn list_tasks(state: State<VaultManager>) -> Result<Vec<Task>, String>

#[tauri::command]
#[specta::specta]
fn list_projects(state: State<VaultManager>) -> Result<Vec<Project>, String>

#[tauri::command]
#[specta::specta]
fn list_areas(state: State<VaultManager>) -> Result<Vec<Area>, String>

#[tauri::command]
#[specta::specta]
fn get_task(state: State<VaultManager>, id: String) -> Result<Option<Task>, String>

// Similar for get_project, get_area
```

**Write Commands**
```rust
#[tauri::command]
#[specta::specta]
fn update_task(state: State<VaultManager>, task: TaskUpdate) -> Result<Task, String>

#[tauri::command]
#[specta::specta]
fn create_task(state: State<VaultManager>, options: CreateTaskOptions) -> Result<Task, String>

// Similar for projects, areas as needed
```

**Query Commands** (optional, could filter in frontend)
```rust
fn get_tasks_by_project(state: State<VaultManager>, project_id: String) -> Result<Vec<Task>, String>
fn get_tasks_by_status(state: State<VaultManager>, status: TaskStatus) -> Result<Vec<Task>, String>
```

### 3. TanStack Query Layer

**Setup**
- Query client configuration in `src/lib/query-client.ts`
- Provider wrapper in app root

**Queries**
```typescript
// src/services/queries/tasks.ts
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => commands.listTasks(),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => commands.getTask({ id }),
  })
}

// Similar for projects, areas
```

**Mutations with Optimistic Updates**
```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: TaskUpdate) => commands.updateTask({ task: update }),

    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', newTask.id] })
      const previous = queryClient.getQueryData(['tasks', newTask.id])
      queryClient.setQueryData(['tasks', newTask.id], newTask)
      return { previous }
    },

    onError: (err, newTask, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', newTask.id], context.previous)
      }
    },

    onSettled: () => {
      // File watcher will handle invalidation via events
    },
  })
}
```

**Event-Driven Invalidation**
```typescript
// src/services/vault-sync.ts
export function useVaultSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unlisten = listen('vault-changed', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    })
    return () => { unlisten.then(fn => fn()) }
  }, [queryClient])
}
```

### 4. Data Hooks Adapter

Create hooks that match the `AppDataContext` API for easier component migration:

```typescript
// src/hooks/use-vault-data.ts
export function useVaultData() {
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: areas = [] } = useAreas()

  const updateTaskMutation = useUpdateTask()
  const createTaskMutation = useCreateTask()
  // ... other mutations

  // Lookup helpers (can be memoized)
  const getTaskById = useCallback((id: string) =>
    tasks.find(t => t.id === id), [tasks])

  const getProjectById = useCallback((id: string) =>
    projects.find(p => p.id === id), [projects])

  // Mutation wrappers matching AppDataContext API
  const updateTaskTitle = useCallback((taskId: string, title: string) => {
    updateTaskMutation.mutate({ id: taskId, title })
  }, [updateTaskMutation])

  // ... etc

  return {
    tasks, projects, areas,
    getTaskById, getProjectById, getAreaById,
    updateTaskTitle, updateTaskScheduled, updateTaskStatus,
    createTask, toggleTaskStatus,
    // ... full API
  }
}
```

This adapter layer allows components to swap `useAppData()` for `useVaultData()` with minimal changes.

### 5. Test Infrastructure

**Static Test Vault**
Create `test-fixtures/vault/` with known files for integration tests:
- Several tasks with various statuses
- A few projects with different states
- A couple areas
- Edge cases (empty notes, special characters, etc.)

**Programmatic Test Helpers**
For unit tests, create helpers to generate test data:
```typescript
// src/test/vault-helpers.ts
export function createTestTask(overrides?: Partial<Task>): Task
export function createTestProject(overrides?: Partial<Project>): Project
export async function setupTestVault(config: VaultTestConfig): Promise<string>
```

**Rust Tests**
- Unit tests for parsing/writing
- Integration tests with temp directory vaults

## API Design Notes

The mockup's `AppDataContext` has ~25 functions. Before implementation, review whether this is the right granularity:

**Potentially combine:**
- `updateTaskTitle`, `updateTaskScheduled`, `updateTaskDue`, etc. → single `updateTask(id, fields)`

**Keep separate for optimistic updates:**
- Each field update might need its own mutation for proper rollback

**Decision:** Start with the current API shape (matches mockup), optimize later if needed. The adapter pattern means we can change the underlying implementation without touching components.

## Vault Path Configuration

The app needs to know where the vault is. Options:
1. First-run wizard prompts user to select folder
2. Store path in preferences (already have preferences system)
3. Default to a sensible location, allow override in preferences

Implement option 2+3: default location with preference override.

## Checklist

### Rust Backend
- [ ] Port Task, Project, Area structs from CLI
- [ ] Port/adapt VaultIndex
- [ ] Create VaultManager with RwLock
- [ ] Implement file reading with parallel scanning
- [ ] Implement file writing with atomic operations
- [ ] Add file watcher with notify-debouncer-full
- [ ] Implement write loop prevention
- [ ] Add Tauri state management for VaultManager
- [ ] Write Rust unit tests

### Tauri Commands
- [ ] Implement list_tasks, list_projects, list_areas
- [ ] Implement get_task, get_project, get_area
- [ ] Implement update_task, create_task
- [ ] Generate TypeScript bindings
- [ ] Test commands from frontend console

### TanStack Query
- [ ] Set up query client
- [ ] Implement all query hooks
- [ ] Implement all mutation hooks with optimistic updates
- [ ] Implement vault-changed event listener
- [ ] Create useVaultData adapter hook

### Testing
- [ ] Create static test vault in test-fixtures/
- [ ] Create programmatic test helpers
- [ ] Write integration tests
- [ ] Verify with dummy-demo-vault

## Dependencies

- Task 1 (Foundation) - Type definitions needed for TypeScript side

## Next Phase

Task 3: UI Integration - Bring over UI components and connect to data layer.
