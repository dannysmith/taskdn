# AI Context Output Reference

This document defines how context commands format output for AI agents (when the `--ai` flag is set).

---

## 1. Purpose & Background

AI agents benefit from structured, token-efficient context about the user's work. The `context` command family provides this, with different scopes:

- `context --ai` — Full overview of all active work
- `context area <area> --ai` — Deep dive into a specific area
- `context project <project> --ai` — Deep dive into a specific project
- `context task <task> --ai` — Full details on a specific task with parent context

**Key principle:** All `--ai` output should follow the patterns in this document. The format is optimized for:

1. **Token efficiency** — Minimize tokens while preserving semantic richness
2. **Progressive disclosure** — Most important info first, details later
3. **Machine parseability** — Consistent patterns an agent can rely on
4. **Actionability** — Surface what matters for decision-making

---

## 2. Principles and Rules

### 2.1 Progressive Disclosure

Structure output so agents can stop reading at any depth:

```
Stats → Structure → Timeline → In-Progress Details → Excerpts → Reference
```

Most critical information (counts, hierarchy) comes first. Full body content and path references come last.

### 2.2 Definition of "Active"

These definitions apply throughout all context output:

| Entity   | "Active" means                                                                      |
| -------- | ----------------------------------------------------------------------------------- |
| Tasks    | Excludes `done`, `dropped`, `icebox` (icebox = intentionally deferred indefinitely) |
| Projects | Excludes `done`                                                                     |
| Areas    | `status: active` or no status field (excludes `archived`)                           |

### 2.3 Non-Prescriptive Surfacing

Context output surfaces information for awareness — it does NOT dictate priorities. The "Timeline" section shows time-sensitive items, but the agent/user decides what needs attention.

### 2.4 Token Efficiency

- Use emoji status indicators instead of verbose labels
- Use shorthand for task counts: `(2▶️ 4🟢 1📥)` not "2 in-progress, 4 ready, 1 inbox"
- Tree structures are more compact than nested markdown headers
- Truncate body excerpts: first 20 lines OR first 200 words, whichever is shorter
- Reference table at end keeps main content clean (paths not inline)
- Only include entities that are mentioned in output

### 2.5 What to Exclude

- **Done/dropped/icebox tasks** — Not actionable
- **Done projects** — Completed
- **Archived areas** — Hidden by user preference
- **Full metadata for non-primary entities** — Clutters output
- **Paused project excerpts** — Show in tree, but don't include body excerpts

### 2.6 Specific Rules

| Rule                        | Value                                                         |
| --------------------------- | ------------------------------------------------------------- |
| Scheduled horizon           | 7 days (fixed)                                                |
| Recently modified window    | 24 hours                                                      |
| Recently modified threshold | If >20 tasks modified, omit section (implies batch operation) |
| Excerpt truncation          | First 20 lines OR first 200 words                             |
| Reference table scope       | Only entities mentioned in output                             |

---

## 3. Reusable Components

### 3.1 Status Indicators

**For projects (in structure tree):**

| Emoji | Status      |
| ----- | ----------- |
| `🔵`  | in-progress |
| `🟢`  | ready       |
| `🟡`  | planning    |
| `🚫`  | blocked     |
| `⏸️`  | paused      |

**For tasks (in count shorthand):**

| Emoji | Status      |
| ----- | ----------- |
| `▶️`  | in-progress |
| `🟢`  | ready       |
| `📥`  | inbox       |
| `🚫`  | blocked     |

**Other indicators:**

| Emoji | Meaning                                                          |
| ----- | ---------------------------------------------------------------- |
| `📁`  | Area                                                             |
| `📋`  | Direct tasks (tasks belonging directly to area, not via project) |
| `⚠️`  | Overdue count (in stats)                                         |
| `📅`  | Due today count (in stats)                                       |

### 3.2 One-Line Patterns

**Project in structure tree:**

```
🔵 Q1 Planning [in-progress] — 8 tasks (2▶️ 4🟢 1📥 1🚫)
```

Format: `{status_emoji} {title} [{status}] — {count} tasks ({shorthand})`

**Task in structure tree (in-progress only):**

