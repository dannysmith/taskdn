import { describe, test, expect } from 'bun:test';
import { processBatch } from '@/lib/batch';
import { createError } from '@/errors/index.ts';
import type { Task } from '@bindings';

// Helper to create a mock task
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    path: '/path/to/task.md',
    title: 'Test Task',
    status: 'Ready',
    body: '',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  } as Task;
}

describe('processBatch', () => {
  test('processes all items successfully', async () => {
    const items = ['/task1.md', '/task2.md', '/task3.md'];

    const result = await processBatch(
      items,
      'status-changed',
      (path) => {
        const task = createMockTask({ path, title: `Task ${path}` });
        return { path, title: task.title, task };
      },
      (path) => path
    );

    expect(result.type).toBe('batch-result');
    expect(result.operation).toBe('status-changed');
    expect(result.successes).toHaveLength(3);
    expect(result.failures).toHaveLength(0);
    expect(result.successes[0]?.title).toBe('Task /task1.md');
    expect(result.successes[1]?.title).toBe('Task /task2.md');
    expect(result.successes[2]?.title).toBe('Task /task3.md');
  });

  test('handles all failures', async () => {
    const items = ['/task1.md', '/task2.md'];

    const result = await processBatch(
      items,
      'status-changed',
      (path) => {
        throw createError.notFound('task', path);
      },
      (path) => path
    );

    expect(result.type).toBe('batch-result');
    expect(result.operation).toBe('status-changed');
    expect(result.successes).toHaveLength(0);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]?.code).toBe('NOT_FOUND');
    expect(result.failures[0]?.path).toBe('/task1.md');
    expect(result.failures[1]?.code).toBe('NOT_FOUND');
    expect(result.failures[1]?.path).toBe('/task2.md');
  });

  test('handles mixed success and failure', async () => {
    const items = ['/task1.md', '/task2.md', '/task3.md', '/task4.md'];

    const result = await processBatch(
      items,
      'status-changed',
      (path) => {
        if (path === '/task2.md' || path === '/task4.md') {
          throw createError.notFound('task', path);
        }
        const task = createMockTask({ path, title: `Task ${path}` });
        return { path, title: task.title, task };
      },
      (path) => path
    );

    expect(result.successes).toHaveLength(2);
    expect(result.failures).toHaveLength(2);
    expect(result.successes[0]?.path).toBe('/task1.md');
    expect(result.successes[1]?.path).toBe('/task3.md');
    expect(result.failures[0]?.path).toBe('/task2.md');
    expect(result.failures[1]?.path).toBe('/task4.md');
  });

  test('handles CLI errors correctly', async () => {
    const items = ['/task1.md'];

    const result = await processBatch(
      items,
      'archived',
      (path) => {
        throw createError.ambiguous('Multiple matches found', ['/a.md', '/b.md']);
      },
      (path) => path
    );

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.code).toBe('AMBIGUOUS');
    expect(result.failures[0]?.message).toContain('Multiple matches found');
  });

  test('handles non-CLI errors with UNKNOWN code', async () => {
    const items = ['/task1.md'];

    const result = await processBatch(
      items,
      'status-changed',
      (path) => {
        throw new Error('Unexpected error');
      },
      (path) => path
    );

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.code).toBe('UNKNOWN');
    expect(result.failures[0]?.message).toBe('Error: Unexpected error');
  });

  test('works with different operations', async () => {
    const operations: Array<'completed' | 'dropped' | 'status-changed' | 'updated' | 'archived'> = [
      'completed',
      'dropped',
      'status-changed',
      'updated',
      'archived',
    ];

    for (const operation of operations) {
      const result = await processBatch(
        ['/task.md'],
        operation,
        (path) => {
          const task = createMockTask({ path });
          return { path, title: task.title, task };
        },
        (path) => path
      );

      expect(result.operation).toBe(operation);
    }
  });

  test('includes optional fields in success info', async () => {
    const items = ['/task1.md'];

    const result = await processBatch(
      items,
      'archived',
      (path) => {
        const task = createMockTask({ path, title: 'Archived Task' });
        return {
          path,
          title: task.title,
          task,
          toPath: '/archive/task1.md',
        };
      },
      (path) => path
    );

    expect(result.successes).toHaveLength(1);
    expect(result.successes[0]?.toPath).toBe('/archive/task1.md');
    expect(result.successes[0]?.task).toBeDefined();
  });

  test('uses custom path extractor for error reporting', async () => {
    interface TaskInput {
      id: string;
      path: string;
    }

    const items: TaskInput[] = [
      { id: '1', path: '/task1.md' },
      { id: '2', path: '/task2.md' },
    ];

    const result = await processBatch(
      items,
      'status-changed',
      (item) => {
        if (item.id === '2') {
          throw createError.notFound('task', item.path);
        }
        return { path: item.path, title: `Task ${item.id}` };
      },
      (item) => item.path
    );

    expect(result.successes).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.path).toBe('/task2.md');
  });

  test('handles empty input array', async () => {
    const result = await processBatch(
      [],
      'status-changed',
      (path) => ({ path, title: 'Test' }),
      (path) => path
    );

    expect(result.successes).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  test('preserves error messages from CLI errors', async () => {
    const items = ['/task1.md'];

    const result = await processBatch(
      items,
      'status-changed',
      (path) => {
        throw createError.invalidStatus('invalid-status', ['Ready', 'InProgress', 'Done']);
      },
      (path) => path
    );

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.code).toBe('INVALID_STATUS');
    expect(result.failures[0]?.message).toContain('Invalid status');
  });
});
