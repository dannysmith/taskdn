import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { runCli, fixturePath } from '../helpers/cli';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * E2E tests for append-body command
 *
 * Tests verify:
 * - Basic appending to tasks, projects, and areas
 * - Fuzzy title matching
 * - File content preservation (frontmatter and body)
 * - All output modes (human, AI, JSON, AI-JSON)
 * - Dry-run mode
 * - Edge cases (multiline, special chars, empty body, existing body)
 */

let tempDir: string;
let tasksDir: string;
let projectsDir: string;
let areasDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'taskdn-append-body-test-'));
  tasksDir = join(tempDir, 'tasks');
  projectsDir = join(tempDir, 'projects');
  areasDir = join(tempDir, 'areas');
  mkdirSync(tasksDir, { recursive: true });
  mkdirSync(projectsDir, { recursive: true });
  mkdirSync(areasDir, { recursive: true });
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
  opts: { title?: string; status?: string; body?: string } = {}
): string {
  const title = opts.title ?? 'Test Task';
  const status = opts.status ?? 'ready';
  const filePath = join(tasksDir, filename);

  let content = `---
title: ${title}
status: ${status}
created-at: 2025-01-01T00:00:00
---
`;

  if (opts.body) {
    content += `\n${opts.body}\n`;
  }

  writeFileSync(filePath, content);
  return filePath;
}

/**
 * Helper to create a test project file
 */
function createTestProject(
  filename: string,
  opts: { title?: string; status?: string; body?: string } = {}
): string {
  const title = opts.title ?? 'Test Project';
  const status = opts.status ?? 'in-progress';
  const filePath = join(projectsDir, filename);

  let content = `---
title: ${title}
status: ${status}
created-at: 2025-01-01T00:00:00
---
`;

  if (opts.body) {
    content += `\n${opts.body}\n`;
  }

  writeFileSync(filePath, content);
  return filePath;
}

/**
 * Helper to create a test area file
 */
