import { dim } from 'ansis';
import type { Area } from '@bindings';
import { extractFilename, formatEntityHeader, renderMarkdownBody } from './shared.ts';

/**
 * Format a single area for human output (show command)
 */
export function formatArea(area: Area): string {
  const lines: string[] = [];

  // Boxed header with title, filename, status
  lines.push(formatEntityHeader(area.title, extractFilename(area.path), area.status ?? undefined));
  lines.push('');

  // Metadata
  if (area.areaType) lines.push(`  ${dim('Type:')} ${area.areaType}`);
  if (area.description) lines.push(`  ${dim('Description:')} ${area.description}`);

  // Body with markdown rendering
  if (area.body) {
    lines.push('');
    lines.push(renderMarkdownBody(area.body));
  }

  return lines.join('\n');
}
