import * as React from 'react'
import { format } from 'date-fns'
import {
  X,
  Calendar,
  Flag,
  Snowflake,
  FolderOpen,
  CircleDot,
} from 'lucide-react'

// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import { useTaskDetailStore } from '@/store/task-detail-store'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DateButton } from '@/components/ui/date-button'
import { TaskStatusCheckbox } from './task-status-checkbox'
import { TaskStatusPill } from './task-status-pill'
import { LazyMilkdownEditor } from './lazy-milkdown-editor'

/**
 * TaskDetailPanel - Full task editing interface in the right sidebar.
 *
 * Opens when clicking a task anywhere in the app (lists, kanban, calendars).
 * Lives inside DetailSideBar and is controlled by task-detail-store.
 *
 * Sections:
 * - Header: Status checkbox, title (editable), close button
 * - Metadata: Project selector, area selector, status pill, date buttons
 * - Notes: Full markdown editor (LazyMilkdownEditor)
 * - Footer: Created/updated timestamps, task ID
 *
 * All changes save immediately - no explicit save button needed.
 */
export function TaskDetailPanel() {
  const { openTaskId, closeTask } = useTaskDetailStore()
  const {
    getTaskById,
    getActiveProjects,
    getActiveAreas,
    updateTaskTitle,
    updateTaskStatus,
    updateTaskScheduled,
    updateTaskDue,
    updateTaskDeferUntil,
    updateTaskNotes,
    updateTaskProject,
    updateTaskArea,
    toggleTaskStatus,
    getProjectById,
    getAreaById,
  } = useAppData()

  const task = openTaskId ? getTaskById(openTaskId) : null
  const activeProjects = getActiveProjects()
  const activeAreas = getActiveAreas()

  // Include non-active projects/areas that are currently assigned
  const allProjects = React.useMemo(() => {
    const projectId = task?.projectId
    if (!projectId) return activeProjects
    const current = getProjectById(projectId)
    if (current && !activeProjects.find((p) => p.id === current.id)) {
      return [current, ...activeProjects]
    }
    return activeProjects
  }, [task?.projectId, activeProjects, getProjectById])

  const allAreas = React.useMemo(() => {
    const areaId = task?.areaId
    if (!areaId) return activeAreas
    const current = getAreaById(areaId)
    if (current && !activeAreas.find((a) => a.id === current.id)) {
      return [current, ...activeAreas]
    }
    return activeAreas
  }, [task?.areaId, activeAreas, getAreaById])

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-6">
        Select a task to view details
      </div>
    )
  }

  const currentProject = task.projectId
    ? (getProjectById(task.projectId) ?? null)
    : null
  const currentArea = task.areaId ? (getAreaById(task.areaId) ?? null) : null

  return (
    <div className="flex h-full flex-col">
      {/* Header: Checkbox + Title + Close */}
      <div className="flex items-center gap-3 px-4 py-3">
        <TaskStatusCheckbox
          status={task.status}
          onToggle={() => toggleTaskStatus(task.id)}
          className="size-5 shrink-0"
        />
        <Textarea
          value={task.title}
          onChange={(e) => updateTaskTitle(task.id, e.target.value)}
          className="flex-1 text-lg font-medium border-none shadow-none p-1 min-h-0 h-auto resize-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm field-sizing-content"
          placeholder="Task title..."
          rows={1}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={closeTask}
          className="-mr-1 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Metadata section */}
      <div className="@container px-4 pb-3 space-y-2.5">
        {/* Project & Area row - stacks on narrow, row on wider */}
        <div className="flex flex-col @[280px]:flex-row gap-2">
          <SearchableSelect
            value={task.projectId}
            options={allProjects.map((p) => ({ value: p.id, label: p.title }))}
            placeholder="Project..."
            displayValue={currentProject?.title}
            icon={<CircleDot className="size-3 text-entity-project" />}
            onChange={(id) => updateTaskProject(task.id, id)}
            emptyText="No projects found"
          />
          <SearchableSelect
            value={task.areaId}
            options={allAreas.map((a) => ({ value: a.id, label: a.title }))}
            placeholder="Area..."
            displayValue={currentArea?.title}
            icon={<FolderOpen className="size-3 text-entity-area" />}
            onChange={(id) => updateTaskArea(task.id, id)}
            emptyText="No areas found"
          />
        </div>

        {/* Status + Dates row - wraps on narrow */}
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusPill
            status={task.status}
            onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
          />
          <div className="flex-1 min-w-4" />
          <div className="flex items-center gap-1.5 @[280px]:gap-2">
            <DateButton
              icon={<Calendar className="size-3" />}
              value={task.scheduled}
              onChange={(date) => updateTaskScheduled(task.id, date)}
              tooltip="Scheduled"
              variant="scheduled"
            />
            <DateButton
              icon={<Flag className="size-3" />}
              value={task.due}
              onChange={(date) => updateTaskDue(task.id, date)}
              tooltip="Due"
              variant="due"
            />
            <DateButton
              icon={<Snowflake className="size-3" />}
              value={task.deferUntil}
              onChange={(date) => updateTaskDeferUntil(task.id, date)}
              tooltip="Defer"
              variant="defer"
            />
          </div>
        </div>
      </div>

      {/* Notes - fills remaining space with card background */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 pt-0">
        <div className="h-full bg-card rounded-lg border overflow-hidden">
          <LazyMilkdownEditor
            editorKey={task.id}
            defaultValue={task.notes ?? ''}
            onChange={(value) => updateTaskNotes(task.id, value)}
            className="h-full"
          />
        </div>
      </div>

      {/* Footer - Metadata */}
      <div className="px-4 py-2 flex flex-wrap gap-x-2 @[280px]:gap-x-4 gap-y-0.5 text-2xs @[280px]:text-xs text-muted-foreground">
        <span>Created {formatShortDate(task.createdAt)}</span>
        <span>Updated {formatShortDate(task.updatedAt)}</span>
        {task.completedAt && (
          <span>Completed {formatShortDate(task.completedAt)}</span>
        )}
        <span className="font-mono opacity-50 truncate max-w-20 @xs:max-w-none">{task.id}</span>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatShortDate(isoString: string): string {
  try {
    return format(new Date(isoString), 'MMM d')
  } catch {
    return isoString
  }
}
