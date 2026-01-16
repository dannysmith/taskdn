/**
 * Task navigation utilities.
 *
 * Determines which view/selection to navigate to when opening a task.
 * Used by deep linking and Quick Search.
 */

import type { Task, Project, Area } from '@/lib/tauri-bindings'
import type { Selection } from '@/types/navigation'

/**
 * Determine the correct view/selection for a task.
 *
 * Priority:
 * 1. Inbox tasks → inbox view
 * 2. Task has project → project view
 * 3. Task has area (no project) → area view
 * 4. No project or area → no-area view
 *
 * @param task - The task to navigate to
 * @param projects - All projects (for resolving wikilinks)
 * @param areas - All areas (for resolving wikilinks)
 * @returns The selection to set in navigation store
 */
export function getSelectionForTask(
  task: Task,
  projects: Project[],
  areas: Area[]
): Selection {
  // Inbox tasks always go to inbox view
  if (task.status === 'inbox') {
    return { type: 'nav', id: 'inbox' }
  }

  // If task has a project, find the project and navigate to it
  if (task.project) {
    // task.project is a wikilink like "[[Project Name]]"
    const projectTitle = task.project.replace(/^\[\[|\]\]$/g, '')
    const project = projects.find(
      p => p.title.toLowerCase() === projectTitle.toLowerCase()
    )
    if (project) {
      return { type: 'project', id: project.id }
    }
  }

  // If task has an area (but no project), navigate to area view
  if (task.area) {
    // task.area is a wikilink like "[[Area Name]]"
    const areaTitle = task.area.replace(/^\[\[|\]\]$/g, '')
    const area = areas.find(
      a => a.title.toLowerCase() === areaTitle.toLowerCase()
    )
    if (area) {
      return { type: 'area', id: area.id }
    }
  }

  // No project or area - go to No Area view
  return { type: 'no-area' }
}
