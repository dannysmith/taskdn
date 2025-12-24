import type { Task } from '@bindings';
import { TASK_STATUS_EMOJI } from './status-emoji.ts';

/**
 * Stats utilities for context commands.
 * Aggregates task counts by status for display.
 */

/**
 * Task counts by status
 */
export interface TaskStatusCounts {
  inProgress: number;
  ready: number;
  inbox: number;
  blocked: number;
}

/**
 * Count tasks by their status
 * Only counts active statuses (in-progress, ready, inbox, blocked)
 */
export function countTasksByStatus(tasks: Task[]): TaskStatusCounts {
  const counts: TaskStatusCounts = {
    inProgress: 0,
    ready: 0,
    inbox: 0,
    blocked: 0,
  };

  for (const task of tasks) {
    const status = normalizeStatus(task.status);
    switch (status) {
      case 'in-progress':
        counts.inProgress++;
        break;
      case 'ready':
        counts.ready++;
        break;
      case 'inbox':
        counts.inbox++;
        break;
      case 'blocked':
        counts.blocked++;
        break;
      // Ignore done, dropped, icebox
    }
  }

  return counts;
}

/**
 * Format task counts as shorthand with emojis
 * Returns format like "(2▶️ 4🟢 1📥 1🚫)"
 * Omits zero counts
 */
export function formatTaskCountShorthand(counts: TaskStatusCounts): string {
  const parts: string[] = [];

  if (counts.inProgress > 0) {
    parts.push(`${counts.inProgress}${TASK_STATUS_EMOJI['in-progress']}`);
  }
  if (counts.ready > 0) {
    parts.push(`${counts.ready}${TASK_STATUS_EMOJI['ready']}`);
  }
  if (counts.inbox > 0) {
    parts.push(`${counts.inbox}${TASK_STATUS_EMOJI['inbox']}`);
  }
  if (counts.blocked > 0) {
    parts.push(`${counts.blocked}${TASK_STATUS_EMOJI['blocked']}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `(${parts.join(' ')})`;
}

/**
 * Get total count of active tasks from counts
 */
export function getTotalActiveCount(counts: TaskStatusCounts): number {
  return counts.inProgress + counts.ready + counts.inbox + counts.blocked;
}

/**
 * Normalize status to kebab-case
 */
function normalizeStatus(status: string): string {
  return status
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
