import { describe, test, expect } from 'bun:test';
import { runCli, fixturePath } from '../helpers/cli';

describe('taskdn list', () => {
  describe('default behavior (active tasks)', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['list']);
      expect(exitCode).toBe(0);
    });

    test('lists active tasks in human mode', async () => {
      const { stdout } = await runCli(['list']);
      // Active tasks should be included
      expect(stdout).toContain('Minimal Task');
      expect(stdout).toContain('Full Metadata Task');
    });

    test('excludes done tasks by default', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'done')).toBe(true);
    });

    test('excludes dropped tasks by default', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'dropped')).toBe(true);
    });

    test('excludes icebox tasks by default', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.every((t: { status: string }) => t.status !== 'icebox')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows task count in header', async () => {
      const { stdout } = await runCli(['list']);
      // Should show something like "Tasks (N)"
      expect(stdout).toMatch(/Tasks \(\d+\)/);
    });

    test('shows task titles', async () => {
      const { stdout } = await runCli(['list']);
      expect(stdout).toContain('Minimal Task');
    });

    test('shows task status', async () => {
      const { stdout } = await runCli(['list']);
      // Should show status information
      expect(stdout.toLowerCase()).toMatch(/ready|in-progress|blocked|inbox/);
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['list', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Tasks');
    });

    test('includes path field for each task', async () => {
      const { stdout } = await runCli(['list', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('includes status field for each task', async () => {
      const { stdout } = await runCli(['list', '--ai']);
      expect(stdout).toContain('- **status:**');
    });

    test('uses task title as heading', async () => {
      const { stdout } = await runCli(['list', '--ai']);
      expect(stdout).toContain('### Minimal Task');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['list', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes tasks array', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.tasks)).toBe(true);
    });

    test('each task has required fields', async () => {
      const { stdout } = await runCli(['list', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      for (const task of output.tasks) {
        expect(task.path).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
      }
    });
  });

  describe('empty results', () => {
    test('returns exit code 0 for empty result', async () => {
      // Use a filter that matches nothing
      const { exitCode } = await runCli(['list', '--status', 'nonexistent']);
      expect(exitCode).toBe(0);
    });

    test('JSON mode returns empty array with summary', async () => {
      const { stdout } = await runCli(['list', '--status', 'nonexistent', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks).toEqual([]);
      expect(output.summary).toBeDefined();
    });

    test('AI mode indicates no matches', async () => {
      const { stdout } = await runCli(['list', '--status', 'nonexistent', '--ai']);
      expect(stdout).toContain('Tasks (0)');
    });
  });

  describe('--status filter', () => {
    test('filters by single status', async () => {
      const { stdout } = await runCli(['list', '--status', 'ready', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(output.tasks.every((t: { status: string }) => t.status === 'ready')).toBe(true);
    });

    test('filters by multiple statuses (OR logic)', async () => {
      const { stdout } = await runCli(['list', '--status', 'ready,in-progress', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(
        output.tasks.every(
          (t: { status: string }) => t.status === 'ready' || t.status === 'in-progress'
        )
      ).toBe(true);
    });

    test('returns empty when status matches nothing', async () => {
      // Use a status that exists but no active tasks have it in fixtures
      const { stdout, exitCode } = await runCli(['list', '--status', 'nonexistent', '--json']);
      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.tasks).toEqual([]);
    });

    test('works in AI mode', async () => {
      const { stdout } = await runCli(['list', '--status', 'ready', '--ai']);
      expect(stdout).toContain('## Tasks');
      expect(stdout).toContain('Minimal Task');
    });

    test('works in human mode', async () => {
      const { stdout } = await runCli(['list', '--status', 'in-progress']);
      expect(stdout).toContain('in-progress');
      expect(stdout).toContain('Full Metadata Task');
    });
  });

  describe('--project filter', () => {
    test('filters by project name (substring match)', async () => {
      const { stdout } = await runCli(['list', '--project', 'Test', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(
        output.tasks.every((t: { project?: string }) => t.project?.toLowerCase().includes('test'))
      ).toBe(true);
    });

    test('is case-insensitive', async () => {
      const { stdout: upper } = await runCli(['list', '--project', 'TEST', '--json']);
      const { stdout: lower } = await runCli(['list', '--project', 'test', '--json']);
      expect(JSON.parse(upper).tasks.length).toBe(JSON.parse(lower).tasks.length);
    });

    test('returns empty when no tasks match project', async () => {
      const { stdout, exitCode } = await runCli(['list', '--project', 'nonexistent', '--json']);
      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.tasks).toEqual([]);
    });
  });

  describe('--area filter', () => {
    test('filters by area name (substring match)', async () => {
      const { stdout } = await runCli(['list', '--area', 'Work', '--json']);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(
        output.tasks.every((t: { area?: string }) => t.area?.toLowerCase().includes('work'))
      ).toBe(true);
    });

    test('is case-insensitive', async () => {
      const { stdout: upper } = await runCli(['list', '--area', 'WORK', '--json']);
      const { stdout: lower } = await runCli(['list', '--area', 'work', '--json']);
      expect(JSON.parse(upper).tasks.length).toBe(JSON.parse(lower).tasks.length);
    });

    test('returns empty when no tasks match area', async () => {
      const { stdout, exitCode } = await runCli(['list', '--area', 'nonexistent', '--json']);
      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout);
      expect(output.tasks).toEqual([]);
    });
  });

  describe('combined filters', () => {
    test('--project AND --area uses AND logic', async () => {
      const { stdout } = await runCli(['list', '--project', 'Test', '--area', 'Work', '--json']);
      const output = JSON.parse(stdout);
      // Full Metadata Task has both project=Test Project and area=Work
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(
        output.tasks.every(
          (t: { project?: string; area?: string }) =>
            t.project?.toLowerCase().includes('test') && t.area?.toLowerCase().includes('work')
        )
      ).toBe(true);
    });

    test('--status AND --project uses AND logic', async () => {
      const { stdout } = await runCli([
        'list',
        '--status',
        'in-progress',
        '--project',
        'Test',
        '--json',
      ]);
      const output = JSON.parse(stdout);
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(
        output.tasks.every(
          (t: { status: string; project?: string }) =>
            t.status === 'in-progress' && t.project?.toLowerCase().includes('test')
        )
      ).toBe(true);
    });
  });
});

describe('taskdn list projects', () => {
  describe('default behavior (active projects)', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['list', 'projects']);
      expect(exitCode).toBe(0);
    });

    test('lists active projects in human mode', async () => {
      const { stdout } = await runCli(['list', 'projects']);
      expect(stdout).toContain('Minimal Project');
      expect(stdout).toContain('Projects');
    });

    test('includes projects without status (treated as active)', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      // Project Without Status should be included
      expect(output.projects.some((p: { title: string }) => p.title === 'Project Without Status')).toBe(
        true
      );
    });

    test('excludes done projects', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(output.projects.every((p: { status?: string }) => p.status !== 'done')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows project count in header', async () => {
      const { stdout } = await runCli(['list', 'projects']);
      expect(stdout).toMatch(/Projects \(\d+\)/);
    });

    test('shows project titles', async () => {
      const { stdout } = await runCli(['list', 'projects']);
      expect(stdout).toContain('Minimal Project');
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['list', 'projects', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Projects');
    });

    test('includes path field for each project', async () => {
      const { stdout } = await runCli(['list', 'projects', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('uses project title as heading', async () => {
      const { stdout } = await runCli(['list', 'projects', '--ai']);
      expect(stdout).toContain('### Minimal Project');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['list', 'projects', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes projects array', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.projects)).toBe(true);
    });

    test('each project has required fields', async () => {
      const { stdout } = await runCli(['list', 'projects', '--json']);
      const output = JSON.parse(stdout);
      expect(output.projects.length).toBeGreaterThan(0);
      for (const project of output.projects) {
        expect(project.path).toBeDefined();
        expect(project.title).toBeDefined();
      }
    });
  });
});

describe('taskdn list areas', () => {
  describe('default behavior (active areas)', () => {
    test('returns exit code 0', async () => {
      const { exitCode } = await runCli(['list', 'areas']);
      expect(exitCode).toBe(0);
    });

    test('lists active areas in human mode', async () => {
      const { stdout } = await runCli(['list', 'areas']);
      expect(stdout).toContain('Minimal Area');
      expect(stdout).toContain('Areas');
    });

    test('includes areas without status (treated as active)', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      // Minimal Area has no status and should be included
      expect(output.areas.some((a: { title: string }) => a.title === 'Minimal Area')).toBe(true);
    });

    test('includes areas with status=active', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      // Full Metadata Area has status: active and should be included
      expect(output.areas.some((a: { title: string }) => a.title === 'Full Metadata Area')).toBe(true);
    });

    test('excludes archived areas', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(output.areas.every((a: { status?: string }) => a.status !== 'archived')).toBe(true);
    });
  });

  describe('human mode output', () => {
    test('shows area count in header', async () => {
      const { stdout } = await runCli(['list', 'areas']);
      expect(stdout).toMatch(/Areas \(\d+\)/);
    });

    test('shows area titles', async () => {
      const { stdout } = await runCli(['list', 'areas']);
      expect(stdout).toContain('Minimal Area');
    });
  });

  describe('AI mode (--ai)', () => {
    test('outputs structured markdown', async () => {
      const { stdout, exitCode } = await runCli(['list', 'areas', '--ai']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('## Areas');
    });

    test('includes path field for each area', async () => {
      const { stdout } = await runCli(['list', 'areas', '--ai']);
      expect(stdout).toContain('- **path:**');
    });

    test('uses area title as heading', async () => {
      const { stdout } = await runCli(['list', 'areas', '--ai']);
      expect(stdout).toContain('### Minimal Area');
    });
  });

  describe('JSON mode (--json)', () => {
    test('outputs valid JSON', async () => {
      const { stdout, exitCode } = await runCli(['list', 'areas', '--json']);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test('includes summary field', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(output.summary).toBeDefined();
    });

    test('includes areas array', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(Array.isArray(output.areas)).toBe(true);
    });

    test('each area has required fields', async () => {
      const { stdout } = await runCli(['list', 'areas', '--json']);
      const output = JSON.parse(stdout);
      expect(output.areas.length).toBeGreaterThan(0);
      for (const area of output.areas) {
        expect(area.path).toBeDefined();
        expect(area.title).toBeDefined();
      }
    });
  });
});

// ============================================================================
// Phase 6: Date Filters
// ============================================================================

// Fixtures use these dates:
// - due-fixed-date.md: due: 2025-06-15
// - due-tomorrow.md: due: 2025-06-16
// - due-this-week.md: due: 2025-06-18
// - due-past.md: due: 2020-01-01 (always overdue)
// - scheduled-fixed-date.md: scheduled: 2025-06-15
// - full-metadata.md: due: 2025-01-20, scheduled: 2025-01-18

// We mock "today" as 2025-06-15 (a Sunday) for predictable date comparisons
// End of week (Sunday) from 2025-06-15 is 2025-06-15 itself
// So "this-week" on 2025-06-15 means just that day (Sunday)
// Let's mock it as 2025-06-16 (a Monday) instead for better testing
// End of week from Monday 2025-06-16 is Sunday 2025-06-22
// So "this-week" includes 2025-06-16 through 2025-06-22

const MOCK_TODAY = '2025-06-16';

describe('taskdn list --due filter', () => {
  test('--due today returns tasks due on mocked date', async () => {
    const { stdout, exitCode } = await runCli(['list', '--due', 'today', '--json'], {
      env: { TASKDN_MOCK_DATE: MOCK_TODAY },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    expect(output.tasks.every((t: { due: string }) => t.due === MOCK_TODAY)).toBe(true);
  });

  test('--due tomorrow returns tasks due on tomorrow', async () => {
    const { stdout, exitCode } = await runCli(['list', '--due', 'tomorrow', '--json'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    // Tomorrow from 2025-06-15 is 2025-06-16
    expect(output.tasks.every((t: { due: string }) => t.due === '2025-06-16')).toBe(true);
  });

  test('--due this-week returns tasks due within the current week', async () => {
    // Mock today as Monday 2025-06-16, week ends Sunday 2025-06-22
    const { stdout, exitCode } = await runCli(['list', '--due', 'this-week', '--json'], {
      env: { TASKDN_MOCK_DATE: '2025-06-16' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    // Should include tasks due between 2025-06-16 and 2025-06-22
    expect(
      output.tasks.every((t: { due: string }) => t.due >= '2025-06-16' && t.due <= '2025-06-22')
    ).toBe(true);
  });

  test('returns empty when no tasks are due on that date', async () => {
    // Mock a date where no fixtures have tasks due
    const { stdout, exitCode } = await runCli(['list', '--due', 'today', '--json'], {
      env: { TASKDN_MOCK_DATE: '2099-01-01' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks).toEqual([]);
  });

  test('works in AI mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--due', 'today', '--ai'], {
      env: { TASKDN_MOCK_DATE: MOCK_TODAY },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Tasks');
  });

  test('works in human mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--due', 'today'], {
      env: { TASKDN_MOCK_DATE: MOCK_TODAY },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Task Due Tomorrow'); // due-tomorrow.md has due: 2025-06-16
  });
});

describe('taskdn list --overdue filter', () => {
  test('returns tasks with due date before today', async () => {
    const { stdout, exitCode } = await runCli(['list', '--overdue', '--json'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    // All tasks should have due date before the mock date
    expect(output.tasks.every((t: { due: string }) => t.due < '2025-06-15')).toBe(true);
  });

  test('excludes tasks without due date', async () => {
    const { stdout } = await runCli(['list', '--overdue', '--json'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    const output = JSON.parse(stdout);
    // All tasks should have a due date
    expect(output.tasks.every((t: { due?: string }) => t.due !== undefined)).toBe(true);
  });

  test('includes only active tasks (not done/dropped)', async () => {
    const { stdout } = await runCli(['list', '--overdue', '--json'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    const output = JSON.parse(stdout);
    expect(
      output.tasks.every((t: { status: string }) => t.status !== 'done' && t.status !== 'dropped')
    ).toBe(true);
  });

  test('returns empty when no tasks are overdue', async () => {
    // Mock a date in the past where no fixtures would be overdue
    const { stdout, exitCode } = await runCli(['list', '--overdue', '--json'], {
      env: { TASKDN_MOCK_DATE: '2019-01-01' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks).toEqual([]);
  });

  test('works in AI mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--overdue', '--ai'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Tasks');
  });

  test('works in human mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--overdue'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Task Due In Past');
  });
});

describe('taskdn list --scheduled filter', () => {
  test('--scheduled today returns tasks scheduled for mocked date', async () => {
    const { stdout, exitCode } = await runCli(['list', '--scheduled', 'today', '--json'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    expect(output.tasks.every((t: { scheduled: string }) => t.scheduled === '2025-06-15')).toBe(
      true
    );
  });

  test('returns empty when no tasks are scheduled for that date', async () => {
    const { stdout, exitCode } = await runCli(['list', '--scheduled', 'today', '--json'], {
      env: { TASKDN_MOCK_DATE: '2099-01-01' },
    });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks).toEqual([]);
  });

  test('works in AI mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--scheduled', 'today', '--ai'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Tasks');
  });

  test('works in human mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--scheduled', 'today'], {
      env: { TASKDN_MOCK_DATE: '2025-06-15' },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Task Scheduled Fixed Date');
  });
});

describe('date filter combinations', () => {
  test('--due today AND --status ready uses AND logic', async () => {
    const { stdout, exitCode } = await runCli(
      ['list', '--due', 'today', '--status', 'ready', '--json'],
      {
        env: { TASKDN_MOCK_DATE: MOCK_TODAY },
      }
    );
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(
      output.tasks.every(
        (t: { due: string; status: string }) => t.due === MOCK_TODAY && t.status === 'ready'
      )
    ).toBe(true);
  });

  test('--overdue AND --project uses AND logic', async () => {
    // There's no task that is both overdue AND has a specific project in fixtures
    // So this should return empty (but still exit 0)
    const { stdout, exitCode } = await runCli(
      ['list', '--overdue', '--project', 'Nonexistent', '--json'],
      {
        env: { TASKDN_MOCK_DATE: '2025-06-15' },
      }
    );
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks).toEqual([]);
  });
});

// ============================================================================
// Phase 7: Sorting and Limits
// ============================================================================

describe('taskdn list --sort flag', () => {
  test('sorts by due date ascending by default', async () => {
    const { stdout, exitCode } = await runCli(['list', '--sort', 'due', '--json']);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    const withDue = output.tasks.filter((t: { due?: string }) => t.due);
    expect(withDue.length).toBeGreaterThan(0);
    for (let i = 1; i < withDue.length; i++) {
      expect(withDue[i].due >= withDue[i - 1].due).toBe(true);
    }
  });

  test('sorts by created date ascending', async () => {
    const { stdout, exitCode } = await runCli(['list', '--sort', 'created', '--json']);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    const withCreated = output.tasks.filter((t: { createdAt?: string }) => t.createdAt);
    expect(withCreated.length).toBeGreaterThan(0);
    for (let i = 1; i < withCreated.length; i++) {
      expect(withCreated[i].createdAt >= withCreated[i - 1].createdAt).toBe(true);
    }
  });

  test('sorts by title alphabetically', async () => {
    const { stdout, exitCode } = await runCli(['list', '--sort', 'title', '--json']);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(1);
    for (let i = 1; i < output.tasks.length; i++) {
      expect(
        output.tasks[i].title.toLowerCase() >= output.tasks[i - 1].title.toLowerCase()
      ).toBe(true);
    }
  });

  test('items without sort field appear last', async () => {
    const { stdout } = await runCli(['list', '--sort', 'due', '--json']);
    const output = JSON.parse(stdout);
    const lastWithDue = output.tasks.reduce(
      (lastIdx: number, t: { due?: string }, idx: number) => (t.due ? idx : lastIdx),
      -1
    );
    const firstWithoutDue = output.tasks.findIndex((t: { due?: string }) => !t.due);
    if (lastWithDue !== -1 && firstWithoutDue !== -1) {
      expect(lastWithDue).toBeLessThan(firstWithoutDue);
    }
  });

  test('works in AI mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--sort', 'title', '--ai']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Tasks');
  });

  test('works in human mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--sort', 'title']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Tasks');
  });
});

describe('taskdn list --desc flag', () => {
  test('reverses sort order for title', async () => {
    const { stdout, exitCode } = await runCli(['list', '--sort', 'title', '--desc', '--json']);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(1);
    for (let i = 1; i < output.tasks.length; i++) {
      expect(
        output.tasks[i].title.toLowerCase() <= output.tasks[i - 1].title.toLowerCase()
      ).toBe(true);
    }
  });

  test('reverses sort order for due date', async () => {
    const { stdout } = await runCli(['list', '--sort', 'due', '--desc', '--json']);
    const output = JSON.parse(stdout);
    const withDue = output.tasks.filter((t: { due?: string }) => t.due);
    expect(withDue.length).toBeGreaterThan(0);
    for (let i = 1; i < withDue.length; i++) {
      expect(withDue[i].due <= withDue[i - 1].due).toBe(true);
    }
  });

  test('items without sort field still appear last when descending', async () => {
    const { stdout } = await runCli(['list', '--sort', 'due', '--desc', '--json']);
    const output = JSON.parse(stdout);
    const lastWithDue = output.tasks.reduce(
      (lastIdx: number, t: { due?: string }, idx: number) => (t.due ? idx : lastIdx),
      -1
    );
    const firstWithoutDue = output.tasks.findIndex((t: { due?: string }) => !t.due);
    if (lastWithDue !== -1 && firstWithoutDue !== -1) {
      expect(lastWithDue).toBeLessThan(firstWithoutDue);
    }
  });
});

describe('taskdn list --limit flag', () => {
  test('limits number of results', async () => {
    const { stdout, exitCode } = await runCli(['list', '--limit', '2', '--json']);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeLessThanOrEqual(2);
  });

  test('limit is applied after sorting', async () => {
    // Get all tasks sorted by title
    const { stdout: allStdout } = await runCli(['list', '--sort', 'title', '--json']);
    const allOutput = JSON.parse(allStdout);

    // Get limited tasks sorted by title
    const { stdout: limitedStdout } = await runCli([
      'list',
      '--sort',
      'title',
      '--limit',
      '2',
      '--json',
    ]);
    const limitedOutput = JSON.parse(limitedStdout);

    expect(limitedOutput.tasks.length).toBeLessThanOrEqual(2);
    // The limited results should be the first 2 from the full sorted list
    if (allOutput.tasks.length >= 2) {
      expect(limitedOutput.tasks[0].title).toBe(allOutput.tasks[0].title);
      expect(limitedOutput.tasks[1].title).toBe(allOutput.tasks[1].title);
    }
  });

  test('returns all if limit exceeds count', async () => {
    const { stdout: allStdout } = await runCli(['list', '--json']);
    const allOutput = JSON.parse(allStdout);

    const { stdout: limitedStdout } = await runCli(['list', '--limit', '1000', '--json']);
    const limitedOutput = JSON.parse(limitedStdout);

    expect(limitedOutput.tasks.length).toBe(allOutput.tasks.length);
  });

  test('works with other filters', async () => {
    const { stdout, exitCode } = await runCli([
      'list',
      '--status',
      'ready',
      '--sort',
      'title',
      '--limit',
      '2',
      '--json',
    ]);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeLessThanOrEqual(2);
    expect(output.tasks.every((t: { status: string }) => t.status === 'ready')).toBe(true);
  });

  test('works in AI mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--limit', '2', '--ai']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('## Tasks');
  });

  test('works in human mode', async () => {
    const { stdout, exitCode } = await runCli(['list', '--limit', '2']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Tasks');
  });
});
