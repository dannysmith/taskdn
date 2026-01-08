/**
 * Heading types for visual organization within task lists.
 * Headings are UI-only dividers that help users chunk tasks into groups.
 */

export type HeadingColor =
  | 'default'
  | 'blue'
  | 'teal'
  | 'purple'
  | 'amber'
  | 'pink'
  | 'green'
  | 'red'

export interface Heading {
  id: string
  title: string
  color: HeadingColor
}

/** Prefix used to distinguish heading IDs from task IDs in order arrays */
export const HEADING_ID_PREFIX = 'heading:'

/** Check if an ID represents a heading (has the heading prefix) */
export function isHeadingId(id: string): boolean {
  return id.startsWith(HEADING_ID_PREFIX)
}

/** Extract the heading ID from a prefixed ID string */
export function parseHeadingId(prefixedId: string): string {
  return prefixedId.slice(HEADING_ID_PREFIX.length)
}

/** Create a prefixed heading ID for use in order arrays */
export function toHeadingId(id: string): string {
  return `${HEADING_ID_PREFIX}${id}`
}

/** Ordered item in a mixed task/heading list */
export type OrderedItem =
  | { type: 'task'; id: string }
  | { type: 'heading'; id: string }

/** Parse an order array ID into an OrderedItem */
export function parseOrderedId(id: string): OrderedItem {
  if (isHeadingId(id)) {
    return { type: 'heading', id: parseHeadingId(id) }
  }
  return { type: 'task', id }
}
