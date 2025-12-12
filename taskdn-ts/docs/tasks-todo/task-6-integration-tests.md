# Task 6: Integration Tests

Write comprehensive integration tests to verify all NAPI bindings work correctly.

## Test Infrastructure

### Setup

```typescript
// tests/setup.ts
import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');
const RESET_SCRIPT = path.join(REPO_ROOT, 'scripts', 'reset-dummy-vault.sh');

export function resetTestVault() {
    execSync(RESET_SCRIPT, { cwd: REPO_ROOT });
}

export const TEST_VAULT = {
    tasks: path.join(REPO_ROOT, 'dummy-demo-vault', 'tasks'),
    projects: path.join(REPO_ROOT, 'dummy-demo-vault', 'projects'),
    areas: path.join(REPO_ROOT, 'dummy-demo-vault', 'areas'),
};
```

### Test file structure

```
tests/
├── setup.ts           # Test utilities
├── taskdn.test.ts     # Main SDK tests
├── tasks.test.ts      # Task operation tests
├── projects.test.ts   # Project operation tests
├── areas.test.ts      # Area operation tests
└── events.test.ts     # Event processing tests
```

## Test Coverage Requirements

### SDK Initialization

- [x] Constructor with valid paths
- [x] Constructor with invalid paths throws
- [x] Config getters return correct values

### Task Operations

- [ ] `getTask` - returns task, throws on missing
- [ ] `listTasks` - returns all tasks
- [ ] `listTasks` with filter - filters correctly
- [ ] `countTasks` - returns correct count
- [ ] `createTask` - creates file, returns path
- [ ] `createInboxTask` - creates with inbox status
- [ ] `updateTask` - modifies frontmatter
- [ ] `completeTask` - sets status and completed_at
- [ ] `dropTask` - sets status and completed_at
- [ ] `startTask` - sets in-progress status
- [ ] `blockTask` - sets blocked status
- [ ] `archiveTask` - moves to archive, returns new path
- [ ] `unarchiveTask` - moves from archive
- [ ] `deleteTask` - removes file

### Project Operations

- [ ] `getProject` - returns project
- [ ] `listProjects` - returns all projects
- [ ] `listProjects` with filter
- [ ] `createProject` - creates file
- [ ] `updateProject` - modifies frontmatter
- [ ] `deleteProject` - removes file
- [ ] `getTasksForProject` - returns linked tasks

### Area Operations

- [ ] `getArea` - returns area
- [ ] `listAreas` - returns all areas
- [ ] `listAreas` with filter
- [ ] `createArea` - creates file
- [ ] `updateArea` - modifies frontmatter
- [ ] `deleteArea` - removes file
- [ ] `getTasksForArea` - returns linked tasks
- [ ] `getProjectsForArea` - returns linked projects

### Event Processing

- [ ] `processFileChange` with created task
- [ ] `processFileChange` with modified task
- [ ] `processFileChange` with deleted task
- [ ] `processFileChange` with non-task file returns null

## Example Test

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { Taskdn } from '../index.js';
import { resetTestVault, TEST_VAULT } from './setup';

describe('Task Operations', () => {
    let sdk: Taskdn;

    beforeEach(() => {
        resetTestVault();
        sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
    });

    test('createTask creates a new task file', () => {
        const path = sdk.createTask({ title: 'Test task' });

        expect(path).toContain('test-task.md');

        const task = sdk.getTask(path);
        expect(task.title).toBe('Test task');
        expect(task.status).toBe('inbox');
    });

    test('completeTask sets done status and completed_at', () => {
        const path = sdk.createTask({ title: 'Task to complete' });
        sdk.completeTask(path);

        const task = sdk.getTask(path);
        expect(task.status).toBe('done');
        expect(task.completedAt).toBeDefined();
    });
});
```

## Running Tests

```bash
# Reset vault and run tests
bun test

# Run specific test file
bun test tests/tasks.test.ts
```

## Files to create

- `tests/setup.ts`
- `tests/taskdn.test.ts`
- `tests/tasks.test.ts`
- `tests/projects.test.ts`
- `tests/areas.test.ts`
- `tests/events.test.ts`
