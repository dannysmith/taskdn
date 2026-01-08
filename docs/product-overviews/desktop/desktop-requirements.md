# Desktop App - Requirements & Overview

A Tauri desktop application for managing S1-compliant task systems. Designed for macOS foremost, but with support for cross-platform users. See [Desktop Tech](./desktop-tech.md) for technical overview and requirements. Used by human users only.

See [Overview](../../overview.md) for an overview of the whole project.

## Goal

A fast, beautiful, easy-to-use desktop app which makes [taskdn files](../../../tdn-specs/S1-core.md) feel less like files on disk and exactly like tasks, projects & areas should feel in a proper task management app. Plus a few power features from the best Notion setups for this.

### Non-Goals

We are not building:

- A file browser, text editor or obsidian clone - This is a **todo app** with a sprinkling of project management. It should feel like one. If users wanna interact with their tasks _as files_ and write reams of markdown they should use an actual text editor or Obsidian.
- A project management app – We may eventually have some limited support for timelining or scheduling projects, but we will **never** be a full blown project management system. Areas and projects exist primarily to allow individuals to plan and organise their tasks. The First version will probably not even include a way to **edit** project files.
- A system for managing Areas – This will likely never be in scope for this app.
- Anything for "AI" – The CLI is for AI. The files on disk are for AI. This interface is for squarely for Humans. And if humans want to use AI to "chat with their tasks" they should do so using more appropriate tools. The **only** AI in this app is the optional post-processing for tasks added by the quick-entry pane.

## General UI Requirements

The UI must:

- Feel clean & uncluttered.
- Be visually consistent with itself.
- Be predictable, intuitive and learnable.
- Feel **fast**.
- Be "keyboard-first" – task apps are one of the few systems where even non-power users rely on the keyboard to work.
- Where possible, use design patterns, interactions, shortcuts, icons (etc) which are consistent with similar widely-used task management apps.

## Core UI Components

### The Left Sidebar

The left sidebar should always show currently active areas, with active projects nested underneath each area. Project status should be clearly visible. Clicking any area or project opens a suitable view in the main window. Projects not belonging to an area should also be shown.

The left sidebar should also provide quick access to views like "inbox", "this week", "today", "overdue", and similar. Exact details to be determined.

### The Task Card

Tasks are a fundamental unit in this app. Whether in grid view, Kanban view, or other views, tasks should be represented as cards that display all relevant information for the current context. In appropriate views, cards should be draggable. It should be easy to change task properties by interacting directly with the card. This is one of the two fundamental representations of a task (the other being the Task ListItem).

### The Project Card

Similar to task cards, but with different information displayed. Users will interact with these less frequently than task cards.

### The Area Card

Similar to task cards, but with different information displayed. Users will interact with these less frequently than task cards.

### The New/Edit Task Card

Editing tasks in place or adding new tasks can happen in any view showing task cards. The editing interface should be able to replace a task card in place, whether editing an existing task's properties or creating a new one.

### The Task ListItem

The second major representation of tasks, used when displaying tasks in a list rather than a grid or Kanban board. Task list items should appear similar to checkbox tasks in standard task management apps. Users should be able to:

- Rearrange items by dragging
- Seemalessly edit task title
- Drill down into task details
- Edit some task properties inline
- Add new tasks
- Change status by checking them off

The interaction model should feel natural and keyboard-friendly.

### The Project ListItem

The equivalent of a task list item, but for projects. Used less frequently than task list items. Unlike task list items, these probably don't need to be interactive—it's unlikely users will need to change project metadata from a list view. Project list items are primarily used as grouping headers under which task list items appear.

### The Area ListItem

Similar to Project ListItems. No interaction that changes their data is expected.

### The List

A fundamental view type. Lists contain task list items and allow easy adding, reordering, and editing. Lists may also include project or area list items as grouping headers, depending on the view context.

### The Grid

A simple grid layout for displaying cards. Usage depends entirely on context.

### The Kanban Board

