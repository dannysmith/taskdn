# Testing

Testing patterns for Rust and TypeScript, with focus on Tauri-specific mocking.

## Running Tests

```bash
bun run check:all      # All tests and checks
bun run test           # TypeScript tests (watch mode)
bun run test:run       # TypeScript tests (single run)
bun run rust:test      # Rust tests
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

Tauri commands must be mocked since tests run outside the Tauri environment. Mocks are configured in `src/test/setup.ts`:

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
