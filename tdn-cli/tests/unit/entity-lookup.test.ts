import { describe, test, expect } from 'bun:test';
import { lookupTask, lookupProject, lookupArea } from '@/lib/entity-lookup.ts';
import type { LookupResult } from '@/lib/entity-lookup.ts';
import type { Task, Project, Area, VaultConfig } from '@bindings';
import { createVaultSession } from '@bindings';
import { fixturePath } from '../helpers/cli';

// Helper to create a vault config pointing to fixtures
function getFixtureConfig(): VaultConfig {
  return {
    tasksDir: fixturePath('vault/tasks'),
    projectsDir: fixturePath('vault/projects'),
    areasDir: fixturePath('vault/areas'),
  };
}

describe('entity-lookup', () => {
  describe('lookupTask', () => {
    test('finds task by exact title', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, 'Minimal Task', config);
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Task');
    });

    test('finds task by partial title (case-insensitive)', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, 'minimal', config);
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Task');
    });

    test('returns multiple matches when ambiguous', () => {
      // "Task" should match multiple tasks
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, 'Task', config);
      expect(result.type).toBe('multiple');
      expect(result.matches.length).toBeGreaterThan(1);
    });

    test('returns none when no matches', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, 'xyznonexistent12345', config);
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('prefers path if query looks like a path', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const fullPath = fixturePath('vault/tasks/minimal.md');
      const result = lookupTask(session, fullPath, config);
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Task');
    });

    test('returns none for nonexistent path', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, '/nonexistent/path.md', config);
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('handles .md suffix as path indicator', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, 'minimal.md', config);
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
    });
  });

  describe('lookupProject', () => {
    test('finds project by exact title', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupProject(session, 'Minimal Project', config);
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Project');
    });

    test('finds project by partial title (case-insensitive)', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupProject(session, 'minimal', config);
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
    });

    test('returns multiple matches when ambiguous', () => {
      // "Project" should match multiple projects
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupProject(session, 'Project', config);
      expect(result.type).toBe('multiple');
      expect(result.matches.length).toBeGreaterThan(1);
    });

    test('returns none when no matches', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupProject(session, 'xyznonexistent12345', config);
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('prefers path if query looks like a path', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const fullPath = fixturePath('vault/projects/minimal.md');
      const result = lookupProject(session, fullPath, config);
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Project');
    });
  });

  describe('lookupArea', () => {
    test('finds area by exact title', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupArea(session, 'Minimal Area', config);
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Area');
    });

    test('finds area by partial title (case-insensitive)', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupArea(session, 'minimal', config);
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
    });

    test('returns multiple matches when ambiguous', () => {
      // "Area" should match multiple areas
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupArea(session, 'Area', config);
      expect(result.type).toBe('multiple');
      expect(result.matches.length).toBeGreaterThan(1);
    });

    test('returns none when no matches', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupArea(session, 'xyznonexistent12345', config);
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('prefers path if query looks like a path', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const fullPath = fixturePath('vault/areas/minimal.md');
      const result = lookupArea(session, fullPath, config);
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Area');
    });
  });

  describe('path detection', () => {
    test('recognizes absolute paths', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, '/absolute/path/task.md', config);
      // Should attempt path lookup (none because doesn't exist)
      expect(result.type).toBe('none');
    });

    test('recognizes relative paths with ./', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, './relative/task.md', config);
      expect(result.type).toBe('none');
    });

    test('recognizes relative paths with ../', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, '../parent/task.md', config);
      expect(result.type).toBe('none');
    });

    test('recognizes tilde paths', () => {
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, '~/home/task.md', config);
      expect(result.type).toBe('none');
    });

    test('treats .md suffix as path indicator', () => {
      // "minimal.md" should be treated as path, not title search
      const config = getFixtureConfig();
      const session = createVaultSession(config);
      const result = lookupTask(session, 'minimal.md', config);
      expect(result.type).toBe('exact');
    });
  });
});
