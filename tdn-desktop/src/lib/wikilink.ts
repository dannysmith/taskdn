/**
 * WikiLink parsing utilities matching Rust behavior.
 *
 * Handles Obsidian-style wikilinks:
 * - Basic: [[Page Name]]
 * - With alias: [[Page Name|Display Text]]
 * - With heading: [[Page Name#Heading]]
 * - Combined: [[Page Name#Heading|Display Text]]
 *
 * @see src-tauri/src/vault/wikilink.rs for the Rust implementation
 */

/**
 * Extract the target name from a wikilink reference.
 * Returns null if the input is not a valid wikilink.
 *
 * @example
 * extractWikilinkTitle('[[Work]]') // 'Work'
 * extractWikilinkTitle('[[Work|My Job]]') // 'Work'
 * extractWikilinkTitle('[[Work#Section]]') // 'Work'
 * extractWikilinkTitle('[[Work#Section|Alias]]') // 'Work'
 * extractWikilinkTitle('not a wikilink') // null
 * extractWikilinkTitle('[[]]') // null (empty)
 */
export function extractWikilinkTitle(reference: string): string | null {
  const trimmed = reference.trim()
  if (!trimmed.startsWith('[[') || !trimmed.endsWith(']]')) {
    return null
  }

  const inner = trimmed.slice(2, -2).trim()
  if (!inner) return null

  // Handle alias (take everything before |)
  const beforeAlias = inner.split('|')[0] ?? ''

  // Handle heading (take everything before #)
  const name = (beforeAlias.split('#')[0] ?? '').trim()

  return name || null
}

/**
 * Check if a string is a valid wikilink with a non-empty title.
 */
export function isWikilink(value: string): boolean {
  return extractWikilinkTitle(value) !== null
}

/**
 * Ensure a value is wrapped in wikilink format.
 * If already wrapped, returns unchanged (trimmed).
 */
export function ensureWikilink(value: string): string {
  const trimmed = value.trim()
  return isWikilink(trimmed) ? trimmed : `[[${trimmed}]]`
}

/**
 * Check if a wikilink reference matches a given title.
 * Extracts the title from the wikilink and compares it exactly.
 *
 * This avoids false positives from substring matching — e.g.,
 * matchesWikilinkTitle('[[Homework]]', 'Work') returns false.
 *
 * @example
 * matchesWikilinkTitle('[[Work]]', 'Work') // true
 * matchesWikilinkTitle('[[Work|My Job]]', 'Work') // true
 * matchesWikilinkTitle('[[Homework]]', 'Work') // false
 * matchesWikilinkTitle(null, 'Work') // false
 */
export function matchesWikilinkTitle(
  reference: string | null | undefined,
  title: string
): boolean {
  if (!reference) return false
  return extractWikilinkTitle(reference) === title
}

/**
 * Strip wikilink brackets from a value if present.
 * Returns the title if it's a wikilink, otherwise returns the trimmed input.
 *
 * This is useful when you need a string result regardless of whether
 * the input is a wikilink or not.
 *
 * @example
 * stripWikilink('[[Work]]') // 'Work'
 * stripWikilink('Work') // 'Work'
 * stripWikilink('[[Work|Alias]]') // 'Work'
 */
export function stripWikilink(value: string): string {
  return extractWikilinkTitle(value) ?? value.trim()
}