```
▶️ Fix authentication bug
```

Format: `▶️ {title}`

**Task in timeline:**

```
**Fix critical security issue** — due Jan 10 — Q1 Planning → Work
```

Format: `**{title}** — {date_info} — {parent_chain}`

**Parent chain notation:**

- With project: `Q1 Planning → Work` (project → area)
- Direct to area: `Work (direct)`
- No parent: `(no project or area)`

**Task count shorthand:**

```
(2▶️ 4🟢 1📥 1🚫)
```

Only include statuses with count > 0.

### 3.3 In-Progress Task Detail Block

```markdown
### {Task Title}

{Parent Chain} · due {date}

{Body excerpt - first 20 lines or 200 words}
```

Example:

```markdown
### Fix authentication bug

Q1 Planning → Work · due 2025-01-18

The SSO authentication flow is failing for enterprise users...
```

### 3.4 Body Excerpt Block

Use blockquote format for excerpts in the Excerpts section:

```markdown
### Work (Area)

> Primary professional focus area covering client work...
>
> Key priorities:
>
> - Ship authentication system
> - Onboard new clients
```

### 3.5 Reference Table

```markdown
| Entity       | Type    | Path                    |
| ------------ | ------- | ----------------------- |
| Work         | area    | areas/work.md           |
| Q1 Planning  | project | projects/q1-planning.md |
| Fix auth bug | task    | tasks/fix-auth-bug.md   |
```

---

## 4. The `context --ai` Command

Provides a comprehensive overview of all active work for context priming before specific queries.

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

| Entity                          | Type    | Path                                 |
| ------------------------------- | ------- | ------------------------------------ |
| Work                            | area    | areas/work.md                        |
| Personal                        | area    | areas/personal.md                    |
| Health                          | area    | areas/health.md                      |
| Q1 Planning                     | project | projects/q1-planning.md              |
| Client Onboarding               | project | projects/client-onboarding.md        |
| Q2 Roadmap                      | project | projects/q2-roadmap.md               |
| Legacy Migration                | project | projects/legacy-migration.md         |
| Home Renovation                 | project | projects/home-renovation.md          |
| Tax Prep 2025                   | project | projects/tax-prep-2025.md            |
| Side Project Alpha              | project | projects/side-project-alpha.md       |
| Fix authentication bug          | task    | tasks/fix-auth-bug.md                |
| Document API v2 endpoints       | task    | tasks/document-api-v2.md             |
| Review team capacity            | task    | tasks/review-team-capacity.md        |
| Get contractor quotes           | task    | tasks/get-contractor-quotes.md       |
| Schedule dentist appointment    | task    | tasks/schedule-dentist.md            |
| Fix critical security issue     | task    | tasks/fix-security-issue.md          |
| Submit expense report           | task    | tasks/submit-expense-report.md       |
| Review PR #847                  | task    | tasks/review-pr-847.md               |
| Call insurance company          | task    | tasks/call-insurance.md              |
| Finalize Q1 goals               | task    | tasks/finalize-q1-goals.md           |
| Follow up with client           | task    | tasks/follow-up-client.md            |
| Check test results              | task    | tasks/check-test-results.md          |
| Team standup prep               | task    | tasks/team-standup-prep.md           |
| Contractor site visit           | task    | tasks/contractor-site-visit.md       |
| Weekly review                   | task    | tasks/weekly-review.md               |
| Meal prep planning              | task    | tasks/meal-prep-planning.md          |
| Random idea to explore          | task    | tasks/random-idea-to-explore.md      |
| Update personal website         | task    | tasks/update-personal-website.md     |
| Daily standup                   | task    | tasks/daily-standup.md               |
| Waiting for client feedback     | task    | tasks/waiting-for-client-feedback.md |
| Pending contractor availability | task    | tasks/pending-contractor.md          |
| Update project timeline         | task    | tasks/update-project-timeline.md     |
| Research SSO providers          | task    | tasks/research-sso-providers.md      |
| Draft client proposal           | task    | tasks/draft-client-proposal.md       |
```

---

## 5. The `context area <area> --ai` Command

Provides deep context on a specific area: full details, all projects (regardless of status), and scoped timeline/task information.

**Key differences from overview:**

- Area is primary entity — full body, all frontmatter, no truncation
- ALL projects shown, including paused and done (full picture of area's scope)
- Projects grouped by status with more detail
- Timeline scoped to tasks in this area only
- Ready tasks section (capped at 10) for actionability

### Structure

1. **Stats header** — Quick summary of this area
2. **Area details** — Full frontmatter + full body
3. **Projects** — All projects grouped by status
4. **Timeline** — Time-sensitive tasks in this area
5. **In-Progress Tasks** — Full details (same as overview)
6. **Ready Tasks** — Top 10 ready tasks (titles + project only)
7. **Project Excerpts** — From in-progress/ready/planning/blocked projects
8. **Reference** — Paths for all mentioned entities

### Example Output

```markdown
# Area: Work

