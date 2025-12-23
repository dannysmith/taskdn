import { describe, test, expect } from 'bun:test';
import { runCli, fixturePath } from '../helpers/cli';

describe('context task', () => {
  describe('with full-metadata task (has project and area)', () => {
    const taskPath = fixturePath('vault/tasks/full-metadata.md');

    test('returns task details', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Full Metadata Task');
    });

    test('includes parent project', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Test Project');
    });

    test('includes parent area', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Work');
    });
  });

  describe('with direct area task (no project)', () => {
    const taskPath = fixturePath('vault/tasks/in-work-direct.md');

    test('returns task with area but no project', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Direct Work Task');
      expect(stdout).toContain('Work');
    });
  });

  describe('with minimal task (no parents)', () => {
    const taskPath = fixturePath('vault/tasks/minimal.md');

    test('handles task with no parents', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Task');
    });
  });

  describe('with --ai flag', () => {
    const taskPath = fixturePath('vault/tasks/full-metadata.md');

    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Task: Full Metadata Task');
      expect(stdout).toContain('- **path:**');
      expect(stdout).toContain('- **status:** in-progress');
    });

    test('includes body for primary entity', async () => {
      // Note: full-metadata.md has no body, use with-body.md
      const bodyTaskPath = fixturePath('vault/tasks/with-body.md');
      const { stdout, exitCode } = await runCli(['context', 'task', bodyTaskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Body');
    });

    test('shows parent project section', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Project');
      expect(stdout).toContain('### Test Project');
    });

    test('shows parent area section', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Area');
      expect(stdout).toContain('### Work');
    });
  });

  describe('with --json flag', () => {
    const taskPath = fixturePath('vault/tasks/full-metadata.md');

    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain('Full Metadata Task');
    });

    test('includes task object with body', async () => {
      const bodyTaskPath = fixturePath('vault/tasks/with-body.md');
      const { stdout } = await runCli(['context', 'task', bodyTaskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.task.title).toBe('Task With Body');
      expect(output.task.body).toBeDefined();
    });

    test('includes project object', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.project).toBeDefined();
      expect(output.project.title).toBe('Test Project');
    });

    test('includes area object', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.area).toBeDefined();
      expect(output.area.title).toBe('Work');
    });

    test('omits project when task has no project', async () => {
      const minimalPath = fixturePath('vault/tasks/minimal.md');
      const { stdout } = await runCli(['context', 'task', minimalPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.project).toBeUndefined();
    });
  });

  describe('task not found', () => {
    test('exits with code 1', async () => {
      const { exitCode } = await runCli(['context', 'task', '/nonexistent/task.md']);
      expect(exitCode).toBe(1);
    });

    test('shows NOT_FOUND error in human mode', async () => {
      const { stderr } = await runCli(['context', 'task', '/nonexistent/task.md']);
      expect(stderr).toContain('NOT_FOUND');
    });

    test('shows structured error in AI mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'task',
        '/nonexistent/task.md',
        '--ai',
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain('## Error: NOT_FOUND');
      expect(stdout).toContain('- **message:**');
    });

    test('shows error in JSON mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'task',
        '/nonexistent/task.md',
        '--json',
      ]);
      expect(exitCode).toBe(1);
      const output = JSON.parse(stdout);
      expect(output.error).toBe(true);
      expect(output.code).toBe('NOT_FOUND');
    });
  });

  describe('missing target', () => {
    test('shows helpful error when target is missing', async () => {
      const { stderr, exitCode } = await runCli(['context', 'task']);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Please specify a task title or path');
    });
  });

  describe('title-based lookup', () => {
    test('finds task by exact title', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'Minimal Task']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Task');
    });

    test('finds task by case-insensitive title', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'minimal task']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Task');
    });

    test('finds task by uppercase title', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'MINIMAL TASK']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Task');
    });

    test('includes parent project when found by title', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'Full Metadata Task']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Full Metadata Task');
      expect(stdout).toContain('Test Project');
    });

    test('includes parent area when found by title', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'Full Metadata Task']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Work');
    });

    test('returns NOT_FOUND for non-existent title', async () => {
      const { stderr, exitCode } = await runCli(['context', 'task', 'Non Existent Task Title']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('NOT_FOUND');
    });

    test('works with --ai flag', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'Minimal Task', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Task: Minimal Task');
      expect(stdout).toContain('- **path:**');
    });

    test('works with --json flag', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', 'Minimal Task', '--json']);
      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.task.title).toBe('Minimal Task');
    });
  });

  describe('ambiguous title lookup', () => {
    test('returns AMBIGUOUS error when multiple tasks match', async () => {
      const { stderr, exitCode } = await runCli(['context', 'task', 'Duplicate Title Task']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('AMBIGUOUS');
    });

    test('lists matching paths in human mode', async () => {
      const { stderr } = await runCli(['context', 'task', 'Duplicate Title Task']);
      expect(stderr).toContain('duplicate-title-a.md');
      expect(stderr).toContain('duplicate-title-b.md');
    });

    test('shows structured error in AI mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'task',
        'Duplicate Title Task',
        '--ai',
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain('## Error: AMBIGUOUS');
      expect(stdout).toContain('- **query:** Duplicate Title Task');
      expect(stdout).toContain('- **matches:**');
    });

    test('shows error in JSON mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'task',
        'Duplicate Title Task',
        '--json',
      ]);
      expect(exitCode).toBe(1);
      const output = JSON.parse(stdout);
      expect(output.error).toBe(true);
      expect(output.code).toBe('AMBIGUOUS');
      expect(output.matches).toHaveLength(2);
    });
  });

  describe('path vs title detection', () => {
    test('treats input starting with / as path', async () => {
      const { exitCode } = await runCli(['context', 'task', '/nonexistent/path.md']);
      expect(exitCode).toBe(1);
      // Even if there were a task titled "/nonexistent/path.md", it should look up by path
    });

    test('treats input starting with ~ as path', async () => {
      const { exitCode } = await runCli(['context', 'task', '~/nonexistent/path.md']);
      expect(exitCode).toBe(1);
    });

    test('treats input ending with .md as path', async () => {
      // "minimal.md" should be treated as a path (relative to tasks dir), not a title
      const { stdout, exitCode } = await runCli(['context', 'task', 'minimal.md']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Task');
    });

    test('treats input with / as path', async () => {
      const { exitCode } = await runCli(['context', 'task', 'subdir/task.md']);
      expect(exitCode).toBe(1); // Not found because subdir doesn't exist
    });
  });
});
