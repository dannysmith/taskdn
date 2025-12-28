import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import type { Task, TaskStatus, Area, Project } from '@bindings';

// Date utils tests
import {
  getToday,
  formatDate,
  parseDate,
  getTomorrow,
  getEndOfWeek,
  getStartOfWeek,
  isOverdue,
  isDueToday,
  isScheduledToday,
  isNewlyActionable,
  isDueThisWeek,
  isScheduledThisWeek,
  addDays,
  formatRelativeDate,
  getWeekday,
  parseNaturalDate,
} from '@/output/helpers/date-utils';

// Stats tests
import {
  countTasksByStatus,
  formatTaskCountShorthand,
  getTotalActiveCount,
} from '@/output/helpers/stats';

// Body utils tests
import {
  truncateBody,
  isEmptyBody,
  countWords,
  countLines,
} from '@/output/helpers/body-utils';

// Reference table tests
import {
  collectReferences,
  buildReferenceTable,
  sortReferenceEntries,
} from '@/output/helpers/reference-table';

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

// Helper to create a mock project
function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    path: 'projects/test.md',
    title: 'Test Project',
    body: '',
    ...overrides,
  };
}

// Helper to create a mock area
function createMockArea(overrides: Partial<Area> = {}): Area {
  return {
    path: 'areas/test.md',
    title: 'Test Area',
    body: '',
    ...overrides,
  };
}

