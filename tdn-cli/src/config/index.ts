import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

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
 * Get the user config file path (~/.config/taskdn/config.json)
 */
function getUserConfigPath(): string {
  return resolve(homedir(), '.config', 'taskdn', 'config.json');
}

/**
 * Get the local config file path (./.taskdn.json)
 */
function getLocalConfigPath(): string {
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
 * 3. User config (~/.config/taskdn/config.json)
 * 4. Defaults (./tasks, ./projects, ./areas relative to cwd)
 */
export function getVaultConfig(): VaultConfig {
  // Load config files (lower priority sources first, will be overwritten)
  const userConfig = readConfigFile(getUserConfigPath());
  const localConfig = readConfigFile(getLocalConfigPath());

  // Start with defaults
  const cwd = process.cwd();
  let tasksDir = resolve(cwd, 'tasks');
  let projectsDir = resolve(cwd, 'projects');
  let areasDir = resolve(cwd, 'areas');

  // Apply user config
  if (userConfig) {
    if (userConfig.tasksDir) tasksDir = resolve(userConfig.tasksDir);
    if (userConfig.projectsDir) projectsDir = resolve(userConfig.projectsDir);
    if (userConfig.areasDir) areasDir = resolve(userConfig.areasDir);
  }

  // Apply local config (overrides user config)
  if (localConfig) {
    if (localConfig.tasksDir) tasksDir = resolve(localConfig.tasksDir);
    if (localConfig.projectsDir) projectsDir = resolve(localConfig.projectsDir);
    if (localConfig.areasDir) areasDir = resolve(localConfig.areasDir);
  }

  // Apply environment variables (highest priority)
  if (process.env.TASKDN_TASKS_DIR) {
    tasksDir = resolve(process.env.TASKDN_TASKS_DIR);
  }
  if (process.env.TASKDN_PROJECTS_DIR) {
    projectsDir = resolve(process.env.TASKDN_PROJECTS_DIR);
  }
  if (process.env.TASKDN_AREAS_DIR) {
    areasDir = resolve(process.env.TASKDN_AREAS_DIR);
  }

  return {
    tasksDir,
    projectsDir,
    areasDir,
  };
}
