import { describe, test, expect } from 'bun:test';
import { runCli } from '../helpers/cli';

describe('taskdn inbox', () => {
  describe('basic functionality', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['inbox']);
      expect(exitCode).toBe(0);
    });

    test('shows only inbox status tasks', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(output.tasks.every((t: { status: string }) => t.status === 'inbox')).toBe(true);
    });

    test('includes the inbox task from fixtures', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.some((t: { title: string }) => t.title === 'Inbox Task')).toBe(true);
    });

    test('excludes tasks with other statuses', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
      const output = JSON.parse(stdout);
      // Should not include ready, in-progress, etc.
      expect(output.tasks.every((t: { status: string }) => t.status === 'inbox')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows task count in header', async () => {
      const { stdout } = await runCli(['inbox']);
      expect(stdout).toMatch(/Tasks \(\d+\)/);
    });

    test('shows task titles', async () => {
      const { stdout } = await runCli(['inbox']);
      expect(stdout).toContain('Inbox Task');
    });

    test('shows inbox status', async () => {
      const { stdout } = await runCli(['inbox']);
      expect(stdout.toLowerCase()).toContain('inbox');
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['inbox', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Tasks');
    });

    test('includes path field for each task', async () => {
      const { stdout } = await runCli(['inbox', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('includes status field for each task', async () => {
      const { stdout } = await runCli(['inbox', '--ai']);
      expect(stdout).toContain('- **status:**');
    });

    test('uses task title as heading', async () => {
      const { stdout } = await runCli(['inbox', '--ai']);
      expect(stdout).toContain('### Inbox Task');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['inbox', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes tasks array', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.tasks)).toBe(true);
    });

    test('each task has required fields', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
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
      const { stdout, exitCode } = await runCli(['inbox', '--ai', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });
  });

  describe('empty results behavior', () => {
    // Note: We can't easily test empty inbox without modifying fixtures
    // but we can verify the command handles the result structure correctly
    test('JSON mode includes proper structure', async () => {
      const { stdout } = await runCli(['inbox', '--json']);
      const output = JSON.parse(stdout);
      expect(output).toHaveProperty('tasks');
      expect(output).toHaveProperty('summary');
    });
  });
});
