# Demo Vault

Reference Obsidian vault for testing and demoing Taskdn tools. Contains realistic example content covering the full specification.

## Directory Structure

```
demo-vault/
├── tasks/           # Task files (spec section 3)
│   └── archive/     # Completed/dropped tasks
├── projects/        # Project files (spec section 4)
├── areas/           # Area files (spec section 5)
└── README.md
```

When configuring implementations, use these paths:
- `tasks_dir`: `demo-vault/tasks`
- `projects_dir`: `demo-vault/projects`
- `areas_dir`: `demo-vault/areas`

## Scenario

A freelance developer/consultant with:
- Personal life areas (Health, Finances, Home)
- Client work (Acme Corp, TechStart)
- Side projects and open source work

## Contents

### Areas (7 files)

| File | Type | Status | Notes |
|------|------|--------|-------|
| health.md | life-area | active | Personal health |
| finances.md | life-area | active | Personal/business finances |
| home.md | life-area | active | Home and office |
| acme-corp.md | client | active | Enterprise client |
| techstart.md | client | active | Startup client |
| side-projects.md | life-area | active | Personal projects |
| old-client-inc.md | client | archived | Former client (tests archived status) |

### Projects (9 files)

| File | Status | Area | Notes |
|------|--------|------|-------|
| q1-planning-acme.md | in-progress | Acme Corp | Has unique-id, dates |
| website-redesign-acme.md | planning | Acme Corp | Future project |
| api-migration-techstart.md | in-progress | TechStart | Has unique-id, detailed progress |
| mobile-app-techstart.md | blocked | TechStart | Uses blocked-by |
| home-office-setup.md | ready | Home | Ready to start |
| tax-filing-2024.md | done | Finances | Completed project |
| fitness-challenge.md | paused | Health | Paused state |
| open-source-lib.md | planning | Side Projects | Early planning |
| blog-relaunch.md | ready | (none) | Tests missing area |

### Tasks (18 active + 3 archived)

**By Status:**
- `inbox` (2): review-client-proposal, research-backup-solutions
- `icebox` (2): learn-rust, redesign-personal-website
- `ready` (6): review-quarterly-report, update-portfolio, call-insurance, order-standing-desk, schedule-dentist, review-pr-47
- `in-progress` (3): implement-auth-endpoint, draft-typescript-post, prepare-roadmap-presentation
- `blocked` (2): deploy-api-production, submit-expense-reports
- `dropped` (2): attend-networking-event, build-custom-cms
- `done` (1 active + 3 archived): setup-dev-environment, file-quarterly-taxes, review-api-docs, setup-ci-pipeline

**Spec Features Covered:**
- All 7 task statuses
- Required fields: title, status, created-at, updated-at
- Optional fields: completed-at, area, projects, due, scheduled, defer-until
- Date formats: date-only and datetime (with T and space separators)
- WikiLinks for file references
- Projects as single-element arrays
- Archive subdirectory for completed tasks
- Rich markdown body content

## Usage

Use this vault to test:
- Parsing and validation of task/project/area files
- Querying by status, area, project
- Date filtering (due, scheduled, defer-until)
- Archive handling
- WikiLink resolution
- Edge cases (missing optional fields, datetime variants)
