# Task: Rework of Context Commands

We have implemented context commands for area, project and task. Before implementing `context --ai` we decided to stop and do a much better job of clearly defining a good output.

The outcome of that work is now in `../../tdn-cli/docs/developer/ai-context.md`. This overrides the output specified in `cli-requirements.md`.

**Efficiency note:** Phases 2-4 (area/project/task context) only change the *formatter* output - data gathering continues to use the existing Rust functions (`getAreaContext()`, `getProjectContext()`, `getTaskContext()`) which use VaultIndex internally for efficient querying. Only Phase 1 (vault overview) requires new data gathering, but since the overview needs ALL entities anyway, calling the scan functions is equivalent I/O to what VaultIndex does internally.

---

## Phase 0: Foundation & Shared Helpers

Before implementing the context commands, we need shared TypeScript utilities that all context formatters will use. These should live in a new directory: `src/output/helpers/`.

### 0.1 Date Utilities (`date-utils.ts`)

**Note:** `list.ts` already has basic date functions (`getToday()`, `formatDate()`, `getTomorrow()`, etc.) that support `TASKDN_MOCK_DATE` env var for testing. Our new utilities should:
- Reuse `getToday()` from list.ts (or move it here and import from here)
- Follow the same `TASKDN_MOCK_DATE` pattern for testability

Functions for date-based filtering and formatting:

- `getToday()` — Returns today's date as YYYY-MM-DD (supports `TASKDN_MOCK_DATE`)
- `isOverdue(task)` — `due < today`
- `isDueToday(task)` — `due == today`
- `isScheduledToday(task)` — `scheduled == today`
- `isNewlyActionable(task)` — `defer-until == today`
- `isDueThisWeek(task)` — due within 7 days from today
- `isScheduledThisWeek(task)` — scheduled within 7 days from today
- `wasModifiedRecently(task, hours=24)` — `updated-at` within N hours
- `formatRelativeDate(date)` — "Jan 10", "Tomorrow (Thu Jan 16)", etc.
- `getWeekday(date)` — "Monday", "Tuesday", etc.

All comparisons should use the task's date strings (YYYY-MM-DD format) compared against today's date.

### 0.2 Status Emoji Maps (`status-emoji.ts`)

Constants and helpers for status indicators per ai-context.md Section 3.1:

```typescript
// Project status → emoji
const PROJECT_STATUS_EMOJI = {
  'in-progress': '🔵',
  'ready': '🟢',
  'planning': '🟡',
  'blocked': '🚫',
  'paused': '⏸️',
  'done': '✅',
};

// Task status → emoji (for count shorthand)
const TASK_STATUS_EMOJI = {
  'in-progress': '▶️',
  'ready': '🟢',
  'inbox': '📥',
  'blocked': '🚫',
};

// Other indicators
const AREA_ICON = '📁';
const DIRECT_TASKS_ICON = '📋';
const OVERDUE_ICON = '⚠️';
const DUE_TODAY_ICON = '📅';
```

### 0.3 Stats & Counting (`stats.ts`)

Functions for aggregating task counts:

- `countTasksByStatus(tasks)` — Returns `{ inProgress: N, ready: N, inbox: N, blocked: N }`
- `formatTaskCountShorthand(counts)` — Returns `"(2▶️ 4🟢 1📥 1🚫)"` (omits zero counts)

### 0.4 Body Truncation (`body-utils.ts`)

Per ai-context.md Section 2.4:

- `truncateBody(body, maxLines=20, maxWords=200)` — Returns first 20 lines OR first 200 words, whichever is shorter

### 0.5 Reference Table Builder (`reference-table.ts`)

Per ai-context.md Section 3.5, every context output ends with a Reference table listing all mentioned entities with their paths. This is a *formatting* helper (not related to VaultIndex which handles data querying).

```typescript
interface ReferenceEntry {
  name: string;
  type: 'area' | 'project' | 'task';
  path: string;
}

// Render entries as markdown table
function buildReferenceTable(entries: ReferenceEntry[]): string;

// Collect unique entities from the data we've already fetched
function collectReferences(entities: { areas?: Area[], projects?: Project[], tasks?: Task[] }): ReferenceEntry[];
```

