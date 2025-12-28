import type { Area, Project, Task } from '@bindings';

/**
 * Reference table builder for context commands.
 * Per ai-context.md Section 3.5
 *
 * Every context output ends with a Reference table listing
 * all mentioned entities with their paths.
 */

/**
 * Entity type for reference table
 */
export type EntityType = 'area' | 'project' | 'task';

/**
 * A reference entry for the table
 */
export interface ReferenceEntry {
  name: string;
  type: EntityType;
  path: string;
}

/**
 * Input for collecting references
 */
export interface ReferenceInput {
  areas?: Area[];
  projects?: Project[];
  tasks?: Task[];
}

/**
 * Collect unique entities from the data we've already fetched.
 * Deduplicates by path.
 */
export function collectReferences(input: ReferenceInput): ReferenceEntry[] {
  const seen = new Set<string>();
  const entries: ReferenceEntry[] = [];

  // Add areas
  if (input.areas) {
    for (const area of input.areas) {
      if (!seen.has(area.path)) {
        seen.add(area.path);
        entries.push({
          name: area.title,
          type: 'area',
          path: area.path,
        });
      }
    }
  }

  // Add projects
  if (input.projects) {
    for (const project of input.projects) {
      if (!seen.has(project.path)) {
        seen.add(project.path);
        entries.push({
          name: project.title,
          type: 'project',
          path: project.path,
        });
      }
    }
  }

  // Add tasks
  if (input.tasks) {
    for (const task of input.tasks) {
      if (!seen.has(task.path)) {
        seen.add(task.path);
        entries.push({
          name: task.title,
          type: 'task',
          path: task.path,
        });
      }
    }
  }

  return entries;
}

/**
 * Build a markdown reference table from entries.
 * Format:
 * | Entity | Type | Path |
 * | ------ | ---- | ---- |
 * | Work   | area | areas/work.md |
 */
export function buildReferenceTable(entries: ReferenceEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Header
  lines.push('| Entity | Type | Path |');
  lines.push('| ------ | ---- | ---- |');

  // Rows
  for (const entry of entries) {
    // Escape pipe characters in entity names
    const safeName = entry.name.replace(/\|/g, '\\|');
    lines.push(`| ${safeName} | ${entry.type} | ${entry.path} |`);
  }

  return lines.join('\n');
}

/**
 * Build a complete reference section with header
 */
export function buildReferenceSection(entries: ReferenceEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  const table = buildReferenceTable(entries);
  return `## Reference\n\n${table}`;
}

/**
 * Sort reference entries by type priority (area > project > task)
 * then by name alphabetically
 */
export function sortReferenceEntries(entries: ReferenceEntry[]): ReferenceEntry[] {
  const typePriority: Record<EntityType, number> = {
    area: 0,
    project: 1,
    task: 2,
  };

  return [...entries].sort((a, b) => {
    const typeDiff = typePriority[a.type] - typePriority[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name);
  });
}
