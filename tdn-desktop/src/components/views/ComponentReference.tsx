/**
 * ComponentReference - Development-only view showcasing all reusable components.
 *
 * This view displays examples of all UI primitives and reusable app components
 * with fake data. Use it to:
 * - Work on styling/interactivity in isolation
 * - Spot visual inconsistencies
 * - Document component APIs
 *
 * Only available in development mode (import.meta.env.DEV).
 */

import { useState } from 'react'
import {
  CalendarIcon,
  ChevronRightIcon,
  FlagIcon,
  FolderOpen,
  CircleDot,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SnowflakeIcon,
  TrashIcon,
  UserIcon,
  ClockIcon,
} from 'lucide-react'

// UI Primitives
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressCircle } from '@/components/ui/progress-circle'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { DateButton } from '@/components/ui/date-button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TagInput, type Tag } from '@/components/ui/tag-input'
import { LazyMarkdownEditor } from '@/components/ui/lazy-markdown-editor'
import { CollapsibleNotesSection } from '@/components/ui/collapsible-notes'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'

// App Components - Tasks
import { TaskCard } from '@/components/cards/TaskCard'
import { TaskItem } from '@/components/tasks/TaskItem'
import { TaskStatusCheckbox } from '@/components/tasks/TaskStatusCheckbox'
import { TaskStatusPill } from '@/components/tasks/TaskStatusPill'
import { SectionHeader } from '@/components/tasks/SectionHeader'

// App Components - Projects
import { ProjectCard } from '@/components/cards/ProjectCard'
import { ProjectStatusPill } from '@/components/projects/ProjectStatusPill'
import { ProjectStatusBadges } from '@/components/projects/ProjectStatusBadges'
import { ProjectStatusIndicator } from '@/components/sidebar/DraggableProject'

// App Components - Areas
import { AreaCard } from '@/components/cards/AreaCard'

// App Components - Layout
import { ViewHeader } from '@/components/layout/ViewHeader'
import { HeadingListItem } from '@/components/headings/HeadingListItem'

// Types
import type { Task, Project, Area } from '@/lib/tauri-bindings'

// -----------------------------------------------------------------------------
// Fake Data
// -----------------------------------------------------------------------------

const todayStr = new Date().toISOString().split('T')[0]!
const yesterdayStr = new Date(Date.now() - 86400000)
  .toISOString()
  .split('T')[0]!
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]!

