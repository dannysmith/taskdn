# Context Overview Command Design (Draft)

**Purpose:** Provide AI agents with a comprehensive, token-efficient overview of all work for context priming before specific queries.

**Command:** `taskdn context --ai` (no entity specified)

---

## Design Requirements

### 1. Quick Stats Header

A single-line summary at the very top providing immediate situational awareness:

- Total counts: areas, active projects, active tasks
- Urgent indicators: overdue count, due today, in-progress count

### 2. Hierarchical Structure View

Tree-style display showing organizational hierarchy:

**Areas:**

- List all active areas
- Show task summary (direct vs. via projects)
- No metadata needed beyond name

**Projects under Areas:**

- Group by parent area
- Show status prominently (emoji + label)
- Show task counts by status
- For planning/ready/in-progress: show in-progress task titles

**Projects with no Area:**

- Projects without area assignment shown in separate section

**Tasks with no Project or Area:**

- Loose tasks (not assigned to any project or area) shown in separate section
- Critical for surfacing orphaned in-progress work

**Status Indicators (suggested):**

_For projects:_
- `🔵` in-progress
- `🟢` ready
- `🟡` planning
- `🚫` blocked
- `⏸️` paused
- `📋` (for direct task counts under areas)

_For tasks (in count shorthand):_
- `▶️` in-progress
- `🟢` ready
- `📥` inbox
- `🚫` blocked

**Note on "active":**
- **Active tasks:** Excludes `done`, `dropped`, `icebox` (icebox = intentionally deferred indefinitely, not actionable)
- **Active projects:** Excludes `done`
- **Active areas:** `status: active` or no status field (excludes `archived`)

### 3. Timeline Section

Time-sensitive items surfaced for awareness (not prescriptive about what needs attention):

**Overdue Tasks:**

- All tasks past their due date
- Include: title, due date, parent project/area

**Due Today:**

- Tasks due on current date

**Scheduled Today:**

- Tasks with `scheduled` date equal to today

**Actionable Today:**

- Tasks with `defer-until` equal to today (becoming actionable)

**Blocked Tasks:**

- All tasks with blocked status
- Include: title, parent project/area
- Surfaced prominently as potential impediments

**Scheduled This Week:**

- Tasks with `scheduled` dates in next 7 days (starting tomorrow)
- Grouped by date with day labels

### 4. In-Progress Task Details

Full details for all currently active work:

- Task title
- Full parent chain (task → project → area)
- Due date if set
- Body content (first ~100-150 words or first meaningful section)

This section is critical because in-progress tasks are the "live" work most likely relevant to any conversation.

### 5. Context Excerpts from Active Areas and Projects

Body content excerpts for:

- All active areas (excludes archived)
- Projects with status: `planning`, `ready`, `in-progress`, or `blocked` (excludes `paused`, `done`)

**Truncation rule:** First 20 lines OR first 200 words, whichever is shorter. Simple and predictable.

Purpose: Provide "what is this?" context without requiring follow-up reads.

Note: Paused projects appear in the structure tree but are excluded from excerpts to reduce noise.

### 5.5 Recently Modified Tasks

Tasks modified within the last 24 hours, excluding:
- Tasks already shown in other sections (in-progress, overdue, etc.)
- Completed or dropped tasks (not relevant to current work)

**Threshold rule:** If more than 20 tasks were modified in this window, omit this section entirely. A high modification count likely indicates a batch operation (bulk import, status sweep, etc.) rather than meaningful individual work.

Purpose: Surface "what was I working on recently?" context that might not be captured by status or due dates alone.

### 6. Path Reference Table

Mapping of all mentioned entities to their file paths:

| Entity | Type | Path            |
| ------ | ---- | --------------- |
| Work   | area | ~/areas/work.md |
| ...    | ...  | ...             |

This approach:

- Keeps main content clean and readable
- Provides paths for follow-up `context area/project/task` calls
- Enables entity resolution without cluttering the tree

---

## Example Output

