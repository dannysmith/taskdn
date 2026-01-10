import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTestTask,
  createTestProject,
  createTestArea,
  createTestVault,
  resetFactoryCounters,
  withTempVault,
  withTempVaultFromFixtures,
  getFixtureTaskFiles,
  getFixtureProjectFiles,
  getFixtureAreaFiles,
  getFixtureVaultPaths,
  FIXTURE_TASK_IDS,
  FIXTURE_PROJECT_IDS,
  FIXTURE_AREA_IDS,
  FIXTURE_COUNTS,
} from './vault'
import * as fs from 'node:fs'
import * as path from 'node:path'

describe('vault test helpers', () => {
  beforeEach(() => {
    resetFactoryCounters()
  })

  describe('createTestTask', () => {
    it('creates a task with default values', () => {
      const task = createTestTask()

      expect(task.id).toBe('test-task-1')
      expect(task.title).toBe('Test Task 1')
      expect(task.status).toBe('inbox')
      expect(task.createdAt).toBe('2025-01-15')
      expect(task.body).toBe('')
    })

    it('allows overriding default values', () => {
      const task = createTestTask({
        title: 'Custom Title',
        status: 'done',
        due: '2025-02-01',
      })

      expect(task.title).toBe('Custom Title')
      expect(task.status).toBe('done')
      expect(task.due).toBe('2025-02-01')
    })

    it('increments IDs for each task', () => {
      const task1 = createTestTask()
      const task2 = createTestTask()
      const task3 = createTestTask()

      expect(task1.id).toBe('test-task-1')
      expect(task2.id).toBe('test-task-2')
      expect(task3.id).toBe('test-task-3')
    })
  })

  describe('createTestProject', () => {
    it('creates a project with default values', () => {
      const project = createTestProject()

      expect(project.id).toBe('test-project-1')
      expect(project.title).toBe('Test Project 1')
      expect(project.status).toBeNull()
      expect(project.area).toBeNull()
    })

    it('allows overriding default values', () => {
      const project = createTestProject({
        title: 'Custom Project',
        status: 'in-progress',
        area: '[[Work]]',
      })

      expect(project.title).toBe('Custom Project')
      expect(project.status).toBe('in-progress')
      expect(project.area).toBe('[[Work]]')
    })
  })

  describe('createTestArea', () => {
    it('creates an area with default values', () => {
      const area = createTestArea()

      expect(area.id).toBe('test-area-1')
      expect(area.title).toBe('Test Area 1')
      expect(area.status).toBe('active')
    })

    it('allows overriding default values', () => {
      const area = createTestArea({
        title: 'Work',
        areaType: 'life-area',
      })

      expect(area.title).toBe('Work')
      expect(area.areaType).toBe('life-area')
    })
  })

  describe('createTestVault', () => {
    it('creates vault with default counts', () => {
      const { tasks, projects, areas } = createTestVault({})

      expect(tasks).toHaveLength(5)
      expect(projects).toHaveLength(2)
      expect(areas).toHaveLength(1)
    })

    it('creates vault with custom counts', () => {
      const { tasks, projects, areas } = createTestVault({
        taskCount: 10,
        projectCount: 3,
        areaCount: 2,
      })

      expect(tasks).toHaveLength(10)
      expect(projects).toHaveLength(3)
      expect(areas).toHaveLength(2)
    })

    it('links tasks to projects', () => {
      const { tasks, projects } = createTestVault({
        taskCount: 3,
        projectCount: 1,
      })

      // All tasks should link to the single project
      expect(tasks[0].project).toContain(projects[0].title)
    })

    it('assigns varied statuses to tasks', () => {
      const { tasks } = createTestVault({ taskCount: 7 })

      const statuses = tasks.map(t => t.status)
      expect(statuses).toContain('inbox')
      expect(statuses).toContain('ready')
      expect(statuses).toContain('done')
    })
  })

  describe('resetFactoryCounters', () => {
    it('resets all counters', () => {
      createTestTask()
      createTestTask()
      createTestProject()
      createTestArea()

      resetFactoryCounters()

      const task = createTestTask()
      const project = createTestProject()
      const area = createTestArea()

      expect(task.id).toBe('test-task-1')
      expect(project.id).toBe('test-project-1')
      expect(area.id).toBe('test-area-1')
    })
  })

  describe('withTempVault', () => {
    it('creates temp directory with subdirectories', async () => {
      await withTempVault(async vaultPath => {
        expect(fs.existsSync(path.join(vaultPath, 'tasks'))).toBe(true)
        expect(fs.existsSync(path.join(vaultPath, 'tasks', 'archive'))).toBe(
          true
        )
        expect(fs.existsSync(path.join(vaultPath, 'projects'))).toBe(true)
        expect(fs.existsSync(path.join(vaultPath, 'areas'))).toBe(true)
      })
    })

    it('cleans up after function completes', async () => {
      let capturedPath = ''

      await withTempVault(async vaultPath => {
        capturedPath = vaultPath
        expect(fs.existsSync(vaultPath)).toBe(true)
      })

      expect(fs.existsSync(capturedPath)).toBe(false)
    })

    it('cleans up even if function throws', async () => {
      let capturedPath = ''

      await expect(
        withTempVault(async vaultPath => {
          capturedPath = vaultPath
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')

      expect(fs.existsSync(capturedPath)).toBe(false)
    })
  })

  describe('withTempVaultFromFixtures', () => {
    it('copies fixture files to temp directory', async () => {
      await withTempVaultFromFixtures(async vaultPath => {
        const taskFiles = fs.readdirSync(path.join(vaultPath, 'tasks'))
        expect(taskFiles.length).toBeGreaterThan(0)
        expect(taskFiles).toContain('task-inbox-001.md')
      })
    })
  })

  describe('fixture file utilities', () => {
    it('getFixtureTaskFiles returns task files', () => {
      const files = getFixtureTaskFiles()

      expect(files.length).toBe(FIXTURE_COUNTS.tasks)
      expect(files.some(f => f.id === 'task-inbox-001')).toBe(true)
    })

    it('getFixtureProjectFiles returns project files', () => {
      const files = getFixtureProjectFiles()

      expect(files.length).toBe(FIXTURE_COUNTS.projects)
      expect(files.some(f => f.id === 'project-planning-001')).toBe(true)
    })

    it('getFixtureAreaFiles returns area files', () => {
      const files = getFixtureAreaFiles()

      expect(files.length).toBe(FIXTURE_COUNTS.areas)
      expect(files.some(f => f.id === 'area-active-001')).toBe(true)
    })

    it('getFixtureVaultPaths returns valid paths', () => {
      const paths = getFixtureVaultPaths()

      expect(fs.existsSync(paths.tasksDir)).toBe(true)
      expect(fs.existsSync(paths.projectsDir)).toBe(true)
      expect(fs.existsSync(paths.areasDir)).toBe(true)
    })
  })

  describe('fixture constants', () => {
    it('FIXTURE_TASK_IDS contains expected IDs', () => {
      expect(FIXTURE_TASK_IDS).toContain('task-inbox-001')
      expect(FIXTURE_TASK_IDS).toContain('task-done-006')
      expect(FIXTURE_TASK_IDS).toContain('task-with-dates-008')
    })

    it('FIXTURE_PROJECT_IDS contains expected IDs', () => {
      expect(FIXTURE_PROJECT_IDS).toContain('project-planning-001')
      expect(FIXTURE_PROJECT_IDS).toContain('project-in-progress-003')
    })

    it('FIXTURE_AREA_IDS contains expected IDs', () => {
      expect(FIXTURE_AREA_IDS).toContain('area-active-001')
      expect(FIXTURE_AREA_IDS).toContain('area-empty-002')
    })

    it('FIXTURE_COUNTS matches actual file counts', () => {
      expect(FIXTURE_COUNTS.tasks).toBe(FIXTURE_TASK_IDS.length)
      expect(FIXTURE_COUNTS.projects).toBe(FIXTURE_PROJECT_IDS.length)
      expect(FIXTURE_COUNTS.areas).toBe(FIXTURE_AREA_IDS.length)
    })
  })
})
