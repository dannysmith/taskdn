# State Management

Three-layer "onion" architecture for state management.

## The Three Layers

```
┌─────────────────────────────────────┐
│           useState                  │  ← Component UI State
│  ┌─────────────────────────────────┐│
│  │          Zustand                ││  ← Global UI State
│  │  ┌─────────────────────────────┐││
│  │  │      TanStack Query         │││  ← Persistent Data
│  │  └─────────────────────────────┘││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Layer 1: TanStack Query (Persistent Data)

Use for data that:

- Comes from Tauri backend (file system, external APIs)
- Benefits from caching and automatic refetching
- Has loading, error, and success states

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => commands.getUser({ userId }),
  enabled: !!userId,
})
```

See [error-handling.md](./error-handling.md) for retry configuration and error display patterns.

### Layer 2: Zustand (Global UI State)

Use for transient global state:

- Panel visibility, layout state
- Command palette open/closed
- UI modes and navigation

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  sidebarVisible: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      sidebarVisible: true,
      toggleSidebar: () =>
        set(state => ({ sidebarVisible: !state.sidebarVisible })),
    }),
    { name: 'ui-store' }
  )
)
```

### Layer 3: useState (Component State)

Use for state that:

- Only affects UI presentation
- Is derived from props or global state
- Is tightly coupled to component lifecycle

```typescript
const [isDropdownOpen, setIsDropdownOpen] = useState(false)
const [windowWidth, setWindowWidth] = useState(window.innerWidth)
```

## Performance Patterns (Critical)

### The `getState()` Pattern

**Problem**: Subscribing to store data in callbacks causes render cascades.

**Solution**: Use `getState()` for callbacks that need current state.

```typescript
// ❌ BAD: Causes render cascade on every store change
const { currentFile, isDirty, saveFile } = useEditorStore()

const handleSave = useCallback(() => {
  if (currentFile && isDirty) {
    void saveFile()
  }
}, [currentFile, isDirty, saveFile]) // Re-creates on every change!

// ✅ GOOD: No cascade, stable callback
const handleSave = useCallback(() => {
  const { currentFile, isDirty, saveFile } = useEditorStore.getState()
  if (currentFile && isDirty) {
    void saveFile()
  }
}, []) // Stable dependency array
```

**When to use `getState()`:**

- In `useCallback` dependencies when you need current state but don't want re-renders
- In event handlers for accessing latest state without subscriptions
- In `useEffect` with empty deps when you need current state on mount only
- In async operations when state might change during execution

### Store Subscription Optimization

```typescript
// ❌ BAD: Object destructuring subscribes to entire store
const { currentFile } = useEditorStore()

// ✅ GOOD: Selector only re-renders when this specific value changes
const currentFile = useEditorStore(state => state.currentFile)

// ✅ GOOD: Derived selector for minimal re-renders
const hasCurrentFile = useEditorStore(state => !!state.currentFile)
const currentFileName = useEditorStore(state => state.currentFile?.name)
```

### CSS Visibility vs Conditional Rendering

For stateful UI components (like `react-resizable-panels`), use CSS visibility:

```typescript
// ❌ BAD: Conditional rendering breaks stateful components
{sidebarVisible ? <ResizablePanel /> : null}

// ✅ GOOD: CSS visibility preserves component tree
<ResizablePanel className={sidebarVisible ? '' : 'hidden'} />
```

### React Compiler (Automatic Memoization)

This app uses React Compiler which automatically handles memoization. You do **not** need to manually add:

- `useMemo` for computed values
- `useCallback` for function references
- `React.memo` for components

**Note:** The `getState()` pattern is still critical - it avoids store subscriptions, not memoization.

## Store Boundaries

The app uses multiple focused stores rather than one monolithic store. Each has a specific responsibility:

| Store | Purpose | Location |
|-------|---------|----------|
| `useUIStore` | Panel visibility, command palette, preferences dialog | `src/store/ui-store.ts` |
| `useNavigationStore` | Sidebar selection and view routing | `src/store/navigation-store.ts` |
| `useTaskCreationStore` | Cmd+N task creation with two-layer handler system | `src/store/task-creation-store.ts` |
| `useViewModeStore` | List/kanban/calendar mode per view type | `src/store/view-mode-store.ts` |
| `useDisplayOrderStore` | Drag-and-drop ordering (sidebar, inbox, kanban columns) | `src/store/display-order-store.ts` |
| `useTaskDetailStore` | Right sidebar detail panel state | `src/store/task-detail-store.ts` |

### When to create a new store

Create a separate store when:

- State is unrelated to existing stores
- State would bloat an existing store
- Multiple components need this state but it's not persistent data

Keep stores focused - a store with 5-10 state properties is typical.

## Adding a New Store

1. Create store file in `src/store/`
2. Follow the pattern with `devtools` middleware
3. Update the ast-grep rule in `.ast-grep/rules/zustand/no-destructure.yml` to include the new store

```yaml
rule:
  any:
    - pattern: const { $$$PROPS } = useUIStore($$$ARGS)
    - pattern: const { $$$PROPS } = useNavigationStore($$$ARGS)
    - pattern: const { $$$PROPS } = useNewStore($$$ARGS) # Add new store
```
