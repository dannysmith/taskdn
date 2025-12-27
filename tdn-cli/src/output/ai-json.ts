/**
 * AI-JSON formatter for context commands.
 * Per ai-context.md Section 8.
 *
 * When both --ai and --json flags are passed, output is wrapped
 * in a JSON envelope with the AI-optimized markdown in the `content` field.
 */

import type {
  Formatter,
  FormattableResult,
  AreaContextResultOutput,
  ProjectContextResultOutput,
  TaskContextResultOutput,
  VaultOverviewResult,
} from './types.ts';
import { aiFormatter } from './ai.ts';
import { jsonFormatter } from './json.ts';
import { collectReferences, type ReferenceEntry } from './helpers/reference-table.ts';

/**
 * Reference entry for JSON output (matches ai-context.md Section 8)
 */
export interface Reference {
  name: string;
  type: 'area' | 'project' | 'task';
  path: string;
}

/**
 * JSON envelope for context commands with --ai --json
 */
export interface ContextJsonOutput {
  contextType: 'overview' | 'area' | 'project' | 'task';
  entity: string | null;
  summary: string;
  content: string;
  references: Reference[];
}

/**
 * Convert ReferenceEntry to Reference (for JSON output)
 */
function toReference(entry: ReferenceEntry): Reference {
  return {
    name: entry.name,
    type: entry.type,
    path: entry.path,
  };
}

/**
 * Check if result is a context type that should get the JSON envelope
 */
function isContextResult(
  result: FormattableResult
): result is
  | VaultOverviewResult
  | AreaContextResultOutput
  | ProjectContextResultOutput
  | TaskContextResultOutput {
  return (
    result.type === 'vault-overview' ||
    result.type === 'area-context' ||
    result.type === 'project-context' ||
    result.type === 'task-context'
  );
}

/**
 * Build the AI-JSON envelope for a vault overview
 */
function formatVaultOverviewAiJson(result: VaultOverviewResult): string {
  const content = aiFormatter.format(result);

  const references = collectReferences({
    areas: result.areas,
    projects: result.projects,
    tasks: result.tasks,
  });

  const output: ContextJsonOutput = {
    contextType: 'overview',
    entity: null,
    summary: `Overview of all active work: ${result.stats.areaCount} areas, ${result.stats.projectCount} projects, ${result.stats.taskCount} tasks`,
    content,
    references: references.map(toReference),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Build the AI-JSON envelope for an area context
 */
function formatAreaContextAiJson(result: AreaContextResultOutput): string {
  const content = aiFormatter.format(result);

  // Collect all tasks for references
  const allTasks = [...result.directTasks];
  for (const tasks of result.projectTasks.values()) {
    allTasks.push(...tasks);
  }

  const references = collectReferences({
    areas: [result.area],
    projects: result.projects,
    tasks: allTasks,
  });

  const output: ContextJsonOutput = {
    contextType: 'area',
    entity: result.area.title,
    summary: `Context for area '${result.area.title}': ${result.stats.projectCount} projects, ${result.stats.activeTaskCount} active tasks`,
    content,
    references: references.map(toReference),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Build the AI-JSON envelope for a project context
 */
function formatProjectContextAiJson(result: ProjectContextResultOutput): string {
  const content = aiFormatter.format(result);

  const references = collectReferences({
    areas: result.area ? [result.area] : [],
    projects: [result.project],
    tasks: result.tasks,
  });

  const output: ContextJsonOutput = {
    contextType: 'project',
    entity: result.project.title,
    summary: `Context for project '${result.project.title}': ${result.stats.activeTaskCount} active tasks`,
    content,
    references: references.map(toReference),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Build the AI-JSON envelope for a task context
 */
function formatTaskContextAiJson(result: TaskContextResultOutput): string {
  const content = aiFormatter.format(result);

  const references = collectReferences({
    areas: result.area ? [result.area] : [],
    projects: result.project ? [result.project] : [],
    tasks: [result.task],
  });

  // Build summary with parent info
  let summary = `Context for task '${result.task.title}'`;
  if (result.project) {
    summary += ` in project '${result.project.title}'`;
  } else if (result.area) {
    summary += ` in area '${result.area.title}'`;
  }

  const output: ContextJsonOutput = {
    contextType: 'task',
    entity: result.task.title,
    summary,
    content,
    references: references.map(toReference),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * AI-JSON formatter - wraps AI markdown in JSON envelope for context commands.
 * For non-context types, falls back to regular JSON output.
 */
export const aiJsonFormatter: Formatter = {
  format(result: FormattableResult): string {
    if (!isContextResult(result)) {
      // Non-context types fall back to regular JSON formatter
      return jsonFormatter.format(result);
    }

    switch (result.type) {
      case 'vault-overview':
        return formatVaultOverviewAiJson(result);
      case 'area-context':
        return formatAreaContextAiJson(result);
      case 'project-context':
        return formatProjectContextAiJson(result);
      case 'task-context':
        return formatTaskContextAiJson(result);
      default:
        // Should never reach here due to isContextResult check
        return jsonFormatter.format(result);
    }
  },
};
