import { describe, test, expect } from 'bun:test';
import { lookupTask, lookupProject, lookupArea } from '@/lib/entity-lookup.ts';
import type { LookupResult } from '@/lib/entity-lookup.ts';
import type { Task, Project, Area, VaultConfig } from '@bindings';
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
      const result = lookupTask('Minimal Task', getFixtureConfig());
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Task');
    });

    test('finds task by partial title (case-insensitive)', () => {
      const result = lookupTask('minimal', getFixtureConfig());
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Task');
    });

    test('returns multiple matches when ambiguous', () => {
      // "Task" should match multiple tasks
      const result = lookupTask('Task', getFixtureConfig());
      expect(result.type).toBe('multiple');
      expect(result.matches.length).toBeGreaterThan(1);
    });

    test('returns none when no matches', () => {
      const result = lookupTask('xyznonexistent12345', getFixtureConfig());
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('prefers path if query looks like a path', () => {
      const fullPath = fixturePath('vault/tasks/minimal.md');
      const result = lookupTask(fullPath, getFixtureConfig());
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Task');
    });

    test('returns none for nonexistent path', () => {
      const result = lookupTask('/nonexistent/path.md', getFixtureConfig());
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('handles .md suffix as path indicator', () => {
      const result = lookupTask('minimal.md', getFixtureConfig());
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
    });
  });

  describe('lookupProject', () => {
    test('finds project by exact title', () => {
      const result = lookupProject('Minimal Project', getFixtureConfig());
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Project');
    });

    test('finds project by partial title (case-insensitive)', () => {
      const result = lookupProject('minimal', getFixtureConfig());
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
    });

    test('returns multiple matches when ambiguous', () => {
      // "Project" should match multiple projects
      const result = lookupProject('Project', getFixtureConfig());
      expect(result.type).toBe('multiple');
      expect(result.matches.length).toBeGreaterThan(1);
    });

    test('returns none when no matches', () => {
      const result = lookupProject('xyznonexistent12345', getFixtureConfig());
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('prefers path if query looks like a path', () => {
      const fullPath = fixturePath('vault/projects/minimal.md');
      const result = lookupProject(fullPath, getFixtureConfig());
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Project');
    });
  });

  describe('lookupArea', () => {
    test('finds area by exact title', () => {
      const result = lookupArea('Minimal Area', getFixtureConfig());
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Area');
    });

    test('finds area by partial title (case-insensitive)', () => {
      const result = lookupArea('minimal', getFixtureConfig());
      expect(result.type).toBe('single');
      expect(result.matches.length).toBe(1);
    });

    test('returns multiple matches when ambiguous', () => {
      // "Area" should match multiple areas
      const result = lookupArea('Area', getFixtureConfig());
      expect(result.type).toBe('multiple');
      expect(result.matches.length).toBeGreaterThan(1);
    });

    test('returns none when no matches', () => {
      const result = lookupArea('xyznonexistent12345', getFixtureConfig());
      expect(result.type).toBe('none');
      expect(result.matches).toEqual([]);
    });

    test('prefers path if query looks like a path', () => {
      const fullPath = fixturePath('vault/areas/minimal.md');
      const result = lookupArea(fullPath, getFixtureConfig());
      expect(result.type).toBe('exact');
      expect(result.matches.length).toBe(1);
      expect(result.matches[0]!.title).toBe('Minimal Area');
    });
  });

  describe('path detection', () => {
    test('recognizes absolute paths', () => {
      const result = lookupTask('/absolute/path/task.md', getFixtureConfig());
      // Should attempt path lookup (none because doesn't exist)
      expect(result.type).toBe('none');
    });

    test('recognizes relative paths with ./', () => {
      const result = lookupTask('./relative/task.md', getFixtureConfig());
      expect(result.type).toBe('none');
    });

    test('recognizes relative paths with ../', () => {
      const result = lookupTask('../parent/task.md', getFixtureConfig());
      expect(result.type).toBe('none');
    });

    test('recognizes tilde paths', () => {
      const result = lookupTask('~/home/task.md', getFixtureConfig());
      expect(result.type).toBe('none');
    });

    test('treats .md suffix as path indicator', () => {
      // "minimal.md" should be treated as path, not title search
      const config = getFixtureConfig();
      const result = lookupTask('minimal.md', config);
      expect(result.type).toBe('exact');
    });
  });
});
