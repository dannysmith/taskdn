/**
 * Deep link URL parsing and handling for taskdn:// URLs.
 *
 * Supports:
 * - taskdn://open?path=<url-encoded-path> - Open task/project/area by file path
 * - taskdn://open?view=<view-name> - Navigate to a view (today, inbox, etc.)
 * - taskdn://new?title=...&status=... - Create a new task (Phase 4)
 */

import type { NavId } from '@/types/navigation'

// =============================================================================
// Types
// =============================================================================

/** Valid view names for open?view= */
export type DeepLinkView = NavId | 'no-area'

/** Parsed deep link command */
export type DeepLinkCommand =
  | { type: 'open-path'; path: string }
  | { type: 'open-view'; view: DeepLinkView }
  | { type: 'new'; options: CreateTaskFromUrlOptions }
  | { type: 'invalid' }

/** Options for creating a task from URL parameters */
export interface CreateTaskFromUrlOptions {
  title?: string
  status?: string
  due?: string
  scheduled?: string
  deferUntil?: string
  project?: string
  area?: string
  body?: string
}

// =============================================================================
// Constants
// =============================================================================

/** Valid view names for taskdn://open?view= */
const VALID_VIEWS: ReadonlySet<string> = new Set([
  'today',
  'this-week',
  'inbox',
  'calendar',
  'no-area',
])

/** Valid status values for taskdn://new?status= */
const VALID_STATUSES: ReadonlySet<string> = new Set([
  'inbox',
  'icebox',
  'ready',
  'in-progress',
  'blocked',
  'dropped',
  'done',
])

// =============================================================================
// URL Parsing
// =============================================================================

/**
 * Parse a taskdn:// URL into a command object.
 *
 * @param url - Full URL string (e.g., "taskdn://open?path=%2Fpath%2Fto%2Ffile.md")
 * @returns Parsed command or { type: 'invalid' } if URL is malformed
 */
export function parseDeepLinkUrl(url: string): DeepLinkCommand {
  try {
    // Handle URL parsing - taskdn:// URLs need special handling
    // since URL constructor expects a host for custom schemes
    if (!url.startsWith('taskdn://')) {
      return { type: 'invalid' }
    }

    // Parse as if it's a real URL by adding a fake host
    const normalizedUrl = url.replace('taskdn://', 'https://taskdn/')
    const parsed = new URL(normalizedUrl)
    const command = parsed.pathname.slice(1) // Remove leading /
    const params = parsed.searchParams

    switch (command) {
      case 'open':
        return parseOpenCommand(params)
      case 'new':
        return parseNewCommand(params)
      default:
        return { type: 'invalid' }
    }
  } catch {
    return { type: 'invalid' }
  }
}

/**
 * Parse the open command parameters.
 */
function parseOpenCommand(params: URLSearchParams): DeepLinkCommand {
  const path = params.get('path')
  const view = params.get('view')

  // Must have exactly one of path or view
  if (path && !view) {
    // Validate path is an absolute path
    if (!path.startsWith('/')) {
      return { type: 'invalid' }
    }
    return { type: 'open-path', path }
  }

  if (view && !path) {
    // Validate view name (lowercase only)
    if (!VALID_VIEWS.has(view)) {
      return { type: 'invalid' }
    }
    return { type: 'open-view', view: view as DeepLinkView }
  }

  // Neither or both specified - invalid
  return { type: 'invalid' }
}

/**
 * Parse the new command parameters.
 */
function parseNewCommand(params: URLSearchParams): DeepLinkCommand {
  const options: CreateTaskFromUrlOptions = {}

  // Title (optional, defaults to "New Task" in handler)
  const title = params.get('title')
  if (title) {
    options.title = title
  }

  // Status (optional, must be valid lowercase kebab-case)
  const status = params.get('status')
  if (status && VALID_STATUSES.has(status)) {
    options.status = status
  }

  // Dates (optional, must be valid ISO format YYYY-MM-DD)
  const due = params.get('due')
  if (due && isValidIsoDate(due)) {
    options.due = due
  }

  const scheduled = params.get('scheduled')
  if (scheduled && isValidIsoDate(scheduled)) {
    options.scheduled = scheduled
  }

  const deferUntil = params.get('defer-until')
  if (deferUntil && isValidIsoDate(deferUntil)) {
    options.deferUntil = deferUntil
  }

  // Project/Area (optional, matched by title)
  const project = params.get('project')
  if (project) {
    options.project = project
  }

  const area = params.get('area')
  if (area) {
    options.area = area
  }

  // Body (optional, supports multiline markdown)
  const body = params.get('body')
  if (body) {
    options.body = body
  }

  return { type: 'new', options }
}

/**
 * Validate ISO date format (YYYY-MM-DD).
 */
function isValidIsoDate(date: string): boolean {
  // Must match YYYY-MM-DD pattern
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false
  }

  // Must be a valid date
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

// =============================================================================
// URL Building (for copy-local-url command)
// =============================================================================

/**
 * Build a taskdn://open?path= URL for an entity.
 *
 * @param path - Absolute file path to the entity
 * @returns URL-encoded taskdn:// URL
 */
export function buildOpenPathUrl(path: string): string {
  return `taskdn://open?path=${encodeURIComponent(path)}`
}
