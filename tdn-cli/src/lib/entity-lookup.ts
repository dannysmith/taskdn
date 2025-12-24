/**
 * Entity lookup utilities for finding tasks, projects, and areas by name.
 * Provides a unified interface for fuzzy matching and exact path lookup.
 *
 * Used by commands that accept entity references (show, complete, drop, etc.)
 */

import {
  findTasksByTitle,
  findProjectsByTitle,
  findAreasByTitle,
  parseTaskFile,
  parseProjectFile,
  parseAreaFile,
} from '@bindings';
import type { Task, Project, Area, VaultConfig } from '@bindings';
import type { EntityType } from '@/errors/types.ts';
export type { EntityType };
import { getVaultConfig } from '@/config/index.ts';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detect entity type from file path.
 *
 * This checks if the path contains '/projects/' or '/areas/' subdirectories.
 * Falls back to 'task' if neither is found.
 *
 * TODO: Once config is fully implemented, this should check if the path falls
 * under the user's configured projects_dir, tasks_dir, or areas_dir.
 */
export function detectEntityType(filePath: string): EntityType {
  if (filePath.includes('/projects/')) {
    return 'project';
  }
  if (filePath.includes('/areas/')) {
    return 'area';
  }
  return 'task';
}

/**
 * Result of an entity lookup operation.
 * - 'exact': Query was a path and matched exactly one entity
 * - 'single': Query matched exactly one entity by title
 * - 'multiple': Query matched multiple entities (disambiguation needed)
 * - 'none': No matches found
 */
export interface LookupResult<T> {
  type: 'exact' | 'single' | 'multiple' | 'none';
  matches: T[];
}

/**
 * Check if a query looks like a file path.
 * A path can be:
 * - Absolute (/path/to/file.md)
 * - Relative (./file.md, ../file.md)
 * - Tilde-prefixed (~/path/to/file.md)
 * - Contains path separator (tasks/file.md)
 * - Ends with .md
 */
function isPathQuery(query: string): boolean {
  return (
    query.startsWith('/') ||
    query.startsWith('./') ||
    query.startsWith('../') ||
    query.startsWith('~') ||
    query.includes(path.sep) ||
    query.endsWith('.md')
  );
}

/**
 * Resolve a path query to an absolute path.
 * Handles:
 * - Absolute paths (returned as-is)
 * - Tilde paths (expanded to home directory)
 * - Relative paths (resolved against base directory)
 * - Filename only (looked up in base directory)
 */
function resolvePath(query: string, baseDir: string): string {
  // Expand tilde
  if (query.startsWith('~')) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return query.replace(/^~/, home);
  }

  // Already absolute
  if (path.isAbsolute(query)) {
    return query;
  }

  // Relative to base directory
  return path.resolve(baseDir, query);
}

/**
 * Look up a task by query.
 *
 * If query looks like a path, attempts exact path lookup.
 * Otherwise, performs fuzzy title matching.
 *
 * @param query - Task identifier (path or title substring)
 * @param config - Optional vault config (defaults to getVaultConfig())
 * @returns LookupResult with matched tasks
 */
export function lookupTask(query: string, config?: VaultConfig): LookupResult<Task> {
  const vaultConfig = config || getVaultConfig();

  // Path-based lookup
  if (isPathQuery(query)) {
    const resolvedPath = resolvePath(query, vaultConfig.tasksDir);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return { type: 'none', matches: [] };
    }

    try {
      const task = parseTaskFile(resolvedPath);
      return { type: 'exact', matches: [task] };
    } catch {
      // File exists but failed to parse
      return { type: 'none', matches: [] };
    }
  }

  // Title-based fuzzy lookup
  const matches = findTasksByTitle(vaultConfig, query);

  if (matches.length === 0) {
    return { type: 'none', matches: [] };
  }

  if (matches.length === 1) {
    return { type: 'single', matches };
  }

  return { type: 'multiple', matches };
}

/**
 * Look up a project by query.
 *
 * If query looks like a path, attempts exact path lookup.
 * Otherwise, performs fuzzy title matching.
 *
 * @param query - Project identifier (path or title substring)
 * @param config - Optional vault config (defaults to getVaultConfig())
 * @returns LookupResult with matched projects
 */
export function lookupProject(query: string, config?: VaultConfig): LookupResult<Project> {
  const vaultConfig = config || getVaultConfig();

  // Path-based lookup
  if (isPathQuery(query)) {
    const resolvedPath = resolvePath(query, vaultConfig.projectsDir);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return { type: 'none', matches: [] };
    }

    try {
      const project = parseProjectFile(resolvedPath);
      return { type: 'exact', matches: [project] };
    } catch {
      // File exists but failed to parse
      return { type: 'none', matches: [] };
    }
  }

  // Title-based fuzzy lookup
  const matches = findProjectsByTitle(vaultConfig, query);

  if (matches.length === 0) {
    return { type: 'none', matches: [] };
  }

  if (matches.length === 1) {
    return { type: 'single', matches };
  }

  return { type: 'multiple', matches };
}

/**
 * Look up an area by query.
 *
 * If query looks like a path, attempts exact path lookup.
 * Otherwise, performs fuzzy title matching.
 *
 * @param query - Area identifier (path or title substring)
 * @param config - Optional vault config (defaults to getVaultConfig())
 * @returns LookupResult with matched areas
 */
export function lookupArea(query: string, config?: VaultConfig): LookupResult<Area> {
  const vaultConfig = config || getVaultConfig();

  // Path-based lookup
  if (isPathQuery(query)) {
    const resolvedPath = resolvePath(query, vaultConfig.areasDir);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return { type: 'none', matches: [] };
    }

    try {
      const area = parseAreaFile(resolvedPath);
      return { type: 'exact', matches: [area] };
    } catch {
      // File exists but failed to parse
      return { type: 'none', matches: [] };
    }
  }

  // Title-based fuzzy lookup
  const matches = findAreasByTitle(vaultConfig, query);

  if (matches.length === 0) {
    return { type: 'none', matches: [] };
  }

  if (matches.length === 1) {
    return { type: 'single', matches };
  }

  return { type: 'multiple', matches };
}
