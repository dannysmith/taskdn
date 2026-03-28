import { describe, it, expect } from 'vitest'
import {
  extractWikilinkTitle,
  isWikilink,
  ensureWikilink,
  matchesWikilinkTitle,
  stripWikilink,
} from './wikilink'

describe('wikilink', () => {
  describe('extractWikilinkTitle', () => {
    it('extracts title from basic wikilink', () => {
      expect(extractWikilinkTitle('[[Work]]')).toBe('Work')
      expect(extractWikilinkTitle('[[My Project]]')).toBe('My Project')
      expect(extractWikilinkTitle('[[Q1 2025 Planning]]')).toBe(
        'Q1 2025 Planning'
      )
    })

    it('extracts title from wikilink with alias', () => {
      expect(extractWikilinkTitle('[[Work|My Job]]')).toBe('Work')
      expect(extractWikilinkTitle('[[Project Name|Display Text]]')).toBe(
        'Project Name'
      )
    })

    it('extracts title from wikilink with heading', () => {
      expect(extractWikilinkTitle('[[Work#Section]]')).toBe('Work')
      expect(extractWikilinkTitle('[[Page#Heading]]')).toBe('Page')
    })

    it('extracts title from wikilink with heading and alias', () => {
      expect(extractWikilinkTitle('[[Work#Section|Alias]]')).toBe('Work')
      expect(extractWikilinkTitle('[[Page Name#Heading|Display]]')).toBe(
        'Page Name'
      )
    })

    it('returns null for non-wikilinks', () => {
      expect(extractWikilinkTitle('Work')).toBeNull()
      expect(extractWikilinkTitle('not a wikilink')).toBeNull()
      expect(extractWikilinkTitle('./path/to/file.md')).toBeNull()
      expect(extractWikilinkTitle('file.md')).toBeNull()
    })

    it('returns null for invalid wikilinks', () => {
      expect(extractWikilinkTitle('[[]]')).toBeNull()
      expect(extractWikilinkTitle('[[   ]]')).toBeNull()
      expect(extractWikilinkTitle('[[Name')).toBeNull()
      expect(extractWikilinkTitle('Name]]')).toBeNull()
      expect(extractWikilinkTitle('[Name]')).toBeNull()
    })

    it('returns null for heading-only wikilinks', () => {
      // [[#Heading]] has no page name, just a heading reference
      expect(extractWikilinkTitle('[[#Heading]]')).toBeNull()
    })

    it('returns null for alias-only wikilinks', () => {
      // [[|Alias]] has no page name, just an alias
      expect(extractWikilinkTitle('[[|Alias]]')).toBeNull()
    })

    it('handles whitespace correctly', () => {
      expect(extractWikilinkTitle('  [[Work]]  ')).toBe('Work')
      expect(extractWikilinkTitle('[[ Spaced Name ]]')).toBe('Spaced Name')
      expect(extractWikilinkTitle('[[  Work  |  Alias  ]]')).toBe('Work')
    })
  })

  describe('isWikilink', () => {
    it('returns true for valid wikilinks', () => {
      expect(isWikilink('[[Work]]')).toBe(true)
      expect(isWikilink('[[My Project]]')).toBe(true)
      expect(isWikilink('[[Work|Alias]]')).toBe(true)
      expect(isWikilink('[[Work#Section]]')).toBe(true)
    })

    it('returns false for non-wikilinks', () => {
      expect(isWikilink('Work')).toBe(false)
      expect(isWikilink('[Work]')).toBe(false)
      expect(isWikilink('[[Work')).toBe(false)
      expect(isWikilink('Work]]')).toBe(false)
    })

    it('returns false for empty or invalid wikilinks', () => {
      expect(isWikilink('[[]]')).toBe(false)
      expect(isWikilink('[[   ]]')).toBe(false)
      expect(isWikilink('[[#Heading]]')).toBe(false)
      expect(isWikilink('[[|Alias]]')).toBe(false)
    })

    it('handles whitespace correctly', () => {
      expect(isWikilink('  [[Work]]  ')).toBe(true)
    })
  })

  describe('ensureWikilink', () => {
    it('wraps plain text in brackets', () => {
      expect(ensureWikilink('Work')).toBe('[[Work]]')
      expect(ensureWikilink('My Project')).toBe('[[My Project]]')
    })

    it('returns existing wikilinks unchanged', () => {
      expect(ensureWikilink('[[Work]]')).toBe('[[Work]]')
      expect(ensureWikilink('[[My Project]]')).toBe('[[My Project]]')
    })

    it('trims whitespace', () => {
      expect(ensureWikilink('  Work  ')).toBe('[[Work]]')
      expect(ensureWikilink('  [[Work]]  ')).toBe('[[Work]]')
    })
  })

  describe('matchesWikilinkTitle', () => {
    it('matches exact wikilink title', () => {
      expect(matchesWikilinkTitle('[[Work]]', 'Work')).toBe(true)
      expect(matchesWikilinkTitle('[[My Project]]', 'My Project')).toBe(true)
    })

    it('matches wikilinks with alias or heading', () => {
      expect(matchesWikilinkTitle('[[Work|My Job]]', 'Work')).toBe(true)
      expect(matchesWikilinkTitle('[[Work#Section]]', 'Work')).toBe(true)
    })

    it('rejects substring matches', () => {
      expect(matchesWikilinkTitle('[[Homework]]', 'Work')).toBe(false)
      expect(matchesWikilinkTitle('[[Networking]]', 'Net')).toBe(false)
    })

    it('handles null and undefined', () => {
      expect(matchesWikilinkTitle(null, 'Work')).toBe(false)
      expect(matchesWikilinkTitle(undefined, 'Work')).toBe(false)
    })

    it('returns false for non-wikilinks', () => {
      expect(matchesWikilinkTitle('Work', 'Work')).toBe(false)
    })
  })

  describe('stripWikilink', () => {
    it('extracts title from wikilink', () => {
      expect(stripWikilink('[[Work]]')).toBe('Work')
      expect(stripWikilink('[[My Project]]')).toBe('My Project')
      expect(stripWikilink('[[Work|Alias]]')).toBe('Work')
      expect(stripWikilink('[[Work#Section]]')).toBe('Work')
    })

    it('returns original string for non-wikilinks', () => {
      expect(stripWikilink('Work')).toBe('Work')
      expect(stripWikilink('not a wikilink')).toBe('not a wikilink')
    })

    it('trims whitespace for non-wikilinks', () => {
      expect(stripWikilink('  Work  ')).toBe('Work')
    })

    it('returns original for invalid wikilinks', () => {
      expect(stripWikilink('[[]]')).toBe('[[]]')
      expect(stripWikilink('[[#Heading]]')).toBe('[[#Heading]]')
    })
  })
})