**Stats:** 6 projects · 23 active tasks · ⚠️ 1 overdue · 📅 2 due today · ▶️ 4 in-progress

---

## Area Details

| Field       | Value             |
|-------------|-------------------|
| status      | active            |
| type        | professional      |
| description | Primary work area |
| path        | areas/work.md     |

### Body

This area covers all professional work including client projects, internal tools, and team management.

## Current Priorities

- Q1: Ship authentication system overhaul
- Q1: Onboard 2 new enterprise clients
- Q2: Complete API v2 documentation

## Key Stakeholders

- Product team (Sarah, Mike)
- Enterprise sales (Jennifer)
- Engineering leads

## Notes

Weekly sync every Monday at 10am. Quarterly reviews at end of each quarter.

---

## Projects in Work (6)

### In-Progress (2)

🔵 Q1 Planning — 8 tasks (2▶️ 4🟢 1📥 1🚫)
├── ▶️ Fix authentication bug
└── ▶️ Document API v2 endpoints

🔵 Client Migration — 3 tasks (1▶️ 2🟢)
└── ▶️ Set up staging environment

### Ready (1)

🟢 Client Onboarding — 4 tasks (4🟢)

### Planning (1)

🟡 Q2 Roadmap — 2 tasks (2📥)

### Blocked (0)

_None_

### Paused (1)

⏸️ Legacy Migration — 3 tasks (1🟢 2📥)

### Done (1)

✅ Q4 Wrap-up — completed 2024-12-15

---

## Timeline

_Scoped to tasks in Work area_

### Overdue (1)

- **Fix critical security issue** — due Jan 10 — Q1 Planning

### Due Today (2)

- **Review PR #847** — Q1 Planning
- **Finalize Q1 goals** — Q1 Planning

### Scheduled Today (1)

- **Daily standup** — (direct)

### Newly Actionable Today (1)

_defer-until = today_

- **Follow up with client** — Client Onboarding

### Blocked (1)

- **Waiting for client feedback** — Q1 Planning

### Scheduled This Week

**Tomorrow (Thu Jan 16)**

- Team standup prep — (direct)

**Friday (Jan 17)**

- Weekly review — (direct)

---

## In-Progress Tasks (4)

### Fix authentication bug

Q1 Planning · due 2025-01-18

The SSO authentication flow is failing for enterprise users. Investigation shows the OAuth callback handler isn't properly refreshing expired tokens. Need to:

1. Add token refresh logic to callback handler
2. Update session management to detect expiry
3. Add integration tests for SSO flow

### Document API v2 endpoints

Q1 Planning

Document the new v2 REST endpoints before client release. Focus areas:

- Authentication and authorization flows
- Rate limiting and quotas
- Breaking changes from v1

### Set up staging environment

Client Migration · due 2025-01-20

Configure staging environment for client data migration testing.

### Review team capacity

(direct) · due 2025-01-16

Assess current team bandwidth for Q1 commitments. Need to identify if we can take on the new client project or need to defer.

---

## Ready Tasks (showing 10 of 15)

- Review PR #847 — Q1 Planning
- Finalize Q1 goals — Q1 Planning
- Update deployment docs — Q1 Planning
- Set up monitoring alerts — Client Migration
- Create onboarding checklist — Client Onboarding
- Draft welcome email template — Client Onboarding
- Schedule kickoff call — Client Onboarding
- Review SLA terms — Client Onboarding
- Update team wiki — (direct)
- Book conference room — (direct)

