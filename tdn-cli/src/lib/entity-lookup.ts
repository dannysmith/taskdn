/**
 * Entity lookup utilities for finding tasks, projects, and areas by name.
 * Provides a unified interface for fuzzy matching and exact path lookup.
 *
 * Used by commands that accept entity references (show, complete, drop, etc.)
 */

import {
  createVaultSession,
  findTasksByTitle,
  findProjectsByTitle,
  findAreasByTitle,
  parseTaskFile,
  parseProjectFile,
  parseAreaFile,
} from '@bindings';
import type { Task, Project, Area, VaultSession } from '@bindings';
import type { VaultConfig } from '@bindings';
import type { EntityType } from '@/errors/types.ts';
export type { EntityType };
import { getVaultConfig } from '@/config/index.ts';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detect entity type from file path using configured directories.
 *
 * Checks if the resolved path falls within the configured projectsDir,
 * areasDir, or tasksDir. Falls back to 'task' if no match is found.
 *
 * @param filePath - The file path to check
 * @param config - Optional vault config (defaults to getVaultConfig())
 */
export function detectEntityType(filePath: string, config?: VaultConfig): EntityType {
  const vaultConfig = config || getVaultConfig();
  const resolvedPath = path.resolve(filePath);

  // Normalize paths for comparison (ensure trailing slash for directory matching)
  const normalizeDir = (dir: string) => {
    const resolved = path.resolve(dir);
    return resolved.endsWith(path.sep) ? resolved : resolved + path.sep;
  };

  const projectsDir = normalizeDir(vaultConfig.projectsDir);
  const areasDir = normalizeDir(vaultConfig.areasDir);
  const tasksDir = normalizeDir(vaultConfig.tasksDir);

  // Check if the file path starts with one of the configured directories
  if (resolvedPath.startsWith(projectsDir) || resolvedPath === vaultConfig.projectsDir) {
    return 'project';
  }
  if (resolvedPath.startsWith(areasDir) || resolvedPath === vaultConfig.areasDir) {
    return 'area';
  }
  if (resolvedPath.startsWith(tasksDir) || resolvedPath === vaultConfig.tasksDir) {
    return 'task';
  }

  // Default to 'task' if no match
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
 * Otherwise, performs fuzzy title matching using a vault session.
 *
 * @param query - Task identifier (path or title substring)
 * @param config - Optional vault config (defaults to getVaultConfig())
 * @param session - Optional vault session for reusing index (recommended for multiple lookups)
 * @returns LookupResult with matched tasks
 */
export function lookupTask(
  query: string,
  config?: VaultConfig,
  session?: VaultSession
): LookupResult<Task> {
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

  // Title-based fuzzy lookup using session
  const vaultSession = session || createVaultSession(vaultConfig);
  const matches = findTasksByTitle(vaultSession, query);

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
 * Otherwise, performs fuzzy title matching using a vault session.
 *
 * @param query - Project identifier (path or title substring)
 * @param config - Optional vault config (defaults to getVaultConfig())
 * @param session - Optional vault session for reusing index (recommended for multiple lookups)
 * @returns LookupResult with matched projects
 */
export function lookupProject(
  query: string,
  config?: VaultConfig,
  session?: VaultSession
): LookupResult<Project> {
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

  // Title-based fuzzy lookup using session
  const vaultSession = session || createVaultSession(vaultConfig);
  const matches = findProjectsByTitle(vaultSession, query);

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
 * Otherwise, performs fuzzy title matching using a vault session.
 *
 * @param query - Area identifier (path or title substring)
 * @param config - Optional vault config (defaults to getVaultConfig())
 * @param session - Optional vault session for reusing index (recommended for multiple lookups)
 * @returns LookupResult with matched areas
 */
export function lookupArea(
  query: string,
  config?: VaultConfig,
  session?: VaultSession
): LookupResult<Area> {
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

  // Title-based fuzzy lookup using session
  const vaultSession = session || createVaultSession(vaultConfig);
  const matches = findAreasByTitle(vaultSession, query);

  if (matches.length === 0) {
    return { type: 'none', matches: [] };
  }

  if (matches.length === 1) {
    return { type: 'single', matches };
  }

  return { type: 'multiple', matches };
}
