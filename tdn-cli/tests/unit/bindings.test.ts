import { describe, test, expect } from 'bun:test';
import { resolve } from 'path';
import { helloFromRust, parseTaskFile } from '@bindings';

// Helper to get fixture path
function fixturePath(relativePath: string): string {
  return resolve(import.meta.dir, '../fixtures', relativePath);
}

describe('NAPI bindings', () => {
  describe('helloFromRust', () => {
    test('bindings load successfully', () => {
      expect(helloFromRust()).toBe('Hello from Rust!');
    });
  });

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
});
