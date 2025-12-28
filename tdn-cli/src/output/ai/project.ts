import type { Project } from '@bindings';
import { toKebabCase } from '../helpers/index.ts';

/**
 * Format a single project for AI mode (structured Markdown)
 */
export function formatProject(project: Project): string {
  const lines: string[] = [];

  lines.push(`## ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);

  // Status is optional for projects
  if (project.status) {
    lines.push(`- **status:** ${toKebabCase(project.status)}`);
  }

  if (project.area) lines.push(`- **area:** ${project.area}`);
  if (project.description) lines.push(`- **description:** ${project.description}`);
  if (project.startDate) lines.push(`- **start-date:** ${project.startDate}`);
  if (project.endDate) lines.push(`- **end-date:** ${project.endDate}`);
  if (project.uniqueId) lines.push(`- **unique-id:** ${project.uniqueId}`);
  if (project.blockedBy && project.blockedBy.length > 0) {
    lines.push(`- **blocked-by:** ${project.blockedBy.join(', ')}`);
  }

  if (project.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(project.body);
  }

  return lines.join('\n');
}

/**
 * Format a project for list output in AI mode (compact, no body)
 * Uses ### heading (one level below the section heading)
 */
export function formatProjectListItem(project: Project): string {
  const lines: string[] = [];

  lines.push(`### ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);

  if (project.status) {
    lines.push(`- **status:** ${toKebabCase(project.status)}`);
  }
  if (project.area) {
    lines.push(`- **area:** ${project.area}`);
  }

  return lines.join('\n');
}
