# taskdn-sdk

TypeScript SDK for the Taskdn task management system. Provides NAPI-RS bindings to the Rust library for Node.js and Bun environments.

[![npm version](https://img.shields.io/npm/v/taskdn-sdk.svg)](https://www.npmjs.com/package/taskdn-sdk)

## Installation

```bash
npm install taskdn-sdk
# or
bun add taskdn-sdk
```

## Quick Start

```typescript
import { Taskdn, TaskStatus, ProjectStatus, AreaStatus } from 'taskdn-sdk';

// Initialize with paths to your vault directories
const sdk = new Taskdn('./tasks', './projects', './areas');

// Create a task
const taskPath = sdk.createTask({
    title: 'Review documentation',
    status: TaskStatus.Ready,
    due: '2025-01-15',
    project: { type: 'wikilink', target: 'Website Redesign' }
});

// Quick capture - creates inbox task
const inboxPath = sdk.createInboxTask('Call about insurance');

// List and filter tasks
const readyTasks = sdk.listTasks({ statuses: [TaskStatus.Ready] });
const overdueTasks = sdk.listTasks({ dueBefore: '2025-01-01' });

// Update task status
sdk.completeTask(taskPath);
sdk.startTask(inboxPath);
sdk.blockTask(inboxPath);
```

## Core Concepts

### Tasks

Tasks are the core unit of work. Each task has:
- **title** - The task name
- **status** - One of: `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`
- **due** - Optional due date/datetime
- **project** / **area** - Optional links to project or area
- **createdAt**, **updatedAt**, **completedAt** - Automatic timestamps

```typescript
// Get a specific task
const task = sdk.getTask('./tasks/my-task.md');

// Update task fields
sdk.updateTask(taskPath, {
    title: 'Updated title',
    status: TaskStatus.InProgress,
    due: '2025-02-01'
});

// Status transition shortcuts
sdk.startTask(taskPath);      // -> in-progress
sdk.blockTask(taskPath);      // -> blocked
sdk.completeTask(taskPath);   // -> done (sets completedAt)
sdk.dropTask(taskPath);       // -> dropped (sets completedAt)

// Archive management
const archivedPath = sdk.archiveTask(taskPath);
const restoredPath = sdk.unarchiveTask(archivedPath);

// Delete permanently
sdk.deleteTask(taskPath);
```

### Projects

Projects group related tasks:

```typescript
const projectPath = sdk.createProject({
    title: 'Website Redesign',
    status: ProjectStatus.Planning,
    description: 'Redesign the marketing site',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    area: { type: 'wikilink', target: 'Acme Corp' }
});

const projects = sdk.listProjects({ statuses: [ProjectStatus.InProgress] });
const projectTasks = sdk.getTasksForProject(projectPath);
```

### Areas

Areas represent ongoing responsibilities:

```typescript
const areaPath = sdk.createArea({
    title: 'Acme Corp',
    areaType: 'client',
    status: AreaStatus.Active,
    description: 'Enterprise client work'
});

const areas = sdk.listAreas({ statuses: [AreaStatus.Active] });
const areaTasks = sdk.getTasksForArea(areaPath);
const areaProjects = sdk.getProjectsForArea(areaPath);
```

### File References

Link tasks to projects/areas using wikilinks or paths:

```typescript
// Wikilink style (Obsidian-compatible)
{ type: 'wikilink', target: 'Project Name' }
{ type: 'wikilink', target: 'Project Name', display: 'Custom Text' }

// Relative path
{ type: 'relativePath', path: './projects/my-project.md' }

// Bare filename
{ type: 'filename', name: 'my-project.md' }
```

### Event Processing

Process file system changes into typed events:

```typescript
// Integrate with your file watcher
const event = sdk.processFileChange('./tasks/new-task.md', 'created');

if (event?.type === 'taskCreated') {
    console.log('New task:', event.task.title);
}

// Event types: taskCreated, taskUpdated, taskDeleted,
//              projectCreated, projectUpdated, projectDeleted,
//              areaCreated, areaUpdated, areaDeleted

// Get paths to watch
const watchPaths = sdk.watchedPaths(); // [tasksDir, projectsDir, areasDir]
```

## Filtering

All list methods support filters:

```typescript
// Task filters
sdk.listTasks({
    statuses: [TaskStatus.Ready, TaskStatus.InProgress],
    project: { type: 'wikilink', target: 'My Project' },
    area: { type: 'wikilink', target: 'Work' },
    hasProject: true,
    hasArea: false,
    dueBefore: '2025-12-31',
    dueAfter: '2025-01-01',
    includeArchive: true
});

// Project filters
sdk.listProjects({
    statuses: [ProjectStatus.Planning, ProjectStatus.Ready],
    area: { type: 'wikilink', target: 'Work' },
    hasArea: true
});

// Area filters
sdk.listAreas({
    statuses: [AreaStatus.Active]
});

// Efficient counting
const count = sdk.countTasks({ statuses: [TaskStatus.Inbox] });
```

## Validation

Check tasks for spec compliance:

```typescript
const warnings = sdk.getTaskWarnings(taskPath);
for (const warning of warnings) {
    console.log(`${warning.field}: ${warning.message}`);
}
```

## Error Handling

All methods throw on errors. Wrap calls in try/catch:

```typescript
try {
    const task = sdk.getTask('./nonexistent.md');
} catch (error) {
    console.error('Task not found:', error.message);
}
```

## Development

```bash
# Install dependencies
bun install

# Debug build (faster, current platform only)
bun run build:debug

# Release build (optimized)
bun run build

# Run tests
bun test
```

## Architecture

This is a thin wrapper around the [Taskdn Rust SDK](../taskdn-rust). All business logic lives in Rust - this package handles type conversion and exposes the API to JavaScript via NAPI-RS.

See [CLAUDE.md](./CLAUDE.md) for development instructions.
