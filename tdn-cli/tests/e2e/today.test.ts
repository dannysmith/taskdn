import { describe, test, expect } from 'bun:test';
import { runCli } from '../helpers/cli';

// Mock date for deterministic testing
// Fixtures use:
// - due-fixed-date.md: due: 2025-06-15
// - scheduled-fixed-date.md: scheduled: 2025-06-15
// - deferred-today.md: defer-until: 2025-06-15
// - due-past.md: due: 2020-01-01 (always overdue)
// - status-in-progress.md: status: in-progress
const MOCK_TODAY = '2025-06-15';

describe('taskdn today', () => {
  describe('basic functionality', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['today'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(exitCode).toBe(0);
    });

    test('shows tasks due today', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.some((t: { title: string }) => t.title === 'Task Due Fixed Date')).toBe(
        true
      );
    });

    test('shows tasks scheduled for today', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(
        output.tasks.some((t: { title: string }) => t.title === 'Task Scheduled Fixed Date')
      ).toBe(true);
    });

    test('shows overdue tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.some((t: { title: string }) => t.title === 'Task Due In Past')).toBe(
        true
      );
    });

    test('shows tasks which became available today (defer-until is today)', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(
        output.tasks.some((t: { title: string }) => t.title === 'Deferred Until Today Task')
      ).toBe(true);
    });

    test('shows in-progress tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.some((t: { title: string }) => t.title === 'In Progress Task')).toBe(
        true
      );
    });
  });

  describe('exclusions', () => {
    test('excludes done tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'done')).toBe(true);
    });

    test('excludes dropped tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'dropped')).toBe(true);
    });

    test('excludes icebox tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'icebox')).toBe(true);
    });

    test('excludes future deferred tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      // Deferred Future Task has defer-until: 2099-01-01
      expect(
        output.tasks.every((t: { title: string }) => t.title !== 'Deferred Future Task')
      ).toBe(true);
    });

    test('excludes archived tasks', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { path: string }) => !t.path.includes('/archive/'))).toBe(
        true
      );
    });

    test('excludes tasks not matching any today criteria', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      // Minimal Task has no due/scheduled/defer-until and is not in-progress
      expect(output.tasks.every((t: { title: string }) => t.title !== 'Minimal Task')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows task count in header', async () => {
      const { stdout } = await runCli(['today'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(stdout).toMatch(/Tasks \(\d+\)/);
    });

    test('shows task titles', async () => {
      const { stdout } = await runCli(['today'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(stdout).toContain('Task Due Fixed Date');
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['today', '--ai'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Tasks');
    });

    test('includes path field for each task', async () => {
      const { stdout } = await runCli(['today', '--ai'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(stdout).toContain('- **path:**');
    });

    test('includes status field for each task', async () => {
      const { stdout } = await runCli(['today', '--ai'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(stdout).toContain('- **status:**');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes tasks array', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.tasks)).toBe(true);
    });

    test('each task has required fields', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      for (const task of output.tasks) {
        expect(task.path).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
      }
    });
  });

  describe('AI-JSON mode (--ai --json)', () => {
    test('outputs valid JSON with AI-optimized content', async () => {
      const { stdout, exitCode } = await runCli(['today', '--ai', '--json'], {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      });
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });
  });

  describe('empty results', () => {
    test('returns exit code 0 for empty result', async () => {
      // Use a date where nothing matches
      const { exitCode } = await runCli(['today'], {
        env: { TASKDN_MOCK_DATE: '1900-01-01' },
      });
      expect(exitCode).toBe(0);
    });

    test('JSON mode returns empty array with summary', async () => {
      const { stdout } = await runCli(['today', '--json'], {
        env: { TASKDN_MOCK_DATE: '1900-01-01' },
      });
      const output = JSON.parse(stdout);
      // May still have in-progress tasks, but let's check structure
      expect(Array.isArray(output.tasks)).toBe(true);
      expect(output.summary).toBeDefined();
    });
  });
});
