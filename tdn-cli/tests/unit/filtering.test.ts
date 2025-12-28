import { describe, test, expect } from 'bun:test';
import { filterByStatus, sortEntities, filterByQuery, limitResults } from '@/lib/filtering';
import type { Task, Project, Area, TaskStatus } from '@bindings';

// Helper to create mock entities
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    path: '/path/to/task.md',
    title: 'Test Task',
    status: 'Ready' as TaskStatus,
    body: '',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  } as Task;
}

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    path: '/path/to/project.md',
    title: 'Test Project',
    status: 'Active',
    description: '',
    ...overrides,
  } as Project;
}

function createMockArea(overrides: Partial<Area> = {}): Area {
  return {
    path: '/path/to/area.md',
    title: 'Test Area',
    status: 'Active',
    description: '',
    ...overrides,
  } as Area;
}

describe('filterByStatus', () => {
  test('filters by single status', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: "Ready" as TaskStatus }),
      createMockTask({ title: 'Task 2', status: "Done" as TaskStatus }),
      createMockTask({ title: 'Task 3', status: "Ready" as TaskStatus }),
    ];

    const result = filterByStatus(tasks, 'ready');
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('Task 1');
    expect(result[1]?.title).toBe('Task 3');
  });

  test('filters by multiple statuses (comma-separated)', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: "Ready" as TaskStatus }),
      createMockTask({ title: 'Task 2', status: "Done" as TaskStatus }),
      createMockTask({ title: 'Task 3', status: "InProgress" as TaskStatus }),
      createMockTask({ title: 'Task 4', status: "Blocked" as TaskStatus }),
    ];

    const result = filterByStatus(tasks, 'ready,done');
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
  });

  test('handles kebab-case normalization', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: "InProgress" as TaskStatus }),
      createMockTask({ title: 'Task 2', status: "Ready" as TaskStatus }),
    ];

    const result = filterByStatus(tasks, 'in-progress');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Task 1');
  });

  test('handles PascalCase normalization', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: "InProgress" as TaskStatus }),
      createMockTask({ title: 'Task 2', status: "Ready" as TaskStatus }),
    ];

    const result = filterByStatus(tasks, 'inprogress');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Task 1');
  });

  test('filters out entities without status', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: "Ready" as TaskStatus }),
      createMockTask({ title: 'Task 2', status: undefined }),
    ];

    const result = filterByStatus(tasks, 'ready');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Task 1');
  });

  test('is case-insensitive', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: "Ready" as TaskStatus }),
      createMockTask({ title: 'Task 2', status: "Ready" as TaskStatus }),
      createMockTask({ title: 'Task 3', status: "Ready" as TaskStatus }),
    ];

    const result = filterByStatus(tasks, 'READY');
    expect(result).toHaveLength(3);
  });
});

describe('sortEntities', () => {
  test('sorts strings in ascending order', () => {
    const tasks = [
      createMockTask({ title: 'Zebra' }),
      createMockTask({ title: 'Apple' }),
      createMockTask({ title: 'Mango' }),
    ];

    const result = sortEntities(tasks, 'title', false);
    expect(result.map((t) => t.title)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  test('sorts strings in descending order', () => {
    const tasks = [
      createMockTask({ title: 'Zebra' }),
      createMockTask({ title: 'Apple' }),
      createMockTask({ title: 'Mango' }),
    ];

    const result = sortEntities(tasks, 'title', true);
    expect(result.map((t) => t.title)).toEqual(['Zebra', 'Mango', 'Apple']);
  });

  test('sorts dates correctly', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', due: '2025-03-15' }),
      createMockTask({ title: 'Task 2', due: '2025-01-10' }),
      createMockTask({ title: 'Task 3', due: '2025-02-20' }),
    ];

    const result = sortEntities(tasks, 'due', false);
    expect(result.map((t) => t.title)).toEqual(['Task 2', 'Task 3', 'Task 1']);
  });

  test('puts undefined values last in ascending order', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', due: '2025-03-15' }),
      createMockTask({ title: 'Task 2', due: undefined }),
      createMockTask({ title: 'Task 3', due: '2025-01-10' }),
    ];

    const result = sortEntities(tasks, 'due', false);
    expect(result.map((t) => t.title)).toEqual(['Task 3', 'Task 1', 'Task 2']);
  });

  test('puts undefined values last in descending order', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', due: '2025-03-15' }),
      createMockTask({ title: 'Task 2', due: undefined }),
      createMockTask({ title: 'Task 3', due: '2025-01-10' }),
    ];

    const result = sortEntities(tasks, 'due', true);
    expect(result.map((t) => t.title)).toEqual(['Task 1', 'Task 3', 'Task 2']);
  });

  test('is case-insensitive for strings', () => {
    const tasks = [
      createMockTask({ title: 'zebra' }),
      createMockTask({ title: 'Apple' }),
      createMockTask({ title: 'MANGO' }),
    ];

    const result = sortEntities(tasks, 'title', false);
    expect(result.map((t) => t.title)).toEqual(['Apple', 'MANGO', 'zebra']);
  });
});

