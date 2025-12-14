import { describe, test, expect, beforeEach } from 'bun:test';
import { Taskdn, ProjectStatus } from '../index.js';
import { resetTestVault, TEST_VAULT } from './setup';
import { existsSync } from 'fs';
import path from 'path';

describe('Project Operations', () => {
    let sdk: Taskdn;

    beforeEach(() => {
        resetTestVault();
        sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
    });

    describe('getProject', () => {
        test('returns project when file exists', () => {
            const projectPath = path.join(TEST_VAULT.projects, 'website-redesign-acme.md');
            const project = sdk.getProject(projectPath);

            expect(project.title).toBe('Website Redesign');
            expect(project.status).toBe(ProjectStatus.Planning);
            expect(project.path).toBe(projectPath);
        });

        test('throws when file does not exist', () => {
            expect(() => {
                sdk.getProject(path.join(TEST_VAULT.projects, 'nonexistent.md'));
            }).toThrow();
        });
    });

    describe('listProjects', () => {
        test('returns all projects without filter', () => {
            const projects = sdk.listProjects();
            expect(projects.length).toBeGreaterThan(0);
        });

        test('filters by status', () => {
            const planningProjects = sdk.listProjects({
                statuses: [ProjectStatus.Planning]
            });
            expect(planningProjects.length).toBeGreaterThan(0);
            planningProjects.forEach(project => {
                expect(project.status).toBe(ProjectStatus.Planning);
            });
        });

        test('filters by multiple statuses', () => {
            const projects = sdk.listProjects({
                statuses: [ProjectStatus.Planning, ProjectStatus.InProgress]
            });
            projects.forEach(project => {
                expect([ProjectStatus.Planning, ProjectStatus.InProgress]).toContain(project.status);
            });
        });

        test('filters by hasArea', () => {
            const projectsWithArea = sdk.listProjects({ hasArea: true });
            projectsWithArea.forEach(project => {
                expect(project.area).toBeDefined();
            });
        });
    });

    describe('createProject', () => {
        test('creates a new project file and returns path', () => {
            const projectPath = sdk.createProject({ title: 'Test project' });

            expect(projectPath).toContain('test-project.md');
            expect(existsSync(projectPath)).toBe(true);

            const project = sdk.getProject(projectPath);
            expect(project.title).toBe('Test project');
        });

        test('creates project with specified status', () => {
            const projectPath = sdk.createProject({
                title: 'Ready project',
                status: ProjectStatus.Ready
            });

            const project = sdk.getProject(projectPath);
            expect(project.status).toBe(ProjectStatus.Ready);
        });

        test('creates project with description', () => {
            const projectPath = sdk.createProject({
                title: 'Described project',
                description: 'This is a test project description'
            });

            const project = sdk.getProject(projectPath);
            expect(project.description).toBe('This is a test project description');
        });

        test('creates project with area reference', () => {
            const projectPath = sdk.createProject({
                title: 'Area project',
                area: { type: 'wikilink', target: 'Acme Corp' }
            });

            const project = sdk.getProject(projectPath);
            expect(project.area).toBeDefined();
            expect(project.area?.type).toBe('wikilink');
        });

        test('creates project with start and end dates', () => {
            const projectPath = sdk.createProject({
                title: 'Dated project',
                startDate: '2025-01-01',
                endDate: '2025-06-30'
            });

            const project = sdk.getProject(projectPath);
            expect(project.startDate).toBe('2025-01-01');
            expect(project.endDate).toBe('2025-06-30');
        });

        test('creates project with custom filename', () => {
            const projectPath = sdk.createProject({
                title: 'Custom filename project',
                filename: 'my-custom-project.md'
            });

            expect(projectPath).toContain('my-custom-project.md');
        });
    });

    describe('updateProject', () => {
        test('modifies project title', () => {
            const projectPath = sdk.createProject({ title: 'Original title' });
            sdk.updateProject(projectPath, { title: 'Updated title' });

            const project = sdk.getProject(projectPath);
            expect(project.title).toBe('Updated title');
        });

        test('modifies project status', () => {
            const projectPath = sdk.createProject({ title: 'Status test' });
            sdk.updateProject(projectPath, { status: ProjectStatus.InProgress });

            const project = sdk.getProject(projectPath);
            expect(project.status).toBe(ProjectStatus.InProgress);
        });

        test('modifies project description', () => {
            const projectPath = sdk.createProject({ title: 'Description test' });
            sdk.updateProject(projectPath, { description: 'New description' });

            const project = sdk.getProject(projectPath);
            expect(project.description).toBe('New description');
        });

        test('modifies project dates', () => {
            const projectPath = sdk.createProject({ title: 'Date test' });
            sdk.updateProject(projectPath, {
                startDate: '2025-02-01',
                endDate: '2025-12-31'
            });

            const project = sdk.getProject(projectPath);
            expect(project.startDate).toBe('2025-02-01');
            expect(project.endDate).toBe('2025-12-31');
        });
    });

    describe('deleteProject', () => {
        test('removes project file', () => {
            const projectPath = sdk.createProject({ title: 'Project to delete' });
            expect(existsSync(projectPath)).toBe(true);

            sdk.deleteProject(projectPath);
            expect(existsSync(projectPath)).toBe(false);
        });
    });

    describe('getTasksForProject', () => {
        test('returns tasks assigned to project', () => {
            // Create a project and tasks assigned to it
            const projectPath = sdk.createProject({ title: 'Task Parent Project' });

            // Get the project to get its title for the wikilink
            const project = sdk.getProject(projectPath);

            // Create tasks with this project reference
            sdk.createTask({
                title: 'Task 1 for project',
                project: { type: 'wikilink', target: project.title }
            });
            sdk.createTask({
                title: 'Task 2 for project',
                project: { type: 'wikilink', target: project.title }
            });

            const tasks = sdk.getTasksForProject(projectPath);
            expect(tasks.length).toBe(2);
            tasks.forEach(task => {
                expect(task.project?.target).toBe(project.title);
            });
        });

        test('returns empty array when no tasks assigned', () => {
            const projectPath = sdk.createProject({ title: 'Empty Project' });
            const tasks = sdk.getTasksForProject(projectPath);
            expect(tasks).toEqual([]);
        });
    });
});
