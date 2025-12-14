import { describe, test, expect, beforeEach } from 'bun:test';
import { Taskdn } from '../index.js';
import { resetTestVault, TEST_VAULT } from './setup';
import path from 'path';

describe('Event Processing', () => {
    let sdk: Taskdn;

    beforeEach(() => {
        resetTestVault();
        sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
    });

    describe('processFileChange', () => {
        describe('task events', () => {
            test('returns taskCreated event for new task', () => {
                const taskPath = sdk.createTask({ title: 'New event task' });
                const event = sdk.processFileChange(taskPath, 'created');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('taskCreated');
                expect(event?.task).toBeDefined();
                expect(event?.task?.title).toBe('New event task');
            });

            test('returns taskUpdated event for modified task', () => {
                const taskPath = sdk.createTask({ title: 'Modified event task' });
                sdk.updateTask(taskPath, { title: 'Updated title' });

                const event = sdk.processFileChange(taskPath, 'modified');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('taskUpdated');
                expect(event?.task).toBeDefined();
                expect(event?.task?.title).toBe('Updated title');
            });

            test('returns taskDeleted event for deleted task', () => {
                const taskPath = sdk.createTask({ title: 'Task to delete for event' });
                sdk.deleteTask(taskPath);

                const event = sdk.processFileChange(taskPath, 'deleted');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('taskDeleted');
                expect(event?.path).toBe(taskPath);
            });
        });

        describe('project events', () => {
            test('returns projectCreated event for new project', () => {
                const projectPath = sdk.createProject({ title: 'New event project' });
                const event = sdk.processFileChange(projectPath, 'created');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('projectCreated');
                expect(event?.project).toBeDefined();
                expect(event?.project?.title).toBe('New event project');
            });

            test('returns projectUpdated event for modified project', () => {
                const projectPath = sdk.createProject({ title: 'Modified event project' });
                sdk.updateProject(projectPath, { title: 'Updated project title' });

                const event = sdk.processFileChange(projectPath, 'modified');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('projectUpdated');
                expect(event?.project).toBeDefined();
                expect(event?.project?.title).toBe('Updated project title');
            });

            test('returns projectDeleted event for deleted project', () => {
                const projectPath = sdk.createProject({ title: 'Project to delete for event' });
                sdk.deleteProject(projectPath);

                const event = sdk.processFileChange(projectPath, 'deleted');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('projectDeleted');
                expect(event?.path).toBe(projectPath);
            });
        });

        describe('area events', () => {
            test('returns areaCreated event for new area', () => {
                const areaPath = sdk.createArea({ title: 'New event area' });
                const event = sdk.processFileChange(areaPath, 'created');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('areaCreated');
                expect(event?.area).toBeDefined();
                expect(event?.area?.title).toBe('New event area');
            });

            test('returns areaUpdated event for modified area', () => {
                const areaPath = sdk.createArea({ title: 'Modified event area' });
                sdk.updateArea(areaPath, { title: 'Updated area title' });

                const event = sdk.processFileChange(areaPath, 'modified');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('areaUpdated');
                expect(event?.area).toBeDefined();
                expect(event?.area?.title).toBe('Updated area title');
            });

            test('returns areaDeleted event for deleted area', () => {
                const areaPath = sdk.createArea({ title: 'Area to delete for event' });
                sdk.deleteArea(areaPath);

                const event = sdk.processFileChange(areaPath, 'deleted');

                expect(event).not.toBeNull();
                expect(event?.type).toBe('areaDeleted');
                expect(event?.path).toBe(areaPath);
            });
        });

        describe('non-task files', () => {
            test('returns null for non-markdown file', () => {
                const event = sdk.processFileChange('/some/path/file.txt', 'created');
                expect(event).toBeNull();
            });

            test('returns null for file outside watched directories', () => {
                const event = sdk.processFileChange('/other/directory/file.md', 'created');
                expect(event).toBeNull();
            });
        });
    });
});