const FAKE_TASKS: Task[] = [
  {
    id: 'task-1',
    path: '/tasks/task-1.md',
    title: 'Review pull request for authentication feature',
    status: 'ready',
    project: 'project-1',
    area: null,
    due: tomorrowStr,
    scheduled: todayStr,
    deferUntil: null,
    body: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  },
  {
    id: 'task-2',
    path: '/tasks/task-2.md',
    title: 'Fix critical bug in payment processing',
    status: 'in-progress',
    project: 'project-1',
    area: null,
    due: yesterdayStr, // overdue
    scheduled: null,
    deferUntil: null,
    body: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  },
  {
    id: 'task-3',
    path: '/tasks/task-3.md',
    title: 'Write documentation for new API endpoints',
    status: 'ready',
    project: null,
    area: 'area-1',
    due: null,
    scheduled: null,
    deferUntil: tomorrowStr, // deferred
    body: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  },
  {
    id: 'task-4',
    path: '/tasks/task-4.md',
    title: 'Deploy staging environment',
    status: 'done',
    project: 'project-1',
    area: null,
    due: null,
    scheduled: null,
    deferUntil: null,
    body: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
]

const FAKE_PROJECT: Project = {
  id: 'project-1',
  path: '/projects/project-1.md',
  title: 'Authentication System',
  status: 'in-progress',
  area: 'area-1',
  startDate: null,
  endDate: null,
  description: 'Implement user authentication with OAuth2',
  blockedBy: null,
  body: '',
}

const FAKE_AREA: Area = {
  id: 'area-1',
  path: '/areas/area-1.md',
  title: 'Work',
  status: 'active',
  areaType: 'work',
  description: 'Work-related projects and tasks',
  body: '',
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ComponentReference() {
  // Form state
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const [switchChecked, setSwitchChecked] = useState(false)
  const [selectValue, setSelectValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [collapsibleOpen, setCollapsibleOpen] = useState(false)
  const [dateButtonValue, setDateButtonValue] = useState<string | undefined>(
    todayStr
  )
  const [tags, setTags] = useState<Tag[]>([
    { id: '1', text: 'tag1' },
    { id: '2', text: 'tag2' },
  ])
  const [searchableSelectValue, setSearchableSelectValue] = useState<
    string | undefined
  >(undefined)
  const [commandOpen, setCommandOpen] = useState(false)
  const [markdownContent, setMarkdownContent] = useState(
    '# Notes\n\nSome **bold** and *italic* text.\n\n- List item 1\n- List item 2'
  )

  // Task/heading state for demos
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [sectionExpanded, setSectionExpanded] = useState(true)

  return (
    <TooltipProvider>
      <ScrollArea className="h-full">
        <div className="space-y-12 p-6 pb-24 max-w-4xl">
          <header className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Component Reference</h1>
              <p className="text-muted-foreground mt-1">
                All reusable UI components used in Taskdn
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a
                href="#tasks"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Tasks
              </a>
              <a
                href="#projects"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Projects
              </a>
              <a
                href="#areas"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Areas
              </a>
              <a
                href="#layout"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Layout
              </a>
              <a
                href="#forms"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Forms
              </a>
              <a
                href="#display"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Display
              </a>
              <a
                href="#overlays"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Overlays
              </a>
            </nav>
          </header>

          {/* ----------------------------------------------------------------- */}
          {/* TASK COMPONENTS */}
          {/* ----------------------------------------------------------------- */}
          <Section id="tasks" title="Task Components">
            <ComponentGroup title="TaskItem (list row)">
              <p className="text-xs text-muted-foreground mb-3">
                Core task row used in TodayView, InboxView, WeekView. Click to
                select, double-click to edit.
              </p>
              <div className="border rounded-lg overflow-hidden">
                {FAKE_TASKS.slice(0, 2).map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isSelected={selectedTaskId === task.id}
                    isEditing={editingTaskId === task.id}
                    onSelect={() => setSelectedTaskId(task.id)}
                    onStartEdit={() => setEditingTaskId(task.id)}
                    onEndEdit={() => setEditingTaskId(null)}
                    onTitleChange={() => {}}
                    onStatusToggle={() => {}}
                    contextName="Authentication System"
                  />
                ))}
              </div>
            </ComponentGroup>

            <ComponentGroup title="TaskCard (default size)">
              <p className="text-xs text-muted-foreground mb-3">
                Rich card for Kanban boards and week calendar. Shows full
                metadata.
              </p>
              <div className="grid gap-3 max-w-xs">
                <TaskCard
                  task={FAKE_TASKS[0]!}
                  projectName="Authentication System"
                  onStatusChange={() => {}}
                  onTitleChange={() => {}}
                />
              </div>
            </ComponentGroup>

            <ComponentGroup title="TaskCard (compact size)">
              <p className="text-xs text-muted-foreground mb-3">
                Compact card for month calendar cells. Just checkbox + title.
              </p>
              <div className="grid gap-2 max-w-[200px]">
                <TaskCard task={FAKE_TASKS[0]!} size="compact" />
                <TaskCard task={FAKE_TASKS[3]!} size="compact" variant="done" />
              </div>
            </ComponentGroup>

            <ComponentGroup title="TaskCard variants">
              <p className="text-xs text-muted-foreground mb-3">
                Visual states: default, overdue (red), deferred (muted/dashed),
                done (green).
              </p>
              <div className="grid gap-3 max-w-xs">
                <TaskCard task={FAKE_TASKS[0]!} variant="default" />
                <TaskCard task={FAKE_TASKS[1]!} variant="overdue" />
                <TaskCard task={FAKE_TASKS[2]!} variant="deferred" />
                <TaskCard task={FAKE_TASKS[3]!} variant="done" />
              </div>
            </ComponentGroup>

            <ComponentGroup title="TaskStatusCheckbox">
              <p className="text-xs text-muted-foreground mb-3">
                Status indicator that toggles between states on click.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <TaskStatusCheckbox status="ready" onToggle={() => {}} />
                  <span className="text-2xs text-muted-foreground">ready</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <TaskStatusCheckbox
                    status="in-progress"
                    onToggle={() => {}}
                  />
                  <span className="text-2xs text-muted-foreground">
                    in-progress
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <TaskStatusCheckbox status="blocked" onToggle={() => {}} />
                  <span className="text-2xs text-muted-foreground">
                    blocked
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <TaskStatusCheckbox status="done" onToggle={() => {}} />
                  <span className="text-2xs text-muted-foreground">done</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <TaskStatusCheckbox status="dropped" onToggle={() => {}} />
                  <span className="text-2xs text-muted-foreground">
                    dropped
                  </span>
                </div>
              </div>
            </ComponentGroup>

            <ComponentGroup title="TaskStatusPill" isLast>
              <p className="text-xs text-muted-foreground mb-3">
                Dropdown to change task status. Click to open menu.
              </p>
              <div className="flex flex-wrap gap-2">
                <TaskStatusPill status="inbox" onStatusChange={() => {}} />
                <TaskStatusPill status="ready" onStatusChange={() => {}} />
                <TaskStatusPill
                  status="in-progress"
                  onStatusChange={() => {}}
                />
                <TaskStatusPill status="blocked" onStatusChange={() => {}} />
                <TaskStatusPill status="done" onStatusChange={() => {}} />
              </div>
            </ComponentGroup>
          </Section>

          {/* ----------------------------------------------------------------- */}
          {/* PROJECT COMPONENTS */}
          {/* ----------------------------------------------------------------- */}
          <Section id="projects" title="Project Components">
            <ComponentGroup title="ProjectCard">
              <div className="max-w-sm">
                <ProjectCard
                  project={FAKE_PROJECT}
                  completion={42}
                  taskCount={12}
                  completedTaskCount={5}
                  areaName="Work"
                  onClick={() => {}}
                />
              </div>
            </ComponentGroup>

            <ComponentGroup title="ProjectStatusPill">
              <div className="flex flex-wrap gap-2">
                <ProjectStatusPill
                  status="planning"
                  onStatusChange={() => {}}
                />
                <ProjectStatusPill status="ready" onStatusChange={() => {}} />
                <ProjectStatusPill
                  status="in-progress"
                  onStatusChange={() => {}}
                />
                <ProjectStatusPill status="blocked" onStatusChange={() => {}} />
                <ProjectStatusPill status="paused" onStatusChange={() => {}} />
                <ProjectStatusPill status="done" onStatusChange={() => {}} />
              </div>
            </ComponentGroup>

            <ComponentGroup title="ProjectStatusBadges">
              <p className="text-xs text-muted-foreground mb-3">
                Shown in ViewHeader when viewing an area.
              </p>
              <ProjectStatusBadges
                counts={{
                  planning: 2,
                  'in-progress': 5,
                  blocked: 1,
                  done: 8,
                }}
              />
            </ComponentGroup>

            <ComponentGroup title="ProjectStatusIndicator" isLast>
              <p className="text-xs text-muted-foreground mb-3">
                Compact status indicator showing progress circle or status icon.
                Used in sidebar, ProjectHeader, and ProjectCard.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <ProjectStatusIndicator status="planning" completion={0} />
                  <span className="text-2xs text-muted-foreground">
                    planning
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ProjectStatusIndicator status="ready" completion={0} />
                  <span className="text-2xs text-muted-foreground">ready</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ProjectStatusIndicator
                    status="in-progress"
                    completion={42}
                  />
                  <span className="text-2xs text-muted-foreground">
                    in-progress
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ProjectStatusIndicator status="blocked" completion={50} />
                  <span className="text-2xs text-muted-foreground">
                    blocked
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ProjectStatusIndicator status="paused" completion={75} />
                  <span className="text-2xs text-muted-foreground">paused</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ProjectStatusIndicator status="done" completion={100} />
                  <span className="text-2xs text-muted-foreground">done</span>
                </div>
              </div>
            </ComponentGroup>
          </Section>

          {/* ----------------------------------------------------------------- */}
          {/* AREA COMPONENTS */}
          {/* ----------------------------------------------------------------- */}
          <Section id="areas" title="Area Components">
            <ComponentGroup title="AreaCard" isLast>
              <div className="max-w-sm">
                <AreaCard
                  area={FAKE_AREA}
                  projectCount={4}
                  activeProjectCount={2}
                  onClick={() => {}}
                />
              </div>
            </ComponentGroup>
          </Section>

          {/* ----------------------------------------------------------------- */}
          {/* SECTION HEADERS & LAYOUT */}
          {/* ----------------------------------------------------------------- */}
          <Section id="layout" title="Section Headers & Layout">
            <ComponentGroup title="SectionHeader">
              <p className="text-xs text-muted-foreground mb-3">
                Collapsible section header with task count and action buttons.
              </p>
              <div className="border rounded-lg overflow-hidden">
                <SectionHeader
                  title="Scheduled for Today"
                  icon={<ClockIcon className="size-4" />}
                  taskCount={5}
                  isExpanded={sectionExpanded}
                  onToggleExpand={() => setSectionExpanded(!sectionExpanded)}
                  onAddTask={() => {}}
                  onAddHeading={() => {}}
                />
                {sectionExpanded && (
                  <div className="p-2 text-sm text-muted-foreground">
                    Section content appears here when expanded
                  </div>
                )}
              </div>
            </ComponentGroup>

            <ComponentGroup title="ViewHeader">
              <p className="text-xs text-muted-foreground mb-3">
                Top header bar for all views. Title + optional badges + actions.
              </p>
              <div className="border rounded-lg overflow-hidden bg-background">
                <ViewHeader
                  title="Today"
                  actions={
                    <ViewToggle
                      value={viewMode}
                      onChange={setViewMode}
                      availableModes={['list', 'kanban']}
                    />
                  }
                />
              </div>
              <div className="border rounded-lg overflow-hidden bg-background mt-3">
                <ViewHeader
                  title="Work"
                  children={
                    <ProjectStatusBadges
                      counts={{ 'in-progress': 3, ready: 2 }}
                    />
                  }
                  actions={
                    <ViewToggle
                      value={viewMode}
                      onChange={setViewMode}
                      availableModes={['list', 'kanban']}
                    />
                  }
                />
              </div>
            </ComponentGroup>

            <ComponentGroup title="HeadingListItem" isLast>
              <p className="text-xs text-muted-foreground mb-3">
                Colored divider heading for organizing tasks in Today view.
              </p>
              <div className="border rounded-lg overflow-hidden">
                <HeadingListItem
                  heading={{ id: 'h1', title: 'Morning Tasks', color: 'blue' }}
                  isSelected={false}
                  isEditing={false}
                  onSelect={() => {}}
                  onStartEdit={() => {}}
                  onEndEdit={() => {}}
                  onTitleChange={() => {}}
                  onColorChange={() => {}}
                  onDelete={() => {}}
                  dragId="heading-h1"
                  containerId="demo"
                />
                <HeadingListItem
                  heading={{
                    id: 'h2',
                    title: 'Afternoon Focus',
                    color: 'amber',
                  }}
                  isSelected={false}
                  isEditing={false}
                  onSelect={() => {}}
                  onStartEdit={() => {}}
                  onEndEdit={() => {}}
                  onTitleChange={() => {}}
                  onColorChange={() => {}}
                  onDelete={() => {}}
                  dragId="heading-h2"
                  containerId="demo"
                />
              </div>
            </ComponentGroup>
          </Section>

          {/* ----------------------------------------------------------------- */}
          {/* FORM COMPONENTS */}
          {/* ----------------------------------------------------------------- */}
          <Section id="forms" title="Form Components">
            <ComponentGroup title="Button">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="lg">Large</Button>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="xs">XS</Button>
                <Button size="icon">
                  <PlusIcon />
                </Button>
                <Button disabled>Disabled</Button>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Input & Textarea">
              <div className="space-y-2 max-w-xs">
                <Input placeholder="Default input" />
                <Input placeholder="Disabled" disabled />
                <Textarea placeholder="Textarea..." />
              </div>
            </ComponentGroup>

            <ComponentGroup title="Checkbox & Switch">
              <p className="text-xs text-muted-foreground mb-3">
                Switch is used in Preferences for toggles.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="checkbox-demo"
                    checked={checkboxChecked}
                    onCheckedChange={c => setCheckboxChecked(c === true)}
                  />
                  <Label htmlFor="checkbox-demo">Checkbox option</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="switch-demo"
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />
                  <Label htmlFor="switch-demo">Enable feature</Label>
                </div>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Select">
              <p className="text-xs text-muted-foreground mb-3">
                Used in Preferences for theme/language selection.
              </p>
              <Select
                value={selectValue}
                onValueChange={v => v && setSelectValue(v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </ComponentGroup>

            <ComponentGroup title="SearchableSelect">
              <p className="text-xs text-muted-foreground mb-3">
                Used in TaskDetailPanel for project/area selection.
              </p>
              <div className="flex gap-2">
                <SearchableSelect
                  options={[
                    { value: 'proj-1', label: 'Authentication System' },
                    { value: 'proj-2', label: 'Dashboard Redesign' },
                    { value: 'proj-3', label: 'API Documentation' },
                  ]}
                  value={searchableSelectValue}
                  onChange={setSearchableSelectValue}
                  placeholder="Project..."
                  icon={<CircleDot className="size-3 text-entity-project" />}
                  emptyText="No projects found"
                />
                <SearchableSelect
                  options={[
                    { value: 'area-1', label: 'Work' },
                    { value: 'area-2', label: 'Personal' },
                  ]}
                  value={undefined}
                  onChange={() => {}}
                  placeholder="Area..."
                  icon={<FolderOpen className="size-3 text-entity-area" />}
                  emptyText="No areas found"
                />
              </div>
            </ComponentGroup>

            <ComponentGroup title="DateButton">
              <p className="text-xs text-muted-foreground mb-3">
                Compact date picker buttons used in TaskDetailPanel.
              </p>
              <div className="flex gap-2">
                <DateButton
                  variant="scheduled"
                  icon={<CalendarIcon className="size-3" />}
                  value={dateButtonValue}
                  onChange={setDateButtonValue}
                  tooltip="Schedule"
                />
                <DateButton
                  variant="due"
                  icon={<FlagIcon className="size-3" />}
                  value={dateButtonValue}
                  onChange={setDateButtonValue}
                  tooltip="Due date"
                />
                <DateButton
                  variant="defer"
                  icon={<SnowflakeIcon className="size-3" />}
                  value={undefined}
                  onChange={setDateButtonValue}
                  tooltip="Defer until"
                />
              </div>
            </ComponentGroup>

            <ComponentGroup title="TagInput">
              <p className="text-xs text-muted-foreground mb-3">
                Used in Preferences for ignore patterns.
              </p>
              <TagInput
                tags={tags}
                onTagsChange={setTags}
                placeholder="Add tags..."
              />
            </ComponentGroup>

            <ComponentGroup title="MarkdownEditor" isLast>
              <p className="text-xs text-muted-foreground mb-3">
                WYSIWYG markdown editor with preview/source toggle. Used in
                TaskDetailPanel for notes. Loaded lazily (Milkdown is large).
              </p>
              <div className="border rounded-lg h-48 overflow-hidden">
                <LazyMarkdownEditor
                  editorKey="demo-editor"
                  defaultValue={markdownContent}
                  onChange={setMarkdownContent}
                  placeholder="Write some notes..."
                />
              </div>
            </ComponentGroup>
          </Section>

          {/* ----------------------------------------------------------------- */}
          {/* DISPLAY & FEEDBACK */}
          {/* ----------------------------------------------------------------- */}
          <Section id="display" title="Display & Feedback">
            <ComponentGroup title="Badge">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Spinner & Skeleton">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span className="text-sm">Loading...</span>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
            </ComponentGroup>

            <ComponentGroup title="ProgressCircle">
              <p className="text-xs text-muted-foreground mb-3">
                Used in sidebar for project completion indicator.
              </p>
              <div className="flex items-center gap-4">
                <ProgressCircle value={0} />
                <ProgressCircle value={25} />
                <ProgressCircle value={50} />
                <ProgressCircle value={75} />
                <ProgressCircle value={100} />
              </div>
            </ComponentGroup>

            <ComponentGroup title="ViewToggle">
              <ViewToggle
                value={viewMode}
                onChange={setViewMode}
                availableModes={['list', 'kanban', 'calendar']}
              />
            </ComponentGroup>

            <ComponentGroup title="Kbd">
              <p className="text-xs text-muted-foreground mb-3">
                Keyboard shortcut display.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </div>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>P</Kbd>
                </KbdGroup>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Breadcrumb">
              <p className="text-xs text-muted-foreground mb-3">
                Used in Preferences dialog for navigation.
              </p>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>General</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </ComponentGroup>

            <ComponentGroup title="EmptyState">
              <EmptyState
                title="No tasks found"
                description="Create a new task to get started"
              />
            </ComponentGroup>

            <ComponentGroup title="CollapsibleNotesSection">
              <p className="text-xs text-muted-foreground mb-3">
                Expandable notes panel used in ProjectView and AreaView for
                descriptions. Shows preview when collapsed.
              </p>
              <div className="max-w-md">
                <CollapsibleNotesSection
                  notes="This is a **project description** with some markdown content.\n\nIt can contain multiple paragraphs and formatting to describe the purpose and goals of the project or area."
                  title="Notes"
                />
              </div>
            </ComponentGroup>

            <ComponentGroup title="Separator" isLast>
              <div className="space-y-4 max-w-xs">
                <Separator />
                <div className="flex items-center gap-4">
                  <span>Left</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Right</span>
                </div>
              </div>
            </ComponentGroup>
          </Section>

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAYS */}
          {/* ----------------------------------------------------------------- */}
          <Section id="overlays" title="Overlays">
            <ComponentGroup title="Tooltip">
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" />}>
                  Hover me
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a tooltip</p>
                </TooltipContent>
              </Tooltip>
            </ComponentGroup>

            <ComponentGroup title="Popover">
              <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>
                  Open popover
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium">Popover Title</h4>
                    <p className="text-sm text-muted-foreground">
                      Popover content goes here.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </ComponentGroup>

            <ComponentGroup title="Dialog">
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  Open dialog
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>
                      Dialog description text.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">Dialog content goes here.</div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </ComponentGroup>

            <ComponentGroup title="AlertDialog">
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  Delete item
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </ComponentGroup>

            <ComponentGroup title="DropdownMenu">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  Open menu
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 size-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <SettingsIcon className="mr-2 size-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <TrashIcon className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentGroup>

            <ComponentGroup title="Collapsible">
              <Collapsible
                open={collapsibleOpen}
                onOpenChange={setCollapsibleOpen}
              >
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2"
                    />
                  }
                >
                  <ChevronRightIcon
                    className={`size-4 transition-transform ${collapsibleOpen ? 'rotate-90' : ''}`}
                  />
                  Click to expand
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-md border p-4">
                  Collapsible content appears here.
                </CollapsibleContent>
              </Collapsible>
            </ComponentGroup>

            <ComponentGroup title="Command Palette" isLast>
              <p className="text-xs text-muted-foreground mb-3">
                Global command palette (Cmd+K).
              </p>
              <Button variant="outline" onClick={() => setCommandOpen(true)}>
                <SearchIcon className="mr-2 size-4" />
                Open Command Palette
              </Button>
              <CommandDialog
                open={commandOpen}
                onOpenChange={setCommandOpen}
                title="Command Palette"
                description="Search for commands..."
              >
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Navigation">
                    <CommandItem>
                      <CalendarIcon className="mr-2 size-4" />
                      Go to Today
                      <CommandShortcut>⌘T</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <FolderOpen className="mr-2 size-4" />
                      Go to Inbox
                      <CommandShortcut>⌘I</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading="Actions">
                    <CommandItem>
                      <PlusIcon className="mr-2 size-4" />
                      New Task
                      <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </CommandDialog>
            </ComponentGroup>
          </Section>
        </div>
      </ScrollArea>
    </TooltipProvider>
  )
}

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="border-l-4 border-primary/60 pl-4 mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="grid gap-6 pl-5">{children}</div>
    </section>
  )
}

function ComponentGroup({
  title,
  children,
  isLast = false,
}: {
  title: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div
      className={`space-y-3 pb-6 ${!isLast ? 'border-b border-dashed border-border/60' : ''}`}
    >
      <h3 className="font-mono text-sm font-medium">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
