import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { runCli } from '../helpers/cli';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock date for deterministic testing of natural language dates
const MOCK_TODAY = '2025-06-15';

// Create a temporary vault for testing write operations
let tempDir: string;
let tasksDir: string;
let projectsDir: string;
let areasDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'taskdn-test-'));
  tasksDir = join(tempDir, 'tasks');
  projectsDir = join(tempDir, 'projects');
  areasDir = join(tempDir, 'areas');
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('taskdn new', () => {
  describe('task creation', () => {
    test('creates task with minimal args', async () => {
      const { stdout, exitCode } = await runCli(['new', 'Test Task', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.created).toBe(true);
      expect(output.task.title).toBe('Test Task');
      expect(output.task.status).toBe('inbox');
      expect(output.task.path).toContain('test-task.md');
    });

    test('generates slug filename from title', async () => {
      const { stdout, exitCode } = await runCli(['new', 'Hello World Task!', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.task.path).toContain('hello-world-task.md');
    });

    test('handles duplicate filenames with suffix', async () => {
      // Create first task
      await runCli(['new', 'Duplicate Title', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      // Create second task with same title
      const { stdout, exitCode } = await runCli(['new', 'Duplicate Title', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.task.path).toContain('duplicate-title-1.md');
    });

    test('sets created-at and updated-at', async () => {
      const { stdout, exitCode } = await runCli(['new', 'Timestamped Task', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.task.createdAt).toBeDefined();
      expect(output.task.updatedAt).toBeDefined();
    });

    test('defaults to inbox status', async () => {
      const { stdout, exitCode } = await runCli(['new', 'Default Status Task', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.task.status).toBe('inbox');
    });

    test('creates task with all options', async () => {
      const { stdout, exitCode } = await runCli(
        [
          'new',
          'Full Task',
          '--status',
          'ready',
          '--project',
          'Q1 Planning',
          '--area',
          'Work',
          '--due',
          '2025-01-20',
          '--scheduled',
          '2025-01-15',
          '--json',
        ],
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
      expect(output.task.title).toBe('Full Task');
      expect(output.task.status).toBe('ready');
      expect(output.task.project).toBe('[[Q1 Planning]]');
      expect(output.task.area).toBe('[[Work]]');
      expect(output.task.due).toBe('2025-01-20');
      expect(output.task.scheduled).toBe('2025-01-15');
    });

    test('converts natural language dates to ISO 8601', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'Due Tomorrow', '--due', 'tomorrow', '--json'],
        {
          useFixtureVault: false,
          env: {
            TASKDN_TASKS_DIR: tasksDir,
            TASKDN_PROJECTS_DIR: projectsDir,
            TASKDN_AREAS_DIR: areasDir,
            TASKDN_MOCK_DATE: MOCK_TODAY,
          },
        }
      );

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      // Tomorrow from 2025-06-15 is 2025-06-16
      expect(output.task.due).toBe('2025-06-16');
    });

    test('converts weekday names to ISO 8601', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'Due Friday', '--due', 'friday', '--json'],
        {
          useFixtureVault: false,
          env: {
            TASKDN_TASKS_DIR: tasksDir,
            TASKDN_PROJECTS_DIR: projectsDir,
            TASKDN_AREAS_DIR: areasDir,
            TASKDN_MOCK_DATE: MOCK_TODAY, // 2025-06-15 is a Sunday
          },
        }
      );

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      // Next Friday from 2025-06-15 (Sunday) is 2025-06-20
      expect(output.task.due).toBe('2025-06-20');
    });

    test('converts relative days to ISO 8601', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'Due In 3 Days', '--due', '+3d', '--json'],
        {
          useFixtureVault: false,
          env: {
            TASKDN_TASKS_DIR: tasksDir,
            TASKDN_PROJECTS_DIR: projectsDir,
            TASKDN_AREAS_DIR: areasDir,
            TASKDN_MOCK_DATE: MOCK_TODAY,
          },
        }
      );

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      // +3d from 2025-06-15 is 2025-06-18
      expect(output.task.due).toBe('2025-06-18');
    });

    test('errors in AI mode with no title', async () => {
      const { stderr, exitCode } = await runCli(['new', '--ai'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(2);
      const error = JSON.parse(stderr);
      expect(error.error).toBe('MISSING_ARGUMENT');
      expect(error.message).toContain('Title or entity type is required');
    });

    test('writes valid frontmatter to file', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'Check File Content', '--project', 'Test Project', '--json'],
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
      const filePath = output.task.path;
      const content = readFileSync(filePath, 'utf-8');

      expect(content).toContain('title: Check File Content');
      expect(content).toContain('status: inbox');
      expect(content).toContain("'[[Test Project]]'");
      expect(content).toContain('created-at:');
      expect(content).toContain('updated-at:');
    });
  });

  describe('project creation', () => {
    test('creates project file', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'project', 'Q1 Planning', '--json'],
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
      expect(output.created).toBe(true);
      expect(output.project.title).toBe('Q1 Planning');
      expect(output.project.path).toContain('q1-planning.md');
    });

    test('sets area reference correctly', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'project', 'Test Project', '--area', 'Work', '--json'],
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
      expect(output.project.area).toBe('[[Work]]');
    });

    test('handles optional status', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'project', 'Planning Project', '--status', 'planning', '--json'],
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
      expect(output.project.status).toBe('planning');
    });

    test('errors with no project title', async () => {
      const { stderr, exitCode } = await runCli(['new', 'project', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(2);
      expect(stderr).toContain('title');
    });
  });

  describe('area creation', () => {
    test('creates area file', async () => {
      const { stdout, exitCode } = await runCli(['new', 'area', 'Work', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.created).toBe(true);
      expect(output.area.title).toBe('Work');
      expect(output.area.path).toContain('work.md');
    });

    test('sets type field if provided', async () => {
      const { stdout, exitCode } = await runCli(
        ['new', 'area', 'Acme Corp', '--type', 'client', '--json'],
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
      expect(output.area.areaType).toBe('client');
    });

    test('defaults status to active', async () => {
      const { stdout, exitCode } = await runCli(['new', 'area', 'Default Area', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.area.status).toBe('active');
    });

    test('errors with no area title', async () => {
      const { stderr, exitCode } = await runCli(['new', 'area', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(2);
      expect(stderr).toContain('title');
    });
  });

  describe('output modes', () => {
    test('human mode shows confirmation', async () => {
      const { stdout, exitCode } = await runCli(['new', 'Human Output Task'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Task created');
      expect(stdout).toContain('Human Output Task');
    });

    test('AI mode shows structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['new', 'AI Output Task', '--ai'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Task Created');
      expect(stdout).toContain('### AI Output Task');
      expect(stdout).toContain('- **path:**');
      expect(stdout).toContain('- **status:**');
    });

    test('JSON mode shows machine-readable output', async () => {
      const { stdout, exitCode } = await runCli(['new', 'JSON Output Task', '--json'], {
        useFixtureVault: false,
        env: {
          TASKDN_TASKS_DIR: tasksDir,
          TASKDN_PROJECTS_DIR: projectsDir,
          TASKDN_AREAS_DIR: areasDir,
        },
      });

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.summary).toContain('Created task');
      expect(output.created).toBe(true);
      expect(output.task).toBeDefined();
    });
  });
});

describe('singular and plural entity types', () => {
  test('accepts "project" (singular)', async () => {
    const { stdout, exitCode} = await runCli(['new', 'project', 'Test Project Singular', '--json'], {
      useFixtureVault: false,
      env: {
        TASKDN_TASKS_DIR: tasksDir,
        TASKDN_PROJECTS_DIR: projectsDir,
        TASKDN_AREAS_DIR: areasDir,
      },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.project).toBeDefined();
    expect(output.project.title).toBe('Test Project Singular');
  });

  test('accepts "projects" (plural)', async () => {
    const { stdout, exitCode } = await runCli(['new', 'projects', 'Test Project Plural', '--json'], {
      useFixtureVault: false,
      env: {
        TASKDN_TASKS_DIR: tasksDir,
        TASKDN_PROJECTS_DIR: projectsDir,
        TASKDN_AREAS_DIR: areasDir,
      },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.project).toBeDefined();
    expect(output.project.title).toBe('Test Project Plural');
  });

  test('accepts "area" (singular)', async () => {
    const { stdout, exitCode } = await runCli(['new', 'area', 'Test Area Singular', '--json'], {
      useFixtureVault: false,
      env: {
        TASKDN_TASKS_DIR: tasksDir,
        TASKDN_PROJECTS_DIR: projectsDir,
        TASKDN_AREAS_DIR: areasDir,
      },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.area).toBeDefined();
    expect(output.area.title).toBe('Test Area Singular');
  });

  test('accepts "areas" (plural)', async () => {
    const { stdout, exitCode } = await runCli(['new', 'areas', 'Test Area Plural', '--json'], {
      useFixtureVault: false,
      env: {
        TASKDN_TASKS_DIR: tasksDir,
        TASKDN_PROJECTS_DIR: projectsDir,
        TASKDN_AREAS_DIR: areasDir,
      },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.area).toBeDefined();
    expect(output.area.title).toBe('Test Area Plural');
  });
});

describe('new project date flags', () => {
  test('--start-date flag works', async () => {
    const { stdout, exitCode } = await runCli(
      ['new', 'project', 'Project With Start', '--start-date', '2025-03-01', '--json'],
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
    expect(output.project.startDate).toBe('2025-03-01');
  });

  test('--end-date flag works', async () => {
    const { stdout, exitCode } = await runCli(
      ['new', 'project', 'Project With End', '--end-date', '2025-06-30', '--json'],
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
    expect(output.project.endDate).toBe('2025-06-30');
  });

  test('both --start-date and --end-date together', async () => {
    const { stdout, exitCode } = await runCli(
      [
        'new',
        'project',
        'Q1 Project',
        '--start-date',
        '2025-01-01',
        '--end-date',
        '2025-03-31',
        '--json',
      ],
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
    expect(output.project.startDate).toBe('2025-01-01');
    expect(output.project.endDate).toBe('2025-03-31');
  });

  test('combines with other project options', async () => {
    const { stdout, exitCode } = await runCli(
      [
        'new',
        'project',
        'Full Project',
        '--status',
        'planning',
        '--area',
        'Work',
        '--start-date',
        '2025-02-01',
        '--end-date',
        '2025-04-30',
        '--json',
      ],
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
    expect(output.project.title).toBe('Full Project');
    expect(output.project.status).toBe('planning');
    expect(output.project.area).toContain('Work');
    expect(output.project.startDate).toBe('2025-02-01');
    expect(output.project.endDate).toBe('2025-04-30');
  });
});
