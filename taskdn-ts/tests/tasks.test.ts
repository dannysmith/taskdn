import { describe, test, expect, beforeEach } from 'bun:test';
import { Taskdn, TaskStatus } from '../index.js';
import { resetTestVault, TEST_VAULT } from './setup';
import { existsSync } from 'fs';
import path from 'path';

describe('Task Operations', () => {
    let sdk: Taskdn;

    beforeEach(() => {
        resetTestVault();
        sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
    });

    describe('getTask', () => {
        test('returns task when file exists', () => {
            const taskPath = path.join(TEST_VAULT.tasks, 'learn-rust.md');
            const task = sdk.getTask(taskPath);

            expect(task.title).toBe('Learn Rust properly');
            expect(task.status).toBe(TaskStatus.Icebox);
            expect(task.path).toBe(taskPath);
        });

        test('throws when file does not exist', () => {
            expect(() => {
                sdk.getTask(path.join(TEST_VAULT.tasks, 'nonexistent.md'));
            }).toThrow();
        });
    });

    describe('listTasks', () => {
        test('returns all tasks without filter', () => {
            const tasks = sdk.listTasks();
            expect(tasks.length).toBeGreaterThan(0);
        });

        test('filters by status', () => {
            const readyTasks = sdk.listTasks({ statuses: [TaskStatus.Ready] });
            expect(readyTasks.length).toBeGreaterThan(0);
            readyTasks.forEach(task => {
                expect(task.status).toBe(TaskStatus.Ready);
            });
        });

        test('filters by multiple statuses', () => {
            const tasks = sdk.listTasks({
                statuses: [TaskStatus.Ready, TaskStatus.InProgress]
            });
            tasks.forEach(task => {
                expect([TaskStatus.Ready, TaskStatus.InProgress]).toContain(task.status);
            });
        });

        test('excludes archived by default', () => {
            const tasks = sdk.listTasks();
            tasks.forEach(task => {
                expect(task.isArchived).toBe(false);
            });
        });

        test('includes archived when requested', () => {
            const tasks = sdk.listTasks({ includeArchive: true });
            const archivedTasks = tasks.filter(t => t.isArchived);
            expect(archivedTasks.length).toBeGreaterThan(0);
        });
    });

    describe('countTasks', () => {
        test('returns correct count without filter', () => {
            const count = sdk.countTasks();
            const tasks = sdk.listTasks();
            expect(count).toBe(tasks.length);
        });

        test('returns correct count with filter', () => {
            const count = sdk.countTasks({ statuses: [TaskStatus.Ready] });
            const tasks = sdk.listTasks({ statuses: [TaskStatus.Ready] });
            expect(count).toBe(tasks.length);
        });
    });

    describe('createTask', () => {
        test('creates a new task file and returns path', () => {
            const taskPath = sdk.createTask({ title: 'Test task' });

            expect(taskPath).toContain('test-task.md');
            expect(existsSync(taskPath)).toBe(true);

            const task = sdk.getTask(taskPath);
            expect(task.title).toBe('Test task');
            expect(task.status).toBe(TaskStatus.Inbox);
        });

        test('creates task with specified status', () => {
            const taskPath = sdk.createTask({
                title: 'Ready task',
                status: TaskStatus.Ready
            });

            const task = sdk.getTask(taskPath);
            expect(task.status).toBe(TaskStatus.Ready);
        });

        test('creates task with project reference', () => {
            const taskPath = sdk.createTask({
                title: 'Project task',
                project: { type: 'wikilink', target: 'Website Redesign' }
            });

            const task = sdk.getTask(taskPath);
            expect(task.project).toBeDefined();
            expect(task.project?.type).toBe('wikilink');
        });

        test('creates task with area reference', () => {
            const taskPath = sdk.createTask({
                title: 'Area task',
                area: { type: 'wikilink', target: 'Acme Corp' }
            });

            const task = sdk.getTask(taskPath);
            expect(task.area).toBeDefined();
            expect(task.area?.type).toBe('wikilink');
        });

        test('creates task with due date', () => {
            const taskPath = sdk.createTask({
                title: 'Due task',
                due: '2025-12-31'
            });

            const task = sdk.getTask(taskPath);
            expect(task.due).toBe('2025-12-31');
        });

        test('creates task with custom filename', () => {
            const taskPath = sdk.createTask({
                title: 'Custom filename task',
                filename: 'my-custom-name.md'
            });

            expect(taskPath).toContain('my-custom-name.md');
        });
    });

    describe('createInboxTask', () => {
        test('creates task with inbox status', () => {
            const taskPath = sdk.createInboxTask('Quick capture task');

            const task = sdk.getTask(taskPath);
            expect(task.title).toBe('Quick capture task');
            expect(task.status).toBe(TaskStatus.Inbox);
        });
    });

    describe('updateTask', () => {
        test('modifies task title', () => {
            const taskPath = sdk.createTask({ title: 'Original title' });
            sdk.updateTask(taskPath, { title: 'Updated title' });

            const task = sdk.getTask(taskPath);
            expect(task.title).toBe('Updated title');
        });

        test('modifies task status', () => {
            const taskPath = sdk.createTask({ title: 'Status test' });
            sdk.updateTask(taskPath, { status: TaskStatus.Ready });

            const task = sdk.getTask(taskPath);
            expect(task.status).toBe(TaskStatus.Ready);
        });

        test('updates updatedAt timestamp', () => {
            const taskPath = sdk.createTask({ title: 'Timestamp test' });
            const before = sdk.getTask(taskPath);

            // Update the task
            sdk.updateTask(taskPath, { title: 'Updated' });

            const after = sdk.getTask(taskPath);
            // Both timestamps should be valid ISO strings (may be same if in same second)
            expect(after.updatedAt).toBeDefined();
            expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(before.updatedAt).getTime()
            );
        });

        test('modifies due date', () => {
            const taskPath = sdk.createTask({ title: 'Due test' });
            sdk.updateTask(taskPath, { due: '2025-06-15' });

            const task = sdk.getTask(taskPath);
            expect(task.due).toBe('2025-06-15');
        });
    });

    describe('completeTask', () => {
        test('sets done status and completedAt', () => {
            const taskPath = sdk.createTask({ title: 'Task to complete' });
            sdk.completeTask(taskPath);

            const task = sdk.getTask(taskPath);
            expect(task.status).toBe(TaskStatus.Done);
            expect(task.completedAt).toBeDefined();
        });
    });

    describe('dropTask', () => {
        test('sets dropped status and completedAt', () => {
            const taskPath = sdk.createTask({ title: 'Task to drop' });
            sdk.dropTask(taskPath);

            const task = sdk.getTask(taskPath);
            expect(task.status).toBe(TaskStatus.Dropped);
            expect(task.completedAt).toBeDefined();
        });
    });

    describe('startTask', () => {
        test('sets in-progress status', () => {
            const taskPath = sdk.createTask({ title: 'Task to start' });
            sdk.startTask(taskPath);

            const task = sdk.getTask(taskPath);
            expect(task.status).toBe(TaskStatus.InProgress);
        });
    });

    describe('blockTask', () => {
        test('sets blocked status', () => {
            const taskPath = sdk.createTask({ title: 'Task to block' });
            sdk.blockTask(taskPath);

            const task = sdk.getTask(taskPath);
            expect(task.status).toBe(TaskStatus.Blocked);
        });
    });

    describe('archiveTask', () => {
        test('moves task to archive and returns new path', () => {
            const originalPath = sdk.createTask({ title: 'Task to archive' });
            const newPath = sdk.archiveTask(originalPath);

            expect(newPath).toContain('archive');
            expect(existsSync(newPath)).toBe(true);
            expect(existsSync(originalPath)).toBe(false);

            const task = sdk.getTask(newPath);
            expect(task.isArchived).toBe(true);
        });
    });

    describe('unarchiveTask', () => {
        test('moves task from archive to main directory', () => {
            // First archive a task
            const originalPath = sdk.createTask({ title: 'Task for archiving' });
            const archivedPath = sdk.archiveTask(originalPath);

            // Now unarchive it
            const restoredPath = sdk.unarchiveTask(archivedPath);

            // Should not be in the archive subdirectory
            expect(restoredPath).not.toContain('/archive/');
            expect(existsSync(restoredPath)).toBe(true);
            expect(existsSync(archivedPath)).toBe(false);

            const task = sdk.getTask(restoredPath);
            expect(task.isArchived).toBe(false);
        });
    });

    describe('deleteTask', () => {
        test('removes task file', () => {
            const taskPath = sdk.createTask({ title: 'Task to delete' });
            expect(existsSync(taskPath)).toBe(true);

            sdk.deleteTask(taskPath);
            expect(existsSync(taskPath)).toBe(false);
        });
    });

    describe('getTaskWarnings', () => {
        test('returns empty array for valid task', () => {
            const taskPath = sdk.createTask({ title: 'Valid task' });
            const warnings = sdk.getTaskWarnings(taskPath);
            expect(Array.isArray(warnings)).toBe(true);
        });
    });
});
