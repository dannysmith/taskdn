/**
 * Styleguide sections for the app's components, each showing the variants and
 * states the app uses, with fake data. Overlays are rendered open so they can
 * be seen and screenshotted.
 */
import type React from 'react'
import { useEffect, useState } from 'react'
import { addDays, format } from 'date-fns'
import { toast } from 'sonner'
import {
  CalendarIcon,
  ChevronRightIcon,
  CircleDot,
  ClockIcon,
  FlagIcon,
  FolderOpen,
  PlusIcon,
  SettingsIcon,
  SnowflakeIcon,
  TrashIcon,
  UserIcon,
} from 'lucide-react'

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
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'

import { TaskCard } from '@/components/cards/TaskCard'
import { TaskItem } from '@/components/tasks/TaskItem'
import { TaskStatusCheckbox } from '@/components/tasks/TaskStatusCheckbox'
import { TaskStatusPill } from '@/components/tasks/TaskStatusPill'
import { SectionHeader } from '@/components/tasks/SectionHeader'
import { ProjectCard } from '@/components/cards/ProjectCard'
import { ProjectStatusPill } from '@/components/projects/ProjectStatusPill'
import { ProjectStatusBadges } from '@/components/projects/ProjectStatusBadges'
import { ProjectStatusIndicator } from '@/components/sidebar/DraggableProject'
import { AreaCard } from '@/components/cards/AreaCard'
import { ViewHeader } from '@/components/layout/ViewHeader'
import { HeadingListItem } from '@/components/headings/HeadingListItem'
import { AppToaster } from '@/components/layout/AppToaster'
import type {
  Area,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
} from '@/lib/tauri-bindings'
import type { Heading } from '@/types/headings'

// -----------------------------------------------------------------------------
// Fake data
// -----------------------------------------------------------------------------

/** Demo callbacks that do nothing */
const noop = () => undefined

const day = (offset: number) =>
  format(addDays(new Date(), offset), 'yyyy-MM-dd')
const now = new Date().toISOString()

function fakeTask(fields: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    path: `/tasks/${fields.id}.md`,
    status: 'ready',
    project: null,
    area: null,
    due: null,
    scheduled: null,
    deferUntil: null,
    body: '',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...fields,
  }
}

const REVIEW = fakeTask({
  id: 'review',
  title: 'Review pull request for authentication feature',
  project: 'project-1',
  due: day(1),
  scheduled: day(0),
})
const OVERDUE = fakeTask({
  id: 'overdue',
  title: 'Fix critical bug in payment processing',
  status: 'in-progress',
  project: 'project-1',
  due: day(-1),
})
const DEFERRED = fakeTask({
  id: 'deferred',
  title: 'Write documentation for new API endpoints',
  area: 'area-1',
  deferUntil: day(1),
})
const DONE = fakeTask({
  id: 'done',
  title: 'Deploy staging environment',
  status: 'done',
  project: 'project-1',
  completedAt: now,
})

