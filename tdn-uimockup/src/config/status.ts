import type { TaskStatus, ProjectStatus } from '@/types/data'

export interface StatusConfig {
  label: string
  color: string // Combined bg + text classes using CSS variables
}

export const taskStatusConfig: Record<TaskStatus, StatusConfig> = {
  inbox: { label: 'Inbox', color: 'bg-status-inbox/15 text-status-inbox' },
  icebox: { label: 'Icebox', color: 'bg-status-icebox/15 text-status-icebox' },
  ready: { label: 'Ready', color: 'bg-status-ready/15 text-status-ready' },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-status-in-progress/15 text-status-in-progress',
  },
  blocked: {
    label: 'Blocked',
    color: 'bg-status-blocked/15 text-status-blocked',
  },
  dropped: {
    label: 'Dropped',
    color: 'bg-status-dropped/15 text-status-dropped',
  },
  done: { label: 'Done', color: 'bg-status-done/15 text-status-done' },
}

export const projectStatusConfig: Record<ProjectStatus, StatusConfig> = {
  planning: {
    label: 'Planning',
    color: 'bg-status-planning/15 text-status-planning',
  },
  ready: { label: 'Ready', color: 'bg-status-ready/15 text-status-ready' },
  'in-progress': {
    label: 'Active',
    color: 'bg-status-in-progress/15 text-status-in-progress',
  },
  blocked: {
    label: 'Blocked',
    color: 'bg-status-blocked/15 text-status-blocked',
  },
  paused: {
    label: 'Paused',
    color: 'bg-status-paused/15 text-status-paused',
  },
  done: { label: 'Done', color: 'bg-status-done/15 text-status-done' },
}

// Task status ordering: primary statuses first, then secondary after separator
export const taskPrimaryStatuses: TaskStatus[] = [
  'inbox',
  'ready',
  'in-progress',
  'blocked',
  'done',
]
export const taskSecondaryStatuses: TaskStatus[] = ['icebox', 'dropped']

// Project status ordering
export const projectPrimaryStatuses: ProjectStatus[] = [
  'planning',
  'ready',
  'in-progress',
  'blocked',
]
export const projectSecondaryStatuses: ProjectStatus[] = ['paused', 'done']