describe('date-utils', () => {
  const originalEnv = process.env.TASKDN_MOCK_DATE;

  afterEach(() => {
    if (originalEnv) {
      process.env.TASKDN_MOCK_DATE = originalEnv;
    } else {
      delete process.env.TASKDN_MOCK_DATE;
    }
  });

  describe('getToday', () => {
    test('returns YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('respects TASKDN_MOCK_DATE env var', () => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
      expect(getToday()).toBe('2025-01-15');
    });

    test('ignores invalid mock date format', () => {
      process.env.TASKDN_MOCK_DATE = 'invalid-date';
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(today).not.toBe('invalid-date');
    });
  });

  describe('formatDate', () => {
    test('formats date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDate(date)).toBe('2025-01-15');
    });

    test('pads single digit months and days', () => {
      const date = new Date(2025, 4, 5); // May 5, 2025
      expect(formatDate(date)).toBe('2025-05-05');
    });
  });

  describe('parseDate', () => {
    test('parses YYYY-MM-DD string to Date', () => {
      const date = parseDate('2025-01-15');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });
  });

  describe('getTomorrow', () => {
    test('returns next day', () => {
      expect(getTomorrow('2025-01-15')).toBe('2025-01-16');
    });

    test('handles month boundary', () => {
      expect(getTomorrow('2025-01-31')).toBe('2025-02-01');
    });

    test('handles year boundary', () => {
      expect(getTomorrow('2024-12-31')).toBe('2025-01-01');
    });
  });

  describe('getStartOfWeek', () => {
    test('returns Monday for mid-week date', () => {
      // Wednesday Jan 15, 2025
      expect(getStartOfWeek('2025-01-15')).toBe('2025-01-13');
    });

    test('returns same day for Monday', () => {
      // Monday Jan 13, 2025
      expect(getStartOfWeek('2025-01-13')).toBe('2025-01-13');
    });

    test('returns previous Monday for Sunday', () => {
      // Sunday Jan 19, 2025
      expect(getStartOfWeek('2025-01-19')).toBe('2025-01-13');
    });
  });

  describe('getEndOfWeek', () => {
    test('returns Sunday for mid-week date', () => {
      // Wednesday Jan 15, 2025
      expect(getEndOfWeek('2025-01-15')).toBe('2025-01-19');
    });

    test('returns same day for Sunday', () => {
      // Sunday Jan 19, 2025
      expect(getEndOfWeek('2025-01-19')).toBe('2025-01-19');
    });

    test('returns end of week for Monday', () => {
      // Monday Jan 13, 2025
      expect(getEndOfWeek('2025-01-13')).toBe('2025-01-19');
    });
  });

  describe('isOverdue', () => {
    beforeEach(() => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns true when due is before today', () => {
      const task = createMockTask({ due: '2025-01-10' });
      expect(isOverdue(task)).toBe(true);
    });

    test('returns false when due is today', () => {
      const task = createMockTask({ due: '2025-01-15' });
      expect(isOverdue(task)).toBe(false);
    });

    test('returns false when due is in future', () => {
      const task = createMockTask({ due: '2025-01-20' });
      expect(isOverdue(task)).toBe(false);
    });

    test('returns false when no due date', () => {
      const task = createMockTask({});
      expect(isOverdue(task)).toBe(false);
    });
  });

  describe('isDueToday', () => {
    beforeEach(() => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns true when due is today', () => {
      const task = createMockTask({ due: '2025-01-15' });
      expect(isDueToday(task)).toBe(true);
    });

    test('returns false when due is not today', () => {
      const task = createMockTask({ due: '2025-01-16' });
      expect(isDueToday(task)).toBe(false);
    });

    test('returns false when no due date', () => {
      const task = createMockTask({});
      expect(isDueToday(task)).toBe(false);
    });
  });

  describe('isScheduledToday', () => {
    beforeEach(() => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns true when scheduled is today', () => {
      const task = createMockTask({ scheduled: '2025-01-15' });
      expect(isScheduledToday(task)).toBe(true);
    });

    test('returns false when scheduled is not today', () => {
      const task = createMockTask({ scheduled: '2025-01-16' });
      expect(isScheduledToday(task)).toBe(false);
    });
  });

  describe('isNewlyActionable', () => {
    beforeEach(() => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns true when defer-until is today', () => {
      const task = createMockTask({ deferUntil: '2025-01-15' });
      expect(isNewlyActionable(task)).toBe(true);
    });

    test('returns false when defer-until is not today', () => {
      const task = createMockTask({ deferUntil: '2025-01-16' });
      expect(isNewlyActionable(task)).toBe(false);
    });
  });

  describe('isDueThisWeek', () => {
    beforeEach(() => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns true when due is within 7 days', () => {
      const task = createMockTask({ due: '2025-01-20' });
      expect(isDueThisWeek(task)).toBe(true);
    });

    test('returns false when due is today', () => {
      const task = createMockTask({ due: '2025-01-15' });
      expect(isDueThisWeek(task)).toBe(false);
    });

    test('returns false when due is beyond 7 days', () => {
      const task = createMockTask({ due: '2025-01-25' });
      expect(isDueThisWeek(task)).toBe(false);
    });
  });

  describe('addDays', () => {
    test('adds days correctly', () => {
      expect(addDays('2025-01-15', 5)).toBe('2025-01-20');
    });

    test('handles negative days', () => {
      expect(addDays('2025-01-15', -5)).toBe('2025-01-10');
    });
  });

  describe('formatRelativeDate', () => {
    beforeEach(() => {
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns "today" for today\'s date', () => {
      expect(formatRelativeDate('2025-01-15')).toBe('today');
    });

    test('returns "Tomorrow" with weekday for tomorrow', () => {
      const result = formatRelativeDate('2025-01-16');
      expect(result).toContain('Tomorrow');
      expect(result).toContain('Thu');
    });

    test('returns month and day for other dates', () => {
      const result = formatRelativeDate('2025-01-20');
      expect(result).toBe('Jan 20');
    });
  });

  describe('getWeekday', () => {
    test('returns full weekday name', () => {
      expect(getWeekday('2025-01-15')).toBe('Wednesday');
      expect(getWeekday('2025-01-13')).toBe('Monday');
      expect(getWeekday('2025-01-19')).toBe('Sunday');
    });
  });

  describe('parseNaturalDate', () => {
    beforeEach(() => {
      // 2025-01-15 is a Wednesday
      process.env.TASKDN_MOCK_DATE = '2025-01-15';
    });

    test('returns ISO format dates unchanged', () => {
      expect(parseNaturalDate('2025-01-20')).toBe('2025-01-20');
      expect(parseNaturalDate('2024-12-31')).toBe('2024-12-31');
    });

    test('parses "today"', () => {
      expect(parseNaturalDate('today')).toBe('2025-01-15');
      expect(parseNaturalDate('Today')).toBe('2025-01-15');
      expect(parseNaturalDate('TODAY')).toBe('2025-01-15');
    });

    test('parses "tomorrow"', () => {
      expect(parseNaturalDate('tomorrow')).toBe('2025-01-16');
      expect(parseNaturalDate('Tomorrow')).toBe('2025-01-16');
    });

    test('parses weekday names (next occurrence)', () => {
      // 2025-01-15 is Wednesday
      // Thursday = 2025-01-16
      expect(parseNaturalDate('thursday')).toBe('2025-01-16');
      expect(parseNaturalDate('Thursday')).toBe('2025-01-16');
      expect(parseNaturalDate('thu')).toBe('2025-01-16');

      // Friday = 2025-01-17
      expect(parseNaturalDate('friday')).toBe('2025-01-17');
      expect(parseNaturalDate('fri')).toBe('2025-01-17');

      // Saturday = 2025-01-18
      expect(parseNaturalDate('saturday')).toBe('2025-01-18');
      expect(parseNaturalDate('sat')).toBe('2025-01-18');

      // Sunday = 2025-01-19
      expect(parseNaturalDate('sunday')).toBe('2025-01-19');
      expect(parseNaturalDate('sun')).toBe('2025-01-19');

      // Monday = 2025-01-20 (next week)
      expect(parseNaturalDate('monday')).toBe('2025-01-20');
      expect(parseNaturalDate('mon')).toBe('2025-01-20');

      // Tuesday = 2025-01-21
      expect(parseNaturalDate('tuesday')).toBe('2025-01-21');
      expect(parseNaturalDate('tue')).toBe('2025-01-21');

      // Wednesday = 2025-01-22 (next week, not today)
      expect(parseNaturalDate('wednesday')).toBe('2025-01-22');
      expect(parseNaturalDate('wed')).toBe('2025-01-22');
    });

    test('parses relative days (+Nd)', () => {
      expect(parseNaturalDate('+1d')).toBe('2025-01-16');
      expect(parseNaturalDate('+3d')).toBe('2025-01-18');
      expect(parseNaturalDate('+7d')).toBe('2025-01-22');
      expect(parseNaturalDate('+10d')).toBe('2025-01-25');
    });

    test('parses relative weeks (+Nw)', () => {
      expect(parseNaturalDate('+1w')).toBe('2025-01-22');
      expect(parseNaturalDate('+2w')).toBe('2025-01-29');
    });

    test('parses "next week" as Monday of next week', () => {
      // From Wednesday 2025-01-15, next Monday is 2025-01-20
      expect(parseNaturalDate('next week')).toBe('2025-01-20');
      expect(parseNaturalDate('nextweek')).toBe('2025-01-20');
    });

    test('handles whitespace', () => {
      expect(parseNaturalDate('  tomorrow  ')).toBe('2025-01-16');
      expect(parseNaturalDate('  +3d  ')).toBe('2025-01-18');
    });

    test('returns null for unrecognized input', () => {
      expect(parseNaturalDate('invalid')).toBeNull();
      expect(parseNaturalDate('next month')).toBeNull();
      expect(parseNaturalDate('2025/01/15')).toBeNull();
      expect(parseNaturalDate('')).toBeNull();
    });
  });
});

