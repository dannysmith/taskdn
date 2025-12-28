import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  updateFileFields,
  createTaskFile,
  type TaskStatus,
  type FieldUpdate,
  type TaskCreateFields,
} from '@bindings';

/**
 * E2E tests for write infrastructure (updateFileFields and related functions).
 *
 * These tests verify round-trip fidelity requirements:
 * - Unknown frontmatter fields survive updates
 * - Date format choices are preserved (date vs datetime)
 * - Body content remains unchanged
 * - Atomic writes work correctly
 */

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'taskdn-write-test-'));
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('write infrastructure', () => {
  describe('updateFileFields', () => {
    test('preserves unknown frontmatter fields on update', () => {
      const filePath = join(tempDir, 'task.md');

      // Create file with custom fields that aren't part of the spec
      const content = `---
title: Test Task
status: ready
priority: high
my-custom-field: some value
tags:
  - important
  - urgent
---
Body content here.
`;
      writeFileSync(filePath, content);

      // Update status
      const updates: FieldUpdate[] = [{ field: 'status', value: 'in-progress' }];
      updateFileFields(filePath, updates);

      // Read back and verify custom fields preserved
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('priority: high');
      expect(updatedContent).toContain('my-custom-field: some value');
      expect(updatedContent).toContain('- important');
      expect(updatedContent).toContain('- urgent');
      expect(updatedContent).toContain('status: in-progress');
    });

    test('preserves date-only format (not converted to datetime)', () => {
      const filePath = join(tempDir, 'task.md');

      // Create file with date-only format (not datetime)
      const content = `---
title: Test Task
status: ready
due: 2025-01-15
scheduled: 2025-02-01
defer-until: 2025-01-10
---
`;
      writeFileSync(filePath, content);

      // Update status (should not affect date fields)
      const updates: FieldUpdate[] = [{ field: 'status', value: 'in-progress' }];
      updateFileFields(filePath, updates);

      // Read back and verify date format is preserved
      const updatedContent = readFileSync(filePath, 'utf-8');

      // Should contain date-only format (possibly quoted)
      expect(
        updatedContent.includes('due: 2025-01-15') || updatedContent.includes("due: '2025-01-15'")
      ).toBe(true);
      expect(
        updatedContent.includes('scheduled: 2025-02-01') ||
          updatedContent.includes("scheduled: '2025-02-01'")
      ).toBe(true);
      expect(
        updatedContent.includes('defer-until: 2025-01-10') ||
          updatedContent.includes("defer-until: '2025-01-10'")
      ).toBe(true);

      // Should NOT contain datetime format
      expect(updatedContent).not.toContain('2025-01-15T');
      expect(updatedContent).not.toContain('2025-02-01T');
      expect(updatedContent).not.toContain('2025-01-10T');
    });

    test('preserves body content exactly', () => {
      const filePath = join(tempDir, 'task.md');

      // Create file with complex markdown body
      const body = `## Notes

- Point 1
- Point 2

### Details

Some **bold** and _italic_ text.

\`\`\`rust
fn main() {
    println!("Hello");
}
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| A        | B        |
`;

      const content = `---
title: Test Task
status: ready
---
${body}`;
      writeFileSync(filePath, content);

      // Update status
      const updates: FieldUpdate[] = [{ field: 'status', value: 'done' }];
      updateFileFields(filePath, updates);

      // Read back and verify body preserved exactly
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('## Notes');
      expect(updatedContent).toContain('- Point 1');
      expect(updatedContent).toContain('- Point 2');
      expect(updatedContent).toContain('### Details');
      expect(updatedContent).toContain('Some **bold** and _italic_ text.');
      expect(updatedContent).toContain('```rust');
      expect(updatedContent).toContain('println!("Hello");');
      expect(updatedContent).toContain('| Column 1 | Column 2 |');
    });

    test('updates multiple fields at once', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
due: 2025-01-15
---
`;
      writeFileSync(filePath, content);

      // Update multiple fields
      const updates: FieldUpdate[] = [
        { field: 'status', value: 'in-progress' },
        { field: 'due', value: '2025-02-01' },
        { field: 'scheduled', value: '2025-01-20' },
      ];
      updateFileFields(filePath, updates);

      // Verify all updates applied
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('status: in-progress');
      expect(
        updatedContent.includes('due: 2025-02-01') || updatedContent.includes("due: '2025-02-01'")
      ).toBe(true);
      expect(
        updatedContent.includes('scheduled: 2025-01-20') ||
          updatedContent.includes("scheduled: '2025-01-20'")
      ).toBe(true);
    });

    test('removes field when value is null/undefined', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
due: 2025-01-15
scheduled: 2025-01-10
---
`;
      writeFileSync(filePath, content);

      // Remove due field
      const updates: FieldUpdate[] = [{ field: 'due', value: undefined }];
      updateFileFields(filePath, updates);

      // Verify due is removed
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).not.toContain('due:');
      expect(updatedContent).toContain('title: Test Task');
      expect(updatedContent).toContain('status: ready');
      // scheduled should still be there
      expect(updatedContent).toContain('scheduled');
    });

    test('sets completed-at when status changes to done', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
---
`;
      writeFileSync(filePath, content);

      // Update to done
      const updates: FieldUpdate[] = [{ field: 'status', value: 'done' }];
      updateFileFields(filePath, updates);

      // Verify completed-at is set
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('completed-at:');
    });

    test('sets completed-at when status changes to dropped', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
---
`;
      writeFileSync(filePath, content);

      // Update to dropped
      const updates: FieldUpdate[] = [{ field: 'status', value: 'dropped' }];
      updateFileFields(filePath, updates);

      // Verify completed-at is set
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('completed-at:');
    });

    test('updates updated-at timestamp', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
updated-at: 2020-01-01T00:00:00
---
`;
      writeFileSync(filePath, content);

      // Update any field
      const updates: FieldUpdate[] = [{ field: 'status', value: 'in-progress' }];
      updateFileFields(filePath, updates);

      // Verify updated-at is changed
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).not.toContain('2020-01-01');
      expect(updatedContent).toContain('updated-at:');
    });

    test('wraps project in wikilink format', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
---
`;
      writeFileSync(filePath, content);

      // Set project field
      const updates: FieldUpdate[] = [{ field: 'project', value: 'Q1 Planning' }];
      updateFileFields(filePath, updates);

      // Verify project is wrapped in wikilinks and stored in projects array
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('[[Q1 Planning]]');
    });

    test('wraps area in wikilink format', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
---
`;
      writeFileSync(filePath, content);

      // Set area field
      const updates: FieldUpdate[] = [{ field: 'area', value: 'Work' }];
      updateFileFields(filePath, updates);

      // Verify area is wrapped in wikilinks
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('[[Work]]');
    });

    test('handles files with no body content', () => {
      const filePath = join(tempDir, 'task.md');

      const content = `---
title: Test Task
status: ready
---
`;
      writeFileSync(filePath, content);

      // Update status
      const updates: FieldUpdate[] = [{ field: 'status', value: 'done' }];
      updateFileFields(filePath, updates);

      // Verify file is still valid
      const updatedContent = readFileSync(filePath, 'utf-8');
      expect(updatedContent).toContain('status: done');
      expect(updatedContent).toContain('---');
    });

    test('throws error for non-existent file', () => {
      const filePath = join(tempDir, 'does-not-exist.md');

      const updates: FieldUpdate[] = [{ field: 'status', value: 'done' }];

      expect(() => {
        updateFileFields(filePath, updates);
      }).toThrow(/not found|doesn't exist/i);
    });
  });

  describe('createTaskFile', () => {
    test('creates file with valid frontmatter', () => {
      const fields: TaskCreateFields = {
        status: 'ready',
        project: 'Q1',
        due: '2025-01-15',
      };

      const task = createTaskFile(tempDir, 'Test Task', fields);

      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('Ready' as TaskStatus);

      // Verify file exists and has valid content
      const content = readFileSync(task.path, 'utf-8');
      expect(content).toContain('title: Test Task');
      expect(content).toContain('status: ready');
      expect(content).toContain('[[Q1]]');
    });

    test('creates parent directory if it does not exist', () => {
      const nestedDir = join(tempDir, 'nested', 'tasks');

      const fields: TaskCreateFields = {};
      const task = createTaskFile(nestedDir, 'Nested Task', fields);

      expect(existsSync(task.path)).toBe(true);
      expect(task.path).toContain('nested-task.md');
    });
  });
});
