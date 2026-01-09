import { format } from 'date-fns'
import { Calendar, Flag, Snowflake, FolderOpen, CircleDot } from 'lucide-react'

import { useVaultData, useVaultHelpers, useUpdateTask } from '@/services/vault'
import { useTaskDetailStore } from '@/store/task-detail-store'
import type { TaskStatus } from '@/lib/tauri-bindings'

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
 * Lives inside RightSideBar and is controlled by task-detail-store.
 * Close the sidebar with the keyboard shortcut (Cmd+\).
 *
 * Sections:
 * - Header: Status checkbox, title (editable)
 * - Metadata: Project selector, area selector, status pill, date buttons
 * - Notes: Full markdown editor (LazyMilkdownEditor)
 * - Footer: Created/updated timestamps, task ID
 *
 * All changes save immediately - no explicit save button needed.
 */
export function TaskDetailPanel() {
  const openTaskId = useTaskDetailStore(state => state.openTaskId)

  const { tasks, projects, areas } = useVaultData()
  const { getActiveProjects, getActiveAreas, getProjectById, getAreaById } =
    useVaultHelpers()
  const updateTask = useUpdateTask()

  const task = openTaskId
    ? (tasks.find(t => t.id === openTaskId) ?? null)
    : null

  const activeProjects = getActiveProjects()
  const activeAreas = getActiveAreas()

  // Extract title from wikilink like "[[Project Name]]" -> "Project Name"
  const extractFromWikilink = (wikilink: string | null): string | null => {
    if (!wikilink) return null
    const match = wikilink.match(/^\[\[(.+)\]\]$/)
    return match?.[1] ?? wikilink
  }

  // Find project/area by matching wikilink
  const findProjectByWikilink = (wikilink: string | null) => {
    if (!wikilink) return null
    const title = extractFromWikilink(wikilink)
    if (!title) return null
    return projects.find(p => p.title === title || p.id === title) ?? null
  }

  const findAreaByWikilink = (wikilink: string | null) => {
    if (!wikilink) return null
    const title = extractFromWikilink(wikilink)
    if (!title) return null
    return areas.find(a => a.title === title || a.id === title) ?? null
  }

  // Include non-active projects/areas that are currently assigned
  // React Compiler handles memoization automatically
  const currentProject = findProjectByWikilink(task?.project ?? null)
  const allProjects =
    currentProject && !activeProjects.find(p => p.id === currentProject.id)
      ? [currentProject, ...activeProjects]
      : activeProjects

  const currentArea = findAreaByWikilink(task?.area ?? null)
  const allAreas =
    currentArea && !activeAreas.find(a => a.id === currentArea.id)
      ? [currentArea, ...activeAreas]
      : activeAreas

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-6">
        Select a task to view details
      </div>
    )
  }

  // Update handlers - all use the updateTask mutation
  const handleTitleChange = (newTitle: string) => {
    updateTask.mutate({
      id: task.id,
      title: newTitle,
      status: null,
      project: null,
      area: null,
      scheduled: null,
      due: null,
      deferUntil: null,
      body: null,
    })
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTask.mutate({
      id: task.id,
      title: null,
      status: newStatus,
      project: null,
      area: null,
      scheduled: null,
      due: null,
      deferUntil: null,
      body: null,
    })
  }

  const handleToggleStatus = () => {
    const newStatus = task.status === 'done' ? 'ready' : 'done'
    handleStatusChange(newStatus)
  }

  const handleProjectChange = (projectId: string | undefined) => {
    const project = projectId ? getProjectById(projectId) : null
    updateTask.mutate({
      id: task.id,
      title: null,
      status: null,
      project: project?.title ?? '',
      area: null,
      scheduled: null,
      due: null,
      deferUntil: null,
      body: null,
    })
  }

  const handleAreaChange = (areaId: string | undefined) => {
    const area = areaId ? getAreaById(areaId) : null
    updateTask.mutate({
      id: task.id,
      title: null,
      status: null,
      project: null,
      area: area?.title ?? '',
      scheduled: null,
      due: null,
      deferUntil: null,
      body: null,
    })
  }

  const handleScheduledChange = (date: string | undefined) => {
    updateTask.mutate({
      id: task.id,
      title: null,
      status: null,
      project: null,
      area: null,
      scheduled: date ?? '',
      due: null,
      deferUntil: null,
      body: null,
    })
  }

  const handleDueChange = (date: string | undefined) => {
    updateTask.mutate({
      id: task.id,
      title: null,
      status: null,
      project: null,
      area: null,
      scheduled: null,
      due: date ?? '',
      deferUntil: null,
      body: null,
    })
  }

  const handleDeferUntilChange = (date: string | undefined) => {
    updateTask.mutate({
      id: task.id,
      title: null,
      status: null,
      project: null,
      area: null,
      scheduled: null,
      due: null,
      deferUntil: date ?? '',
      body: null,
    })
  }

  const handleBodyChange = (newBody: string) => {
    updateTask.mutate({
      id: task.id,
      title: null,
      status: null,
      project: null,
      area: null,
      scheduled: null,
      due: null,
      deferUntil: null,
      body: newBody,
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: Checkbox + Title + Close */}
      <div className="flex items-center gap-3 px-4 py-3">
        <TaskStatusCheckbox
          status={task.status}
          onToggle={handleToggleStatus}
          className="size-5 shrink-0"
        />
        <Textarea
          value={task.title}
          onChange={e => handleTitleChange(e.target.value)}
          className="flex-1 text-lg font-medium border-none shadow-none p-1 min-h-0 h-auto resize-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm field-sizing-content"
          placeholder="Task title..."
          rows={1}
        />
      </div>

      {/* Metadata section */}
      <div className="@container px-4 pb-3 space-y-2.5">
        {/* Project & Area row - stacks on narrow, row on wider */}
        <div className="flex flex-col @[280px]:flex-row gap-2">
          <SearchableSelect
            value={currentProject?.id}
            options={allProjects.map(p => ({ value: p.id, label: p.title }))}
            placeholder="Project..."
            displayValue={currentProject?.title}
            icon={<CircleDot className="size-3 text-entity-project" />}
            onChange={handleProjectChange}
            emptyText="No projects found"
          />
          <SearchableSelect
            value={currentArea?.id}
            options={allAreas.map(a => ({ value: a.id, label: a.title }))}
            placeholder="Area..."
            displayValue={currentArea?.title}
            icon={<FolderOpen className="size-3 text-entity-area" />}
            onChange={handleAreaChange}
            emptyText="No areas found"
          />
        </div>

        {/* Status + Dates row - wraps on narrow */}
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusPill
            status={task.status}
            onStatusChange={handleStatusChange}
          />
          <div className="flex-1 min-w-4" />
          <div className="flex items-center gap-1.5 @[280px]:gap-2">
            <DateButton
              icon={<Calendar className="size-3" />}
              value={task.scheduled ?? undefined}
              onChange={handleScheduledChange}
              tooltip="Scheduled"
              variant="scheduled"
            />
            <DateButton
              icon={<Flag className="size-3" />}
              value={task.due ?? undefined}
              onChange={handleDueChange}
              tooltip="Due"
              variant="due"
            />
            <DateButton
              icon={<Snowflake className="size-3" />}
              value={task.deferUntil ?? undefined}
              onChange={handleDeferUntilChange}
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
            defaultValue={task.body ?? ''}
            onChange={handleBodyChange}
            className="h-full"
          />
        </div>
      </div>

      {/* Footer - Metadata */}
      <div className="px-4 py-2 flex flex-wrap gap-x-2 @[280px]:gap-x-4 gap-y-0.5 text-2xs @[280px]:text-xs text-muted-foreground">
        {task.createdAt && (
          <span>Created {formatShortDate(task.createdAt)}</span>
        )}
        {task.updatedAt && (
          <span>Updated {formatShortDate(task.updatedAt)}</span>
        )}
        {task.completedAt && (
          <span>Completed {formatShortDate(task.completedAt)}</span>
        )}
        <span className="font-mono opacity-50 truncate max-w-20 @xs:max-w-none">
          {task.id}
        </span>
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
