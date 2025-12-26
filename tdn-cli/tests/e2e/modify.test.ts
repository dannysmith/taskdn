import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { runCli } from '../helpers/cli';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * E2E tests for modify commands: set status, update, archive, open
 *
 * These tests verify:
 * - Status changes are applied correctly
 * - Timestamps (completed-at, updated-at) are set appropriately
 * - Batch operations work correctly
 * - Dry-run mode previews without modifying
 * - All output modes work (human, AI, JSON)
 */

let tempDir: string;
let tasksDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'taskdn-modify-test-'));
  tasksDir = join(tempDir, 'tasks');
  mkdirSync(tasksDir, { recursive: true });
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * Helper to create a test task file
 */
function createTestTask(
  filename: string,
  opts: { title?: string; status?: string; completedAt?: string } = {}
): string {
  const title = opts.title ?? 'Test Task';
  const status = opts.status ?? 'ready';
  const filePath = join(tasksDir, filename);

  let content = `---
title: ${title}
status: ${status}
created-at: 2025-01-01T00:00:00
`;
  if (opts.completedAt) {
    content += `completed-at: ${opts.completedAt}\n`;
  }
  content += `---
`;

  writeFileSync(filePath, content);
  return filePath;
}

describe('taskdn set status (complete)', () => {
  test('sets status to done', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.status).toBe('done');
  });

  test('sets completed-at timestamp', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.completedAt).toBeDefined();
    expect(output.task.completedAt).toContain('2025-');
  });

  test('updates updated-at timestamp', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.updatedAt).toBeDefined();
    // Should not be the original 2025-01-01
    expect(output.task.updatedAt).not.toBe('2025-01-01T00:00:00');
  });

  test('errors if file not found', async () => {
    const { stderr, exitCode } = await runCli(
      ['set', 'status', join(tasksDir, 'nonexistent.md'), 'done', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain('NOT_FOUND');
  });

  test('dry-run shows preview without modifying', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--dry-run', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.dryRun).toBe(true);
    expect(output.changes).toContainEqual(
      expect.objectContaining({ field: 'status', oldValue: 'ready', newValue: 'done' })
    );

    // File should not be modified
    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('status: ready');
  });
});

describe('taskdn set status (drop)', () => {
  test('sets status to dropped', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'dropped', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.status).toBe('dropped');
  });

  test('sets completed-at timestamp', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'dropped', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.completedAt).toBeDefined();
  });

  test('dry-run shows preview without modifying', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'dropped', '--dry-run', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.dryRun).toBe(true);

    // File should not be modified
    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('status: ready');
  });
});

describe('taskdn set status (general)', () => {
  test('changes to valid status', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'in-progress', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.status).toBe('in-progress');
    expect(output.previousStatus).toBe('ready');
  });

  test('rejects invalid status with INVALID_STATUS error', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stderr, exitCode } = await runCli(['set', 'status', taskPath, 'invalid-status', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('INVALID_STATUS');
  });

  test('sets completed-at when changing to done', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.completedAt).toBeDefined();
  });

  test('sets completed-at when changing to dropped', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'dropped', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.completedAt).toBeDefined();
  });

  test('clears completed-at when changing from done to ready', async () => {
    const taskPath = createTestTask('test-task.md', {
      status: 'done',
      completedAt: '2025-01-15T12:00:00',
    });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'ready', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    // completedAt should be undefined/null
    expect(output.task.completedAt).toBeUndefined();
  });

  test('dry-run shows preview without modifying', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(
      ['set', 'status', taskPath, 'in-progress', '--dry-run', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.dryRun).toBe(true);

    // File should not be modified
    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('status: ready');
  });
});

