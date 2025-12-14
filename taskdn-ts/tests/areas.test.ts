import { describe, test, expect, beforeEach } from 'bun:test';
import { Taskdn, AreaStatus } from '../index.js';
import { resetTestVault, TEST_VAULT } from './setup';
import { existsSync } from 'fs';
import path from 'path';

describe('Area Operations', () => {
    let sdk: Taskdn;

    beforeEach(() => {
        resetTestVault();
        sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
    });

    describe('getArea', () => {
        test('returns area when file exists', () => {
            const areaPath = path.join(TEST_VAULT.areas, 'acme-corp.md');
            const area = sdk.getArea(areaPath);

            expect(area.title).toBe('Acme Corp');
            expect(area.status).toBe(AreaStatus.Active);
            expect(area.path).toBe(areaPath);
        });

        test('throws when file does not exist', () => {
            expect(() => {
                sdk.getArea(path.join(TEST_VAULT.areas, 'nonexistent.md'));
            }).toThrow();
        });
    });

    describe('listAreas', () => {
        test('returns all areas without filter', () => {
            const areas = sdk.listAreas();
            expect(areas.length).toBeGreaterThan(0);
        });

        test('filters by status', () => {
            const activeAreas = sdk.listAreas({ statuses: [AreaStatus.Active] });
            expect(activeAreas.length).toBeGreaterThan(0);
            activeAreas.forEach(area => {
                expect(area.status).toBe(AreaStatus.Active);
            });
        });

        test('filters by archived status', () => {
            const archivedAreas = sdk.listAreas({ statuses: [AreaStatus.Archived] });
            expect(archivedAreas.length).toBeGreaterThan(0);
            archivedAreas.forEach(area => {
                expect(area.status).toBe(AreaStatus.Archived);
            });
        });

        test('filters by multiple statuses', () => {
            const areas = sdk.listAreas({
                statuses: [AreaStatus.Active, AreaStatus.Archived]
            });
            areas.forEach(area => {
                expect([AreaStatus.Active, AreaStatus.Archived]).toContain(area.status);
            });
        });
    });

    describe('createArea', () => {
        test('creates a new area file and returns path', () => {
            const areaPath = sdk.createArea({ title: 'Test area' });

            expect(areaPath).toContain('test-area.md');
            expect(existsSync(areaPath)).toBe(true);

            const area = sdk.getArea(areaPath);
            expect(area.title).toBe('Test area');
        });

        test('creates area with specified status', () => {
            const areaPath = sdk.createArea({
                title: 'Archived area',
                status: AreaStatus.Archived
            });

            const area = sdk.getArea(areaPath);
            expect(area.status).toBe(AreaStatus.Archived);
        });

        test('creates area with description', () => {
            const areaPath = sdk.createArea({
                title: 'Described area',
                description: 'This is a test area description'
            });

            const area = sdk.getArea(areaPath);
            expect(area.description).toBe('This is a test area description');
        });

        test('creates area with type', () => {
            const areaPath = sdk.createArea({
                title: 'Typed area',
                areaType: 'client'
            });

            const area = sdk.getArea(areaPath);
            expect(area.areaType).toBe('client');
        });

        test('creates area with custom filename', () => {
            const areaPath = sdk.createArea({
                title: 'Custom filename area',
                filename: 'my-custom-area.md'
            });

            expect(areaPath).toContain('my-custom-area.md');
        });
    });

    describe('updateArea', () => {
        test('modifies area title', () => {
            const areaPath = sdk.createArea({ title: 'Original title' });
            sdk.updateArea(areaPath, { title: 'Updated title' });

            const area = sdk.getArea(areaPath);
            expect(area.title).toBe('Updated title');
        });

        test('modifies area status', () => {
            const areaPath = sdk.createArea({ title: 'Status test' });
            sdk.updateArea(areaPath, { status: AreaStatus.Archived });

            const area = sdk.getArea(areaPath);
            expect(area.status).toBe(AreaStatus.Archived);
        });

        test('modifies area description', () => {
            const areaPath = sdk.createArea({ title: 'Description test' });
            sdk.updateArea(areaPath, { description: 'New description' });

            const area = sdk.getArea(areaPath);
            expect(area.description).toBe('New description');
        });

        test('modifies area type', () => {
            const areaPath = sdk.createArea({ title: 'Type test' });
            sdk.updateArea(areaPath, { areaType: 'personal' });

            const area = sdk.getArea(areaPath);
            expect(area.areaType).toBe('personal');
        });
    });

    describe('deleteArea', () => {
        test('removes area file', () => {
            const areaPath = sdk.createArea({ title: 'Area to delete' });
            expect(existsSync(areaPath)).toBe(true);

            sdk.deleteArea(areaPath);
            expect(existsSync(areaPath)).toBe(false);
        });
    });

    describe('getTasksForArea', () => {
        test('returns tasks assigned directly to area', () => {
            // Create an area
            const areaPath = sdk.createArea({ title: 'Task Container Area' });
            const area = sdk.getArea(areaPath);

            // Create tasks with this area reference
            sdk.createTask({
                title: 'Task 1 for area',
                area: { type: 'wikilink', target: area.title }
            });
            sdk.createTask({
                title: 'Task 2 for area',
                area: { type: 'wikilink', target: area.title }
            });

            const tasks = sdk.getTasksForArea(areaPath);
            expect(tasks.length).toBeGreaterThanOrEqual(2);
        });

        test('returns empty array when no tasks assigned', () => {
            const areaPath = sdk.createArea({ title: 'Empty Area' });
            const tasks = sdk.getTasksForArea(areaPath);
            expect(tasks).toEqual([]);
        });
    });

    describe('getProjectsForArea', () => {
        test('returns projects assigned to area', () => {
            // Create an area
            const areaPath = sdk.createArea({ title: 'Project Container Area' });
            const area = sdk.getArea(areaPath);

            // Create projects with this area reference
            sdk.createProject({
                title: 'Project 1 for area',
                area: { type: 'wikilink', target: area.title }
            });
            sdk.createProject({
                title: 'Project 2 for area',
                area: { type: 'wikilink', target: area.title }
            });

            const projects = sdk.getProjectsForArea(areaPath);
            expect(projects.length).toBe(2);
            projects.forEach(project => {
                expect(project.area?.target).toBe(area.title);
            });
        });

        test('returns empty array when no projects assigned', () => {
            const areaPath = sdk.createArea({ title: 'Empty Project Area' });
            const projects = sdk.getProjectsForArea(areaPath);
            expect(projects).toEqual([]);
        });
    });
});
