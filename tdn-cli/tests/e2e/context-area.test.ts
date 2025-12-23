import { describe, test, expect } from 'bun:test';
import { runCli } from '../helpers/cli';

describe('context area', () => {
  describe('with Work area', () => {
    test('returns area details', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Work');
    });

    test('includes projects in area', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Test Project');
    });

    test('includes tasks via projects', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work']);
      expect(exitCode).toBe(0);
      // Tasks in Test Project
      expect(stdout).toContain('Full Metadata Task');
      expect(stdout).toContain('Test Project Task');
    });

    test('includes tasks directly in area', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Direct Work Task');
    });
  });

  describe('with --ai flag', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Area: Work');
      expect(stdout).toContain('- **path:**');
      expect(stdout).toContain('- **status:** active');
    });

    test('includes body for primary entity', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Body');
      expect(stdout).toContain('Work-related tasks and projects');
    });

    test('shows projects section with count', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/## Projects in Work \(\d+\)/);
    });

    test('shows project with task count', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('### Project: Test Project');
      expect(stdout).toMatch(/- \*\*tasks:\*\* \d+/);
    });

    test('shows tasks under projects', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('#### Task:');
      expect(stdout).toContain('- **status:**');
    });

    test('shows direct tasks section', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/## Tasks Directly in Area: Work \(\d+\)/);
    });
  });

  describe('with --json flag', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['context', 'area', 'Work', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['context', 'area', 'Work', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain('Work area');
    });

    test('includes area object', async () => {
      const { stdout } = await runCli(['context', 'area', 'Work', '--json']);
      const output = JSON.parse(stdout);
      expect(output.area.title).toBe('Work');
      expect(output.area.status).toBe('active');
    });

    test('includes projects array with nested tasks', async () => {
      const { stdout } = await runCli(['context', 'area', 'Work', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.projects)).toBe(true);
      expect(output.projects.length).toBeGreaterThan(0);

      const testProject = output.projects.find(
        (p: { title: string }) => p.title === 'Test Project'
      );
      expect(testProject).toBeDefined();
      expect(Array.isArray(testProject.tasks)).toBe(true);
    });

    test('includes directTasks array', async () => {
      const { stdout } = await runCli(['context', 'area', 'Work', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.directTasks)).toBe(true);
      expect(output.directTasks.length).toBeGreaterThan(0);
    });
  });

  describe('area not found', () => {
    test('exits with code 1', async () => {
      const { exitCode } = await runCli(['context', 'area', 'NonExistent']);
      expect(exitCode).toBe(1);
    });

    test('shows NOT_FOUND error in human mode', async () => {
      const { stderr } = await runCli(['context', 'area', 'NonExistent']);
      expect(stderr).toContain('NOT_FOUND');
    });

    test('shows structured error in AI mode', async () => {
      const { stdout, exitCode } = await runCli([
        'context',
        'area',
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
        'area',
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
      const { stderr, exitCode } = await runCli(['context', 'area']);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Please specify an area name');
    });
  });

  describe('no args behavior', () => {
    test('human mode shows error', async () => {
      const { stderr, exitCode } = await runCli(['context']);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Please specify an entity');
    });

    test('AI mode returns vault overview', async () => {
      const { stdout, exitCode } = await runCli(['context', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Vault Overview');
    });
  });
});
