import { describe, test, expect } from 'bun:test';
import { runCli, fixturePath } from '../helpers/cli';

describe('taskdn list', () => {
  describe('default behavior (active tasks)', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['list']);
      expect(exitCode).toBe(0);
    });

    test('lists active tasks in human mode', async () => {
      const { stdout } = await runCli(['list']);
      // Active tasks should be included
      expect(stdout).toContain('Minimal Task');
      expect(stdout).toContain('Full Metadata Task');
    });

    test('excludes done tasks by default', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'done')).toBe(true);
    });

    test('excludes dropped tasks by default', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'dropped')).toBe(true);
    });

    test('excludes icebox tasks by default', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'icebox')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows task count in header', async () => {
      const { stdout } = await runCli(['list']);
      // Should show something like "Tasks (N)"
      expect(stdout).toMatch(/Tasks \(\d+\)/);
    });

    test('shows task titles', async () => {
      const { stdout } = await runCli(['list']);
      expect(stdout).toContain('Minimal Task');
    });

    test('shows task status', async () => {
      const { stdout } = await runCli(['list']);
      // Should show status information
      expect(stdout.toLowerCase()).toMatch(/ready|in-progress|blocked|inbox/);
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['list', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Tasks');
    });

    test('includes path field for each task', async () => {
      const { stdout } = await runCli(['list', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('includes status field for each task', async () => {
      const { stdout } = await runCli(['list', '--ai']);
      expect(stdout).toContain('- **status:**');
    });

    test('uses task title as heading', async () => {
      const { stdout } = await runCli(['list', '--ai']);
      expect(stdout).toContain('### Minimal Task');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['list', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes tasks array', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.tasks)).toBe(true);
    });

    test('each task has required fields', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      for (const task of output.tasks) {
        expect(task.path).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
      }
    });
  });

  describe('empty results', () => {
    test('returns exit code 0 for empty result', async () => {
      // Use a filter that matches nothing
      const { exitCode } = await runCli(['list', '--status', 'nonexistent']);
      expect(exitCode).toBe(0);
    });

    test('JSON mode returns empty array with summary', async () => {
      const { stdout } = await runCli(['list', '--status', 'nonexistent', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks).toEqual([]);
      expect(output.summary).toBeDefined();
    });

    test('AI mode indicates no matches', async () => {
      const { stdout } = await runCli(['list', '--status', 'nonexistent', '--ai']);
      expect(stdout).toContain('Tasks (0)');
    });
  });
});

describe('taskdn list projects', () => {
  describe('default behavior (active projects)', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['list', 'projects']);
      expect(exitCode).toBe(0);
    });

    test('lists active projects in human mode', async () => {
      const { stdout } = await runCli(['list', 'projects']);
      expect(stdout).toContain('Minimal Project');
      expect(stdout).toContain('Projects');
    });

    test('includes projects without status (treated as active)', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      // Project Without Status should be included
      expect(output.projects.some((p: { title: string }) => p.title === 'Project Without Status')).toBe(
        true
      );
    });

    test('excludes done projects', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(output.projects.every((p: { status?: string }) => p.status !== 'done')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows project count in header', async () => {
      const { stdout } = await runCli(['list', 'projects']);
      expect(stdout).toMatch(/Projects \(\d+\)/);
    });

    test('shows project titles', async () => {
      const { stdout } = await runCli(['list', 'projects']);
      expect(stdout).toContain('Minimal Project');
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['list', 'projects', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Projects');
    });

    test('includes path field for each project', async () => {
      const { stdout } = await runCli(['list', 'projects', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('uses project title as heading', async () => {
      const { stdout } = await runCli(['list', 'projects', '--ai']);
      expect(stdout).toContain('### Minimal Project');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['list', 'projects', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes projects array', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.projects)).toBe(true);
    });

    test('each project has required fields', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(output.projects.length).toBeGreaterThan(0);
      for (const project of output.projects) {
        expect(project.path).toBeDefined();
        expect(project.title).toBeDefined();
      }
    });
  });
});

describe('taskdn list areas', () => {
  describe('default behavior (active areas)', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['list', 'areas']);
      expect(exitCode).toBe(0);
    });

    test('lists active areas in human mode', async () => {
      const { stdout } = await runCli(['list', 'areas']);
      expect(stdout).toContain('Minimal Area');
      expect(stdout).toContain('Areas');
    });

    test('includes areas without status (treated as active)', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      // Minimal Area has no status and should be included
      expect(output.areas.some((a: { title: string }) => a.title === 'Minimal Area')).toBe(true);
    });

    test('includes areas with status=active', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      // Full Metadata Area has status: active and should be included
      expect(output.areas.some((a: { title: string }) => a.title === 'Full Metadata Area')).toBe(true);
    });

    test('excludes archived areas', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(output.areas.every((a: { status?: string }) => a.status !== 'archived')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows area count in header', async () => {
      const { stdout } = await runCli(['list', 'areas']);
      expect(stdout).toMatch(/Areas \(\d+\)/);
    });

    test('shows area titles', async () => {
      const { stdout } = await runCli(['list', 'areas']);
      expect(stdout).toContain('Minimal Area');
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['list', 'areas', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Areas');
    });

    test('includes path field for each area', async () => {
      const { stdout } = await runCli(['list', 'areas', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('uses area title as heading', async () => {
      const { stdout } = await runCli(['list', 'areas', '--ai']);
      expect(stdout).toContain('### Minimal Area');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['list', 'areas', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes areas array', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.areas)).toBe(true);
    });

    test('each area has required fields', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(output.areas.length).toBeGreaterThan(0);
      for (const area of output.areas) {
        expect(area.path).toBeDefined();
        expect(area.title).toBeDefined();
      }
    });
  });
});