const PROJECT: Project = {
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

const AREA: Area = {
  id: 'area-1',
  path: '/areas/area-1.md',
  title: 'Work',
  status: 'active',
  areaType: 'work',
  description: 'Work-related projects and tasks',
  body: '',
}

const HEADINGS: Heading[] = [
  { id: 'h1', title: 'Morning tasks', color: 'blue' },
  { id: 'h2', title: 'Afternoon focus', color: 'amber' },
]

const TASK_STATUSES: TaskStatus[] = [
  'ready',
  'in-progress',
  'blocked',
  'done',
  'dropped',
]
const PROJECT_STATUSES: [ProjectStatus, number][] = [
  ['planning', 0],
  ['ready', 0],
  ['in-progress', 42],
  ['blocked', 50],
  ['paused', 75],
  ['done', 100],
]

// -----------------------------------------------------------------------------
// Layout helpers
// -----------------------------------------------------------------------------

/** A titled group of examples, with an optional note on where it's used. */
function Group({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-mono text-sm font-medium">{title}</h3>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  )
}

/** An example with a small caption under it. */
function Labelled({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="text-2xs text-muted-foreground">{label}</span>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Inline sections
// -----------------------------------------------------------------------------

export function TasksSection() {
  const [selectedId, setSelectedId] = useState<string | null>(REVIEW.id)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <Group
        title="TaskItem"
        note="The task row in Today, Inbox and This Week. Click to select, double-click to edit."
      >
        <div className="max-w-2xl overflow-hidden rounded-lg border">
          {[REVIEW, OVERDUE, DEFERRED, DONE].map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={selectedId === task.id}
              isEditing={editingId === task.id}
              onSelect={() => setSelectedId(task.id)}
              onStartEdit={() => setEditingId(task.id)}
              onEndEdit={() => setEditingId(null)}
              onTitleChange={noop}
              onStatusToggle={noop}
              contextName="Authentication System"
            />
          ))}
        </div>
      </Group>
      <Group title="TaskStatusCheckbox" note="Toggles status on click.">
        <div className="flex items-center gap-6">
          {TASK_STATUSES.map(status => (
            <Labelled key={status} label={status}>
              <TaskStatusCheckbox status={status} onToggle={noop} />
            </Labelled>
          ))}
        </div>
      </Group>
      <Group title="TaskStatusPill" note="Changes a task's status from a menu.">
        <div className="flex flex-wrap gap-2">
          {(['inbox', ...TASK_STATUSES] as TaskStatus[]).map(status => (
            <TaskStatusPill
              key={status}
              status={status}
              onStatusChange={noop}
            />
          ))}
        </div>
      </Group>
    </div>
  )
}

export function TaskCardsSection() {
  return (
    <div className="grid grid-cols-[repeat(2,18rem)_14rem] gap-8">
      <Group title="Default" note="Kanban boards and the week calendar.">
        <TaskCard
          task={REVIEW}
          projectName="Authentication System"
          onStatusChange={noop}
          onTitleChange={noop}
        />
        <TaskCard task={OVERDUE} variant="overdue" />
      </Group>
      <Group title="Deferred and done" note="Muted, and green.">
        <TaskCard task={DEFERRED} variant="deferred" />
        <TaskCard task={DONE} variant="done" />
      </Group>
      <Group title="Compact" note="Month calendar cells.">
        <TaskCard task={REVIEW} size="compact" />
        <TaskCard task={OVERDUE} size="compact" variant="overdue" />
        <TaskCard task={DONE} size="compact" variant="done" />
      </Group>
    </div>
  )
}

export function ProjectsSection() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <Group title="ProjectCard">
          <ProjectCard
            project={PROJECT}
            completion={42}
            taskCount={12}
            completedTaskCount={5}
            areaName="Work"
            onClick={noop}
          />
        </Group>
        <Group title="AreaCard">
          <AreaCard
            area={AREA}
            projectCount={4}
            activeProjectCount={2}
            onClick={noop}
          />
        </Group>
      </div>
      <Group title="ProjectStatusPill">
        <div className="flex flex-wrap gap-2">
          {PROJECT_STATUSES.map(([status]) => (
            <ProjectStatusPill
              key={status}
              status={status}
              onStatusChange={noop}
            />
          ))}
        </div>
      </Group>
      <Group
        title="ProjectStatusIndicator"
        note="Progress circle or status icon, in the sidebar and on project cards."
      >
        <div className="flex items-center gap-6">
          {PROJECT_STATUSES.map(([status, completion]) => (
            <Labelled key={status} label={status}>
              <ProjectStatusIndicator status={status} completion={completion} />
            </Labelled>
          ))}
        </div>
      </Group>
      <Group title="ProjectStatusBadges" note="In the header of an area.">
        <ProjectStatusBadges
          counts={{ planning: 2, 'in-progress': 5, blocked: 1, done: 8 }}
        />
      </Group>
    </div>
  )
}

