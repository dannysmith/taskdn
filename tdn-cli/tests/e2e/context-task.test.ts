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

    test('outputs structured markdown with # header', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('# Task: Full Metadata Task');
      expect(stdout).toContain('## Task Details');
      expect(stdout).toContain('| status | in-progress |');
    });

    test('shows metadata table format', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('| Field | Value |');
      expect(stdout).toContain('| path |');
    });

    test('includes body for primary entity', async () => {
      // Note: full-metadata.md has no body, use with-body.md
      const bodyTaskPath = fixturePath('vault/tasks/with-body.md');
      const { stdout, exitCode } = await runCli(['context', 'task', bodyTaskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Body');
    });

    test('shows parent project section with title in header', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Project: Test Project');
    });

    test('shows parent area section with title in header', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Area: Work');
    });

    test('shows relationship notation for area via project', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('_Via project Test Project_');
    });

    test('includes reference table', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Reference');
      expect(stdout).toContain('| Entity | Type | Path |');
      expect(stdout).toContain('| Full Metadata Task | task |');
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

  describe('with --ai --json flags (Section 8 envelope)', () => {
    const taskPath = fixturePath('vault/tasks/full-metadata.md');

    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('has contextType field set to task', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.contextType).toBe('task');
    });

    test('has entity field with task title', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.entity).toBe('Full Metadata Task');
    });

    test('has summary field describing task context', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain("Context for task 'Full Metadata Task'");
      expect(output.summary).toContain("in project 'Test Project'");
    });

    test('has content field with AI-formatted markdown', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.content).toContain('# Task: Full Metadata Task');
      expect(output.content).toContain('## Task Details');
      expect(output.content).toContain('## Parent Project: Test Project');
      expect(output.content).toContain('## Parent Area: Work');
    });

    test('has references array with task, project, and area', async () => {
      const { stdout } = await runCli(['context', 'task', taskPath, '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.references)).toBe(true);

      const taskRef = output.references.find(
        (r: { type: string; name: string }) => r.type === 'task'
      );
      expect(taskRef).toBeDefined();
      expect(taskRef.name).toBe('Full Metadata Task');
      expect(taskRef.path).toContain('full-metadata.md');

      const projectRef = output.references.find(
        (r: { type: string; name: string }) => r.type === 'project'
      );
      expect(projectRef).toBeDefined();
      expect(projectRef.name).toBe('Test Project');

      const areaRef = output.references.find(
        (r: { type: string; name: string }) => r.type === 'area'
      );
      expect(areaRef).toBeDefined();
      expect(areaRef.name).toBe('Work');
    });

    test('task without project has correct summary and references', async () => {
      const minimalPath = fixturePath('vault/tasks/minimal.md');
      const { stdout } = await runCli(['context', 'task', minimalPath, '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain("Context for task 'Minimal Task'");
      expect(output.summary).not.toContain('in project');
      // Should only have task reference (no project or area)
      expect(output.references.every((r: { type: string }) => r.type === 'task')).toBe(true);
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
      expect(stdout).toContain('# Task: Minimal Task');
      expect(stdout).toContain('## Task Details');
      expect(stdout).toContain('| path |');
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

  describe('alert banners', () => {
    test('shows overdue banner for task with past due date', async () => {
      const taskPath = fixturePath('vault/tasks/due-past.md');
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('⚠️ OVERDUE — due 2020-01-01');
    });

    test('no banner for task without time-sensitive dates', async () => {
      const taskPath = fixturePath('vault/tasks/minimal.md');
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      // Should not contain any alert icons
      expect(stdout).not.toContain('⚠️ OVERDUE');
      expect(stdout).not.toContain('📅 DUE TODAY');
      expect(stdout).not.toContain('📆 SCHEDULED TODAY');
      expect(stdout).not.toContain('🔓 NEWLY ACTIONABLE');
    });
  });

  describe('direct area relationship', () => {
    test('shows direct relationship notation when task has area but no project', async () => {
      const taskPath = fixturePath('vault/tasks/in-work-direct.md');
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Project');
      expect(stdout).toContain('_None_');
      expect(stdout).toContain('## Parent Area: Work');
      expect(stdout).toContain('_Direct relationship_');
    });
  });

  describe('task with no parents', () => {
    test('shows None for both project and area', async () => {
      const taskPath = fixturePath('vault/tasks/minimal.md');
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Project');
      expect(stdout).toContain('## Parent Area');
      // Both should show _None_
      expect(stdout.match(/_None_/g)?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('project and area excerpts', () => {
    test('includes project body excerpt in blockquote format', async () => {
      const taskPath = fixturePath('vault/tasks/full-metadata.md');
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      // Test Project has body "A test project in the Work area."
      expect(stdout).toContain('> A test project in the Work area.');
    });

    test('includes area body excerpt in blockquote format', async () => {
      const taskPath = fixturePath('vault/tasks/full-metadata.md');
      const { stdout, exitCode } = await runCli(['context', 'task', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      // Work area has body "Work-related tasks and projects."
      expect(stdout).toContain('> Work-related tasks and projects.');
    });
  });
});
