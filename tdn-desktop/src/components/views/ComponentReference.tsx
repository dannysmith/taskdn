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
  CheckIcon,
  ChevronRightIcon,
  FlagIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SnowflakeIcon,
  TrashIcon,
  UserIcon,
} from 'lucide-react'

// UI Primitives
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressCircle } from '@/components/ui/progress-circle'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
import { Field, FieldLabel, FieldContent, FieldError } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group'
import { DatePicker } from '@/components/ui/date-picker'
import { DateButton } from '@/components/ui/date-button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TagInput, type Tag } from '@/components/ui/tag-input'
import { Calendar } from '@/components/ui/calendar'

// App Components
import { TaskCard } from '@/components/cards/TaskCard'
import { ProjectCard } from '@/components/cards/ProjectCard'
import { AreaCard } from '@/components/cards/AreaCard'
import { TaskStatusCheckbox } from '@/components/tasks/TaskStatusCheckbox'
import { TaskStatusPill } from '@/components/tasks/TaskStatusPill'
import { ProjectStatusPill } from '@/components/projects/ProjectStatusPill'
import { ProjectStatusBadges } from '@/components/projects/ProjectStatusBadges'
import type { Task, Project, Area } from '@/lib/tauri-bindings'

// Fake data for examples
const todayStr = new Date().toISOString().split('T')[0]!
const todayOrNull: string | null = todayStr

const FAKE_TASK: Task = {
  id: 'task-1',
  path: '/tasks/task-1.md',
  title: 'Review pull request for authentication feature',
  status: 'ready',
  project: 'project-1',
  area: null,
  due: todayOrNull,
  scheduled: null,
  deferUntil: null,
  body: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
}