### 0.6 Markdown Helpers (`markdown-helpers.ts`)

Building blocks for consistent formatting:

- `formatMetadataTable(fields: [key, value][])` — Returns markdown table with Field | Value columns
- `formatParentChain(task, project?, area?)` — Returns "Q1 Planning → Work" or "Work (direct)" or "(no project or area)"
- `formatBlockquoteExcerpt(body)` — Wraps truncated body in blockquote format

### Checklist

- [ ] Create `src/output/helpers/` directory
- [ ] Implement `date-utils.ts` with unit tests
- [ ] Implement `status-emoji.ts`
- [ ] Implement `stats.ts` with unit tests
- [ ] Implement `body-utils.ts` with unit tests
- [ ] Implement `reference-table.ts` with unit tests
- [ ] Implement `markdown-helpers.ts`
- [ ] Create `index.ts` barrel export
- [ ] Update `list.ts` to import date utilities from new location (remove duplicates)

---

## Phase 1: Vault Overview (`context --ai`)

Implement the full vault overview per ai-context.md Section 4.

### 1.1 Data Gathering

The current implementation stubs out the vault overview. We need to:

1. Fetch all active areas, projects, and tasks
2. Build relationships (which tasks belong to which projects/areas)
3. Categorize tasks for timeline sections
4. Calculate stats

**Existing Rust functions to use:** We already have `scanAreas()`, `scanProjects()`, `scanTasks()` exported via NAPI. These return all entities. We also have `getAreaContext()`, `getProjectContext()` etc. from VaultIndex, but for the overview we need everything, so we'll use the scan functions and build the structure in TypeScript.

Data flow:
```
scanAreas() + scanProjects() + scanTasks()  (existing Rust functions)
    ↓
Filter to active entities (per ai-context.md Section 2.2)
    ↓
Build structure (areas → projects → tasks) in TypeScript
    ↓
Calculate timeline (overdue, due today, scheduled, etc.)
    ↓
Calculate stats
    ↓
Format output
```

### 1.2 Output Sections

Per ai-context.md Section 4, the overview has these sections:

1. **Stats header** — One-line summary with counts and emoji indicators
2. **Structure** — Tree view of areas → projects → in-progress tasks
3. **Timeline** — Overdue, Due Today, Scheduled Today, Newly Actionable, Blocked, Scheduled This Week, Recently Modified
4. **In-Progress Tasks** — Full detail blocks for all in-progress tasks
5. **Excerpts** — Body excerpts for active areas and non-paused projects
6. **Reference** — Table of all mentioned entities with paths

### 1.3 New Types

Update `src/output/types.ts` with richer result types:

```typescript
interface VaultOverviewResult {
  type: 'vault-overview';
  // Raw data
  areas: Area[];
  projects: Project[];
  tasks: Task[];
  // Computed relationships
  areaProjects: Map<string, Project[]>;  // area path → projects
  projectTasks: Map<string, Task[]>;     // project path → tasks
  directAreaTasks: Map<string, Task[]>;  // area path → direct tasks
  orphanProjects: Project[];             // projects with no area
  orphanTasks: Task[];                   // tasks with no project or area
  // Timeline categorization
  timeline: {
    overdue: Task[];
    dueToday: Task[];
    scheduledToday: Task[];
    newlyActionable: Task[];
    blocked: Task[];
    scheduledThisWeek: Map<string, Task[]>;  // date → tasks
    recentlyModified: Task[];  // last 24h, excluding above
  };
  // Stats
  stats: {
    areaCount: number;
    projectCount: number;
    taskCount: number;
    overdueCount: number;
    dueTodayCount: number;
    inProgressCount: number;
  };
}
```

### 1.4 Formatter Implementation

Create new formatter function in `ai.ts` (or split into `ai/overview.ts`):

- Build stats header line
- Build structure section with tree formatting
- Build timeline sections (skip empty in overview per Section 2.6)
- Build in-progress task detail blocks
- Build excerpts section
- Build reference table

### 1.5 Tree Formatting

Implement ASCII tree structure per ai-context.md examples:

