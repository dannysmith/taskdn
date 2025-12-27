import type { Area } from '@bindings';
import { toKebabCase } from '../helpers/index.ts';

/**
 * Format a single area for AI mode (structured Markdown)
 */
export function formatArea(area: Area): string {
  const lines: string[] = [];

  lines.push(`## ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);

  // Status is optional for areas
  if (area.status) {
    lines.push(`- **status:** ${toKebabCase(area.status)}`);
  }

  if (area.areaType) lines.push(`- **type:** ${area.areaType}`);
  if (area.description) lines.push(`- **description:** ${area.description}`);

  if (area.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(area.body);
  }

  return lines.join('\n');
}

/**
 * Format an area for list output in AI mode (compact, no body)
 * Uses ### heading (one level below the section heading)
 */
export function formatAreaListItem(area: Area): string {
  const lines: string[] = [];

  lines.push(`### ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);

  if (area.status) {
    lines.push(`- **status:** ${toKebabCase(area.status)}`);
  }
  if (area.areaType) {
    lines.push(`- **type:** ${area.areaType}`);
  }

  return lines.join('\n');
}