Similar to a grid, but with columns based on a property of the displayed items. Must support reordering within columns. Notion's implementation is a good model.

### The Week View

The simplest calendar view, showing tasks organized by their date properties (due, scheduled, etc.). The primary use case is scheduling tasks for the coming week by dragging them to the appropriate day.

## Task Ordering & Reordering

Planning views (today, project planning) need manual task reordering. This is a UI concern, not a task property—the same task might be #1 in "today" but #5 in its project view.

## Keyboard Navigation

Keyboard navigation must work intuitively across all views. Whether in a Kanban view, task list, or grid view, users should be able to move between items using the keyboard. Keyboard shortcuts should work contextually, allowing users to:

- Navigate between items in any view
- Edit and create tasks
- Navigate the main app interface

All of this should be possible without touching the mouse. There is plenty of prior art in apps like Linear and Cello.

## The Command Palette

The command palette should support both app-wide and contextual commands. For example, if a task is currently selected, opening the command palette should surface relevant operations for that task at the top, with fuzzy matching for all commands.

## The Quick Search

Users must be able to quickly search for and open any task, area, or project using a command palette-like interface. Requirements:

- Support fuzzy matching
- Prioritize recently opened items
- Accessible via a keyboard shortcut

The goal is to hit a shortcut and very quickly find and open any item in the app.

## Item Context Menus

Right-clicking on any task, project, or area anywhere in the app presents a context menu containing at least:

- **Reveal in Finder/Explorer** – Reveals the file on disk in the OS file manager.
- **Open in Default App** – Opens the file in the OS default application.
- **Open in Obsidian** – Opens the file in Obsidian using its URL scheme. Only shown if the file is within an Obsidian vault.
- **Copy Path** – Copies the full file path to the clipboard.
- **Copy Local URL** – Copies the `taskdn://` URL to the clipboard.
- **Copy as Markdown** – Copies the full contents of the file to the clipboard, with the file path appended at the end.

Context menus may include additional items depending on context, but must always include the items above. Context menus should generally allow us to right click on any entity and edit the various fields By clicking.

## Quick Capture Pane

- A global keyboard shortcut opens a clean "new task" panel on the currently focused screen. By default it shows just a "Title" text area. Esc cancels, Cmd+Enter submits.
- The user can type (or dictate with a third-party tool) the title of their task and have it immediately created with status "inbox".
- Cmd+Shift+Enter opens a "body" textarea below the title. Text entered here will be added to the body of the task doc.
- **"Mentions"**
  - Typing `/` in either text area opens a completion dropdown showing all active areas and projects with fuzzy matching, allowing the user to assign a project and/or area to the task. This inserts a "pill" which can be deleted like normal text.
  - Typing `@` opens a similar dropdown for selecting dates for scheduled, due, and defer-until, using both natural language and a datepicker. These also appear as "pills".
  - While these appear as "mentions" in the text, they are actually a keyboard-friendly way to assign metadata. Each can only be assigned once—once a project is "mentioned", it no longer appears in the dropdown. Same for dates.
- When the task is created, these "pills" are stripped from the text.

## Quick Capture LLM Post-Processing

Primarily intended for users who dictate new tasks into the quick capture box.

- The contents of the input field are sent to a local LLM with a short prompt, which returns a properly-structured task for creation in the app.
- The prompt includes:
  - A list of current areas and projects
  - Context about "now"
  - Instructions for lightly cleaning user input, extracting frontmatter fields, and (if the input is long) generating a suitable title
- The raw input text is always included in the body of the task doc.
- The prompt is not user-customizable.
- V1 supports only Apple Intelligence. Installed Ollama models may also be supported.
- There is no intent to ship downloadable LLMs with this product or provide an interface for managing them.

## URL Scheme

The app supports a `taskdn://` local URL scheme for opening tasks, projects, and areas in the desktop app. The scheme should also include special URLs for commonly-accessed views (e.g., "today", "new task", "calendar"). Exact URLs to be determined by the final app design.

## Future Ideas
