import { describe, it, expect } from 'vitest'
import { getDragId, ORPHAN_CONTAINER_ID } from './sidebar-order'

describe('sidebar-order', () => {
  describe('getDragId', () => {
    it('creates drag ID for area', () => {
      expect(getDragId('area', 'health-1')).toBe('area-health-1')
      expect(getDragId('area', 'work-2')).toBe('area-work-2')
    })

    it('creates drag ID for project', () => {
      expect(getDragId('project', 'launch-1')).toBe('project-launch-1')
      expect(getDragId('project', 'redesign-2')).toBe('project-redesign-2')
    })

    it('handles IDs with special characters', () => {
      expect(getDragId('area', 'my-area-123')).toBe('area-my-area-123')
      expect(getDragId('project', 'project_name')).toBe('project-project_name')
    })

    it('handles empty IDs', () => {
      expect(getDragId('area', '')).toBe('area-')
      expect(getDragId('project', '')).toBe('project-')
    })
  })

  describe('ORPHAN_CONTAINER_ID', () => {
    it('has the correct value', () => {
      expect(ORPHAN_CONTAINER_ID).toBe('__orphan__')
    })

    it('can be used as a key in projectOrder', () => {
      const projectOrder: Record<string, string[]> = {
        [ORPHAN_CONTAINER_ID]: ['project-1', 'project-2'],
        'area-1': ['project-3'],
      }

      expect(projectOrder[ORPHAN_CONTAINER_ID]).toEqual([
        'project-1',
        'project-2',
      ])
    })
  })
})
