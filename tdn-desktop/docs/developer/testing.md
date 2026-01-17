# Testing

Testing patterns for Rust and TypeScript, with focus on Tauri-specific mocking.

## Running Tests

```bash
bun run check:all      # All tests and checks
bun run test           # TypeScript tests (watch mode)
bun run test:run       # TypeScript tests (single run)
bun run rust:test      # Rust tests
```

## Testing Philosophy

### Why 30% Coverage Thresholds?

Our coverage thresholds are intentionally set low (30% lines/functions, 15% branches) because **coverage percentage is a poor proxy for test quality**. Here's what we actually measure:

| Layer | Target Coverage | Rationale |
|-------|-----------------|-----------|
| **Stores** (Zustand) | 90%+ | Core state logic, must be bulletproof |
| **Hooks** (ordering, data) | 80%+ | Business logic that drives the UI |
| **Utilities** (date, wikilink) | 90%+ | Pure functions, easy to test exhaustively |
| **Commands** | 70%+ | Application orchestration layer |
| **Components** | Smoke tests only | Visual testing is expensive, returns diminish quickly |

The 30% threshold exists to catch accidental removal of test files, not to enforce minimum coverage.

### Test Logic, Smoke-Test UI

**Core principle:** Thoroughly test business logic; minimally test UI rendering.

**Why this works for desktop apps:**
- React components are largely composition of well-tested primitives (shadcn/ui)
- Visual regressions are caught during development, not CI
- UI tests are brittle (break on style changes) and slow
- Business logic bugs cause data loss; UI bugs cause inconvenience

**What to test thoroughly:**
- State transitions (navigation store, display order store)
- Data transformations (vault helpers, ordering hooks)
- Error handling (vault error formatting, recovery)
- Platform-specific behavior (keyboard shortcuts, date formatting)

**What to smoke-test:**
- Components render without crashing
- Critical user flows (app loads, sidebar toggles)
- Accessibility basics (headings exist, buttons are clickable)

### Tauri-Specific Considerations

Testing Tauri apps requires understanding the Rust↔TypeScript boundary:

1. **Command handlers (Rust)**: Test the actual logic, not the IPC wrapper
2. **Command callers (TypeScript)**: Mock the Tauri bindings, test orchestration
3. **Event listeners**: Test handler logic separately from event setup
4. **Platform APIs**: Always mock (`@tauri-apps/plugin-*`), never call real APIs

The test environment runs in Node.js/jsdom, not a real Tauri window. Any code that touches `window.__TAURI__` must be mocked.

## What to Test for New Features

### Adding a New Tauri Command

1. **Rust side** (`src-tauri/src/commands/*.rs`):
   - Test core logic in the module's `#[cfg(test)]` block
   - Use `tempfile` for file operations
   - Test error cases (invalid input, missing files)

2. **TypeScript side**:
   - Add mock to `src/test/setup.ts`
   - Test mutation hooks if using TanStack Query
   - Test any helper functions that transform the response

### Adding a New Store

```typescript
// store/my-store.test.ts
import { useMyStore } from './my-store'

beforeEach(() => {
  useMyStore.setState(useMyStore.getInitialState())
})

describe('MyStore', () => {
  it('starts with correct initial state', () => {
    expect(useMyStore.getState().someValue).toBe(defaultValue)
  })

  it('updates state correctly', () => {
    const { someAction } = useMyStore.getState()
    someAction(newValue)
    expect(useMyStore.getState().someValue).toBe(newValue)
  })
})
```

### Adding a New Hook

Focus on the logic, not the React wrapper:

```typescript
// hooks/use-my-hook.test.ts
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from './use-my-hook'

it('computes derived value correctly', () => {
  const { result } = renderHook(() => useMyHook(inputData))
  expect(result.current.derivedValue).toBe(expectedValue)
})
```

### Adding a New Command (App Command System)

```typescript
// Test in lib/commands/commands.test.ts
describe('my-new-command', () => {
  it('executes the expected action', async () => {
    const mockContext = createMockContext()
    // Setup mocks for dependencies

    const result = await executeCommand('my-new-command', mockContext)

    expect(result.success).toBe(true)
    expect(mockContext.someAction).toHaveBeenCalled()
  })

  it('is available when conditions are met', () => {
    const mockContext = createMockContext()
    // Setup conditions

    const commands = getAllCommands(mockContext)
    const cmd = commands.find(c => c.id === 'my-new-command')

    expect(cmd).toBeDefined()
  })
})
```

## Good Test Patterns