```
### 📁 Work

Tasks: 18 total (4 direct, 14 via projects)
├── 🔵 Q1 Planning [in-progress] — 8 tasks (2▶️ 4🟢 1📥 1🚫)
│   ├── ▶️ Fix authentication bug
│   └── ▶️ Document API v2 endpoints
├── 🟢 Client Onboarding [ready] — 4 tasks (4🟢)
└── 📋 Direct: 4 tasks (1▶️ 2🟢 1📥)
    └── ▶️ Review team capacity
```

This requires:
- Tree connector logic (├──, └──, │)
- Proper indentation tracking
- Project one-liner format: `{emoji} {title} [{status}] — {count} tasks ({shorthand})`

### Checklist

- [ ] Update `VaultOverviewResult` type in `types.ts`
- [ ] Implement data gathering in `context.ts` (fetch all entities, build relationships)
- [ ] Implement timeline categorization logic
- [ ] Implement stats calculation
- [ ] Implement tree formatting helper
- [ ] Implement `formatVaultOverview()` in ai.ts
- [ ] Write E2E tests for `context --ai`
- [ ] Verify output matches ai-context.md Section 4 example

---

## Phase 2: Rework `context area --ai`

Rework the area context output per ai-context.md Section 5.

### 2.1 Key Changes from Current

Current implementation is missing:
- Stats header with emoji indicators
- Projects grouped by status (In-Progress, Ready, Planning, Blocked, Paused, Done)
- Tree structure with task counts and in-progress tasks inline
- Timeline section scoped to this area
- Ready tasks section (capped at 10)
- Project excerpts section
- Reference table

### 2.2 Output Sections

1. **Stats header** — `**Stats:** 6 projects · 23 active tasks · ⚠️ 1 overdue · 📅 2 due today · ▶️ 4 in-progress`
2. **Area Details** — Metadata table + full body
3. **Projects by Status** — Groups: In-Progress, Ready, Planning, Blocked, Paused, Done (show all including done)
4. **Timeline** — Scoped to tasks in this area only
5. **In-Progress Tasks** — Full detail blocks
6. **Ready Tasks** — Title list, capped at 10 with "showing X of Y"
7. **Project Excerpts** — From in-progress, ready, planning, blocked projects only (not paused/done)
8. **Reference** — Table of all mentioned entities

### 2.3 Type Updates

```typescript
interface AreaContextResultOutput {
  type: 'area-context';
  area: Area;
  // Projects grouped by status
  projectsByStatus: {
    inProgress: Project[];
    ready: Project[];
    planning: Project[];
    blocked: Project[];
    paused: Project[];
    done: Project[];
  };
  projectTasks: Map<string, Task[]>;
  directTasks: Task[];
  // Timeline (scoped to area)
  timeline: { ... };
  // Stats
  stats: { ... };
  warnings: string[];
}
```

### Checklist

- [ ] Update `AreaContextResultOutput` type
- [ ] Update data gathering in `context.ts` to compute new fields
- [ ] Implement `formatAreaContext()` per Section 5
- [ ] Update/add E2E tests
- [ ] Verify output matches ai-context.md Section 5 example

---

## Phase 3: Rework `context project --ai`

Rework the project context output per ai-context.md Section 6.

### 3.1 Key Changes from Current

Current implementation is missing:
- Stats header with blocked count
- Metadata table format for project details
- Parent area summary table + excerpt
- Timeline section scoped to project
- Tasks grouped by status with proper formatting
- In-progress task detail (full excerpt)
- Blocked task detail (title + block reason)
- Reference table

### 3.2 Output Sections

1. **Stats header** — `**Stats:** 8 active tasks · ⚠️ 1 overdue · 📅 2 due today · ▶️ 2 in-progress · 🚫 1 blocked`
2. **Project Details** — Metadata table + full body
3. **Parent Area** — Summary table + excerpt (if project has area)
4. **Timeline** — Scoped to tasks in this project
5. **Tasks by Status** — In-Progress (full detail), Blocked (title + reason), Ready (title + due), Inbox (title only)
6. **Reference** — Table of all mentioned entities

### 3.3 Type Updates

