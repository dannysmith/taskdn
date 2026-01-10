/**
 * Test helpers for vault data
 *
 * Provides factory functions for creating test data and utilities
 * for working with test fixtures.
 */

import type {
  Task,
  TaskStatus,
  Project,
  ProjectStatus,
  Area,
  AreaStatus,
} from '@/lib/tauri-bindings'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

// ============================================================================
// Constants
// ============================================================================

/**
 * Path to the static test fixtures vault
 */
export const FIXTURE_VAULT_PATH = path.resolve(
  __dirname,
  '../fixtures/vault'
) as string

// ============================================================================
// Factory Functions
// ============================================================================

let taskCounter = 0
let projectCounter = 0
let areaCounter = 0

/**
 * Reset factory counters (call in beforeEach to ensure deterministic IDs)
 */
export function resetFactoryCounters(): void {
  taskCounter = 0
  projectCounter = 0
  areaCounter = 0
}

/**
 * Create a test task with sensible defaults
 *
 * @example
 * ```typescript
 * const task = createTestTask({ status: 'done', title: 'Completed task' })
 * ```
 */
export function createTestTask(overrides?: Partial<Task>): Task {
  const id = `test-task-${++taskCounter}`
  const now = '2025-01-15' // Fixed date for deterministic tests

  return {
    id,
    path: `/test/tasks/${id}.md`,
    title: `Test Task ${taskCounter}`,
    status: 'inbox' as TaskStatus,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    due: null,
    scheduled: null,
    deferUntil: null,
    area: null,
    project: null,
    body: '',
    ...overrides,
  }
}

/**
 * Create a test project with sensible defaults
 *
 * @example
 * ```typescript
 * const project = createTestProject({ status: 'in-progress', title: 'Active project' })
 * ```
 */
export function createTestProject(overrides?: Partial<Project>): Project {
  const id = `test-project-${++projectCounter}`

  return {
    id,
    path: `/test/projects/${id}.md`,
    title: `Test Project ${projectCounter}`,
    status: null,
    area: null,
    startDate: null,
    endDate: null,
    description: null,
    blockedBy: null,
    body: '',
    ...overrides,
  }
}

/**
 * Create a test area with sensible defaults
 *
 * @example
 * ```typescript
 * const area = createTestArea({ title: 'Work', areaType: 'life-area' })
 * ```
 */
export function createTestArea(overrides?: Partial<Area>): Area {
  const id = `test-area-${++areaCounter}`

  return {
    id,
    path: `/test/areas/${id}.md`,
    title: `Test Area ${areaCounter}`,
    status: 'active' as AreaStatus,
    areaType: null,
    description: null,
    body: '',
    ...overrides,
  }
}

// ============================================================================
// Bulk Data Generation
// ============================================================================

export interface CreateTestVaultConfig {
  taskCount?: number
  projectCount?: number
  areaCount?: number
}

export interface TestVaultData {
  tasks: Task[]
  projects: Project[]
  areas: Area[]
}

/**
 * Create a test vault with bulk data
 *
 * @example
 * ```typescript
 * const { tasks, projects, areas } = createTestVault({
 *   taskCount: 10,
 *   projectCount: 3,
 *   areaCount: 2
 * })
 * ```
 */
export function createTestVault(config: CreateTestVaultConfig): TestVaultData {
  const {
    taskCount = 5,
    projectCount = 2,
    areaCount = 1,
  } = config

  const areas: Area[] = []
  const projects: Project[] = []
  const tasks: Task[] = []

  // Create areas first (so projects/tasks can reference them)
  for (let i = 0; i < areaCount; i++) {
    areas.push(createTestArea())
  }

  // Create projects (optionally linked to areas)
  for (let i = 0; i < projectCount; i++) {
    const area = areas[i % areas.length]
    projects.push(
      createTestProject({
        area: area ? `[[${area.title}]]` : null,
        status: (['planning', 'ready', 'in-progress'] as ProjectStatus[])[
          i % 3
        ],
      })
    )
  }

  // Create tasks with various statuses
  const taskStatuses: TaskStatus[] = [
    'inbox',
    'icebox',
    'ready',
    'in-progress',
    'blocked',
    'done',
    'dropped',
  ]
  for (let i = 0; i < taskCount; i++) {
    const project = projects[i % projects.length]
    tasks.push(
      createTestTask({
        status: taskStatuses[i % taskStatuses.length],
        project: project ? `[[${project.title}]]` : null,
      })
    )
  }

  return { tasks, projects, areas }
}

// ============================================================================
// Temporary Vault for Write Tests
// ============================================================================