export function LayoutSection() {
  const [expanded, setExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  return (
    <div className="max-w-3xl space-y-8">
      <Group title="ViewHeader" note="The top of every view.">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border bg-background">
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
          <div className="overflow-hidden rounded-lg border bg-background">
            <ViewHeader title="Work">
              <ProjectStatusBadges counts={{ 'in-progress': 3, ready: 2 }} />
            </ViewHeader>
          </div>
        </div>
      </Group>
      <Group
        title="SectionHeader"
        note="Collapsible section with a task count and add buttons."
      >
        <div className="overflow-hidden rounded-lg border">
          <SectionHeader
            title="Scheduled for Today"
            icon={<ClockIcon className="size-4" />}
            taskCount={5}
            isExpanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
            onAddTask={noop}
            onAddHeading={noop}
          />
        </div>
      </Group>
      <Group title="HeadingListItem" note="Coloured dividers in Today.">
        <div className="overflow-hidden rounded-lg border">
          {HEADINGS.map(heading => (
            <HeadingListItem
              key={heading.id}
              heading={heading}
              isSelected={false}
              isEditing={false}
              onSelect={noop}
              onStartEdit={noop}
              onEndEdit={noop}
              onTitleChange={noop}
              onColorChange={noop}
              onDelete={noop}
              dragId={`heading-${heading.id}`}
              containerId="styleguide"
            />
          ))}
        </div>
      </Group>
    </div>
  )
}

export function ButtonsSection() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  return (
    <div className="space-y-8">
      <Group title="Button">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg">Large</Button>
          <Button size="default">Default</Button>
          <Button size="sm">Small</Button>
          <Button size="xs">XS</Button>
          <Button size="icon" aria-label="Add">
            <PlusIcon />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </Group>
      <Group title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Group>
      <div className="grid grid-cols-3 gap-8">
        <Group title="ViewToggle">
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            availableModes={['list', 'kanban', 'calendar']}
          />
        </Group>
        <Group title="Kbd">
          <div className="flex items-center gap-4">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>P</Kbd>
            </KbdGroup>
          </div>
        </Group>
        <Group title="ProgressCircle">
          <div className="flex items-center gap-4">
            {[0, 25, 50, 75, 100].map(value => (
              <ProgressCircle key={value} value={value} />
            ))}
          </div>
        </Group>
        <Group title="Spinner and Skeleton">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Spinner />
              <span className="text-sm">Loading…</span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          </div>
        </Group>
        <Group title="Separator">
          <div className="max-w-xs space-y-4">
            <Separator />
            <div className="flex items-center gap-4 text-sm">
              <span>Left</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Right</span>
            </div>
          </div>
        </Group>
        <Group title="Breadcrumb" note="Preferences navigation.">
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
        </Group>
      </div>
    </div>
  )
}

export function InputsSection() {
  const [checked, setChecked] = useState(true)
  const [switched, setSwitched] = useState(false)
  const [date, setDate] = useState<string | undefined>(day(0))
  const [project, setProject] = useState<string | undefined>('proj-1')
  const [tags, setTags] = useState<Tag[]>([
    { id: '1', text: '*.tmp' },
    { id: '2', text: 'archive/*' },
  ])

  return (
    <div className="grid grid-cols-2 gap-8">
      <Group title="Input and Textarea">
        <div className="space-y-2">
          <Input placeholder="Default input" />
          <Input defaultValue="With a value" />
          <Input placeholder="Disabled" disabled />
          <Textarea placeholder="Textarea…" />
        </div>
      </Group>
      <div className="space-y-8">
        <Group title="Checkbox and Switch" note="Toggles in Preferences.">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="styleguide-checkbox"
                checked={checked}
                onCheckedChange={c => setChecked(c === true)}
              />
              <Label htmlFor="styleguide-checkbox">Checkbox option</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="styleguide-switch"
                checked={switched}
                onCheckedChange={setSwitched}
              />
              <Label htmlFor="styleguide-switch">Enable feature</Label>
            </div>
          </div>
        </Group>
        <Group title="TagInput" note="Ignore patterns in Preferences.">
          <TagInput tags={tags} onTagsChange={setTags} placeholder="Add…" />
        </Group>
      </div>
      <Group title="DateButton" note="Dates in the task detail panel.">
        <div className="flex gap-2">
          <DateButton
            variant="scheduled"
            icon={<CalendarIcon className="size-3" />}
            value={date}
            onChange={setDate}
            tooltip="Schedule"
          />
          <DateButton
            variant="due"
            icon={<FlagIcon className="size-3" />}
            value={day(-1)}
            onChange={noop}
            tooltip="Due date"
          />
          <DateButton
            variant="defer"
            icon={<SnowflakeIcon className="size-3" />}
            value={undefined}
            onChange={noop}
            tooltip="Defer until"
          />
        </div>
      </Group>
      <Group
        title="SearchableSelect"
        note="Project and area in the task detail panel."
      >
        <div className="flex gap-2">
          <SearchableSelect
            options={PROJECT_OPTIONS}
            value={project}
            onChange={setProject}
            placeholder="Project…"
            icon={<CircleDot className="size-3 text-entity-project" />}
            emptyText="No projects found"
          />
          <SearchableSelect
            options={[
              { value: 'area-1', label: 'Work' },
              { value: 'area-2', label: 'Personal' },
            ]}
            value={undefined}
            onChange={noop}
            placeholder="Area…"
            icon={<FolderOpen className="size-3 text-entity-area" />}
            emptyText="No areas found"
          />
        </div>
      </Group>
    </div>
  )
}