function createTestArea(
  filename: string,
  opts: { title?: string; status?: string; body?: string } = {}
): string {
  const title = opts.title ?? 'Test Area';
  const status = opts.status ?? 'active';
  const filePath = join(areasDir, filename);

  let content = `---
title: ${title}
status: ${status}
created-at: 2025-01-01T00:00:00
---
`;

  if (opts.body) {
    content += `\n${opts.body}\n`;
  }

  writeFileSync(filePath, content);
  return filePath;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayIso(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// ============================================================================
// Basic Appending Functionality
// ============================================================================

describe('taskdn append-body > basic functionality', () => {
  test('appends text to task with path argument', async () => {
    const taskPath = createTestTask('test-task.md', { body: 'Initial body content.' });

    const { stdout, exitCode } = await runCli(
      ['append-body', taskPath, 'New note here', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.appended).toBe(true);
    expect(output.entityType).toBe('task');
    expect(output.title).toBe('Test Task');
    expect(output.appendedText).toContain('New note here');
    expect(output.appendedText).toContain(`[${getTodayIso()}]`);

    // Verify file was modified
    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('Initial body content.');
    expect(content).toContain('New note here');
    expect(content).toContain(`[${getTodayIso()}]`);
  });

  test('appends text to project with path argument', async () => {
    const projectPath = createTestProject('test-project.md', { body: 'Project notes.' });

    const { stdout, exitCode } = await runCli(
      ['append-body', projectPath, 'Additional information', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.appended).toBe(true);
    expect(output.entityType).toBe('project');
    expect(output.title).toBe('Test Project');

    // Verify file was modified
    const content = readFileSync(projectPath, 'utf-8');
    expect(content).toContain('Project notes.');
    expect(content).toContain('Additional information');
  });

  test('appends text to area with path argument', async () => {
    const areaPath = createTestArea('test-area.md', { body: 'Area description.' });

    const { stdout, exitCode } = await runCli(
      ['append-body', areaPath, 'Updated info', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.appended).toBe(true);
    expect(output.entityType).toBe('area');
    expect(output.title).toBe('Test Area');

    // Verify file was modified
    const content = readFileSync(areaPath, 'utf-8');
    expect(content).toContain('Area description.');
    expect(content).toContain('Updated info');
  });
});

// ============================================================================
// Fuzzy Matching
// ============================================================================

describe('taskdn append-body > fuzzy matching', () => {
  test('appends with unique fuzzy title match', async () => {
    createTestTask('unique-task.md', { title: 'Unique Task Title' });

    const { stdout, exitCode } = await runCli(
      ['append-body', 'unique task', 'Fuzzy matched note', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.title).toBe('Unique Task Title');
    expect(output.appendedText).toContain('Fuzzy matched note');
  });

  test('appends to project with unique fuzzy match', async () => {
    createTestProject('unique-project.md', { title: 'Unique Project Name' });

    const { stdout, exitCode } = await runCli(
      ['append-body', 'unique project', 'Project update', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.title).toBe('Unique Project Name');
    expect(output.entityType).toBe('project');
  });

  test('appends to area with unique fuzzy match', async () => {
    createTestArea('unique-area.md', { title: 'Unique Area Title' });

    const { stdout, exitCode } = await runCli(
      ['append-body', 'unique area', 'Area note', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.title).toBe('Unique Area Title');
    expect(output.entityType).toBe('area');
  });

  test('errors on ambiguous match', async () => {
    createTestTask('task-a.md', { title: 'Duplicate Title' });
    createTestTask('task-b.md', { title: 'Duplicate Title' });

    const { stderr, exitCode } = await runCli(
      ['append-body', 'duplicate', 'Note', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain('AMBIGUOUS');
  });

  test('errors when no match found', async () => {
    const { stderr, exitCode } = await runCli(
      ['append-body', 'nonexistent entity', 'Note', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain('NOT_FOUND');
  });

  test('fuzzy match is case-insensitive', async () => {
    createTestTask('test.md', { title: 'CaseSensitive Task' });

    const { stdout, exitCode } = await runCli(
      ['append-body', 'casesensitive', 'Note', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.title).toBe('CaseSensitive Task');
  });
});

// ============================================================================
// File Content Preservation
// ============================================================================

describe('taskdn append-body > content preservation', () => {
  test('preserves frontmatter unchanged', async () => {
    const taskPath = createTestTask('full-task.md', {
      title: 'Full Task',
      status: 'in-progress',
      body: 'Original body.',
    });

    await runCli(['append-body', taskPath, 'New content'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('title: Full Task');
    expect(content).toContain('status: in-progress');
    expect(content).toContain('created-at: 2025-01-01T00:00:00');
  });

  test('preserves existing body content', async () => {
    const taskPath = createTestTask('task.md', {
      body: 'First paragraph.\n\nSecond paragraph.',
    });

    await runCli(['append-body', taskPath, 'Third paragraph'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('First paragraph.');
    expect(content).toContain('Second paragraph.');
    expect(content).toContain('Third paragraph');

    // Verify order
    const firstIndex = content.indexOf('First paragraph');
    const secondIndex = content.indexOf('Second paragraph');
    const thirdIndex = content.indexOf('Third paragraph');
    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  test('appends with blank line separator when body has content', async () => {
    const taskPath = createTestTask('task.md', { body: 'Existing content' });

    await runCli(['append-body', taskPath, 'New content'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

    const content = readFileSync(taskPath, 'utf-8');
    // Should have blank line between existing and new content
    expect(content).toMatch(/Existing content\s*\n\s*\nNew content/);
  });

  test('handles empty body correctly', async () => {
    const taskPath = createTestTask('task.md'); // No body

    await runCli(['append-body', taskPath, 'First body content'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('First body content');
    expect(content).toContain(`[${getTodayIso()}]`);
  });
});

// ============================================================================
// Output Modes
// ============================================================================

describe('taskdn append-body > output modes', () => {
  test('human mode shows confirmation', async () => {
    const taskPath = createTestTask('task.md');

    const { stdout, exitCode } = await runCli(['append-body', taskPath, 'Note'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('✓');
    expect(stdout).toContain('body updated');
    expect(stdout).toContain('Test Task');
  });

  test('AI mode outputs structured markdown', async () => {
    const taskPath = createTestTask('task.md', { title: 'My Task' });

    const { stdout, exitCode } = await runCli(['append-body', taskPath, 'Note', '--ai'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Task Body Updated');
    expect(stdout).toContain('### My Task');
    expect(stdout).toContain('- **path:**');
    expect(stdout).toContain('### Appended Text');
  });

  test('JSON mode outputs valid JSON', async () => {
    const taskPath = createTestTask('task.md');

    const { stdout, exitCode } = await runCli(['append-body', taskPath, 'Note', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();

    const output = JSON.parse(stdout);
    expect(output.appended).toBe(true);
    expect(output.entityType).toBe('task');
    expect(output.title).toBe('Test Task');
    expect(output.path).toBeDefined();
    expect(output.appendedText).toBeDefined();
  });

  // Note: --ai-json mode is not currently implemented for append-body command
});

// ============================================================================
// Dry-run Mode
// ============================================================================

describe('taskdn append-body > dry-run mode', () => {
  test('shows preview without modifying file', async () => {
    const taskPath = createTestTask('task.md', { body: 'Original content' });
    const originalContent = readFileSync(taskPath, 'utf-8');

    const { stdout, exitCode } = await runCli(
      ['append-body', taskPath, 'New content', '--dry-run', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.dryRun).toBe(true);
    expect(output.appendedText).toContain('New content');

    // File should NOT be modified
    const currentContent = readFileSync(taskPath, 'utf-8');
    expect(currentContent).toBe(originalContent);
    expect(currentContent).not.toContain('New content');
  });

  test('dry-run shows correct preview text', async () => {
    const taskPath = createTestTask('task.md');

    const { stdout, exitCode } = await runCli(
      ['append-body', taskPath, 'Preview text', '--dry-run', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.appendedText).toContain('Preview text');
    expect(output.appendedText).toContain(`[${getTodayIso()}]`);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('taskdn append-body > edge cases', () => {
  test('handles multiline input', async () => {
    const taskPath = createTestTask('task.md');

    const multilineText = 'Line one\nLine two\nLine three';
    const { exitCode } = await runCli(['append-body', taskPath, multilineText], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('Line one');
    expect(content).toContain('Line two');
    expect(content).toContain('Line three');
  });

  test('handles markdown syntax in input', async () => {
    const taskPath = createTestTask('task.md');

    const markdownText = '## Heading\n\n- Bullet 1\n- Bullet 2\n\n**Bold** and *italic*';
    const { exitCode } = await runCli(['append-body', taskPath, markdownText], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('## Heading');
    expect(content).toContain('- Bullet 1');
    expect(content).toContain('**Bold**');
  });

  test('handles code blocks in input', async () => {
    const taskPath = createTestTask('task.md');

    const codeText = '```javascript\nconst x = 42;\n```';
    const { exitCode } = await runCli(['append-body', taskPath, codeText], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('```javascript');
    expect(content).toContain('const x = 42;');
    expect(content).toContain('```');
  });

  test('handles special characters in input', async () => {
    const taskPath = createTestTask('task.md');

    const specialText = 'Test $pecial ch@rs: &, <, >, ", \', [, ], {, }';
    const { exitCode } = await runCli(['append-body', taskPath, specialText], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain(specialText);
  });

  test('appends to file with empty body', async () => {
    const taskPath = createTestTask('task.md'); // No body

    const { exitCode } = await runCli(['append-body', taskPath, 'First content'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('First content');

    // Should have proper spacing after frontmatter
    const lines = content.split('\n');
    const frontmatterEndIndex = lines.findIndex((line, idx) => idx > 0 && line === '---');
    expect(frontmatterEndIndex).toBeGreaterThan(0);

    // After frontmatter end, should have blank lines before content
    const afterFrontmatter = lines.slice(frontmatterEndIndex + 1).join('\n');
    expect(afterFrontmatter).toMatch(/^\s*\n\s*First content/);
  });

  test('appends to file with existing body', async () => {
    const taskPath = createTestTask('task.md', {
      body: 'Existing paragraph.\n\nAnother paragraph.',
    });

    const { exitCode } = await runCli(['append-body', taskPath, 'New paragraph'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(0);

    const content = readFileSync(taskPath, 'utf-8');
    expect(content).toContain('Existing paragraph.');
    expect(content).toContain('Another paragraph.');
    expect(content).toContain('New paragraph');

    // Should have blank line before new content
    expect(content).toMatch(/Another paragraph\.\s*\n\s*\nNew paragraph/);
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('taskdn append-body > error handling', () => {
  test('errors when file does not exist', async () => {
    const { stderr, exitCode } = await runCli(
      ['append-body', join(tasksDir, 'nonexistent.md'), 'Note', '--json'],
      {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain('NOT_FOUND');
  });

  test('errors with malformed frontmatter', async () => {
    const taskPath = join(tasksDir, 'malformed.md');
    writeFileSync(taskPath, '---\ntitle: Test\n\nNo closing delimiter');

    const { stderr, exitCode } = await runCli(['append-body', taskPath, 'Note', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(1);
    const errorOutput = JSON.parse(stderr);
    expect(errorOutput.error).toBe(true);
    expect(errorOutput.code).toContain('Failure');
  });

  test('errors with missing frontmatter', async () => {
    const taskPath = join(tasksDir, 'no-frontmatter.md');
    writeFileSync(taskPath, 'Just plain text without frontmatter');

    const { stderr, exitCode } = await runCli(['append-body', taskPath, 'Note', '--json'], {
      useFixtureVault: false,
    });

    expect(exitCode).toBe(1);
    const errorOutput = JSON.parse(stderr);
    expect(errorOutput.error).toBe(true);
    expect(errorOutput.code).toContain('Failure');
  });
});
