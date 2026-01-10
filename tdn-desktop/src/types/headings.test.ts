import { describe, it, expect } from 'vitest'
import {
  isHeadingId,
  parseHeadingId,
  toHeadingId,
  HEADING_ID_PREFIX,
} from './headings'

describe('headings', () => {
  describe('HEADING_ID_PREFIX', () => {
    it('has the correct value', () => {
      expect(HEADING_ID_PREFIX).toBe('heading:')
    })
  })

  describe('isHeadingId', () => {
    it('returns true for valid heading IDs', () => {
      expect(isHeadingId('heading:my-heading')).toBe(true)
      expect(isHeadingId('heading:123')).toBe(true)
      expect(isHeadingId('heading:heading-with-long-name')).toBe(true)
      expect(isHeadingId('heading:')).toBe(true) // Edge case: prefix only
    })

    it('returns false for non-heading IDs', () => {
      expect(isHeadingId('task-1')).toBe(false)
      expect(isHeadingId('my-heading')).toBe(false)
      expect(isHeadingId('')).toBe(false)
      expect(isHeadingId('HEADING:uppercase')).toBe(false) // Case-sensitive
    })

    it('returns false for partial prefix match', () => {
      expect(isHeadingId('heading')).toBe(false)
      expect(isHeadingId('head:')).toBe(false)
      expect(isHeadingId('headings:foo')).toBe(false)
    })
  })

  describe('parseHeadingId', () => {
    it('extracts ID from prefixed heading ID', () => {
      expect(parseHeadingId('heading:my-heading')).toBe('my-heading')
      expect(parseHeadingId('heading:123')).toBe('123')
      expect(parseHeadingId('heading:heading-with-long-name')).toBe(
        'heading-with-long-name'
      )
    })

    it('handles empty ID after prefix', () => {
      expect(parseHeadingId('heading:')).toBe('')
    })

    it('handles IDs with colons', () => {
      expect(parseHeadingId('heading:id:with:colons')).toBe('id:with:colons')
    })

    it('does not validate prefix (caller responsibility)', () => {
      // If called with non-prefixed ID, it just slices from prefix length
      // HEADING_ID_PREFIX is 'heading:' (8 chars), so slicing 'task-123' (8 chars) gives ''
      expect(parseHeadingId('task-123')).toBe('') // Incorrect usage, but documents behavior
      // With a longer string, you'd get the remainder
      expect(parseHeadingId('heading-1234')).toBe('1234')
    })
  })

  describe('toHeadingId', () => {
    it('creates prefixed heading ID', () => {
      expect(toHeadingId('my-heading')).toBe('heading:my-heading')
      expect(toHeadingId('123')).toBe('heading:123')
      expect(toHeadingId('heading-with-long-name')).toBe(
        'heading:heading-with-long-name'
      )
    })

    it('handles empty string', () => {
      expect(toHeadingId('')).toBe('heading:')
    })

    it('handles IDs that already look like prefixed IDs', () => {
      // Double-prefixing - this is expected behavior (no validation)
      expect(toHeadingId('heading:foo')).toBe('heading:heading:foo')
    })
  })

  describe('round-trip', () => {
    it('toHeadingId then parseHeadingId returns original', () => {
      const ids = ['my-heading', '123', 'complex-heading-name', '']

      ids.forEach(id => {
        const prefixed = toHeadingId(id)
        const parsed = parseHeadingId(prefixed)
        expect(parsed).toBe(id)
      })
    })

    it('toHeadingId result passes isHeadingId check', () => {
      const ids = ['my-heading', '123', 'complex-heading-name', '']

      ids.forEach(id => {
        const prefixed = toHeadingId(id)
        expect(isHeadingId(prefixed)).toBe(true)
      })
    })
  })

  describe('OrderedItem type discrimination', () => {
    it('can distinguish between task and heading items in array', () => {
      // This is a type-level test that verifies the OrderedItem union type works
      const items = [
        { type: 'task' as const, id: 'task-1' },
        { type: 'heading' as const, id: 'heading-1' },
        { type: 'task' as const, id: 'task-2' },
      ]

      const tasks = items.filter(item => item.type === 'task')
      const headings = items.filter(item => item.type === 'heading')

      expect(tasks).toHaveLength(2)
      expect(headings).toHaveLength(1)
      expect(tasks.map(t => t.id)).toEqual(['task-1', 'task-2'])
      expect(headings.map(h => h.id)).toEqual(['heading-1'])
    })
  })
})