```markdown
# Overview

**Stats:** 3 areas · 8 active projects · 34 active tasks · ⚠️ 2 overdue · 📅 3 due today · ▶️ 5 in-progress
_Excludes: done/dropped/icebox tasks, done projects, archived areas_

---

## Structure

### 📁 Work

Tasks: 18 total (4 direct, 14 via projects)
├── 🔵 Q1 Planning [in-progress] — 8 tasks (2▶️ 4🟢 1📥 1🚫)
│ ├── ▶️ Fix authentication bug
│ └── ▶️ Document API v2 endpoints
├── 🟢 Client Onboarding [ready] — 4 tasks (0▶️ 4🟢)
├── 🟡 Q2 Roadmap [planning] — 2 tasks (2📥)
├── ⏸️ Legacy Migration [paused] — 3 tasks (1🟢 2📥)
└── 📋 Direct: 4 tasks (1▶️ 2🟢 1📥)
    └── ▶️ Review team capacity

### 📁 Personal

Tasks: 12 total (3 direct, 9 via projects)
├── 🔵 Home Renovation [in-progress] — 6 tasks (1▶️ 3🟢 2📥)
│ └── ▶️ Get contractor quotes
├── 🟢 Tax Prep 2025 [ready] — 3 tasks (3🟢)
└── 📋 Direct: 3 tasks (1▶️ 2🟢)
    └── ▶️ Schedule dentist appointment

### 📁 Health

Tasks: 4 total (4 direct)
└── 📋 Direct: 4 tasks (0▶️ 3🟢 1📥)

### Projects with no Area

└── 🟡 Side Project Alpha [planning] — 2 tasks (2📥)

### Tasks with no Project or Area

Tasks: 2 total (1▶️ 1🟢)
├── ▶️ Random idea to explore
└── 🟢 Update personal website

---

## Timeline

### Overdue (2)

- **Fix critical security issue** — due Jan 10 — Q1 Planning → Work
- **Submit expense report** — due Jan 12 — Work (direct)

### Due Today (3)

- **Review PR #847** — Q1 Planning → Work
- **Call insurance company** — Personal (direct)
- **Finalize Q1 goals** — Q1 Planning → Work

### Scheduled Today (1)

- **Daily standup** — Work (direct)

### Newly Actionable Today (2)

_defer-until = today_

- **Follow up with client** — Client Onboarding → Work
- **Check test results** — Health (direct)

### Blocked (2)

- **Waiting for client feedback** — Q1 Planning → Work
- **Pending contractor availability** — Home Renovation → Personal

### Scheduled This Week

**Tomorrow (Thu Jan 16)**

- Team standup prep — Work (direct)
- Contractor site visit — Home Renovation → Personal

**Friday (Jan 17)**

- Weekly review — Work (direct)

**Sunday (Jan 19)**

- Meal prep planning — Health (direct)

### Recently Modified (3)

_Last 24h, not shown above_

- **Update project timeline** — Q1 Planning → Work — 6h ago
- **Research SSO providers** — Q1 Planning → Work — 14h ago
- **Draft client proposal** — Client Onboarding → Work — 20h ago

---

## In-Progress Tasks (5)

### Fix authentication bug

Q1 Planning → Work · due 2025-01-18

The SSO authentication flow is failing for enterprise users. Investigation shows the OAuth callback handler isn't properly refreshing expired tokens. Need to:

1. Add token refresh logic to callback handler
2. Update session management to detect expiry
3. Add integration tests for SSO flow

### Document API v2 endpoints

Q1 Planning → Work

Document the new v2 REST endpoints before client release. Focus areas:

- Authentication and authorization flows
- Rate limiting and quotas
- Breaking changes from v1

### Review team capacity

Work (direct) · due 2025-01-16

Assess current team bandwidth for Q1 commitments. Need to identify if we can take on the new client project or need to defer.

### Get contractor quotes

Home Renovation → Personal

Reach out to at least 3 contractors for bathroom remodel quotes. Questions to ask:

- Timeline availability
- Material sourcing approach
- Warranty terms

### Schedule dentist appointment

Personal (direct)

Overdue for 6-month checkup. Need to call Dr. Smith's office.

---

## Excerpts

_Active areas and projects (excludes archived areas, paused/done projects)_

### Work (Area)

> Primary professional focus area covering client work, internal tooling, and team management. Q1 2025 priorities:
>
> - Ship authentication system overhaul
> - Onboard 2 new enterprise clients
> - Complete API v2 documentation
>
> Key stakeholders: Product team, Enterprise sales

### Q1 Planning (Project)

> **Goal:** Complete authentication overhaul and prepare for enterprise client launch.
>
> **Key Milestones:**
>
> - Auth system complete: Jan 31
> - API docs published: Feb 7
> - Client UAT begin: Feb 14
>
> **Risks:** Team capacity constrained, may need to defer non-critical items.

### Personal (Area)

> Personal life management including home, health, and life admin tasks.

### Home Renovation (Project)

> **Scope:** Full bathroom remodel (master bath)
> **Budget:** $15-20k
> **Timeline:** Target completion by end of March
>
> Currently in contractor selection phase.

### Client Onboarding (Project)

> Process and materials for onboarding new enterprise clients to the platform.
>
> Standard onboarding takes 2-3 weeks and includes:
>
> - Technical integration support
> - Admin training session
> - Documentation handoff

---

## Reference

| Entity                       | Type    | Path                             |
| ---------------------------- | ------- | -------------------------------- |
| Work                         | area    | areas/work.md                    |
| Personal                     | area    | areas/personal.md                |
| Health                       | area    | areas/health.md                  |
| Q1 Planning                  | project | projects/q1-planning.md          |
| Client Onboarding            | project | projects/client-onboarding.md    |
| Q2 Roadmap                   | project | projects/q2-roadmap.md           |
| Legacy Migration             | project | projects/legacy-migration.md     |
| Home Renovation              | project | projects/home-renovation.md      |
| Tax Prep 2025                | project | projects/tax-prep-2025.md        |
| Side Project Alpha           | project | projects/side-project-alpha.md   |
| Fix authentication bug       | task    | tasks/fix-auth-bug.md            |
| Document API v2 endpoints    | task    | tasks/document-api-v2.md         |
| Review team capacity         | task    | tasks/review-team-capacity.md    |
| Get contractor quotes        | task    | tasks/get-contractor-quotes.md   |
| Schedule dentist appointment | task    | tasks/schedule-dentist.md        |
| Fix critical security issue  | task    | tasks/fix-security-issue.md      |
| Submit expense report        | task    | tasks/submit-expense-report.md   |
| Review PR #847               | task    | tasks/review-pr-847.md           |
| Call insurance company       | task    | tasks/call-insurance.md          |
| Finalize Q1 goals            | task    | tasks/finalize-q1-goals.md       |
| Follow up with client        | task    | tasks/follow-up-client.md        |
| Check test results           | task    | tasks/check-test-results.md      |
| Team standup prep            | task    | tasks/team-standup-prep.md       |
| Contractor site visit        | task    | tasks/contractor-site-visit.md   |
| Weekly review                | task    | tasks/weekly-review.md           |
| Meal prep planning               | task    | tasks/meal-prep-planning.md          |
| Random idea to explore           | task    | tasks/random-idea-to-explore.md      |
| Update personal website          | task    | tasks/update-personal-website.md     |
| Daily standup                    | task    | tasks/daily-standup.md               |
| Waiting for client feedback      | task    | tasks/waiting-for-client-feedback.md |
| Pending contractor availability  | task    | tasks/pending-contractor.md          |
| Update project timeline          | task    | tasks/update-project-timeline.md     |
| Research SSO providers           | task    | tasks/research-sso-providers.md      |
| Draft client proposal            | task    | tasks/draft-client-proposal.md       |
```