const FAKE_PROJECT: Project = {
  id: 'project-1',
  path: '/projects/project-1.md',
  title: 'Authentication System',
  status: 'in-progress',
  area: 'area-1',
  startDate: null,
  endDate: null,
  description: 'Implement user authentication',
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

export function ComponentReference() {
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const [switchChecked, setSwitchChecked] = useState(false)
  const [radioValue, setRadioValue] = useState('option-1')
  const [selectValue, setSelectValue] = useState('')
  const [togglePressed, setTogglePressed] = useState(false)
  const [toggleGroupValue, setToggleGroupValue] = useState(['left'])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [collapsibleOpen, setCollapsibleOpen] = useState(false)
  const [dateValue, setDateValue] = useState<Date | undefined>(undefined)
  const [dateButtonValue, setDateButtonValue] = useState<string | undefined>(todayStr)
  const [tags, setTags] = useState<Tag[]>([
    { id: '1', text: 'tag1' },
    { id: '2', text: 'tag2' },
  ])
  const [searchableSelectValue, setSearchableSelectValue] = useState<string | undefined>(undefined)

  return (
    <TooltipProvider>
      <ScrollArea className="h-full">
        <div className="space-y-12 p-6 pb-24">
          <header>
            <h1 className="text-2xl font-bold">Component Reference</h1>
            <p className="text-muted-foreground mt-1">
              Development-only showcase of all reusable components
            </p>
          </header>

          {/* Basic Inputs */}
          <Section title="Basic Inputs">
            <ComponentGroup title="Button">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="lg">Large</Button>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="xs">Extra Small</Button>
                <Button size="icon"><PlusIcon /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Disabled</Button>
                <Button><Spinner className="mr-2" /> Loading</Button>
              </div>
            </ComponentGroup>

            <ComponentGroup title="ButtonGroup">
              <ButtonGroup>
                <Button variant="outline">Left</Button>
                <Button variant="outline">Center</Button>
                <Button variant="outline">Right</Button>
              </ButtonGroup>
              <ButtonGroup orientation="vertical">
                <Button variant="outline" size="sm">Top</Button>
                <Button variant="outline" size="sm">Middle</Button>
                <Button variant="outline" size="sm">Bottom</Button>
              </ButtonGroup>
            </ComponentGroup>

            <ComponentGroup title="Input">
              <Input placeholder="Default input" />
              <Input placeholder="Disabled" disabled />
              <Input type="password" placeholder="Password" />
              <Input aria-invalid="true" placeholder="Invalid input" />
            </ComponentGroup>

            <ComponentGroup title="Textarea">
              <Textarea placeholder="Enter your message..." />
              <Textarea placeholder="Disabled" disabled />
            </ComponentGroup>

            <ComponentGroup title="Checkbox">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="checkbox-demo"
                  checked={checkboxChecked}
                  onCheckedChange={c => setCheckboxChecked(c === true)}
                />
                <Label htmlFor="checkbox-demo">Accept terms and conditions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="checkbox-disabled" disabled />
                <Label htmlFor="checkbox-disabled">Disabled checkbox</Label>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Switch">
              <div className="flex items-center gap-2">
                <Switch
                  id="switch-demo"
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
                <Label htmlFor="switch-demo">Airplane mode</Label>
              </div>
            </ComponentGroup>

            <ComponentGroup title="RadioGroup">
              <RadioGroup value={radioValue} onValueChange={v => setRadioValue(v as string)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="option-1" id="r1" />
                  <Label htmlFor="r1">Option 1</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="option-2" id="r2" />
                  <Label htmlFor="r2">Option 2</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="option-3" id="r3" />
                  <Label htmlFor="r3">Option 3</Label>
                </div>
              </RadioGroup>
            </ComponentGroup>

            <ComponentGroup title="Select">
              <Select value={selectValue} onValueChange={v => v && setSelectValue(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apple">Apple</SelectItem>
                  <SelectItem value="banana">Banana</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                </SelectContent>
              </Select>
            </ComponentGroup>

            <ComponentGroup title="NativeSelect">
              <NativeSelect className="w-[200px]">
                <NativeSelectOption value="">Select...</NativeSelectOption>
                <NativeSelectOption value="1">Option 1</NativeSelectOption>
                <NativeSelectOption value="2">Option 2</NativeSelectOption>
              </NativeSelect>
            </ComponentGroup>
          </Section>

          {/* Form Components */}
          <Section title="Form Components">
            <ComponentGroup title="Field">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input type="email" placeholder="email@example.com" />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Username</FieldLabel>
                <FieldContent>
                  <Input placeholder="johndoe" aria-invalid="true" />
                </FieldContent>
                <FieldError>Username is already taken</FieldError>
              </Field>
            </ComponentGroup>

            <ComponentGroup title="InputGroup">
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon className="size-4" />
                </InputGroupAddon>
                <InputGroupInput placeholder="Search..." />
              </InputGroup>
              <InputGroup>
                <InputGroupAddon>https://</InputGroupAddon>
                <InputGroupInput placeholder="example.com" />
                <InputGroupButton>
                  <Button size="sm">Go</Button>
                </InputGroupButton>
              </InputGroup>
            </ComponentGroup>

            <ComponentGroup title="DatePicker">
              <DatePicker
                value={dateValue}
                onChange={setDateValue}
                placeholder="Pick a date"
              />
            </ComponentGroup>

            <ComponentGroup title="DateButton (Custom)">
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

            <ComponentGroup title="SearchableSelect">
              <SearchableSelect
                options={[
                  { value: 'react', label: 'React' },
                  { value: 'vue', label: 'Vue' },
                  { value: 'angular', label: 'Angular' },
                  { value: 'svelte', label: 'Svelte' },
                ]}
                value={searchableSelectValue}
                onChange={setSearchableSelectValue}
                placeholder="Select framework..."
                emptyText="No framework found."
              />
            </ComponentGroup>

            <ComponentGroup title="TagInput">
              <TagInput
                tags={tags}
                onTagsChange={setTags}
                placeholder="Add tags..."
              />
            </ComponentGroup>

            <ComponentGroup title="Calendar">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={setDateValue}
                className="rounded-md border"
              />
            </ComponentGroup>
          </Section>

          {/* Display Components */}
          <Section title="Display">
            <ComponentGroup title="Badge">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Spinner">
              <div className="flex items-center gap-4">
                <Spinner />
                <Spinner className="size-8" />
              </div>
            </ComponentGroup>

            <ComponentGroup title="Skeleton">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </ComponentGroup>

            <ComponentGroup title="ProgressCircle">
              <div className="flex items-center gap-4">
                <ProgressCircle value={25} />
                <ProgressCircle value={50} />
                <ProgressCircle value={75} />
                <ProgressCircle value={100} />
              </div>
            </ComponentGroup>

            <ComponentGroup title="Kbd">
              <div className="flex items-center gap-2">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </div>
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>P</Kbd>
              </KbdGroup>
            </ComponentGroup>

            <ComponentGroup title="Separator">
              <div className="space-y-4">
                <Separator />
                <div className="flex items-center gap-4">
                  <span>Left</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Right</span>
                </div>
              </div>
            </ComponentGroup>

            <ComponentGroup title="Card">
              <Card className="w-[350px]">
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card description goes here</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Card content with some example text.</p>
                </CardContent>
                <CardFooter>
                  <Button>Action</Button>
                </CardFooter>
              </Card>
            </ComponentGroup>

            <ComponentGroup title="Alert">
              <Alert>
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  You can add components to your app using the cli.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Something went wrong. Please try again.
                </AlertDescription>
              </Alert>
            </ComponentGroup>

            <ComponentGroup title="EmptyState">
              <EmptyState
                title="No tasks found"
                description="Create a new task to get started"
              />
            </ComponentGroup>
          </Section>

          {/* Navigation */}
          <Section title="Navigation">
            <ComponentGroup title="Toggle">
              <Toggle pressed={togglePressed} onPressedChange={setTogglePressed}>
                <CheckIcon className="size-4" />
              </Toggle>
            </ComponentGroup>

            <ComponentGroup title="ToggleGroup">
              <ToggleGroup
                value={toggleGroupValue}
                onValueChange={setToggleGroupValue}
              >
                <ToggleGroupItem value="left">Left</ToggleGroupItem>
                <ToggleGroupItem value="center">Center</ToggleGroupItem>
                <ToggleGroupItem value="right">Right</ToggleGroupItem>
              </ToggleGroup>
            </ComponentGroup>

            <ComponentGroup title="ViewToggle">
              <ViewToggle
                value={viewMode}
                onChange={setViewMode}
                availableModes={['list', 'kanban']}
              />
            </ComponentGroup>

            <ComponentGroup title="Breadcrumb">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Current</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </ComponentGroup>
          </Section>

          {/* Overlays */}
          <Section title="Overlays">
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
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Popover Title</h4>
                    <p className="text-sm text-muted-foreground">
                      This is the popover content.
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
                      This is a description of what this dialog does.
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
                      This action cannot be undone. This will permanently delete your
                      item.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
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
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
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

            <ComponentGroup title="Sheet">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" />}>
                  Open sheet
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Sheet Title</SheetTitle>
                    <SheetDescription>
                      Sheet content goes here. Use for sidepanels.
                    </SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>
            </ComponentGroup>
          </Section>

          {/* Layout */}
          <Section title="Layout">
            <ComponentGroup title="Collapsible">
              <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
                <CollapsibleTrigger
                  render={
                    <Button variant="ghost" className="flex items-center gap-2" />
                  }
                >
                  <ChevronRightIcon
                    className={`size-4 transition-transform ${collapsibleOpen ? 'rotate-90' : ''}`}
                  />
                  Click to expand
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-md border p-4">
                  This content is collapsible. Click the button above to toggle.
                </CollapsibleContent>
              </Collapsible>
            </ComponentGroup>
          </Section>

          {/* App Components */}
          <Section title="App Components">
            <ComponentGroup title="TaskStatusCheckbox">
              <div className="flex items-center gap-4">
                <TaskStatusCheckbox status="ready" onToggle={() => {}} />
                <TaskStatusCheckbox status="in-progress" onToggle={() => {}} />
                <TaskStatusCheckbox status="done" onToggle={() => {}} />
                <TaskStatusCheckbox status="blocked" onToggle={() => {}} />
                <TaskStatusCheckbox status="icebox" onToggle={() => {}} />
                <TaskStatusCheckbox status="inbox" onToggle={() => {}} />
              </div>
            </ComponentGroup>

            <ComponentGroup title="TaskStatusPill">
              <div className="flex flex-wrap gap-2">
                <TaskStatusPill status="ready" onStatusChange={() => {}} />
                <TaskStatusPill status="in-progress" onStatusChange={() => {}} />
                <TaskStatusPill status="done" onStatusChange={() => {}} />
                <TaskStatusPill status="blocked" onStatusChange={() => {}} />
                <TaskStatusPill status="icebox" onStatusChange={() => {}} />
              </div>
            </ComponentGroup>

            <ComponentGroup title="ProjectStatusPill">
              <div className="flex flex-wrap gap-2">
                <ProjectStatusPill status="planning" onStatusChange={() => {}} />
                <ProjectStatusPill status="ready" onStatusChange={() => {}} />
                <ProjectStatusPill status="in-progress" onStatusChange={() => {}} />
                <ProjectStatusPill status="blocked" onStatusChange={() => {}} />
                <ProjectStatusPill status="paused" onStatusChange={() => {}} />
                <ProjectStatusPill status="done" onStatusChange={() => {}} />
              </div>
            </ComponentGroup>

            <ComponentGroup title="ProjectStatusBadges">
              <ProjectStatusBadges
                counts={{
                  planning: 2,
                  'in-progress': 5,
                  blocked: 1,
                  done: 8,
                }}
              />
            </ComponentGroup>

            <ComponentGroup title="TaskCard">
              <div className="max-w-sm">
                <TaskCard
                  task={FAKE_TASK}
                  onStatusChange={() => {}}
                  onTitleChange={() => {}}
                  onScheduledChange={() => {}}
                  onDueChange={() => {}}
                  projectName="Authentication System"
                />
              </div>
            </ComponentGroup>

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

            <ComponentGroup title="AreaCard">
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
        </div>
      </ScrollArea>
    </TooltipProvider>
  )
}

// Helper components for organization
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">{title}</h2>
      <div className="grid gap-8">{children}</div>
    </section>
  )
}

function ComponentGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
