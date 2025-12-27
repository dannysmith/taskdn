import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir, platform } from 'os';

/**
 * Vault configuration for directory paths
 */
export interface VaultConfig {
  tasksDir: string;
  projectsDir: string;
  areasDir: string;
}

/**
 * Configuration file structure
 */
interface ConfigFile {
  tasksDir?: string;
  projectsDir?: string;
  areasDir?: string;
}

/**
 * System directories that should never be used as vault paths.
 * Attempting to use these could lead to data corruption or security issues.
 */
const SYSTEM_DIRECTORIES = ['/etc', '/usr', '/bin', '/sbin', '/root', '/boot', '/sys'];

/**
 * Validate and sanitize a vault path for security.
 *
 * SECURITY: This function prevents path traversal attacks (CRIT-2) by:
 * 1. Blocking access to system directories
 * 2. Warning if path is outside user's home directory
 * 3. Resolving the path to absolute form
 *
 * @param path - The path to validate (can be relative or absolute)
 * @param pathType - Description of what this path is for (e.g., "tasksDir")
 * @returns The validated absolute path
 * @throws Error if the path points to a system directory
 */
export function validateVaultPath(path: string, pathType: string = 'vault path'): string {
  const absolutePath = resolve(path);

  // Only apply system directory checks on Unix-like systems
  if (platform() !== 'win32') {
    // Check if path is or starts with a system directory
    for (const sysDir of SYSTEM_DIRECTORIES) {
      if (absolutePath === sysDir || absolutePath.startsWith(sysDir + '/')) {
        throw new Error(
          `Security: ${pathType} cannot point to system directory "${sysDir}". ` +
            `Vault paths must be in user-writable locations.`
        );
      }
    }

    // Also block dangerous /var subdirectories (but allow /var/folders for temp files)
    const dangerousVarPaths = ['/var/log', '/var/lib', '/var/db', '/var/mail'];
    for (const dangerousPath of dangerousVarPaths) {
      if (absolutePath === dangerousPath || absolutePath.startsWith(dangerousPath + '/')) {
        throw new Error(
          `Security: ${pathType} cannot point to system directory "${dangerousPath}". ` +
            `Vault paths must be in user-writable locations.`
        );
      }
    }

    // Warn if outside home directory (informational, not blocking)
    // Exception: /var/folders is allowed (macOS temp directory)
    const home = homedir();
    if (!absolutePath.startsWith(home) && !absolutePath.startsWith('/var/folders/')) {
      console.warn(
        `Warning: ${pathType} is outside your home directory: ${absolutePath}\n` +
          `This may cause permission issues or affect system files.`
      );
    }
  }

  return absolutePath;
}

/**
 * Get the user config file path (~/.taskdn.json)
 */
export function getUserConfigPath(): string {
  return resolve(homedir(), '.taskdn.json');
}

/**
 * Get the local config file path (./.taskdn.json)
 */
export function getLocalConfigPath(): string {
  return resolve(process.cwd(), '.taskdn.json');
}

/**
 * Validate that a parsed JSON object conforms to the ConfigFile schema
 */
function validateConfigFile(parsed: unknown): ConfigFile {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`expected object, got ${typeof parsed}`);
  }

  const obj = parsed as Record<string, unknown>;
  const validKeys = ['tasksDir', 'projectsDir', 'areasDir'];

  for (const key of validKeys) {
    if (key in obj && typeof obj[key] !== 'string') {
      throw new Error(`${key} must be a string, got ${typeof obj[key]}`);
    }
  }

  return obj as ConfigFile;
}

/**
 * Read and parse a JSON config file, returning null if it doesn't exist or is invalid
 */
function readConfigFile(path: string): ConfigFile | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(content);
    return validateConfigFile(parsed);
  } catch (error) {
    console.warn(
      `Warning: Failed to parse config file ${path}: ${error instanceof Error ? error.message : error}`
    );
    return null;
  }
}

/**
 * Get vault configuration with the following precedence:
 * 1. Environment variables (TASKDN_TASKS_DIR, TASKDN_PROJECTS_DIR, TASKDN_AREAS_DIR)
 * 2. Local config (./.taskdn.json)
 * 3. User config (~/.taskdn.json)
 * 4. Defaults (./tasks, ./projects, ./areas relative to cwd)
 *
 * All paths are validated for security using validateVaultPath().
 */
export function getVaultConfig(): VaultConfig {
  // Load config files (lower priority sources first, will be overwritten)
  const userConfig = readConfigFile(getUserConfigPath());
  const localConfig = readConfigFile(getLocalConfigPath());

  // Start with defaults (validated)
  const cwd = process.cwd();
  let tasksDir = validateVaultPath(resolve(cwd, 'tasks'), 'tasksDir');
  let projectsDir = validateVaultPath(resolve(cwd, 'projects'), 'projectsDir');
  let areasDir = validateVaultPath(resolve(cwd, 'areas'), 'areasDir');

  // Apply user config (with validation)
  if (userConfig) {
    if (userConfig.tasksDir) {
      tasksDir = validateVaultPath(resolve(userConfig.tasksDir), 'tasksDir');
    }
    if (userConfig.projectsDir) {
      projectsDir = validateVaultPath(resolve(userConfig.projectsDir), 'projectsDir');
    }
    if (userConfig.areasDir) {
      areasDir = validateVaultPath(resolve(userConfig.areasDir), 'areasDir');
    }
  }

  // Apply local config (overrides user config, with validation)
  if (localConfig) {
    if (localConfig.tasksDir) {
      tasksDir = validateVaultPath(resolve(localConfig.tasksDir), 'tasksDir');
    }
    if (localConfig.projectsDir) {
      projectsDir = validateVaultPath(resolve(localConfig.projectsDir), 'projectsDir');
    }
    if (localConfig.areasDir) {
      areasDir = validateVaultPath(resolve(localConfig.areasDir), 'areasDir');
    }
  }

  // Apply environment variables (highest priority, with validation)
  if (process.env.TASKDN_TASKS_DIR) {
    tasksDir = validateVaultPath(resolve(process.env.TASKDN_TASKS_DIR), 'tasksDir');
  }
  if (process.env.TASKDN_PROJECTS_DIR) {
    projectsDir = validateVaultPath(resolve(process.env.TASKDN_PROJECTS_DIR), 'projectsDir');
  }
  if (process.env.TASKDN_AREAS_DIR) {
    areasDir = validateVaultPath(resolve(process.env.TASKDN_AREAS_DIR), 'areasDir');
  }

  return {
    tasksDir,
    projectsDir,
    areasDir,
  };
}

/**
 * Configuration source information
 */
export interface ConfigSource {
  userConfigPath: string;
  userConfigExists: boolean;
  localConfigPath: string;
  localConfigExists: boolean;
  effectiveConfig: VaultConfig;
}

/**
 * Get configuration source information for display purposes.
 * Shows which config files exist and the effective configuration values.
 */
export function getConfigSource(): ConfigSource {
  const userConfigPath = getUserConfigPath();
  const localConfigPath = getLocalConfigPath();
  const userConfigExists = existsSync(userConfigPath);
  const localConfigExists = existsSync(localConfigPath);
  const effectiveConfig = getVaultConfig();

  return {
    userConfigPath,
    userConfigExists,
    localConfigPath,
    localConfigExists,
    effectiveConfig,
  };
}
