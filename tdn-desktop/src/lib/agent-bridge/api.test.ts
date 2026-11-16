import { describe, it, expect } from 'vitest'
import { findByTitle } from './api'

const tasks = [
  { id: 'tasks/call-dad.md', title: 'Call Dad' },
  { id: 'tasks/call-mum.md', title: 'Call Mum' },
  { id: 'tasks/book-dentist.md', title: 'Book dentist appointment' },
]

describe('findByTitle', () => {
  it('matches an id exactly', () => {
    expect(findByTitle(tasks, 'tasks/call-mum.md', 'task').title).toBe(
      'Call Mum'
    )
  })

  it('prefers an exact title, ignoring case, over partial matches', () => {
    const items = [
      ...tasks,
      { id: 'tasks/call-dad-2.md', title: 'Call Dad back' },
    ]
    expect(findByTitle(items, 'call dad', 'task').id).toBe('tasks/call-dad.md')
  })

  it('falls back to a title containing the query', () => {
    expect(findByTitle(tasks, 'dentist', 'task').id).toBe(
      'tasks/book-dentist.md'
    )
  })

  it('names the candidates when several match', () => {
    expect(() => findByTitle(tasks, 'call', 'task')).toThrow(
      '2 tasks match "call": "Call Dad", "Call Mum"'
    )
  })

  it('says when nothing matches', () => {
    expect(() => findByTitle(tasks, 'nope', 'task')).toThrow(
      'No task matches "nope"'
    )
  })
})