### Pattern: Comprehensive Edge Case Coverage

From `src/lib/date-utils.test.ts`:

```typescript
describe('getWeekNumber', () => {
  it('handles year boundary correctly', () => {
    // Dec 31, 2024 is in week 1 of 2025
    expect(getWeekNumber(new Date(2024, 11, 31))).toBe(1)
  })

  it('handles leap years', () => {
    expect(getWeekNumber(new Date(2024, 1, 29))).toBe(9)
  })

  it('handles invalid dates', () => {
    expect(getWeekNumber(new Date('invalid'))).toBeNaN()
  })
})
```

### Pattern: State Machine Testing

From `src/store/navigation-store.test.ts`:

```typescript
describe('navigation history', () => {
  it('maintains history stack on navigation', () => {
    const { navigateToView, goBack, canGoBack } = useNavigationStore.getState()

    navigateToView('today')
    navigateToView('inbox')

    expect(canGoBack()).toBe(true)

    goBack()

    expect(useNavigationStore.getState().currentView).toBe('today')
  })

  it('clears forward history on new navigation', () => {
    // Navigate: A -> B -> C, go back to B, navigate to D
    // Forward history (C) should be cleared
  })
})
```

### Pattern: Mock Context for Commands

From `src/lib/commands/commands.test.ts`:

```typescript
const createMockContext = (): CommandContext => ({
  openPreferences: vi.fn(),
  isObsidianEnabled: vi.fn(() => false),
  showToast: vi.fn(),
  navigateToView: vi.fn(),
  // ... all context methods mocked
  getContextMenuTarget: vi.fn(() => null),
  selectedTaskId: null,
})
```

### Pattern: Testing Availability Conditions

```typescript
it('command is only available when task is selected', () => {
  const context = createMockContext()

  // Not available without selection
  context.selectedTaskId = null
  expect(isTaskCommandAvailable(context)).toBe(false)

  // Available with selection
  context.selectedTaskId = 'task-123'
  expect(isTaskCommandAvailable(context)).toBe(true)
})
```

### Pattern: jsdom Workarounds

jsdom doesn't implement everything. Document workarounds:

```typescript
// jsdom doesn't implement isContentEditable properly
// See: https://github.com/jsdom/jsdom/issues/1670
const div = document.createElement('div')
div.contentEditable = 'true'
Object.defineProperty(div, 'isContentEditable', {
  value: true,
  configurable: true,
})
```

## TypeScript Testing

Uses **Vitest** + **@testing-library/react**. Configuration in `vitest.config.ts`.

### Test File Location

Place tests next to the code they test:

```
src/components/ui/Button.tsx
src/components/ui/Button.test.tsx
```

### Mocking Tauri APIs (Critical)

Tauri commands and plugins must be mocked since tests run outside the Tauri environment. Mocks are configured in `src/test/setup.ts`.

**What's mocked globally:**

- Typed commands (`@/lib/tauri-bindings`) - your app's Rust commands
- Core APIs (`@tauri-apps/api/event`, `@tauri-apps/api/window`, `@tauri-apps/api/menu`)
- Plugins (`plugin-os`, `plugin-updater`, `plugin-process`, `plugin-deep-link`)

**When adding new Tauri plugins**, add corresponding mocks to `setup.ts`. See [tauri-plugins.md](./tauri-plugins.md).

Example command mock:

```typescript
// src/test/setup.ts
import { vi } from 'vitest'

// Mock Tauri event APIs
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockResolvedValue(null),
}))

// Mock typed Tauri bindings (tauri-specta generated)
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    greet: vi.fn().mockResolvedValue('Hello, test!'),
    loadPreferences: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { theme: 'system' } }),
    savePreferences: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    sendNativeNotification: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: null }),
    saveEmergencyData: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    loadEmergencyData: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    cleanupOldRecoveryFiles: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: 0 }),
  },
}))
```

### Testing with Mocked Commands

```typescript
import { vi } from 'vitest'
import { commands } from '@/lib/tauri-bindings'

const mockCommands = vi.mocked(commands)

test('loads preferences', async () => {
  mockCommands.loadPreferences.mockResolvedValue({
    status: 'ok',
    data: { theme: 'dark' },
  })

  // Test code that calls loadPreferences
})
```

### Test Wrapper for Providers

Components using TanStack Query need a provider wrapper:

```typescript
// src/test/utils.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

Usage:

```typescript
import { render } from '@testing-library/react'
import { TestProviders } from '@/test/utils'

