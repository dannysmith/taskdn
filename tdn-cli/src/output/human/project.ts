import { dim, cyan } from 'ansis';
import type { Project } from '@bindings';
import { formatLongDate } from '../helpers/index.ts';
import { extractFilename, formatEntityHeader, renderMarkdownBody } from './shared.ts';

/**
 * Format a single project for human output (show command)
 */
export function formatProject(project: Project): string {
  const lines: string[] = [];

  // Boxed header with title, filename, status
  lines.push(
    formatEntityHeader(project.title, extractFilename(project.path), project.status ?? undefined)
  );
  lines.push('');

  // Metadata
  if (project.startDate) lines.push(`  ${dim('Start Date:')} ${formatLongDate(project.startDate)}`);
  if (project.endDate) lines.push(`  ${dim('End Date:')} ${formatLongDate(project.endDate)}`);
  if (project.area) lines.push(`  ${dim('Area:')} ${cyan(project.area)}`);
  if (project.description) lines.push(`  ${dim('Description:')} ${project.description}`);
  if (project.blockedBy && project.blockedBy.length > 0) {
    lines.push(`  ${dim('Blocked By:')} ${project.blockedBy.join(', ')}`);
  }

  // Body with markdown rendering
  if (project.body) {
    lines.push('');
    lines.push(renderMarkdownBody(project.body));
  }

  return lines.join('\n');
}
