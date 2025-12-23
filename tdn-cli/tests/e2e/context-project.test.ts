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

  describe('with --ai flag', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Project: Test Project');
      expect(stdout).toContain('- **path:**');
      expect(stdout).toContain('- **status:** in-progress');
    });

    test('includes body for primary entity', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Body');
      expect(stdout).toContain('A test project in the Work area');
    });

    test('shows parent area section', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Parent Area');
      expect(stdout).toContain('### Work');
    });

    test('shows tasks section with count', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/## Tasks in Test Project \(\d+\)/);
    });

    test('shows task details', async () => {
      const { stdout, exitCode } = await runCli(['context', 'project', 'Test Project', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Full Metadata Task');
      expect(stdout).toContain('- **status:**');
      expect(stdout).toContain('- **due:**');
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
