/**
 * Normalize entity type to either singular or plural form.
 * Accepts both singular and plural forms as input.
 */
export function normalizeEntityType(type: string, form: 'singular' | 'plural'): string {
  const normalized = type.toLowerCase();

  if (normalized === 'task' || normalized === 'tasks') {
    return form === 'singular' ? 'task' : 'tasks';
  }
  if (normalized === 'project' || normalized === 'projects') {
    return form === 'singular' ? 'project' : 'projects';
  }
  if (normalized === 'area' || normalized === 'areas') {
    return form === 'singular' ? 'area' : 'areas';
  }

  // Return the input unchanged if it's not recognized
  return type;
}
