import { describe, test, expect } from 'bun:test';
import { parseTaskFile, parseProjectFile } from '@bindings';
import { fixturePath } from '../helpers/cli';

describe('NAPI bindings', () => {
  describe('parseTaskFile', () => {
    test('returns Task object with required fields', () => {
      const task = parseTaskFile(fixturePath('vault/tasks/minimal.md'));
      expect(task.title).toBe('Minimal Task');
      expect(task.status as string).toBe('Ready');
      expect(task.path).toBeDefined();
      expect(task.body).toBeDefined();
    });

    test('parses all metadata fields', () => {
      const task = parseTaskFile(fixturePath('vault/tasks/full-metadata.md'));
      expect(task.title).toBe('Full Metadata Task');
      expect(task.status as string).toBe('InProgress');
      expect(task.due).toBe('2025-01-20');
      expect(task.scheduled).toBe('2025-01-18');
      expect(task.deferUntil).toBe('2025-01-16');
      expect(task.project).toBe('[[Test Project]]');
      expect(task.area).toBe('[[Work]]');
    });

    test('parses body content', () => {
      const task = parseTaskFile(fixturePath('vault/tasks/with-body.md'));
      expect(task.body).toContain('markdown');
      expect(task.body).toContain('First subtask');
    });

    test('throws on nonexistent file', () => {
      expect(() => parseTaskFile('/nonexistent/path.md')).toThrow();
    });

    test('parses all status values correctly', () => {
      const statuses = [
        { file: 'status-inbox.md', expected: 'Inbox' },
        { file: 'status-icebox.md', expected: 'Icebox' },
        { file: 'status-in-progress.md', expected: 'InProgress' },
        { file: 'status-blocked.md', expected: 'Blocked' },
        { file: 'status-dropped.md', expected: 'Dropped' },
        { file: 'status-done.md', expected: 'Done' },
        { file: 'minimal.md', expected: 'Ready' },
      ];

      for (const { file, expected } of statuses) {
        const task = parseTaskFile(fixturePath(`vault/tasks/${file}`));
        expect(task.status as string).toBe(expected);
      }
    });
  });

  describe('parseProjectFile', () => {
    test('returns Project object with required fields', () => {
      const project = parseProjectFile(fixturePath('vault/projects/minimal.md'));
      expect(project.title).toBe('Minimal Project');
      expect(project.path).toBeDefined();
      expect(project.body).toBeDefined();
    });

    test('parses status correctly', () => {
      const project = parseProjectFile(fixturePath('vault/projects/minimal.md'));
      expect(project.status as string).toBe('InProgress');
    });

    test('parses all metadata fields', () => {
      const project = parseProjectFile(fixturePath('vault/projects/full-metadata.md'));
      expect(project.title).toBe('Full Metadata Project');
      expect(project.status as string).toBe('InProgress');
      expect(project.startDate).toBe('2025-01-10');
      expect(project.endDate).toBe('2025-03-01');
      expect(project.area).toBe('[[Work]]');
      expect(project.description).toBe('A project with all optional fields populated');
      expect(project.blockedBy).toEqual(['[[Another Project]]']);
    });

    test('parses body content', () => {
      const project = parseProjectFile(fixturePath('vault/projects/with-body.md'));
      expect(project.body).toContain('project body');
      expect(project.body).toContain('Goals');
      expect(project.body).toContain('Deliver feature X');
    });

    test('throws on nonexistent file', () => {
      expect(() => parseProjectFile('/nonexistent/path.md')).toThrow();
    });

    test('parses all project status values correctly', () => {
      // The minimal fixture has in-progress status
      const project = parseProjectFile(fixturePath('vault/projects/minimal.md'));
      expect(project.status as string).toBe('InProgress');

      // The with-body fixture has planning status
      const planningProject = parseProjectFile(fixturePath('vault/projects/with-body.md'));
      expect(planningProject.status as string).toBe('Planning');
    });

    test('handles project without status (optional per S1 spec)', () => {
      // Status is optional for projects per S1 Section 4.4
      const project = parseProjectFile(fixturePath('vault/projects/no-status.md'));
      expect(project.title).toBe('Project Without Status');
      expect(project.status).toBeNull();
      expect(project.area).toBe('[[Work]]');
    });
  });
});