---

## Design Notes

### Why This Structure Works for AI Agents

1. **Progressive disclosure**: Stats → Structure → Urgency → Details → Reference

   - Agent can stop reading at any depth depending on need
   - Most critical info (stats, structure) comes first

2. **Scannable hierarchy**: Tree format with emoji status indicators

   - Instant visual parsing of organizational structure
   - Task counts show "weight" of each branch

3. **Timeline section**: Dedicated section for time-sensitive items

   - Overdue/due-today/blocked immediately visible
   - Scheduled items provide planning context
   - Non-prescriptive: surfaces info, doesn't dictate priorities

4. **In-progress as first-class**: Full details for active work

   - These are most likely to be relevant to any conversation
   - Body content provides actual context

5. **Deferred path resolution**: Reference table at end
   - Main content stays clean and readable
   - Paths available for follow-up `context task/project/area` calls

### Token Efficiency Considerations

- Tree structure is more compact than nested markdown headers
- Status emojis replace verbose status labels
- Task counts use shorthand (2▶️ 3🟢  1📥 1🚫) instead of prose
- Body excerpts are truncated to first meaningful section
- Reference table only includes entities actually mentioned

### What's NOT Included (by design)

- **Done/dropped/icebox tasks**: Not relevant to current actionable work
- **Done projects**: Completed, not relevant
- **Archived areas**: Hidden by user preference
- **Full task metadata**: Only shown for in-progress tasks
- **Project metadata beyond status**: Clutters the tree view
- **Area metadata**: Names and task counts are sufficient
- **Paused project excerpts**: Visible in tree but excluded from excerpts (reduce noise)

---

## Resolved Decisions

- **Scheduled horizon**: Fixed at 7 days. Not configurable.

- **Paused projects**: Included in structure tree, excluded from context excerpts (reduce noise while maintaining visibility).

- **Blocked tasks**: Yes, surfaced prominently in Timeline section as potential impediments.

- **Reference table scope**: Only includes entities mentioned in output. Not all active entities (could be extremely large).

- **Recently modified window**: 24 hours, excludes completed/dropped tasks (tighter signal, relevant work only).

- **Excerpt length**: First 20 lines OR first 200 words, whichever is shorter. Simple, predictable, no structure parsing.

- **Recently modified threshold**: If >20 tasks modified in window, omit section entirely (implies batch operation).

- **Loose tasks**: Surfaced in "Tasks with no Project or Area" section in structure tree.
