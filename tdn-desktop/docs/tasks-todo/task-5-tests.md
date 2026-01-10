# Task 4: Tests

## Purpose

Add sufficient tests to check the functionality as it is now. We don't really have any automated tests so far.

## Phase 1 - Set up static Test Vault

Located in `test/test-fixtures/vault/`:

- Pre-created markdown files with known content
- Coverage across all entity types and statuses
- Edge cases: empty notes, special characters, long titles, many tags
- Used for integration tests and E2E tests

**Contents:**

```
test/test-fixtures/vault/
├── tasks/
│   ├── task-inbox-001.md           # Inbox status
│   ├── task-ready-002.md           # Ready status
│   ├── task-in-progress-003.md     # In progress
│   ├── task-blocked-004.md         # Blocked with reason
│   ├── task-done-005.md            # Completed
│   ├── task-dropped-006.md         # Dropped
│   ├── task-with-dates-007.md      # All date fields set
│   ├── task-minimal-008.md         # Only required fields
│   ├── task-unicode-009.md         # Unicode in title/notes
│   ├── task-long-notes-010.md      # Extended markdown notes
│   └── archive/
│       └── task-archived-011.md    # Archived task
├── projects/
│   ├── project-active-001.md       # Active with tasks
│   ├── project-planning-002.md     # Planning status
│   ├── project-completed-003.md    # Completed
│   ├── project-empty-004.md        # No tasks
│   └── archive/
│       └── project-archived-005.md
└── areas/
    ├── area-with-projects-001.md   # Has multiple projects
    ├── area-empty-002.md           # No projects
    └── archive/
        └── area-archived-003.md
```

#### Programmatic Test Helpers

```typescript
// test/helpers/vault.ts
export function createTestTask(overrides?: Partial<Task>): Task
export function createTestProject(overrides?: Partial<Project>): Project
export function createTestArea(overrides?: Partial<Area>): Area
export function createTestVault(config: VaultConfig): VaultData
export async function withTempVault(
  fn: (path: string) => Promise<void>
): Promise<void>
```

## Phase 2 - Rust Unit Tests

## Phase 3 - Rust Integration Tests (if nececarry)

## Phase 4 - Typescrpt Unit Tests

## Phase 4 - Typescript Integration Tests

## Phase 5 - Typescript React Component Tests

## Phase 6 - E2E minimal smoke tests

We can only do this if it's possible to actually run something like playwright against a Tauri app.

## Phase 6 - Test Cleanup and Refactoring

- [ ] Clean up tests & refactor helpers
- [ ] Check we're testing for edge cases and don't have useless tests
- [ ] Update `testing.md` in developer docs to explain any new patterns