describe('stats', () => {
  describe('countTasksByStatus', () => {
    test('counts tasks by status correctly', () => {
      const tasks = [
        createMockTask({ status: 'InProgress' as TaskStatus }),
        createMockTask({ status: 'InProgress' as TaskStatus }),
        createMockTask({ status: 'Ready' as TaskStatus }),
        createMockTask({ status: 'Inbox' as TaskStatus }),
        createMockTask({ status: 'Blocked' as TaskStatus }),
        createMockTask({ status: 'Done' as TaskStatus }), // Should be ignored
      ];

      const counts = countTasksByStatus(tasks);
      expect(counts.inProgress).toBe(2);
      expect(counts.ready).toBe(1);
      expect(counts.inbox).toBe(1);
      expect(counts.blocked).toBe(1);
    });

    test('returns zeros for empty array', () => {
      const counts = countTasksByStatus([]);
      expect(counts.inProgress).toBe(0);
      expect(counts.ready).toBe(0);
      expect(counts.inbox).toBe(0);
      expect(counts.blocked).toBe(0);
    });
  });

  describe('formatTaskCountShorthand', () => {
    test('formats counts with emojis', () => {
      const result = formatTaskCountShorthand({
        inProgress: 2,
        ready: 4,
        inbox: 1,
        blocked: 1,
      });
      expect(result).toBe('(2▶️ 4🟢 1📥 1🚫)');
    });

    test('omits zero counts', () => {
      const result = formatTaskCountShorthand({
        inProgress: 2,
        ready: 0,
        inbox: 1,
        blocked: 0,
      });
      expect(result).toBe('(2▶️ 1📥)');
    });

    test('returns empty string for all zeros', () => {
      const result = formatTaskCountShorthand({
        inProgress: 0,
        ready: 0,
        inbox: 0,
        blocked: 0,
      });
      expect(result).toBe('');
    });
  });

  describe('getTotalActiveCount', () => {
    test('sums all status counts', () => {
      const total = getTotalActiveCount({
        inProgress: 2,
        ready: 4,
        inbox: 1,
        blocked: 1,
      });
      expect(total).toBe(8);
    });
  });
});