---

## Project Excerpts

_From in-progress, ready, planning, and blocked projects_

### Q1 Planning

> **Goal:** Complete authentication overhaul and prepare for enterprise client launch.
>
> **Key Milestones:**
>
> - Auth system complete: Jan 31
> - API docs published: Feb 7
> - Client UAT begin: Feb 14
>
> **Risks:** Team capacity constrained, may need to defer non-critical items.

### Client Migration

> Migrate existing client data from legacy system to new platform.
>
> **Timeline:** 2 weeks
> **Dependencies:** Staging environment must be ready first.

### Client Onboarding

> Process and materials for onboarding new enterprise clients to the platform.
>
> Standard onboarding takes 2-3 weeks and includes:
>
> - Technical integration support
> - Admin training session
> - Documentation handoff

### Q2 Roadmap

> Planning document for Q2 initiatives. Currently in early scoping phase.
>
> **Candidates:**
>
> - Mobile app v2
> - Analytics dashboard
> - Self-service portal

---

## Reference

| Entity                      | Type    | Path                                 |
|-----------------------------|---------|--------------------------------------|
| Work                        | area    | areas/work.md                        |
| Q1 Planning                 | project | projects/q1-planning.md              |
| Client Migration            | project | projects/client-migration.md         |
| Client Onboarding           | project | projects/client-onboarding.md        |
| Q2 Roadmap                  | project | projects/q2-roadmap.md               |
| Legacy Migration            | project | projects/legacy-migration.md         |
| Q4 Wrap-up                  | project | projects/q4-wrap-up.md               |
| Fix authentication bug      | task    | tasks/fix-auth-bug.md                |
| Document API v2 endpoints   | task    | tasks/document-api-v2.md             |
| Set up staging environment  | task    | tasks/setup-staging.md               |
| Review team capacity        | task    | tasks/review-team-capacity.md        |
| Fix critical security issue | task    | tasks/fix-security-issue.md          |
| Review PR #847              | task    | tasks/review-pr-847.md               |
| Finalize Q1 goals           | task    | tasks/finalize-q1-goals.md           |
| Daily standup               | task    | tasks/daily-standup.md               |
| Follow up with client       | task    | tasks/follow-up-client.md            |
| Waiting for client feedback | task    | tasks/waiting-for-client-feedback.md |
| Team standup prep           | task    | tasks/team-standup-prep.md           |
| Weekly review               | task    | tasks/weekly-review.md               |
```

### Area-Specific Rules

| Rule | Value |
|------|-------|
| Projects shown | ALL (including paused, done) |
| Done projects | Show title + completion date only |
| Ready tasks cap | 10 (with "showing X of Y" if more) |
| Project excerpts | In-progress, ready, planning, blocked only (not paused/done) |
| Timeline scope | Tasks in this area only (direct + via projects) |
| Area body | Full, no truncation |

---

## 6. The `context project <project> --ai` Command

_TODO: Define output format for project-specific context._

---

## 7. The `context task <task> --ai` Command

_TODO: Define output format for task-specific context._

---

## 8. Context Commands with `--json` Flag

_TODO: Define JSON representation for context output._

---

## 9. Other Notes

### Implementation Decisions

These decisions were made during design and should be maintained:

- **Paused projects**: Visible in structure tree but excluded from body excerpts (reduce noise while maintaining visibility)
- **Blocked tasks**: Surfaced prominently in Timeline section as potential impediments
- **Loose tasks**: Tasks with no project or area get their own section in structure tree
- **Recently modified threshold**: If >20 tasks modified in 24h window, omit section entirely (implies batch operation, not meaningful individual work)

### Relationship to S1 Spec

This output format uses status values from `tdn-specs/S1-core.md`:

- **Task statuses:** `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`
- **Project statuses:** `planning`, `ready`, `blocked`, `in-progress`, `paused`, `done`
- **Area statuses:** `active`, `archived` (or absent = active)

The field `defer-until` (not "deferred-until") is used for task deferral.
