export type NavId = 'today' | 'this-week' | 'inbox' | 'calendar'

export type Selection =
  | { type: 'nav'; id: NavId }
  | { type: 'area'; id: string }
  | { type: 'project'; id: string }
  | { type: 'no-area' }
