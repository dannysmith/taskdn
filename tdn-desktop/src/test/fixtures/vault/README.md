# Test Fixture Vault

This directory contains deterministic test fixtures for automated tests. These are minimal fixtures designed for testing, not for realistic exploration (see `demo-vault/` for that).

## Structure

```
vault/
├── tasks/
│   ├── task-inbox-001.md           # Inbox status
│   ├── task-icebox-002.md          # Icebox status
│   ├── task-ready-003.md           # Ready status
│   ├── task-in-progress-004.md     # In progress
│   ├── task-blocked-005.md         # Blocked with reason
│   ├── task-done-006.md            # Completed (with completed-at)
│   ├── task-dropped-007.md         # Dropped (with completed-at)
│   ├── task-with-dates-008.md      # All date fields set
│   ├── task-minimal-009.md         # Only required fields
│   ├── task-unicode-010.md         # Unicode in title/body
│   ├── task-long-notes-011.md      # Extended markdown body
│   ├── task-with-project-012.md    # Linked to project
│   ├── task-with-area-013.md       # Linked directly to area
│   └── archive/
│       └── task-archived-014.md    # Archived task
├── projects/
│   ├── project-planning-001.md     # Planning status
│   ├── project-ready-002.md        # Ready status
│   ├── project-in-progress-003.md  # In progress
│   ├── project-blocked-004.md      # Blocked with blocked-by
│   ├── project-paused-005.md       # Paused
│   ├── project-done-006.md         # Completed
│   ├── project-with-area-007.md    # Linked to area
│   ├── project-empty-008.md        # No linked tasks
│   └── archive/
│       └── project-archived-009.md
└── areas/
    ├── area-active-001.md          # Active status
    ├── area-empty-002.md           # No linked projects
    └── archive/
        └── area-archived-003.md
```

## Edge Cases Covered

### Tasks

| Fixture                    | Edge Case                             |
| -------------------------- | ------------------------------------- |
| task-inbox-001             | Default/initial task state            |
| task-icebox-002            | Deferred indefinitely                 |
| task-blocked-005           | External dependency blocking          |
| task-done-006              | Completed with `completed-at`         |
| task-dropped-007           | Abandoned with `completed-at`         |
| task-with-dates-008        | All date fields: due, scheduled, defer-until |
| task-minimal-009           | Only required fields, no body         |
| task-unicode-010           | Unicode characters, special chars     |
| task-long-notes-011        | Extended markdown: lists, code, tables |
| task-with-project-012      | WikiLink project reference            |
| task-with-area-013         | WikiLink area reference (no project)  |
| task-archived-014          | Task in archive subdirectory          |

### Projects

| Fixture                    | Edge Case                             |
| -------------------------- | ------------------------------------- |
| project-planning-001       | Planning status with dates            |
| project-blocked-004        | blocked-by array reference            |
| project-paused-005         | Temporarily on hold                   |
| project-done-006           | Completed project                     |
| project-with-area-007      | Area reference via WikiLink           |
| project-empty-008          | No start-date/end-date                |
| project-archived-009       | Project in archive subdirectory       |

### Areas

| Fixture                    | Edge Case                             |
| -------------------------- | ------------------------------------- |
| area-active-001            | Active with type field                |
| area-empty-002             | No associated content                 |
| area-archived-003          | Archived status (hidden in views)     |

## Usage

### TypeScript Factory Functions

```typescript
import {
  createTestTask,
  createTestProject,
  createTestArea,
  createTestVault,
  resetFactoryCounters,
} from '@/test/helpers/vault'

// Create individual items
const task = createTestTask({ status: 'done', title: 'My task' })
const project = createTestProject({ status: 'in-progress' })

// Create bulk test data
const { tasks, projects, areas } = createTestVault({
  taskCount: 10,
  projectCount: 3,
  areaCount: 2,
})

// Reset counters between tests
beforeEach(() => {
  resetFactoryCounters()
})
```

### Temporary Vault for Write Tests

```typescript
import { withTempVault, withTempVaultFromFixtures } from '@/test/helpers/vault'

// Empty temp vault
await withTempVault(async (vaultPath) => {
  // vaultPath has tasks/, projects/, areas/ subdirectories
})

// Temp vault with fixture files copied
await withTempVaultFromFixtures(async (vaultPath) => {
  // vaultPath contains copies of all fixture files
})
```

### Fixture File Access

```typescript
import {
  getFixtureTaskFiles,
  getFixtureVaultPaths,
  FIXTURE_TASK_IDS,
  FIXTURE_COUNTS,
} from '@/test/helpers/vault'

// Get list of fixture files
const taskFiles = getFixtureTaskFiles()

// Get paths to fixture directories
const { tasksDir, projectsDir, areasDir } = getFixtureVaultPaths()

// Use predefined constants
expect(loadedTasks).toHaveLength(FIXTURE_COUNTS.tasks)
```

## Naming Convention

Files follow the pattern: `{type}-{description}-{number}.md`

- Type: task, project, or area
- Description: key characteristic being tested
- Number: three-digit sequential ID

This convention ensures:
- Predictable alphabetical ordering
- Easy identification of test purpose
- Unique filenames across the fixture set
