import { describe, test, expect, beforeEach } from 'bun:test';
import { Taskdn } from '../index.js';
import { resetTestVault, TEST_VAULT } from './setup';

describe('SDK Initialization', () => {
    beforeEach(() => {
        resetTestVault();
    });

    test('constructor with valid paths creates instance', () => {
        const sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
        expect(sdk).toBeInstanceOf(Taskdn);
    });

    test('constructor with invalid paths throws', () => {
        expect(() => {
            new Taskdn('/nonexistent/tasks', '/nonexistent/projects', '/nonexistent/areas');
        }).toThrow();
    });

    test('tasksDir getter returns correct value', () => {
        const sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
        expect(sdk.tasksDir).toBe(TEST_VAULT.tasks);
    });

    test('projectsDir getter returns correct value', () => {
        const sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
        expect(sdk.projectsDir).toBe(TEST_VAULT.projects);
    });

    test('areasDir getter returns correct value', () => {
        const sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
        expect(sdk.areasDir).toBe(TEST_VAULT.areas);
    });

    test('watchedPaths returns all three directories', () => {
        const sdk = new Taskdn(TEST_VAULT.tasks, TEST_VAULT.projects, TEST_VAULT.areas);
        const paths = sdk.watchedPaths();
        expect(paths).toHaveLength(3);
        expect(paths).toContain(TEST_VAULT.tasks);
        expect(paths).toContain(TEST_VAULT.projects);
        expect(paths).toContain(TEST_VAULT.areas);
    });
});
