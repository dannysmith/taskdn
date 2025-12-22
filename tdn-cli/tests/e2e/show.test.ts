import { describe, test, expect } from 'bun:test';
import { runCli, fixturePath } from '../helpers/cli';

describe('taskdn show', () => {
  describe('with minimal task', () => {
    const taskPath = fixturePath('vault/tasks/minimal.md');

    test('outputs task title', async () => {
      const { stdout, exitCode } = await runCli(['show', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Task');
    });

    test('outputs task status', async () => {
      const { stdout } = await runCli(['show', taskPath]);
      expect(stdout).toContain('ready');
    });
  });

  describe('with full metadata task', () => {
    const taskPath = fixturePath('vault/tasks/full-metadata.md');

    test('outputs all metadata fields', async () => {
      const { stdout, exitCode } = await runCli(['show', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Full Metadata Task');
      expect(stdout).toContain('in-progress');
      expect(stdout).toContain('2025-01-20'); // due
      expect(stdout).toContain('Test Project');
      expect(stdout).toContain('Work');
    });
  });

  describe('with task containing body', () => {
    const taskPath = fixturePath('vault/tasks/with-body.md');

    test('outputs body content', async () => {
      const { stdout, exitCode } = await runCli(['show', taskPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Task With Body');
      expect(stdout).toContain('markdown');
      expect(stdout).toContain('First subtask');
    });
  });

  describe('with --ai flag', () => {
    const taskPath = fixturePath('vault/tasks/minimal.md');

    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['show', taskPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Minimal Task');
      expect(stdout).toContain('- **status:** ready');
      expect(stdout).toContain('- **path:**');
    });

    test('includes all metadata for full task', async () => {
      const fullTaskPath = fixturePath('vault/tasks/full-metadata.md');
      const { stdout } = await runCli(['show', fullTaskPath, '--ai']);
      expect(stdout).toContain('- **due:** 2025-01-20');
      expect(stdout).toContain('- **scheduled:** 2025-01-18');
      expect(stdout).toContain('- **project:** [[Test Project]]');
      expect(stdout).toContain('- **area:** [[Work]]');
    });
  });

  describe('with --json flag', () => {
    const taskPath = fixturePath('vault/tasks/minimal.md');

    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['show', taskPath, '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['show', taskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBe('Task: Minimal Task');
    });

    test('includes task object with correct fields', async () => {
      const { stdout } = await runCli(['show', taskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.task.title).toBe('Minimal Task');
      expect(output.task.status).toBe('ready');
      expect(output.task.path).toContain('minimal.md');
    });

    test('includes all metadata for full task', async () => {
      const fullTaskPath = fixturePath('vault/tasks/full-metadata.md');
      const { stdout } = await runCli(['show', fullTaskPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.task.due).toBe('2025-01-20');
      expect(output.task.scheduled).toBe('2025-01-18');
      expect(output.task.project).toBe('[[Test Project]]');
      expect(output.task.area).toBe('[[Work]]');
    });
  });

  describe('with nonexistent path', () => {
    test('exits with code 1', async () => {
      const { exitCode } = await runCli(['show', '/nonexistent/path.md']);
      expect(exitCode).toBe(1);
    });

    test('shows error message in human mode', async () => {
      const { stderr } = await runCli(['show', '/nonexistent/path.md']);
      expect(stderr).toContain('Error');
    });

    test('shows error in AI mode', async () => {
      const { stdout, exitCode } = await runCli([
        'show',
        '/nonexistent/path.md',
        '--ai',
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain('## Error');
      expect(stdout).toContain('**message:**');
    });

    test('shows error in JSON mode', async () => {
      const { stdout, exitCode } = await runCli([
        'show',
        '/nonexistent/path.md',
        '--json',
      ]);
      expect(exitCode).toBe(1);
      const output = JSON.parse(stdout);
      expect(output.error).toBe(true);
      expect(output.message).toBeDefined();
    });
  });

  describe('with minimal project', () => {
    const projectPath = fixturePath('vault/projects/minimal.md');

    test('outputs project title', async () => {
      const { stdout, exitCode } = await runCli(['show', projectPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Minimal Project');
    });

    test('outputs project status', async () => {
      const { stdout } = await runCli(['show', projectPath]);
      expect(stdout).toContain('in-progress');
    });
  });

  describe('with full metadata project', () => {
    const projectPath = fixturePath('vault/projects/full-metadata.md');

    test('outputs all project metadata fields', async () => {
      const { stdout, exitCode } = await runCli(['show', projectPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Full Metadata Project');
      expect(stdout).toContain('in-progress');
      expect(stdout).toContain('2025-01-10'); // start-date
      expect(stdout).toContain('2025-03-01'); // end-date
      expect(stdout).toContain('Work'); // area
    });
  });

  describe('with project containing body', () => {
    const projectPath = fixturePath('vault/projects/with-body.md');

    test('outputs body content', async () => {
      const { stdout, exitCode } = await runCli(['show', projectPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Project With Body');
      expect(stdout).toContain('Goals');
      expect(stdout).toContain('Deliver feature X');
    });
  });

  describe('project with --ai flag', () => {
    const projectPath = fixturePath('vault/projects/minimal.md');

    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['show', projectPath, '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Minimal Project');
      expect(stdout).toContain('- **status:** in-progress');
      expect(stdout).toContain('- **path:**');
    });

    test('includes all metadata for full project', async () => {
      const fullProjectPath = fixturePath('vault/projects/full-metadata.md');
      const { stdout } = await runCli(['show', fullProjectPath, '--ai']);
      expect(stdout).toContain('- **start-date:** 2025-01-10');
      expect(stdout).toContain('- **end-date:** 2025-03-01');
      expect(stdout).toContain('- **area:** [[Work]]');
      expect(stdout).toContain('- **description:**');
      expect(stdout).toContain('- **blocked-by:**');
    });
  });

  describe('project without status', () => {
    const projectPath = fixturePath('vault/projects/no-status.md');

    test('handles missing status gracefully', async () => {
      const { stdout, exitCode } = await runCli(['show', projectPath]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Project Without Status');
    });

    test('JSON output has null status', async () => {
      const { stdout } = await runCli(['show', projectPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.project.title).toBe('Project Without Status');
      expect(output.project.status).toBeNull();
    });
  });

  describe('project with --json flag', () => {
    const projectPath = fixturePath('vault/projects/minimal.md');

    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['show', projectPath, '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['show', projectPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBe('Project: Minimal Project');
    });

    test('includes project object with correct fields', async () => {
      const { stdout } = await runCli(['show', projectPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.project.title).toBe('Minimal Project');
      expect(output.project.status).toBe('in-progress');
      expect(output.project.path).toContain('minimal.md');
    });

    test('includes all metadata for full project', async () => {
      const fullProjectPath = fixturePath('vault/projects/full-metadata.md');
      const { stdout } = await runCli(['show', fullProjectPath, '--json']);
      const output = JSON.parse(stdout);
      expect(output.project.startDate).toBe('2025-01-10');
      expect(output.project.endDate).toBe('2025-03-01');
      expect(output.project.area).toBe('[[Work]]');
      expect(output.project.description).toBe('A project with all optional fields populated');
      expect(output.project.blockedBy).toEqual(['[[Another Project]]']);
    });
  });

  describe('status parsing', () => {
    test('parses inbox status', async () => {
      const { stdout } = await runCli([
        'show',
        fixturePath('vault/tasks/status-inbox.md'),
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('inbox');
    });

    test('parses icebox status', async () => {
      const { stdout } = await runCli([
        'show',
        fixturePath('vault/tasks/status-icebox.md'),
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('icebox');
    });

    test('parses in-progress status', async () => {
      const { stdout } = await runCli([
        'show',
        fixturePath('vault/tasks/status-in-progress.md'),
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('in-progress');
    });

    test('parses blocked status', async () => {
      const { stdout } = await runCli([
        'show',
        fixturePath('vault/tasks/status-blocked.md'),
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('blocked');
    });

    test('parses dropped status', async () => {
      const { stdout } = await runCli([
        'show',
        fixturePath('vault/tasks/status-dropped.md'),
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('dropped');
    });

    test('parses done status', async () => {
      const { stdout } = await runCli([
        'show',
        fixturePath('vault/tasks/status-done.md'),
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('done');
    });
  });
});
