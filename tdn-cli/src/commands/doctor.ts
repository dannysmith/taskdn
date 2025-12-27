import { Command } from '@commander-js/extra-typings';
import { getVaultConfig } from '@/config/index.ts';
import { getOutputMode } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/types.ts';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  parseTaskFile,
  parseProjectFile,
  parseAreaFile,
  scanProjects,
  scanAreas,
  type Task,
  type Project,
  type Area,
} from '@bindings';
import {
  VALID_TASK_STATUSES,
  VALID_PROJECT_STATUSES,
  VALID_AREA_STATUSES,
} from '@/lib/constants.ts';

/**
 * Doctor command - comprehensive health check for the vault
 *
 * Usage:
 *   taskdn doctor
 */

interface DoctorIssue {
  file: string;
  message: string;
}

/**
 * Replace home directory with ~ for display
 */
function formatPath(path: string): string {
  const home = homedir();
  if (path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

/**
 * Find all markdown files in a directory (excluding archive subdirectories)
 */
function findMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const files: string[] = [];

  function walk(currentDir: string, depth: number = 0) {
    // Don't recurse too deep to avoid infinite loops
    if (depth > 10) return;

    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip archive directories at any level
        if (entry === 'archive') continue;
        walk(fullPath, depth + 1);
      } else if (stat.isFile() && entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Validate a date string is in ISO 8601 format
 */
function isValidIsoDate(dateStr: string): boolean {
  // ISO 8601 format: YYYY-MM-DD
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso8601Regex.test(dateStr)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr);
}

/**
 * Check if a file has valid YAML frontmatter structure
 */
function checkYamlParseable(filePath: string): string | null {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Check for frontmatter delimiters
    if (!content.startsWith('---\n')) {
      return 'Missing frontmatter (should start with ---)';
    }

    const lines = content.split('\n');
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return 'Frontmatter not closed (missing closing ---)';
    }

    return null; // Parseable
  } catch (error) {
    return `Failed to read file: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Validate a task and return any issues
 */
function validateTask(task: Task, projectTitles: Set<string>): string[] {
  const issues: string[] = [];

  // Check required fields
  if (!task.title || task.title.trim() === '') {
    issues.push('Missing required field: title');
  }

  if (!task.status) {
    issues.push('Missing required field: status');
  } else {
    const statusLower = task.status.toLowerCase();
    const validStatuses = VALID_TASK_STATUSES as readonly string[];
    if (!validStatuses.includes(statusLower)) {
      issues.push(`Invalid status "${task.status}" (valid: ${VALID_TASK_STATUSES.join(', ')})`);
    }
  }

  // Check date fields are valid ISO 8601
  if (task.due && !isValidIsoDate(task.due)) {
    issues.push(`Invalid due date "${task.due}" (must be ISO 8601: YYYY-MM-DD)`);
  }
  if (task.scheduled && !isValidIsoDate(task.scheduled)) {
    issues.push(`Invalid scheduled date "${task.scheduled}" (must be ISO 8601: YYYY-MM-DD)`);
  }
  if (task.deferUntil && !isValidIsoDate(task.deferUntil)) {
    issues.push(`Invalid defer-until date "${task.deferUntil}" (must be ISO 8601: YYYY-MM-DD)`);
  }

  // Check project reference exists
  if (task.project && !projectTitles.has(task.project)) {
    issues.push(`References non-existent project "${task.project}"`);
  }

  // Note: Multi-project validation would require checking raw YAML before parsing,
  // since the Rust parser converts projects array to singular project field.
  // This check is not currently implemented.

  return issues;
}

/**
 * Validate a project and return any issues
 */
function validateProject(project: Project, areaTitles: Set<string>): string[] {
  const issues: string[] = [];

  // Check required fields
  if (!project.title || project.title.trim() === '') {
    issues.push('Missing required field: title');
  }

  // Status is optional for projects, but if present must be valid
  if (project.status) {
    const statusLower = project.status.toLowerCase();
    const validStatuses = VALID_PROJECT_STATUSES as readonly string[];
    if (!validStatuses.includes(statusLower)) {
      issues.push(
        `Invalid status "${project.status}" (valid: ${VALID_PROJECT_STATUSES.join(', ')})`
      );
    }
  }

  // Check date fields are valid ISO 8601
  if (project.startDate && !isValidIsoDate(project.startDate)) {
    issues.push(`Invalid start-date "${project.startDate}" (must be ISO 8601: YYYY-MM-DD)`);
  }
  if (project.endDate && !isValidIsoDate(project.endDate)) {
    issues.push(`Invalid end-date "${project.endDate}" (must be ISO 8601: YYYY-MM-DD)`);
  }

  // Check area reference exists
  if (project.area && !areaTitles.has(project.area)) {
    issues.push(`References non-existent area "${project.area}"`);
  }

  return issues;
}

/**
 * Validate an area and return any issues
 */
function validateArea(area: Area): string[] {
  const issues: string[] = [];

  // Check required fields
  if (!area.title || area.title.trim() === '') {
    issues.push('Missing required field: title');
  }

  // Status is optional for areas, but if present must be valid
  if (area.status) {
    const statusLower = area.status.toLowerCase();
    const validStatuses = VALID_AREA_STATUSES as readonly string[];
    if (!validStatuses.includes(statusLower)) {
      issues.push(`Invalid status "${area.status}" (valid: ${VALID_AREA_STATUSES.join(', ')})`);
    }
  }

  return issues;
}

export const doctorCommand = new Command('doctor')
  .description('Comprehensive health check for the vault')
  .action((options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);

    try {
      const config = getVaultConfig();
      const issues: DoctorIssue[] = [];

      // System checks
      const tasksExists = existsSync(config.tasksDir);
      const projectsExists = existsSync(config.projectsDir);
      const areasExists = existsSync(config.areasDir);

      if (!tasksExists) {
        if (mode === 'human') {
          console.error(`✗ Tasks directory not found: ${formatPath(config.tasksDir)}`);
        }
        process.exit(2);
      }

      if (!projectsExists) {
        if (mode === 'human') {
          console.error(`✗ Projects directory not found: ${formatPath(config.projectsDir)}`);
        }
        process.exit(2);
      }

      if (!areasExists) {
        if (mode === 'human') {
          console.error(`✗ Areas directory not found: ${formatPath(config.areasDir)}`);
        }
        process.exit(2);
      }

      // Find all markdown files
      const taskFiles = findMarkdownFiles(config.tasksDir);
      const projectFiles = findMarkdownFiles(config.projectsDir);
      const areaFiles = findMarkdownFiles(config.areasDir);

      const totalFiles = taskFiles.length + projectFiles.length + areaFiles.length;

      // First, scan successfully parsed entities to build reference sets
      let projects: Project[] = [];
      let areas: Area[] = [];

      try {
        projects = scanProjects(config);
      } catch {
        // If scan fails, we'll catch individual parse errors below
      }

      try {
        areas = scanAreas(config);
      } catch {
        // If scan fails, we'll catch individual parse errors below
      }

      const projectTitles = new Set(projects.map((p) => p.title));
      const areaTitles = new Set(areas.map((a) => a.title));

      // Check each task file
      for (const filePath of taskFiles) {
        const displayPath = formatPath(filePath);

        // Check YAML is parseable
        const yamlError = checkYamlParseable(filePath);
        if (yamlError) {
          issues.push({ file: displayPath, message: yamlError });
          continue;
        }

        // Try to parse the task
        try {
          const task = parseTaskFile(filePath);
          const taskIssues = validateTask(task, projectTitles);
          for (const issue of taskIssues) {
            issues.push({ file: displayPath, message: issue });
          }
        } catch (error) {
          issues.push({
            file: displayPath,
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      // Check each project file
      for (const filePath of projectFiles) {
        const displayPath = formatPath(filePath);

        // Check YAML is parseable
        const yamlError = checkYamlParseable(filePath);
        if (yamlError) {
          issues.push({ file: displayPath, message: yamlError });
          continue;
        }

        // Try to parse the project
        try {
          const project = parseProjectFile(filePath);
          const projectIssues = validateProject(project, areaTitles);
          for (const issue of projectIssues) {
            issues.push({ file: displayPath, message: issue });
          }
        } catch (error) {
          issues.push({
            file: displayPath,
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      // Check each area file
      for (const filePath of areaFiles) {
        const displayPath = formatPath(filePath);

        // Check YAML is parseable
        const yamlError = checkYamlParseable(filePath);
        if (yamlError) {
          issues.push({ file: displayPath, message: yamlError });
          continue;
        }

        // Try to parse the area
        try {
          const area = parseAreaFile(filePath);
          const areaIssues = validateArea(area);
          for (const issue of areaIssues) {
            issues.push({ file: displayPath, message: issue });
          }
        } catch (error) {
          issues.push({
            file: displayPath,
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      // Output results
      if (mode === 'human') {
        console.log(`✓ Config found`);
        console.log(`✓ Tasks directory (${taskFiles.length} files)`);
        console.log(`✓ Projects directory (${projectFiles.length} files)`);
        console.log(`✓ Areas directory (${areaFiles.length} files)`);
        console.log();

        if (issues.length === 0) {
          console.log('✓ No issues found');
        } else {
          console.log(`⚠ ${issues.length} issue${issues.length === 1 ? '' : 's'} found:\n`);

          for (const issue of issues) {
            console.log(`  ${issue.file}`);
            console.log(`    → ${issue.message}\n`);
          }

          console.log(
            `Summary: ${issues.length} issue${issues.length === 1 ? '' : 's'} in ${totalFiles} files checked`
          );
        }
      } else if (mode === 'ai') {
        console.log('## Vault Health Check\n');
        console.log('**System:**');
        console.log(`- Config: ✓`);
        console.log(`- Tasks directory: ✓ (${taskFiles.length} files)`);
        console.log(`- Projects directory: ✓ (${projectFiles.length} files)`);
        console.log(`- Areas directory: ✓ (${areaFiles.length} files)`);
        console.log();

        if (issues.length === 0) {
          console.log('**Status:** ✓ No issues found');
        } else {
          console.log(
            `**Status:** ⚠ ${issues.length} issue${issues.length === 1 ? '' : 's'} found\n`
          );
          console.log('**Issues:**\n');

          for (const issue of issues) {
            console.log(`- \`${issue.file}\`: ${issue.message}`);
          }
        }
      } else {
        // JSON mode
        const summary =
          issues.length === 0
            ? `Vault is healthy (${totalFiles} files checked)`
            : `Found ${issues.length} issue${issues.length === 1 ? '' : 's'} (${totalFiles} files checked)`;
        console.log(
          JSON.stringify(
            {
              summary,
              healthy: issues.length === 0,
              filesChecked: totalFiles,
              taskFiles: taskFiles.length,
              projectFiles: projectFiles.length,
              areaFiles: areaFiles.length,
              issuesCount: issues.length,
              issues: issues.map((i) => ({
                file: i.file,
                message: i.message,
              })),
            },
            null,
            2
          )
        );
      }

      // Exit with appropriate code
      if (issues.length > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (error) {
      if (mode === 'human') {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        console.error(
          JSON.stringify({
            error: 'DOCTOR_FAILED',
            message: error instanceof Error ? error.message : String(error),
          })
        );
      }
      process.exit(2);
    }
  });
