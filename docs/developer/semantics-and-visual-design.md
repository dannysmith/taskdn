# Semantics and Visual Design Guide

This document provides a canonical reference on semantics, naming, coloring, and iconography across all Taskdn products. It's intended for designers, product managers, developers, and AI agents to reference when designing and building new products, writing documentation, or making UI decisions.

**Important:** Individual products may have more granular visual design guides that extend this document. This guide covers the higher-level, cross-product standards that ensure consistency across the suite. For product-specific details, see:

- Desktop App: `tdn-desktop/docs/developer/ui-design-guidelines.md`
- CLI AI Output: `tdn-cli/docs/developer/ai-context.md`

Before reading this document, review the [Product Principles](../product-principles.md) to understand the design philosophy that drives these choices.

---

## Core Entities

Taskdn has three core entities. Each has consistent visual treatment across all products.

### Area

An ongoing responsibility or life domain. Areas are never "finished"—they represent continuous aspects of life or work (e.g., Health, Finance, Family).

| Property | Value |
|----------|-------|
| Icon | Folder |
| AI Emoji | 📁 |
| Accent Color | Teal (OKLCH hue ~180) |

**Visual characteristics:**
- Areas contain projects and/or direct tasks
- Displayed with folder icon in navigation
- Area type badges use a rotating color palette (6 slots, auto-assigned by hash)

### Project

A finishable collection of tasks with a clear outcome. Projects belong to an area (optionally) and contain tasks.

| Property | Value |
|----------|-------|
| Icon | Progress Circle |
| AI Emoji | Varies by status (see below) |
| Accent Color | Purple (OKLCH hue ~300) |

**Visual characteristics:**
- Progress circle shows completion percentage as a filled arc
- Circle changes to status-specific icons when not in-progress (pause, block, check)
- Project cards show task counts and progress bar

### Task

A single actionable item. Tasks belong to a project (optionally) or directly to an area.

| Property | Value |
|----------|-------|
| Icon | Checkbox |
| AI Emoji | Varies by status (see below) |
| Default Color | Inherits from status |

**Visual characteristics:**
- Checkbox appearance changes based on status
- Title is inline-editable
- Metadata (dates, project, area) displayed as secondary information

---

## Status System

### Project Statuses

| Status | YAML Key | Description | Color | Icon | AI Emoji |
|--------|----------|-------------|-------|------|----------|
| Planning | `planning` | Being planned, not yet ready to start | Blue | Progress circle | 🟡 |
| Ready | `ready` | Waiting to start, all tasks are ready | Grey | Progress circle | 🟢 |
| In Progress | `in-progress` | Active work underway | Amber | Progress circle | 🔵 |
| Paused | `paused` | Temporarily on hold | Light Amber | CirclePause | ⏸️ |
| Blocked | `blocked` | Stuck, needs resolution before continuing | Dark Red | Ban | 🚫 |
| Done | `done` | Complete | Green | CircleCheck | ✅ |

**Color specifications (OKLCH):**

| Status | Light Mode | Dark Mode |
|--------|------------|-----------|
| Planning | `oklch(0.55 0.2 260)` | `oklch(0.7 0.18 260)` |
| Ready | `oklch(0.55 0 0)` | `oklch(0.6 0 0)` |
| In Progress | `oklch(0.58 0.22 75)` | `oklch(0.75 0.2 75)` |
| Paused | `oklch(0.65 0.15 70)` | `oklch(0.8 0.12 70)` |
| Blocked | `oklch(0.5 0.2 25)` | `oklch(0.65 0.18 25)` |
| Done | `oklch(0.55 0.18 155)` | `oklch(0.7 0.16 155)` |

### Task Statuses

| Status | YAML Key | Description | Color | Checkbox Icon | AI Emoji |
|--------|----------|-------------|-------|---------------|----------|
| Inbox | `inbox` | Needs processing/triage | Blue | Border with inbox icon | 📥 |
| Icebox | `icebox` | Intentionally deferred indefinitely | Light Blue | Border with snowflake | ❄️ |
| Ready | `ready` | Waiting to start | Grey | Empty rounded square | 🟢 |
| In Progress | `in-progress` | Active work | Amber | Border with center dot | ▶️ |
| Blocked | `blocked` | Stuck, waiting on something | Dark Red | Filled with X | 🚫 |
| Dropped | `dropped` | Abandoned, won't be done | Light Red | Grey with X | — |
| Done | `done` | Complete | Green | Filled with checkmark | ✅ |

**Color specifications (OKLCH):**

| Status | Light Mode | Dark Mode |
|--------|------------|-----------|
| Inbox | `oklch(0.55 0.2 260)` | `oklch(0.7 0.18 260)` |
| Icebox | `oklch(0.6 0.18 250)` | `oklch(0.8 0.08 260)` |
| Ready | `oklch(0.55 0 0)` | `oklch(0.6 0 0)` |
| In Progress | `oklch(0.58 0.22 75)` | `oklch(0.75 0.2 75)` |
| Blocked | `oklch(0.5 0.2 25)` | `oklch(0.65 0.18 25)` |
| Dropped | `oklch(0.55 0.15 25)` | `oklch(0.7 0.15 25)` |
| Done | `oklch(0.55 0.18 155)` | `oklch(0.7 0.16 155)` |

---

## Visual Treatments

### Task Visual States

Beyond status, tasks have additional visual treatments based on their temporal state:

