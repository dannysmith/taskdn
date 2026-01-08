# Task 2: Data Layer

## Purpose

Build the complete data infrastructure: Rust backend with VaultManager, Tauri commands, file watching, and TanStack Query layer. After this phase, we have a fully functional data API ready for the UI components to consume.

This is the core technical work of the project. The UI mockup's `AppDataContext` defines the interface we need - this phase implements that interface with real file persistence.

## Background

The UI mockup uses `AppDataContext` (React Context) with ~15 mutation functions and ~10 lookup functions, all operating on in-memory mock data. Our goal is to build a proper data layer using idiomatic patterns for this stack.

**Key components:**
1. **Rust VaultManager** - Reads/writes markdown files, maintains in-memory index
2. **Tauri Commands** - Expose operations to the frontend
3. **TanStack Query** - Caches data, handles mutations
4. **Event System** - File watcher triggers cache invalidation

Reference: `../docs/product-overviews/desktop/desktop-data-architecture-research.md`

## Design Principle: Build As If From Scratch

When making architectural decisions, ask: **"If we were building this without the mockup, how would we do it?"**

The mockup is a prototype that proves the UI works. It uses patterns optimized for rapid prototyping (synchronous in-memory operations). The production app should use patterns optimized for correctness, maintainability, and the actual tech stack (Tauri + TanStack Query).

This means:
- Use idiomatic TanStack Query patterns, not workarounds to match the mockup
- Use idiomatic Rust/serde patterns, not contortions to match TypeScript types
- Components will need refactoring - this is expected, not a failure

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

**Mutations - The Async Pattern**

The mockup uses synchronous mutations that return values immediately:
```typescript
// Mockup pattern (won't work with TanStack Query)
const newTaskId = createTask({ title: 'New task' })
setPendingEditItemId(newTaskId)  // Uses ID immediately
```

TanStack Query mutations are async. **Use `mutateAsync` with await:**
```typescript
// Correct TanStack Query pattern
const handleAddTask = async () => {
  try {
    const newTask = await createTaskMutation.mutateAsync({ title: 'New task' })
    setPendingEditItemId(newTask.id)
  } catch (error) {
    toast.error('Failed to create task')
  }
}
```

**Why this works for us:** This is a local Tauri app, not a remote API. The IPC round trip to Rust is ~10-50ms - imperceptible to users. There's no need for complex workarounds like frontend-generated IDs or temp ID juggling.

**Mutation hooks should return the mutation object, not wrap it:**
```typescript
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (options: CreateTaskOptions) => commands.createTask(options),

    onSuccess: (newTask) => {
      // Optimistically add to cache
      queryClient.setQueryData(['tasks'], (old: Task[] = []) => [...old, newTask])
    },

    onError: () => {
      // Invalidate to refetch clean state
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

Components use it with `mutateAsync`:
```typescript
const createTaskMutation = useCreateTask()

const handleAddTask = async () => {
  const newTask = await createTaskMutation.mutateAsync({ scheduled: today })
  setPendingEditItemId(newTask.id)
}
```

**Mutations for Updates (with Optimistic Updates)**
```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update: TaskUpdate) => commands.updateTask(update),

    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', update.id] })
      const previous = queryClient.getQueryData(['tasks', update.id])
      queryClient.setQueryData(['tasks', update.id], (old: Task) => ({ ...old, ...update }))
      return { previous }
    },

    onError: (err, update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', update.id], context.previous)
      }
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

### 4. Data Hooks

Provide hooks for common data access patterns. These don't need to exactly match `AppDataContext` - components will be refactored to use idiomatic patterns.

```typescript
// src/hooks/use-vault-data.ts
export function useVaultData() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const { data: areas = [], isLoading: areasLoading } = useAreas()

  const isLoading = tasksLoading || projectsLoading || areasLoading

  // Lookup helpers
  const getTaskById = useCallback((id: string) =>
    tasks.find(t => t.id === id), [tasks])

  const getProjectById = useCallback((id: string) =>
    projects.find(p => p.id === id), [projects])

  const getAreaById = useCallback((id: string) =>
    areas.find(a => a.id === id), [areas])

  // Derived data
  const getTasksByProject = useCallback((projectId: string) =>
    tasks.filter(t => t.projectId === projectId), [tasks])

  const getProjectsByArea = useCallback((areaId: string) =>
    projects.filter(p => p.areaId === areaId), [projects])

  return {
    tasks, projects, areas, isLoading,
    getTaskById, getProjectById, getAreaById,
    getTasksByProject, getProjectsByArea,
  }
}
```

**Mutations are used directly in components:**
```typescript
function MyComponent() {
  const { tasks, getTaskById } = useVaultData()
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()

  const handleAddTask = async () => {
    const newTask = await createTaskMutation.mutateAsync({ ... })
    // use newTask.id
  }

  const handleUpdateTitle = (taskId: string, title: string) => {
    updateTaskMutation.mutate({ id: taskId, title })
  }
}
```

This is more explicit than the mockup's pattern but clearer about what's happening.

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

## Type Handling

**Principle:** Write idiomatic Rust. Handle type mismatches at the boundary.

tauri-specta generates TypeScript types from Rust structs. These may differ from the mockup's types:
- Rust `Option<String>` → TypeScript `string | null` (not `undefined`)
- Rust naming conventions (snake_case in serde) → TypeScript expects camelCase
- Different optional vs required fields

**Approach:**
1. Use `#[serde(rename_all = "camelCase")]` on Rust structs for TypeScript compatibility
2. Use idiomatic Rust types (`Option<T>`, enums, etc.)
3. If the generated types don't match what components expect, handle it in the data hooks layer
4. Don't write weird Rust just to match TypeScript expectations

**Example:**
```rust
#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: TaskStatus,
    pub scheduled: Option<String>,  // Will be `string | null` in TS
    pub due: Option<String>,
    // ...
}
```

If components expect `undefined` instead of `null`, handle it in the data layer, not by contorting Rust.

## Vault Path Configuration

Store vault path in preferences. On first run with no vault configured:
- App shows empty state with message to configure vault in settings
- No wizard needed - user opens Preferences → selects vault folder
- This can be improved later; for now, simple is fine

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
