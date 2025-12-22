import { describe, test, expect } from 'bun:test';
import { humanFormatter } from '@/output/human';
import { aiFormatter } from '@/output/ai';
import { jsonFormatter } from '@/output/json';
import { getOutputMode } from '@/output/types';
import type { Task, TaskStatus } from '@bindings';
import type { TaskResult } from '@/output/types';

// Helper to create a mock task
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    path: '/path/to/task.md',
    title: 'Test Task',
    status: 'Ready' as TaskStatus,
    body: '',
    ...overrides,
  };
}

// Helper to create a task result
function createTaskResult(task: Task): TaskResult {
  return { type: 'task', task };
}

// Helper to strip ANSI codes for testing human formatter
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

describe('getOutputMode', () => {
  test('returns json when --json flag is set', () => {
    expect(getOutputMode({ json: true })).toBe('json');
  });

  test('returns ai when --ai flag is set', () => {
    expect(getOutputMode({ ai: true })).toBe('ai');
  });

  test('returns human by default', () => {
    expect(getOutputMode({})).toBe('human');
  });

  test('prefers json over ai when both are set', () => {
    expect(getOutputMode({ json: true, ai: true })).toBe('json');
  });
});

describe('humanFormatter', () => {
  test('includes task title', () => {
    const task = createMockTask({ title: 'My Important Task' });
    const result = humanFormatter.format(createTaskResult(task));
    expect(stripAnsi(result)).toContain('My Important Task');
  });

  test('includes task status', () => {
    const task = createMockTask({ status: 'InProgress' as TaskStatus });
    const result = humanFormatter.format(createTaskResult(task));
    expect(stripAnsi(result)).toContain('in-progress');
  });

  test('includes due date when present', () => {
    const task = createMockTask({ due: '2025-01-20' });
    const result = humanFormatter.format(createTaskResult(task));
    expect(stripAnsi(result)).toContain('Due:');
    expect(stripAnsi(result)).toContain('2025-01-20');
  });

  test('includes project when present', () => {
    const task = createMockTask({ project: 'Test Project' });
    const result = humanFormatter.format(createTaskResult(task));
    expect(stripAnsi(result)).toContain('Project:');
    expect(stripAnsi(result)).toContain('Test Project');
  });

  test('includes body when present', () => {
    const task = createMockTask({ body: 'Task body content here' });
    const result = humanFormatter.format(createTaskResult(task));
    expect(stripAnsi(result)).toContain('Task body content here');
  });

  test('omits optional fields when not present', () => {
    const task = createMockTask();
    const result = humanFormatter.format(createTaskResult(task));
    expect(stripAnsi(result)).not.toContain('Due:');
    expect(stripAnsi(result)).not.toContain('Project:');
    expect(stripAnsi(result)).not.toContain('Area:');
  });
});

describe('aiFormatter', () => {
  test('formats title as h2 heading', () => {
    const task = createMockTask({ title: 'AI Test Task' });
    const result = aiFormatter.format(createTaskResult(task));
    expect(result).toContain('## AI Test Task');
  });

  test('includes status in structured format', () => {
    const task = createMockTask({ status: 'Blocked' as TaskStatus });
    const result = aiFormatter.format(createTaskResult(task));
    expect(result).toContain('- **status:** blocked');
  });

  test('includes path in structured format', () => {
    const task = createMockTask({ path: '/my/task/path.md' });
    const result = aiFormatter.format(createTaskResult(task));
    expect(result).toContain('- **path:** /my/task/path.md');
  });

  test('includes optional fields when present', () => {
    const task = createMockTask({
      due: '2025-01-20',
      project: 'Test Project',
      area: 'Work',
    });
    const result = aiFormatter.format(createTaskResult(task));
    expect(result).toContain('- **due:** 2025-01-20');
    expect(result).toContain('- **project:** Test Project');
    expect(result).toContain('- **area:** Work');
  });

  test('includes body under separate heading', () => {
    const task = createMockTask({ body: 'Body content here' });
    const result = aiFormatter.format(createTaskResult(task));
    expect(result).toContain('### Body');
    expect(result).toContain('Body content here');
  });

  test('omits body section when body is empty', () => {
    const task = createMockTask({ body: '' });
    const result = aiFormatter.format(createTaskResult(task));
    expect(result).not.toContain('### Body');
  });
});

describe('jsonFormatter', () => {
  test('outputs valid JSON', () => {
    const task = createMockTask();
    const result = jsonFormatter.format(createTaskResult(task));
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test('includes summary field', () => {
    const task = createMockTask({ title: 'JSON Test Task' });
    const result = jsonFormatter.format(createTaskResult(task));
    const parsed = JSON.parse(result);
    expect(parsed.summary).toBe('Task: JSON Test Task');
  });

  test('includes task object with all required fields', () => {
    const task = createMockTask({
      path: '/test/path.md',
      title: 'Test Title',
      status: 'Ready' as TaskStatus,
    });
    const result = jsonFormatter.format(createTaskResult(task));
    const parsed = JSON.parse(result);
    expect(parsed.task.path).toBe('/test/path.md');
    expect(parsed.task.title).toBe('Test Title');
    expect(parsed.task.status).toBe('ready');
  });

  test('includes optional fields when present', () => {
    const task = createMockTask({
      due: '2025-01-20',
      scheduled: '2025-01-18',
      project: 'Test Project',
      area: 'Work',
    });
    const result = jsonFormatter.format(createTaskResult(task));
    const parsed = JSON.parse(result);
    expect(parsed.task.due).toBe('2025-01-20');
    expect(parsed.task.scheduled).toBe('2025-01-18');
    expect(parsed.task.project).toBe('Test Project');
    expect(parsed.task.area).toBe('Work');
  });

  test('omits optional fields when not present', () => {
    const task = createMockTask();
    const result = jsonFormatter.format(createTaskResult(task));
    const parsed = JSON.parse(result);
    expect(parsed.task.due).toBeUndefined();
    expect(parsed.task.project).toBeUndefined();
    expect(parsed.task.area).toBeUndefined();
  });

  test('converts status to kebab-case', () => {
    const task = createMockTask({ status: 'InProgress' as TaskStatus });
    const result = jsonFormatter.format(createTaskResult(task));
    const parsed = JSON.parse(result);
    expect(parsed.task.status).toBe('in-progress');
  });
});