/**
 * Execute a function with a temporary vault directory
 *
 * Creates a temp directory, executes the function, then cleans up.
 * Use this for tests that need to write files.
 *
 * @example
 * ```typescript
 * await withTempVault(async (vaultPath) => {
 *   // vaultPath has tasks/, projects/, areas/ subdirectories
 *   await writeTaskToVault(vaultPath, task)
 *   const loaded = await loadTaskFromVault(vaultPath, task.id)
 *   expect(loaded).toEqual(task)
 * })
 * ```
 */
export async function withTempVault(
  fn: (vaultPath: string) => Promise<void>
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdn-test-vault-'))

  try {
    // Create subdirectories
    fs.mkdirSync(path.join(tempDir, 'tasks'))
    fs.mkdirSync(path.join(tempDir, 'tasks', 'archive'))
    fs.mkdirSync(path.join(tempDir, 'projects'))
    fs.mkdirSync(path.join(tempDir, 'projects', 'archive'))
    fs.mkdirSync(path.join(tempDir, 'areas'))
    fs.mkdirSync(path.join(tempDir, 'areas', 'archive'))

    await fn(tempDir)
  } finally {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

/**
 * Copy fixture vault to a temp directory for write tests
 *
 * @example
 * ```typescript
 * await withTempVaultFromFixtures(async (vaultPath) => {
 *   // vaultPath contains copies of all fixture files
 *   await modifyTask(vaultPath, 'task-inbox-001', { status: 'ready' })
 * })
 * ```
 */
export async function withTempVaultFromFixtures(
  fn: (vaultPath: string) => Promise<void>
): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdn-test-vault-'))

  try {
    // Copy fixture vault to temp directory
    copyDirectoryRecursive(FIXTURE_VAULT_PATH, tempDir)

    await fn(tempDir)
  } finally {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function copyDirectoryRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// ============================================================================
// Fixture Data Loading
// ============================================================================

/**
 * Fixture file metadata (for loading without parsing)
 */
export interface FixtureFile {
  id: string
  path: string
  filename: string
}

/**
 * Get list of fixture task files
 */
export function getFixtureTaskFiles(): FixtureFile[] {
  return getFixtureFiles('tasks')
}

/**
 * Get list of fixture project files
 */
export function getFixtureProjectFiles(): FixtureFile[] {
  return getFixtureFiles('projects')
}

/**
 * Get list of fixture area files
 */
export function getFixtureAreaFiles(): FixtureFile[] {
  return getFixtureFiles('areas')
}

function getFixtureFiles(subdir: string): FixtureFile[] {
  const dir = path.join(FIXTURE_VAULT_PATH, subdir)
  const files: FixtureFile[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const filePath = path.join(dir, entry.name)
      const id = entry.name.replace('.md', '')
      files.push({
        id,
        path: filePath,
        filename: entry.name,
      })
    }
  }

  return files
}

/**
 * Get paths to fixture vault directories
 */
export function getFixtureVaultPaths(): {
  tasksDir: string
  projectsDir: string
  areasDir: string
} {
  return {
    tasksDir: path.join(FIXTURE_VAULT_PATH, 'tasks'),
    projectsDir: path.join(FIXTURE_VAULT_PATH, 'projects'),
    areasDir: path.join(FIXTURE_VAULT_PATH, 'areas'),
  }
}

// ============================================================================
// Pre-built Fixture Data
// ============================================================================

/**
 * IDs of all fixture tasks (non-archived)
 */
export const FIXTURE_TASK_IDS = [
  'task-inbox-001',
  'task-icebox-002',
  'task-ready-003',
  'task-in-progress-004',
  'task-blocked-005',
  'task-done-006',
  'task-dropped-007',
  'task-with-dates-008',
  'task-minimal-009',
  'task-unicode-010',
  'task-long-notes-011',
  'task-with-project-012',
  'task-with-area-013',
] as const

/**
 * IDs of all fixture projects (non-archived)
 */
export const FIXTURE_PROJECT_IDS = [
  'project-planning-001',
  'project-ready-002',
  'project-in-progress-003',
  'project-blocked-004',
  'project-paused-005',
  'project-done-006',
  'project-with-area-007',
  'project-empty-008',
] as const

/**
 * IDs of all fixture areas (non-archived)
 */
export const FIXTURE_AREA_IDS = [
  'area-active-001',
  'area-empty-002',
] as const

/**
 * Get expected count of fixture items
 */
export const FIXTURE_COUNTS = {
  tasks: FIXTURE_TASK_IDS.length,
  projects: FIXTURE_PROJECT_IDS.length,
  areas: FIXTURE_AREA_IDS.length,
  archivedTasks: 1,
  archivedProjects: 1,
  archivedAreas: 1,
} as const
