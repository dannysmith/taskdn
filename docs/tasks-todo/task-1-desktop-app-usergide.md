# Task: Desktop App Userguide

## 1. Pages to Create

Create these docs in `/website/src/content/docs/desktop/`. The sub-items are major headings in each doc. Add them to the sidebar too.

- [ ] Add these headings to overvire.mdx:
  - Overview (of the main app window)
  - Areas
  - Projects
  - Tasks
  - Source of Truth
- [ ] Task Details Panel
- [ ] Views
  - Today
  - This Week
  - Inbox
  - Calendar
  - Project View
  - Area View
  - No Area View
- [ ] Working With Lists
- [ ] Working with Kanban Boards & Calendars
  - Calendars
  - Kanban Boards
- [ ] Global Quick Entry Pane
- [ ] Command Pallete & Task Search
  - Intro
  - The Command Palette
  - Searching for Tasks
- [ ] Menus & Keyboard Shortcuts
- [ ] Preferences
  - General
  - Vault
  - Quick Entry Pane
  - Advanced
  - How Settings are Stored
- [ ] URL Scheme
- [ ] Keyboard Navigation

## 2. Add content

[Add actual content to each section]

# Random Notes on Content

## Overview

- Why a desktop app
- Use cases
- and how it plays with the other products.
- Diagram Overview of the main window

### The Fundamentals

#### Areas

- Read-only
- Can be collapsed and reordered in the left sidebar

#### Projects

- Can be reordered in the sidebar. Dragging to another area will update the project file.
- Status indicators, progress rings and colour meanings
- Read only except for status and parent area.
- Projects without an area appear in "NoArea"

#### Tasks

- Can be shown as list items or cards depending on context. Are the primary entity in the desktop app.
- Currently selected task is always visible & editable in the right sidebar
- Status
  - What each status means and how that affects its display
  - indicators: pill and checkbox meanings
- How Due dates work and are displayed
- How Defer-until dates work
- How Scheduled dates work
- Tasks with an area but no project appear as "loose" under the Area. Tasks with neither project or area appear as "Loose" under No Area.
- The inbox - a special case.

#### The Source of Truth

- Files on disk
- The taskdn spec doesn't have any concept of "ordering", which is intentional. However, the desktop app does allow you to reorder your tasks. This is generallly scoped to a specific view, and is persisted only for the desktop app. Your actual task files will never contain information about their ordering.

## The Task Details Panel

- Shows the currently selected task
- Field Editing
- The markdown editor
  - Basic Markdown
  - Checklists
  - URL Pasting
  - Source mode

## The Primary Views

### Today

- Intended as a place for daily work.
- Scheduled for Today
  - Temporary Headings
- Due today & Overdue
- Became available today

### This Week View

- For weekly planning.
- Week calendar View
  - What moving tasks does
  - Visual indicators: Defer-until, due/overdue, done, scheduled
  - Due tasks (at bottom)
- Kanban View 

### Inbox View

- What's it for and what does it show?

### Calendar View

- For longer-term planning
- What moving tasks does
- Visual indicators: Defer-until, due/overdue, done, scheduled

### Project View

- Intended for project planning and focussed work.
- Shows the project doc and its tasks.
- Project status is editable.
- Tasks can be viewed in both List and Kanban view

### Area View

- Overview of area. Area data is read-only
- Shows area doc, loose tasks and all projects belonging to the area.
- Can drag tasks between projects (or to loose tasks)
- Project cards show overview of currently active projects in the area with progress.
- Tasks can be viewed in both List and Kanban view


#### No Area View

- Works exactly the same as an Area view except it's projects are those without an asigned area and it's "loose tasks" are those with neither area or project.

## Working with Lists

- Editing a task title
- Creating a new task
- Deleting a task
- Reordering
- Keyboard shortcuts

## Working with Kanban Boards & Calendars

## Quick Entry Pane


## Command Pallete & Task Search

## Menus & Keyboard Shortcuts

- Default App
- Reveal
- Open in Obsidian
- Copy path / URL / as markdown
- Tasks: can edit metadata etc

## Preferences

### General

### Vault

### Quick Entry Pane

### Advanced

### How Settings are Stored

## URL Scheme
