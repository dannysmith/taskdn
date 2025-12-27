import { describe, test, expect } from 'bun:test';
import { runCli } from '../helpers/cli';

describe('context project', () => {
  describe('with Test Project', () => {
    test('returns project details', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Test Project');
    });

    test('includes parent area', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Work');
    });

    test('includes tasks in project', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Full Metadata Task');
      expect(stdout).toContain('Test Project Task');
    });
  });

  describe('with project without area', () => {
    test('handles project with no area', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Minimal Project']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Project');
    });
  });

  describe('with --ai flag (Section 6 format)', () => {
    test('outputs structured markdown with project header', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('# Project: Test Project');
    });

    test('includes stats header', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('**Stats:**');
      expect(stdout).toMatch(/\d+ active task/);
    });

    test('includes project details section with metadata table', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Project Details');
      expect(stdout).toContain('| Field | Value |');
      expect(stdout).toContain('| status | in-progress |');
    });

    test('includes body for primary entity', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Body');
      expect(stdout).toContain('A test project in the Work area');
    });

    test('shows parent area section with excerpt', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Area: Work');
      expect(stdout).toContain('| Field | Value |');
    });

    test('includes timeline section', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Timeline');
      expect(stdout).toContain('_Scoped to tasks in Test Project_');
      expect(stdout).toContain('### Overdue');
      expect(stdout).toContain('### Due Today');
    });

    test('shows tasks by status section', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Tasks by Status');
      expect(stdout).toContain('### In-Progress');
      expect(stdout).toContain('### Blocked');
      expect(stdout).toContain('### Ready');
      expect(stdout).toContain('### Inbox');
    });

    test('includes reference table', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Reference');
      expect(stdout).toContain('| Entity |');
      expect(stdout).toContain('| Type |');
    });

    test('shows parent area as None when project has no area', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Minimal Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Area');
      expect(stdout).toContain('_None_');
    });
  });

  describe('with --json flag', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain('Test Project');
    });

    test('includes project object with body', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--json']);
      const output = JSON.parse(stdout);
      expect(output.project.title).toBe('Test Project');
      expect(output.project.status).toBe('in-progress');
      expect(output.project.body).toBeDefined();
    });

    test('includes area object', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--json']);
      const output = JSON.parse(stdout);
      expect(output.area).toBeDefined();
      expect(output.area.title).toBe('Work');
    });

    test('includes tasks array', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.tasks)).toBe(true);
      expect(output.tasks.length).toBeGreaterThan(0);
    });

    test('omits area when project has no area', async () => {
      const { stdout } = await runCli(['context', 'project', 'Minimal Project', '--json']);
      const output = JSON.parse(stdout);
      expect(output.area).toBeUndefined();
    });
  });

  describe('with --ai --json flags (Section 8 envelope)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'project',
        'Test Project',
        '--ai',
        '--json',
      ]);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('has contextType field set to project', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.contextType).toBe('project');
    });

    test('has entity field with project title', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.entity).toBe('Test Project');
    });

    test('has summary field describing project context', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain("Context for project 'Test Project'");
      expect(output.summary).toMatch(/\d+ active tasks/);
    });

    test('has content field with AI-formatted markdown', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.content).toContain('# Project: Test Project');
      expect(output.content).toContain('## Project Details');
      expect(output.content).toContain('## Parent Area: Work');
      expect(output.content).toContain('## Timeline');
      expect(output.content).toContain('## Tasks by Status');
    });

    test('has references array with project, area, and tasks', async () => {
      const { stdout } = await runCli(['context', 'project', 'Test Project', '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.references)).toBe(true);

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

      const taskRefs = output.references.filter(
        (r: { type: string }) => r.type === 'task'
      );
      expect(taskRefs.length).toBeGreaterThan(0);
    });

    test('project without area has correct summary', async () => {
      const { stdout } = await runCli(['context', 'project', 'Minimal Project', '--ai', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain("Context for project 'Minimal Project'");
      // Should not have area reference
      const areaRef = output.references.find(
        (r: { type: string }) => r.type === 'area'
      );
      expect(areaRef).toBeUndefined();
    });
  });

  describe('project not found', () => {
    test('exits with code 1', async () => {
      const { exitCode } = await runCli(['context', 'project', 'NonExistent']);
      expect(exitCode).toBe(1);
    });

    test('shows NOT_FOUND error in human mode', async () => {
      const { stderr } = await runCli(['context', 'project', 'NonExistent']);
      expect(stderr).toContain('NOT_FOUND');
    });

    test('shows structured error in AI mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'project',
        'NonExistent',
        '--ai',
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain('## Error: NOT_FOUND');
      expect(stdout).toContain('- **message:**');
    });

    test('shows error in JSON mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'project',
        'NonExistent',
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
      const { stderr, exitCode } = await runCli(['context', 'project']);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Please specify a project name');
    });
  });
});
