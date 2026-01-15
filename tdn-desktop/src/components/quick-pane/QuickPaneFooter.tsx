import { CircleDot, FolderOpen } from 'lucide-react'

import type { Area, Project } from '@/lib/tauri-bindings'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface QuickPaneFooterProps {
  onCancel: () => void
  onSave: () => void
  saveDisabled: boolean
  project: {
    value: string | undefined
    onChange: (id: string | undefined) => void
    options: Project[]
    open: boolean
    onOpenChange: (open: boolean) => void
  }
  area: {
    value: string | undefined
    onChange: (id: string | undefined) => void
    options: Area[]
    open: boolean
    onOpenChange: (open: boolean) => void
  }
}

/**
 * QuickPaneFooter - Project/Area selectors and Cancel/Save buttons.
 *
 * Left side: Project and area selectors (borderless)
 * Right side: Cancel and Save buttons
 *
 * Save is disabled when title is empty.
 * Cancel dismisses without creating a task.
 * Styled with subtle background like Things 3.
 */
export function QuickPaneFooter({
  onCancel,
  onSave,
  saveDisabled,
  project,
  area,
}: QuickPaneFooterProps) {
  // Filter to active projects/areas
  const activeProjects = project.options.filter(p => p.status !== 'done')
  const activeAreas = area.options.filter(a => a.status === 'active')

  // Find current selections
  const currentProject = project.value
    ? project.options.find(p => p.id === project.value)
    : null
  const currentArea = area.value
    ? area.options.find(a => a.id === area.value)
    : null

  // Include current selection even if not active
  const projectOptions =
    currentProject && !activeProjects.find(p => p.id === currentProject.id)
      ? [currentProject, ...activeProjects]
      : activeProjects

  const areaOptions =
    currentArea && !activeAreas.find(a => a.id === currentArea.id)
      ? [currentArea, ...activeAreas]
      : activeAreas

  return (
    <div className="flex items-center justify-between gap-2 rounded-b-2xl bg-muted/30 px-5 py-3">
      {/* Left side: Project + Area selectors */}
      <div className="flex items-center gap-2">
        <SearchableSelect
          value={currentProject?.id}
          options={projectOptions.map(p => ({ value: p.id, label: p.title }))}
          placeholder="Project"
          displayValue={currentProject?.title}
          icon={<CircleDot className="size-3 text-entity-project" />}
          onChange={project.onChange}
          emptyText="No projects"
          className="border-0 bg-transparent shadow-none min-w-36"
          open={project.open}
          onOpenChange={project.onOpenChange}
        />

        <SearchableSelect
          value={currentArea?.id}
          options={areaOptions.map(a => ({ value: a.id, label: a.title }))}
          placeholder="Area"
          displayValue={currentArea?.title}
          icon={<FolderOpen className="size-3 text-entity-area" />}
          onChange={area.onChange}
          emptyText="No areas"
          className="border-0 bg-transparent shadow-none min-w-32"
          open={area.open}
          onOpenChange={area.onOpenChange}
        />
      </div>

      {/* Right side: Cancel + Save buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="font-medium"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saveDisabled}
          className="font-medium"
        >
          Save
        </Button>
      </div>
    </div>
  )
}