describe('taskdn update', () => {
  test('updates single field', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(
      ['update', taskPath, '--set', 'due=2025-12-31', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.due).toBe('2025-12-31');
  });

  test('updates multiple fields', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(
      ['update', taskPath, '--set', 'due=2025-12-31', '--set', 'scheduled=2025-12-25', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.due).toBe('2025-12-31');
    expect(output.task.scheduled).toBe('2025-12-25');
  });

  test('unsets field with --unset', async () => {
    // Create task with due date
    const filePath = join(tasksDir, 'task-with-due.md');
    writeFileSync(
      filePath,
      `---
title: Task with Due
status: ready
due: 2025-12-31
---
`
    );

    const { stdout, exitCode } = await runCli(['update', filePath, '--unset', 'due', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.task.due).toBeUndefined();

    // Verify file content
    const content = readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('due:');
  });

  test('validates status values', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stderr, exitCode } = await runCli(
      ['update', taskPath, '--set', 'status=invalid', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain('INVALID_STATUS');
  });

  test('validates date formats', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stderr, exitCode } = await runCli(
      ['update', taskPath, '--set', 'due=not-a-date', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain('INVALID_DATE');
  });

  test('preserves unknown fields not being updated', async () => {
    // Create task with custom field
    const filePath = join(tasksDir, 'task-with-custom.md');
    writeFileSync(
      filePath,
      `---
title: Task with Custom
status: ready
my-custom-field: some value
---
`
    );

    const { exitCode } = await runCli(
      ['update', filePath, '--set', 'status=in-progress', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(0);

    // Verify custom field is preserved
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('my-custom-field: some value');
  });

  test('dry-run shows preview without modifying', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(
      ['update', taskPath, '--set', 'due=2025-12-31', '--dry-run', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.dryRun).toBe(true);

    // File should not be modified
    const content = readFileSync(taskPath, 'utf-8');
    expect(content).not.toContain('due:');
  });
});

describe('taskdn archive', () => {
  test('moves file to archive directory', async () => {
    const taskPath = createTestTask('test-task.md', { title: 'Archive Me' });

    const { stdout, exitCode } = await runCli(['archive', taskPath, '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.to).toContain('archive/test-task.md');

    // Original file should not exist
    expect(existsSync(taskPath)).toBe(false);

    // Archive file should exist
    const archivePath = join(tasksDir, 'archive', 'test-task.md');
    expect(existsSync(archivePath)).toBe(true);
  });

  test('creates archive directory if needed', async () => {
    const taskPath = createTestTask('test-task.md');
    const archiveDir = join(tasksDir, 'archive');

    // Verify archive dir doesn't exist
    expect(existsSync(archiveDir)).toBe(false);

    const { exitCode } = await runCli(['archive', taskPath, '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(existsSync(archiveDir)).toBe(true);
  });

  test('handles duplicate filename in archive', async () => {
    // Create archive dir with existing file
    const archiveDir = join(tasksDir, 'archive');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, 'test-task.md'),
      `---
title: Existing Archived
status: done
---
`
    );

    const taskPath = createTestTask('test-task.md', { title: 'New Archive' });

    const { stdout, exitCode } = await runCli(['archive', taskPath, '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    // Should have numeric suffix
    expect(output.to).toContain('test-task-1.md');
  });

  test('dry-run shows preview without moving', async () => {
    const taskPath = createTestTask('test-task.md');

    const { stdout, exitCode } = await runCli(['archive', taskPath, '--dry-run', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.dryRun).toBe(true);

    // Original file should still exist
    expect(existsSync(taskPath)).toBe(true);
  });
});

describe('batch operations', () => {
  test('processes all items even if some fail', async () => {
    const task1 = createTestTask('task1.md', { title: 'Task 1' });
    const task2 = createTestTask('task2.md', { title: 'Task 2' });
    const nonexistent = join(tasksDir, 'nonexistent.md');

    const { stdout, exitCode } = await runCli(
      ['set', 'status', task1, nonexistent, task2, 'done', '--json'],
      { useFixtureVault: false }
    );

    // Exit code 1 because one failed
    expect(exitCode).toBe(1);

    const output = JSON.parse(stdout);
    expect(output.successes.length).toBe(2);
    expect(output.failures.length).toBe(1);
  });

  test('reports successes and failures separately', async () => {
    const task1 = createTestTask('task1.md', { title: 'Task 1' });
    const nonexistent = join(tasksDir, 'nonexistent.md');

    const { stdout, exitCode } = await runCli(['set', 'status', task1, nonexistent, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(1);
    const output = JSON.parse(stdout);

    expect(output.successes).toBeDefined();
    expect(output.failures).toBeDefined();
    expect(output.successes[0].title).toBe('Task 1');
    expect(output.failures[0].code).toBe('NOT_FOUND');
  });

  test('exit code 0 if all succeed', async () => {
    const task1 = createTestTask('task1.md', { title: 'Task 1' });
    const task2 = createTestTask('task2.md', { title: 'Task 2' });

    const { exitCode } = await runCli(['set', 'status', task1, task2, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
  });

  test('batch status change works', async () => {
    const task1 = createTestTask('task1.md', { status: 'ready' });
    const task2 = createTestTask('task2.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(
      ['set', 'status', task1, task2, 'in-progress', '--json'],
      { useFixtureVault: false }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.successes.length).toBe(2);
  });

  test('batch archive works', async () => {
    const task1 = createTestTask('task1.md', { title: 'Task 1' });
    const task2 = createTestTask('task2.md', { title: 'Task 2' });

    const { stdout, exitCode } = await runCli(['archive', task1, task2, '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.successes.length).toBe(2);
  });
});

describe('taskdn open', () => {
  test('errors in AI mode', async () => {
    const taskPath = createTestTask('test-task.md');

    const { stderr, exitCode } = await runCli(['open', taskPath, '--ai'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('NOT_SUPPORTED');
    expect(stderr).toContain('interactive');
  });

  test('errors in JSON mode', async () => {
    const taskPath = createTestTask('test-task.md');

    const { stderr, exitCode } = await runCli(['open', taskPath, '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('NOT_SUPPORTED');
  });
});

describe('output modes', () => {
  test('complete human mode shows confirmation', async () => {
    const taskPath = createTestTask('test-task.md', { title: 'Human Mode Task' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('status changed');
    expect(stdout).toContain('Human Mode Task');
  });

  test('complete AI mode shows structured markdown', async () => {
    const taskPath = createTestTask('test-task.md', { title: 'AI Mode Task' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--ai'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Task Status Changed');
    expect(stdout).toContain('### AI Mode Task');
    expect(stdout).toContain('- **path:**');
    expect(stdout).toContain('- **status:** done');
  });

  test('complete JSON mode shows machine-readable output', async () => {
    const taskPath = createTestTask('test-task.md', { title: 'JSON Mode Task' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'done', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.summary).toContain('Changed status');
    expect(output.task).toBeDefined();
    expect(output.task.status).toBe('done');
  });

  test('status change shows previous status', async () => {
    const taskPath = createTestTask('test-task.md', { status: 'ready' });

    const { stdout, exitCode } = await runCli(['set', 'status', taskPath, 'in-progress', '--ai'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('ready');
    expect(stdout).toContain('in-progress');
  });

  test('archive shows from/to paths', async () => {
    const taskPath = createTestTask('test-task.md', { title: 'Archive Task' });

    const { stdout, exitCode } = await runCli(['archive', taskPath, '--ai'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Archived');
    expect(stdout).toContain('- **from:**');
    expect(stdout).toContain('- **to:**');
  });

  test('dry-run shows preview in all modes', async () => {
    const taskPath = createTestTask('test-task.md');

    // Human mode
    const human = await runCli(['set', 'status', taskPath, 'done', '--dry-run'], { useFixtureVault: false });
    expect(human.stdout).toContain('Dry run');

    // AI mode
    const ai = await runCli(['set', 'status', taskPath, 'done', '--dry-run', '--ai'], {
      useFixtureVault: false,
    });
    expect(ai.stdout).toContain('Dry Run');

    // JSON mode
    const json = await runCli(['set', 'status', taskPath, 'done', '--dry-run', '--json'], {
      useFixtureVault: false,
    });
    const output = JSON.parse(json.stdout);
    expect(output.dryRun).toBe(true);
  });
});