test('component with query', () => {
  render(
    <TestProviders>
      <MyComponent />
    </TestProviders>
  )
})
```

### Testing Zustand Stores

**Important:** Zustand stores persist state between tests. Always reset in `beforeEach`:

```typescript
import { useUIStore } from '@/store/ui-store'

beforeEach(() => {
  // Reset to initial state before each test
  useUIStore.setState({
    leftSidebarVisible: true,
    commandPaletteOpen: false,
    // ... other initial values
  })
})

test('toggles sidebar visibility', () => {
  // Use getState() for direct state access (preferred pattern)
  const { toggleLeftSidebar } = useUIStore.getState()

  toggleLeftSidebar()

  expect(useUIStore.getState().leftSidebarVisible).toBe(false)
})
```

### Resetting Module Caches

Some modules cache values (e.g., platform detection). Export a reset function and call it in `afterEach` in `setup.ts`:

```typescript
// In the module (e.g., use-platform.ts)
export function __resetPlatformCache() {
  cachedPlatform = undefined
}

// In src/test/setup.ts
afterEach(async () => {
  const { __resetPlatformCache } = await import('@/hooks/use-platform')
  __resetPlatformCache()
})
```

### Test Data Factories

Use factory functions from `src/test/helpers/vault.ts`:

```typescript
import {
  createTestTask,
  createTestProject,
  createTestArea,
  createTestVault,
  resetFactoryCounters,
} from '@/test/helpers/vault'

beforeEach(() => {
  resetFactoryCounters() // Ensures deterministic IDs (task-1, task-2, etc.)
})

test('task with custom status', () => {
  const task = createTestTask({ status: 'done', title: 'Completed task' })
  expect(task.status).toBe('done')
})

// Bulk data generation
const { tasks, projects, areas } = createTestVault({
  taskCount: 10,
  projectCount: 3,
  areaCount: 2,
})
```

**Factory features**:

- Deterministic IDs (`task-1`, `project-1`, etc.) reset between tests
- Fixed date `2025-01-15` for reproducible tests
- All entity properties can be overridden

### Test Fixtures

Static fixtures in `src/test/fixtures/vault/` provide real markdown files for integration tests:

```
src/test/fixtures/vault/
├── tasks/
│   ├── inbox-task.md, icebox-task.md, ready-task.md, ...
│   ├── task-with-dates.md, task-with-project.md, ...
│   └── archive/
├── projects/
│   ├── planning-project.md, in-progress-project.md, ...
│   └── archive/
└── areas/
    ├── active-area.md, empty-area.md
    └── archive/
```

**Coverage**: All 7 task statuses, all 6 project statuses, edge cases (unicode, long notes, cross-links).

### Temporary Vault Helpers

Use `withTempVault()` for tests that write files:

```typescript
import { withTempVault, withTempVaultFromFixtures } from '@/test/helpers/vault'

// Empty temp vault
test('creates task file', async () => {
  await withTempVault(async vaultPath => {
    // vaultPath has empty tasks/, projects/, areas/ subdirectories
    // Temp dir cleaned up automatically after test
  })
})

// Temp vault pre-populated from fixtures
test('modifies existing task', async () => {
  await withTempVaultFromFixtures(async vaultPath => {
    // vaultPath contains copies of all fixture files
  })
})
```

**Note**: There is no demo vault for manual testing. The fixtures vault is designed for automated tests only.

## Rust Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preferences_default() {
        let prefs = AppPreferences::default();
        assert_eq!(prefs.theme, "system");
    }
}
```

### Async Tests

```rust
#[tokio::test]
async fn test_async_operation() {
    let result = some_async_fn().await;
    assert!(result.is_ok());
}
```

### File Operation Tests

Use `tempfile` for tests that need file system access:

```rust
use tempfile::TempDir;

#[test]
fn test_file_operations() {
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("test.json");

    // Test write
    std::fs::write(&file_path, "{}").unwrap();

    // Test read
    let content = std::fs::read_to_string(&file_path).unwrap();
    assert_eq!(content, "{}");
}
```

## Adding New Command Mocks

When adding new Tauri commands, update `src/test/setup.ts`:

```typescript
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    // ... existing mocks
    myNewCommand: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}))
```

## Best Practices

| Do                                    | Don't                         |
| ------------------------------------- | ----------------------------- |
| Mock Tauri commands in setup.ts       | Call real Tauri APIs in tests |
| Use `vi.mocked()` for type-safe mocks | Use untyped mock assertions   |
| Test user-visible behavior            | Test implementation details   |
| Use `tempfile` for Rust file tests    | Write to real file system     |