const PROJECT_OPTIONS = [
  { value: 'proj-1', label: 'Authentication System' },
  { value: 'proj-2', label: 'Dashboard Redesign' },
  { value: 'proj-3', label: 'API Documentation' },
]

export function ContentSection() {
  const [open, setOpen] = useState(true)
  const [notes, setNotes] = useState(
    '## Notes\n\nSome **bold** and *italic* text, and a [[wikilink]].\n\n- List item 1\n- List item 2'
  )

  return (
    <div className="grid grid-cols-2 gap-8">
      <Group
        title="MarkdownEditor"
        note="Task notes (Milkdown, loaded lazily)."
      >
        <div className="h-56 overflow-hidden rounded-lg border">
          <LazyMarkdownEditor
            editorKey="styleguide-editor"
            defaultValue={notes}
            onChange={setNotes}
            placeholder="Write some notes…"
          />
        </div>
      </Group>
      <Group
        title="CollapsibleNotesSection"
        note="Project and area descriptions."
      >
        <CollapsibleNotesSection
          notes={
            'This is a **project description** with some markdown.\n\n' +
            'It can run to several paragraphs describing the goals of the project.'
          }
          title="Notes"
        />
      </Group>
      <Group title="EmptyState">
        <EmptyState
          title="No tasks found"
          description="Create a new task to get started"
        />
      </Group>
      <Group title="Collapsible">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-2" />
            }
          >
            <ChevronRightIcon
              className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`}
            />
            Click to toggle
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md border p-4 text-sm">
            Collapsible content appears here.
          </CollapsibleContent>
        </Collapsible>
      </Group>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Overlay sections (each on its own page, rendered open)
// -----------------------------------------------------------------------------

export function SelectSection() {
  const [value, setValue] = useState('dark')
  // The open list lines its selected item up over the trigger, so it needs room above
  return (
    <div className="pt-16">
      <Select defaultOpen value={value} onValueChange={v => v && setValue(v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function DateSection() {
  const [date, setDate] = useState<string | undefined>(day(2))
  const [project, setProject] = useState<string | undefined>('proj-1')
  return (
    <div className="flex items-start gap-48">
      <DateButton
        open
        onOpenChange={noop}
        variant="scheduled"
        icon={<CalendarIcon className="size-3" />}
        value={date}
        onChange={setDate}
        tooltip="Schedule"
      />
      <SearchableSelect
        open
        onOpenChange={noop}
        options={PROJECT_OPTIONS}
        value={project}
        onChange={setProject}
        placeholder="Project…"
        icon={<CircleDot className="size-3 text-entity-project" />}
        emptyText="No projects found"
      />
    </div>
  )
}

export function MenusSection() {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open menu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Base UI needs a label inside a group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>
            <UserIcon className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <SettingsIcon className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <TrashIcon className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PopoversSection() {
  return (
    <div className="flex items-start gap-64">
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="outline" />}>
          Popover
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-medium">Popover title</h4>
            <p className="text-sm text-muted-foreground">
              Popover content goes here.
            </p>
          </div>
        </PopoverContent>
      </Popover>
      <Tooltip defaultOpen>
        <TooltipTrigger render={<Button variant="outline" />}>
          Tooltip
        </TooltipTrigger>
        <TooltipContent>This is a tooltip</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function DialogSection() {
  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description text.</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm">Dialog content goes here.</div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AlertDialogSection() {
  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            It moves to the trash. This can&apos;t be undone from Taskdn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CommandSection() {
  return (
    <CommandDialog defaultOpen>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem>
            <CalendarIcon className="mr-2 size-4" />
            Go to Today
            <CommandShortcut>⌘1</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <FolderOpen className="mr-2 size-4" />
            Go to Inbox
            <CommandShortcut>⌘3</CommandShortcut>
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
  )
}

export function ToastsSection() {
  useEffect(() => {
    const options = { duration: Infinity }
    const ids = [
      toast('Task created', { ...options, description: 'Added to Inbox' }),
      toast.success('Paths imported', options),
      toast.info('Vault reloaded', options),
      toast.error("Couldn't save the task", {
        ...options,
        description: 'The file is read-only',
      }),
    ]
    return () => ids.forEach(id => toast.dismiss(id))
  }, [])
  return <AppToaster expand />
}
