import { describe, it, expect } from 'vitest'
import { parseDeepLinkUrl, buildOpenPathUrl } from './deep-link'

describe('parseDeepLinkUrl', () => {
  describe('open command with path', () => {
    it('parses a valid path URL', () => {
      const url =
        'taskdn://open?path=%2FUsers%2Fdanny%2Fvault%2Ftasks%2Fmy-task.md'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'open-path',
        path: '/Users/danny/vault/tasks/my-task.md',
      })
    })

    it('handles paths with spaces', () => {
      const url =
        'taskdn://open?path=%2FUsers%2Fdanny%2FMy%20Vault%2Ftasks%2Fmy%20task.md'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'open-path',
        path: '/Users/danny/My Vault/tasks/my task.md',
      })
    })

    it('rejects non-absolute paths', () => {
      const url = 'taskdn://open?path=relative%2Fpath.md'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })

    it('rejects when both path and view are provided', () => {
      const url = 'taskdn://open?path=%2Fsome%2Fpath.md&view=today'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })
  })

  describe('open command with view', () => {
    it.each([
      ['today', 'today'],
      ['this-week', 'this-week'],
      ['inbox', 'inbox'],
      ['calendar', 'calendar'],
      ['no-area', 'no-area'],
    ])('parses view=%s correctly', (view, expected) => {
      const url = `taskdn://open?view=${view}`
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'open-view',
        view: expected,
      })
    })

    it('rejects invalid view names', () => {
      const url = 'taskdn://open?view=invalid-view'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })

    it('rejects uppercase view names', () => {
      const url = 'taskdn://open?view=TODAY'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })
  })

  describe('new command', () => {
    it('parses minimal new command', () => {
      const url = 'taskdn://new'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: {},
      })
    })

    it('parses new command with title', () => {
      const url = 'taskdn://new?title=Buy%20groceries'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: { title: 'Buy groceries' },
      })
    })

    it('parses new command with all valid parameters', () => {
      const url =
        'taskdn://new?title=Test%20Task&status=ready&due=2025-01-20&scheduled=2025-01-15&defer-until=2025-01-10&project=My%20Project&area=Work&body=Some%20notes'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: {
          title: 'Test Task',
          status: 'ready',
          due: '2025-01-20',
          scheduled: '2025-01-15',
          deferUntil: '2025-01-10',
          project: 'My Project',
          area: 'Work',
          body: 'Some notes',
        },
      })
    })

    it('ignores invalid status values', () => {
      const url = 'taskdn://new?title=Test&status=invalid-status'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: { title: 'Test' },
      })
    })

    it('ignores invalid date formats', () => {
      const url = 'taskdn://new?due=not-a-date&scheduled=01-15-2025'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: {},
      })
    })

    it('accepts all valid status values', () => {
      const statuses = [
        'inbox',
        'icebox',
        'ready',
        'in-progress',
        'blocked',
        'dropped',
        'done',
      ]

      for (const status of statuses) {
        const url = `taskdn://new?status=${status}`
        const result = parseDeepLinkUrl(url)

        expect(result).toEqual({
          type: 'new',
          options: { status },
        })
      }
    })

    it('handles body with newlines', () => {
      const url = 'taskdn://new?body=Line%201%0ALine%202%0ALine%203'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: { body: 'Line 1\nLine 2\nLine 3' },
      })
    })

    it('handles body with markdown', () => {
      const url =
        'taskdn://new?body=%23%20Heading%0A-%20Item%201%0A-%20Item%202'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({
        type: 'new',
        options: { body: '# Heading\n- Item 1\n- Item 2' },
      })
    })
  })

  describe('invalid URLs', () => {
    it('rejects non-taskdn URLs', () => {
      const url = 'https://example.com'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })

    it('rejects unknown commands', () => {
      const url = 'taskdn://unknown-command'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })

    it('rejects malformed URLs', () => {
      const url = 'not a url at all'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })

    it('rejects open command with no parameters', () => {
      const url = 'taskdn://open'
      const result = parseDeepLinkUrl(url)

      expect(result).toEqual({ type: 'invalid' })
    })
  })
})

describe('buildOpenPathUrl', () => {
  it('builds a correctly encoded URL', () => {
    const path = '/Users/danny/vault/tasks/my-task.md'
    const url = buildOpenPathUrl(path)

    expect(url).toBe(
      'taskdn://open?path=%2FUsers%2Fdanny%2Fvault%2Ftasks%2Fmy-task.md'
    )
  })

  it('handles paths with spaces', () => {
    const path = '/Users/danny/My Vault/tasks/my task.md'
    const url = buildOpenPathUrl(path)

    expect(url).toBe(
      'taskdn://open?path=%2FUsers%2Fdanny%2FMy%20Vault%2Ftasks%2Fmy%20task.md'
    )
  })

  it('roundtrips correctly', () => {
    const originalPath = '/Users/danny/vault/tasks/my-task.md'
    const url = buildOpenPathUrl(originalPath)
    const parsed = parseDeepLinkUrl(url)

    expect(parsed).toEqual({
      type: 'open-path',
      path: originalPath,
    })
  })
})
