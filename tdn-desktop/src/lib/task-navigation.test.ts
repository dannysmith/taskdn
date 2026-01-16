import { describe, it, expect } from 'vitest'
import { getSelectionForTask } from './task-navigation'
import type { Task, Project, Area } from '@/lib/tauri-bindings'

// Helper to create minimal task objects for testing
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    path: '/vault/tasks/task-1.md',
    title: 'Test Task',
    status: 'ready',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    project: null,
    area: null,
    due: null,
    scheduled: null,
    deferUntil: null,
    completedAt: null,
    body: '',
    ...overrides,
  }
}

function createProject(id: string, title: string): Project {
  return {
    id,
    path: `/vault/projects/${id}.md`,
    title,
    status: 'in-progress',
    area: null,
    description: null,
    startDate: null,
    endDate: null,
    blockedBy: null,
    body: '',
  }
}

function createArea(id: string, title: string): Area {
  return {
    id,
    path: `/vault/areas/${id}.md`,
    title,
    status: 'active',
    areaType: null,
    description: null,
    body: '',
  }
}

describe('getSelectionForTask', () => {
  describe('inbox tasks', () => {
    it('returns inbox view for inbox tasks', () => {
      const task = createTask({ status: 'inbox' })

      const result = getSelectionForTask(task, [], [])

      expect(result).toEqual({ type: 'nav', id: 'inbox' })
    })

    it('returns inbox view even if task has project', () => {
      const task = createTask({
        status: 'inbox',
        project: '[[My Project]]',
      })
      const projects = [createProject('proj-1', 'My Project')]

      const result = getSelectionForTask(task, projects, [])

      expect(result).toEqual({ type: 'nav', id: 'inbox' })
    })
  })

  describe('tasks with project', () => {
    it('returns project view when task has matching project', () => {
      const task = createTask({ project: '[[My Project]]' })
      const projects = [createProject('proj-1', 'My Project')]

      const result = getSelectionForTask(task, projects, [])

      expect(result).toEqual({ type: 'project', id: 'proj-1' })
    })

    it('matches project case-insensitively', () => {
      const task = createTask({ project: '[[my project]]' })
      const projects = [createProject('proj-1', 'My Project')]

      const result = getSelectionForTask(task, projects, [])

      expect(result).toEqual({ type: 'project', id: 'proj-1' })
    })

    it('falls back to no-area when project not found', () => {
      const task = createTask({ project: '[[Nonexistent Project]]' })
      const projects = [createProject('proj-1', 'Other Project')]

      const result = getSelectionForTask(task, projects, [])

      expect(result).toEqual({ type: 'no-area' })
    })

    it('prioritizes project over area', () => {
      const task = createTask({
        project: '[[My Project]]',
        area: '[[My Area]]',
      })
      const projects = [createProject('proj-1', 'My Project')]
      const areas = [createArea('area-1', 'My Area')]

      const result = getSelectionForTask(task, projects, areas)

      expect(result).toEqual({ type: 'project', id: 'proj-1' })
    })
  })

  describe('tasks with area (no project)', () => {
    it('returns area view when task has matching area', () => {
      const task = createTask({ area: '[[My Area]]' })
      const areas = [createArea('area-1', 'My Area')]

      const result = getSelectionForTask(task, [], areas)

      expect(result).toEqual({ type: 'area', id: 'area-1' })
    })

    it('matches area case-insensitively', () => {
      const task = createTask({ area: '[[MY AREA]]' })
      const areas = [createArea('area-1', 'My Area')]

      const result = getSelectionForTask(task, [], areas)

      expect(result).toEqual({ type: 'area', id: 'area-1' })
    })

    it('falls back to no-area when area not found', () => {
      const task = createTask({ area: '[[Nonexistent Area]]' })
      const areas = [createArea('area-1', 'Other Area')]

      const result = getSelectionForTask(task, [], areas)

      expect(result).toEqual({ type: 'no-area' })
    })
  })

  describe('tasks without project or area', () => {
    it('returns no-area view', () => {
      const task = createTask()

      const result = getSelectionForTask(task, [], [])

      expect(result).toEqual({ type: 'no-area' })
    })
  })
})