```typescript
interface ProjectContextResultOutput {
  type: 'project-context';
  project: Project;
  area: Area | null;
  // Tasks grouped by status
  tasksByStatus: {
    inProgress: Task[];
    blocked: Task[];
    ready: Task[];
    inbox: Task[];
  };
  // Timeline (scoped to project)
  timeline: { ... };
  // Stats
  stats: { ... };
  warnings: string[];
}
```

### Checklist

- [ ] Update `ProjectContextResultOutput` type
- [ ] Update data gathering in `context.ts`
- [ ] Implement `formatProjectContext()` per Section 6
- [ ] Update/add E2E tests
- [ ] Verify output matches ai-context.md Section 6 example

---

## Phase 4: Rework `context task --ai`

Rework the task context output per ai-context.md Section 7.

### 4.1 Key Changes from Current

Current implementation is missing:
- Alert banner (overdue/due today/scheduled today/newly actionable)
- Metadata table format for task details
- Parent project summary table + excerpt
- Parent area summary table + excerpt with relationship clarity (direct vs via project)
- Reference table

### 4.2 Output Sections

1. **Alert banner** (if applicable) — `⚠️ OVERDUE — due 2025-01-10` or `📅 DUE TODAY` etc.
2. **Task Details** — Metadata table + full body
3. **Parent Project** — Summary table + excerpt (if task has project), or `_None_`
4. **Parent Area** — Summary table + excerpt with notation:
   - `_Via project Q1 Planning_` if area is through project
   - `_Direct relationship_` if task belongs directly to area
   - `_None_` or `_None (project has no area)_`
5. **Reference** — Table of task and parents

### 4.3 Alert Banner Logic

Per ai-context.md Section 7 (show most urgent first if multiple apply):
1. `due < today` → `⚠️ OVERDUE — due {date}`
2. `due == today` → `📅 DUE TODAY`
3. `scheduled == today` → `📆 SCHEDULED TODAY`
4. `defer-until == today` → `🔓 NEWLY ACTIONABLE — deferred until today`

### 4.4 Type Updates

Minimal changes needed - current type is mostly sufficient, just need to compute alert state.

### Checklist

- [ ] Implement alert banner logic using date utilities
- [ ] Implement `formatTaskContext()` per Section 7
- [ ] Handle all parent relationship edge cases
- [ ] Update/add E2E tests
- [ ] Verify output matches ai-context.md Section 7 examples

---

## Phase 5: Review and Rework other `--ai` commands output as needed

Review and rework the output builders for other --ai outputs to ensure they are returning sensible data structures.

- Show commands should return a sensible markdown rendering of the thing itself, including front matter. The body should always be shown.
- List commands should return a simple list or table with the relevant metadata or grouping and File parts as well as entity names.

### Checklist

- [ ] `show task --ai` — Review and update if needed
- [ ] `show project --ai` — Review and update if needed
- [ ] `show area --ai` — Review and update if needed
- [ ] `list tasks --ai` — Review and update if needed
- [ ] `list projects --ai` — Review and update if needed
- [ ] `list areas --ai` — Review and update if needed

---

## Phase 6: Rework `--json` as needed

Review and (if necessary) rework the builders for `--json` outputs to ensure they are returning sensible data structures. The data structure should be simple and consistent.

Note: `--ai --json` for context commands has a specific envelope format defined in ai-context.md Section 8. This wraps the markdown content in a JSON structure.

### Checklist

- [ ] `show task --json`
- [ ] `show project --json`
- [ ] `show area --json`
- [ ] `list tasks --json`
- [ ] `list projects --json`
- [ ] `list areas --json`
- [ ] `context task --ai --json` — Implement Section 8 envelope
- [ ] `context project --ai --json` — Implement Section 8 envelope
- [ ] `context area --ai --json` — Implement Section 8 envelope
- [ ] `context --ai --json` — Implement Section 8 envelope

---

## Phase 7: Final Review

Review all work on context commands and all the code. Any obvious refactoring we should do now before moving on?

### Checklist

- [ ] Review `src/output/ai.ts` — Should it be split into multiple files?
- [ ] Review `src/output/helpers/` — Are utilities well-organized?
- [ ] Review `src/commands/context.ts` — Is data gathering clean?
- [ ] Check for duplicate code across formatters
- [ ] Run full test suite
- [ ] Update `docs/cli-progress.md`