describe('filterByQuery', () => {
  test('filters by single field (title)', () => {
    const tasks = [
      createMockTask({ title: 'Urgent bug fix', body: 'Details here' }),
      createMockTask({ title: 'Regular task', body: 'Some urgent work' }),
      createMockTask({ title: 'Another task', body: 'Details' }),
    ];

    const result = filterByQuery(tasks, 'urgent', ['title']);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Urgent bug fix');
  });

  test('filters by multiple fields (title and body)', () => {
    const tasks = [
      createMockTask({ title: 'Urgent bug fix', body: 'Details here' }),
      createMockTask({ title: 'Regular task', body: 'Some urgent work' }),
      createMockTask({ title: 'Another task', body: 'Details' }),
    ];

    const result = filterByQuery(tasks, 'urgent', ['title', 'body']);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title)).toEqual(['Urgent bug fix', 'Regular task']);
  });

  test('is case-insensitive', () => {
    const tasks = [
      createMockTask({ title: 'URGENT bug fix', body: 'Details' }),
      createMockTask({ title: 'Regular task', body: 'Some URGENT work' }),
    ];

    const result = filterByQuery(tasks, 'urgent', ['title', 'body']);
    expect(result).toHaveLength(2);
  });

  test('performs substring match', () => {
    const tasks = [
      createMockTask({ title: 'Task about authentication', body: '' }),
      createMockTask({ title: 'Task about authorization', body: '' }),
      createMockTask({ title: 'Unrelated task', body: '' }),
    ];

    const result = filterByQuery(tasks, 'auth', ['title']);
    expect(result).toHaveLength(2);
  });

  test('returns empty array when no matches', () => {
    const tasks = [
      createMockTask({ title: 'Task 1', body: 'Content 1' }),
      createMockTask({ title: 'Task 2', body: 'Content 2' }),
    ];

    const result = filterByQuery(tasks, 'nonexistent', ['title', 'body']);
    expect(result).toHaveLength(0);
  });

  test('handles undefined field values gracefully', () => {
    const projects = [
      createMockProject({ title: 'Project 1', description: 'Has description' }),
      createMockProject({ title: 'Project 2', description: undefined }),
    ];

    const result = filterByQuery(projects, 'description', ['title', 'description']);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Project 1');
  });
});

describe('limitResults', () => {
  test('limits results to specified number', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
      createMockTask({ title: 'Task 3' }),
      createMockTask({ title: 'Task 4' }),
      createMockTask({ title: 'Task 5' }),
    ];

    const result = limitResults(tasks, '3');
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3']);
  });

  test('returns all results if limit is greater than array length', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ];

    const result = limitResults(tasks, '10');
    expect(result).toHaveLength(2);
  });

  test('handles limit of 1', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ];

    const result = limitResults(tasks, '1');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Task 1');
  });

  test('returns original array for invalid limit (NaN)', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ];

    const result = limitResults(tasks, 'invalid');
    expect(result).toHaveLength(2);
  });

  test('returns original array for negative limit', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ];

    const result = limitResults(tasks, '-5');
    expect(result).toHaveLength(2);
  });

  test('returns original array for zero limit', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ];

    const result = limitResults(tasks, '0');
    expect(result).toHaveLength(2);
  });
});
