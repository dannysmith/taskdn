/**
 * Utility functions for Quick Search.
 */

import type { Project, Area } from '@/lib/tauri-bindings'

/**
 * Strip wikilink brackets and return the title.
 * "[[My Project]]" → "My Project"
 */
export function stripWikilink(wikilink: string): string {
  return wikilink.replace(/^\[\[|\]\]$/g, '')
}

/**
 * Resolve a wikilink to a project name.
 */
export function resolveProjectName(
  wikilink: string | null,
  projects: Project[]
): string | null {
  if (!wikilink) return null
  const title = stripWikilink(wikilink)
  const project = projects.find(
    p => p.title.toLowerCase() === title.toLowerCase()
  )
  return project?.title ?? title // Fall back to wikilink title if not found
}

/**
 * Resolve a wikilink to an area name.
 */
export function resolveAreaName(
  wikilink: string | null,
  areas: Area[]
): string | null {
  if (!wikilink) return null
  const title = stripWikilink(wikilink)
  const area = areas.find(a => a.title.toLowerCase() === title.toLowerCase())
  return area?.title ?? title // Fall back to wikilink title if not found
}