describe('body-utils', () => {
  describe('truncateBody', () => {
    test('returns empty string for empty body', () => {
      expect(truncateBody('')).toBe('');
      expect(truncateBody(undefined)).toBe('');
      expect(truncateBody('   ')).toBe('');
    });

    test('returns body as-is when under limits', () => {
      const body = 'Short body text';
      expect(truncateBody(body)).toBe(body);
    });

    test('truncates by line count', () => {
      const lines = Array(25).fill('Line').join('\n');
      const result = truncateBody(lines, 20);
      const resultLines = result.split('\n');
      expect(resultLines.length).toBeLessThanOrEqual(20);
    });

    test('truncates by word count', () => {
      const words = Array(250).fill('word').join(' ');
      const result = truncateBody(words, 100, 200);
      const resultWords = result.split(/\s+/);
      expect(resultWords.length).toBeLessThanOrEqual(200);
    });
  });

  describe('isEmptyBody', () => {
    test('returns true for empty or whitespace', () => {
      expect(isEmptyBody('')).toBe(true);
      expect(isEmptyBody(undefined)).toBe(true);
      expect(isEmptyBody('   ')).toBe(true);
      expect(isEmptyBody('\n\n')).toBe(true);
    });

    test('returns false for content', () => {
      expect(isEmptyBody('content')).toBe(false);
    });
  });

  describe('countWords', () => {
    test('counts words correctly', () => {
      expect(countWords('one two three')).toBe(3);
      expect(countWords('one')).toBe(1);
      expect(countWords('')).toBe(0);
      expect(countWords(undefined)).toBe(0);
    });
  });

  describe('countLines', () => {
    test('counts lines correctly', () => {
      expect(countLines('one\ntwo\nthree')).toBe(3);
      expect(countLines('one')).toBe(1);
      expect(countLines('')).toBe(0);
      expect(countLines(undefined)).toBe(0);
    });
  });
});

describe('reference-table', () => {
  describe('collectReferences', () => {
    test('collects areas, projects, and tasks', () => {
      const refs = collectReferences({
        areas: [createMockArea({ title: 'Work', path: 'areas/work.md' })],
        projects: [createMockProject({ title: 'Q1', path: 'projects/q1.md' })],
        tasks: [createMockTask({ title: 'Fix bug', path: 'tasks/fix-bug.md' })],
      });

      expect(refs).toHaveLength(3);
      expect(refs[0]).toEqual({
        name: 'Work',
        type: 'area',
        path: 'areas/work.md',
      });
      expect(refs[1]).toEqual({
        name: 'Q1',
        type: 'project',
        path: 'projects/q1.md',
      });
      expect(refs[2]).toEqual({
        name: 'Fix bug',
        type: 'task',
        path: 'tasks/fix-bug.md',
      });
    });

    test('deduplicates by path', () => {
      const refs = collectReferences({
        tasks: [
          createMockTask({ title: 'Task 1', path: 'tasks/same.md' }),
          createMockTask({ title: 'Task 2', path: 'tasks/same.md' }),
        ],
      });

      expect(refs).toHaveLength(1);
    });
  });

  describe('buildReferenceTable', () => {
    test('builds markdown table', () => {
      const refs = [
        { name: 'Work', type: 'area' as const, path: 'areas/work.md' },
        { name: 'Q1', type: 'project' as const, path: 'projects/q1.md' },
      ];

      const table = buildReferenceTable(refs);
      expect(table).toContain('| Entity | Type | Path |');
      expect(table).toContain('| Work | area | areas/work.md |');
      expect(table).toContain('| Q1 | project | projects/q1.md |');
    });

    test('returns empty string for empty entries', () => {
      expect(buildReferenceTable([])).toBe('');
    });

    test('escapes pipe characters in names', () => {
      const refs = [
        { name: 'Task | with pipe', type: 'task' as const, path: 'tasks/t.md' },
      ];

      const table = buildReferenceTable(refs);
      expect(table).toContain('Task \\| with pipe');
    });
  });

  describe('sortReferenceEntries', () => {
    test('sorts by type priority then name', () => {
      const refs = [
        { name: 'Task B', type: 'task' as const, path: 't2.md' },
        { name: 'Area A', type: 'area' as const, path: 'a1.md' },
        { name: 'Project C', type: 'project' as const, path: 'p1.md' },
        { name: 'Task A', type: 'task' as const, path: 't1.md' },
      ];

      const sorted = sortReferenceEntries(refs);
      expect(sorted).toHaveLength(4);
      expect(sorted[0]!.name).toBe('Area A');
      expect(sorted[1]!.name).toBe('Project C');
      expect(sorted[2]!.name).toBe('Task A');
      expect(sorted[3]!.name).toBe('Task B');
    });
  });
});
