import type { Area, Project } from '@bindings';
import { truncateBody } from './body-utils.ts';
import { toKebabCase } from './string-utils.ts';

// Re-export for convenience
export { toKebabCase };

/**
 * Markdown helpers for context commands.
 * Building blocks for consistent formatting.
 */

/**
 * Format a metadata table with Field | Value columns
 *
 * @param fields - Array of [key, value] pairs
 * @returns Markdown table string
 */
export function formatMetadataTable(fields: [string, string | undefined][]): string {
  // Filter out undefined/empty values
  const validFields = fields.filter(([, value]) => value !== undefined && value !== '');

  if (validFields.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('| Field | Value |');
  lines.push('| ----- | ----- |');

  for (const [key, value] of validFields) {
    // Escape pipe characters
    const safeValue = (value ?? '').replace(/\|/g, '\\|');
    lines.push(`| ${key} | ${safeValue} |`);
  }

  return lines.join('\n');
}

/**
 * Format parent chain for a task.
 * Returns: "Project → Area" or "Area (direct)" or "(no project or area)"
 *
 * @param project - Parent project if any
 * @param area - Parent area if any
 */
export function formatParentChain(project?: Project | null, area?: Area | null): string {
  if (project && area) {
    return `${project.title} → ${area.title}`;
  }

  if (project) {
    return project.title;
  }

  if (area) {
    return `${area.title} (direct)`;
  }

  return '(no project or area)';
}

/**
 * Format parent chain for timeline display (shorter version).
 * In area context: just show project name or "(direct)"
 * In project context: no parent chain needed
 * In overview: show full chain
 */
export function formatParentChainForTimeline(
  project?: Project | null,
  area?: Area | null,
  context?: 'overview' | 'area' | 'project'
): string {
  switch (context) {
    case 'project':
      // No parent chain in project context
      return '';

    case 'area':
      // Just show project or (direct)
      if (project) {
        return project.title;
      }
      return '(direct)';

    case 'overview':
    default:
      // Full chain
      if (project && area) {
        return `${project.title} → ${area.title}`;
      }
      if (project) {
        return project.title;
      }
      if (area) {
        return `${area.title} (direct)`;
      }
      return '(no project or area)';
  }
}

/**
 * Format body content as a blockquote excerpt.
 * Truncates and wraps each line with "> "
 *
 * @param body - The body content
 * @param maxLines - Maximum lines (default 20)
 * @param maxWords - Maximum words (default 200)
 */
export function formatBlockquoteExcerpt(
  body: string | undefined,
  maxLines: number = 20,
  maxWords: number = 200
): string {
  const truncated = truncateBody(body, maxLines, maxWords);
  if (!truncated) {
    return '';
  }

  // Wrap each line in blockquote
  return truncated
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/**
 * Format a horizontal rule/separator
 */
export function formatSeparator(): string {
  return '---';
}

/**
 * Join multiple sections with separators
 * Filters out empty sections
 */
export function joinSections(...sections: (string | undefined)[]): string {
  return sections.filter((s) => s && s.trim() !== '').join('\n\n---\n\n');
}

/**
 * Format a section header (## level)
 */
export function formatSectionHeader(title: string): string {
  return `## ${title}`;
}

/**
 * Format a subsection header (### level)
 */
export function formatSubsectionHeader(title: string): string {
  return `### ${title}`;
}

/**
 * Format "none" placeholder in italics
 */
export function formatNone(message: string = 'None'): string {
  return `_${message}_`;
}

/**
 * Format a count with label, e.g., "8 tasks" or "1 task"
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${label}`;
}