| State | Visual Treatment |
|-------|------------------|
| **Completed** | Strikethrough on title, subdued/muted colors, optionally green tint |
| **Blocked** | Red accent, X icon in checkbox, may show blocking reason |
| **Overdue** | Due date shown in dark red, may have warning indicator |
| **Not yet available** | Grey dotted border, hourglass indicator, subdued appearance |
| **Due today** | Due date highlighted, may show flag prominently |
| **Scheduled today** | Calendar indicator, shown in "today" views |

### Status Pills

Status is displayed as a colored pill/badge in many contexts:

- **Background:** Status color at reduced opacity (~10-15%)
- **Text:** Status color at full saturation
- **Border:** None (rely on background contrast)
- **Border radius:** Small rounded corners

### Progress Indicators

Projects show progress as a circular indicator:

- **Empty state:** Grey ring outline
- **Progress:** Filled arc in status color, clockwise from top
- **Percentage display:** Optional text inside circle (e.g., "3/6" or "50%")

---

## Fields and Metadata

### Date Fields

| Field | Icon | Color | Description |
|-------|------|-------|-------------|
| Due | Flag | Red (`oklch(0.6 0.18 25)`) | Deadline for the task |
| Due (overdue) | Flag | Dark Red (`oklch(0.55 0.22 25)`) | Past deadline |
| Scheduled | Calendar | Grey (muted) | When to work on it |
| Defer Until | Hourglass | Grey (muted) | Hide until this date |

### Date Display Rules

- **Within 2 weeks:** Use relative format ("Today", "Tomorrow", "Mon", "in 5 days")
- **Beyond 2 weeks:** Use short absolute format ("Jan 15", "Mar 3")
- **Overdue:** Always show in dark red with warning styling
- **All dates:** Clickable to open date picker

### Entity Reference Fields

| Field | Icon | Color | Usage |
|-------|------|-------|-------|
| Project | Circle | Purple | Shows parent project |
| Area | Folder | Teal | Shows parent area (or direct area) |

---

## AI Context Output

When outputting context for AI agents (via CLI `--ai` flag), use these emoji conventions for token-efficient, parseable output:

### Structure Tree Notation

```
📁 Work                              # Area
├── 🔵 Q1 Planning [in-progress]    # Project with status
│   ├── ▶️ Fix auth bug              # In-progress task
│   └── ▶️ Write docs                # In-progress task
└── 📋 Direct: 3 tasks              # Direct tasks (no project)
```

### Task Count Shorthand

Use compact notation for task counts by status:

```
(2▶️ 4🟢 1📥 1🚫)
```

Meaning: 2 in-progress, 4 ready, 1 inbox, 1 blocked. Only include statuses with count > 0.

### Status Emoji Reference

**Projects:**
| Emoji | Status |
|-------|--------|
| 🔵 | in-progress |
| 🟢 | ready |
| 🟡 | planning |
| 🚫 | blocked |
| ⏸️ | paused |
| ✅ | done |

**Tasks (in count shorthand):**
| Emoji | Status |
|-------|--------|
| ▶️ | in-progress |
| 🟢 | ready |
| 📥 | inbox |
| 🚫 | blocked |

**Other indicators:**
| Emoji | Meaning |
|-------|---------|
| 📁 | Area |
| 📋 | Direct tasks (belonging to area, not via project) |
| ⚠️ | Overdue count |
| 📅 | Due today count |

---

## Navigation Icons

Standard icons for navigation/view elements:

| View/Element | Icon | Color Token |
|--------------|------|-------------|
| Today | Sun | `--icon-today` (Amber, hue ~85) |
| This Week | CalendarDays | `--icon-week` (Purple, hue ~300) |
| Inbox | Inbox | `--icon-inbox` (Blue, hue ~260) |
| Calendar | Calendar | `--icon-calendar` (Red, hue ~25) |
| Area (with type) | Folder | `--icon-folder` (Green, hue ~155) |
| No Area | Folder | `--icon-folder-none` (Orange, hue ~45) |

---

## Area Type Colors

Areas can have user-defined types (e.g., "work", "personal", "client"). Types are assigned colors automatically via hash of the type string, cycling through 6 color slots:

| Slot | Color | OKLCH Hue |
|------|-------|-----------|
| 1 | Green | ~160 |
| 2 | Blue | ~260 |
| 3 | Purple | ~300 |
| 4 | Amber | ~75 |
| 5 | Red | ~25 |
| 6 | Teal | ~180 |

---

## Color System

Taskdn uses the OKLCH color space for perceptually uniform colors.

### OKLCH Format

```
oklch(lightness chroma hue)
oklch(0.55 0.18 260)   // L: 0-1, C: 0-0.4, H: 0-360
```

### Hue Reference

| Hue | Color |
|-----|-------|
| ~25 | Red |
| ~75 | Amber/Orange |
| ~155 | Green |
| ~180 | Teal |
| ~260 | Blue |
| ~300 | Purple |

### Light vs Dark Mode

- Light mode: Lower lightness values (~0.5-0.6) for good contrast on white
- Dark mode: Higher lightness values (~0.65-0.8) for good contrast on dark backgrounds
- Chroma may be slightly reduced in dark mode for less visual strain

---

## Related Documentation

- [Product Principles](../product-principles.md) — Design philosophy and constraints
- [S1 Specification](../../tdn-specs/S1-core.md) — Data format and field definitions
- [S2 Implementation Guidance](../../tdn-specs/S2-implementation-guidance.md) — Behavioral standards
