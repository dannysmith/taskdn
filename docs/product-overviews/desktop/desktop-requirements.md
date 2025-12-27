# Desktop App - Requirements & Overview

A Tauri desktop application for managing S1-compliant task systems. Designed for macOS foremost, but with support fot cross-platform users. See [Desktop Tech](./desktop-tech.md) for technical overview and reqirements. Used by human users only.

See [Overview](../../overview.md) for an overview of the whole project.

## Goal

A fast, beautiful, easy-to-use desktop app which makes [taskdn files](../../../tdn-specs/S1-core.md) feel less like files on disk and exactly like tasks, projects & areas feel in apps like Things & Reminders. Plus a few power features from the best Notion setups for this.

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

The the left sidebar should always show the currently active areas. And then underneath each area, the currently active projects that belong to them, with the status of each project clearly shown. Drilling down into any of these things should show me a suitable view in the main window. It should also show projects which don't belong to an area.

The left sidebar should also be an easy way to get to certain views like "inbox", "this week", "today", "overdue" and the like. The exact details of this will be worked out later.

### The Task Card

Tasks are a fundamental unit in this app. Whether I'm in grid view or Kanban view or potentially various other views, I want to be able to see tasks represented as a card, which in certain views will be draggable, and that card needs to have all the information I require in a certain context visible. It should be easy to change certain properties of a task by interacting with this card. This is one of the two fundamental representations of a task.

### The Project Card

As per task cards, except I'm likely to interact with these less and the information shown on them will be different.

### The Area Card

As per task cards, except I'm likely to interact with these less and the information shown on them will be different.

### The New/Edit Task Card

Editing current tasks in place or adding new tasks is something that's likely to happen in any view where I can see task cards. So the interface for doing that should in one way or another be able to replace a task card in place whether I'm editing its properties or creating a new one.

### The Task ListItem

The second major view I'm likely to have of tasks is when they are displayed in a list rather than a grid or Kanban board. And so much like a task card, I want to see a task list item which should generally appear in a similar way to checkbox tasks in normal task management apps. I should be able to rearrange these, drill down into them, edit their properties, add new ones, in a very similar interface as you would expect in an app like Things. I should also be able to change their status by checking them off.

### The Project ListItem

The equivalent of a task list item, but for projects. will be used a lot less than the task list items. Unlike task list items, these probably do not need to be interactive. It's unlikely that we will need to change any metadata about a project from a view that is showing them as list items. However, project list items are likely to be used as a kind of heading under which task list items are shown.

### The Area ListItem

As for Project ListItems. No interaction Which changes their data expected with these.

### The List

The list is a fundamental type of view. A list will contain task list items and allow new ones to be added or them to be reordered and edited in an extremely easy way. Much like in things. Lists may also support project list items or area list items either as grouping headings or simply on their own. This will depend on the view.

### The Grid

A simple grid which allows the display of cards where this is used will depend entirely on context.

### The Kanban Board

Similar to grid except a Kanban board must allow reordering within a column and must be able to display columns based on some property of the things it is displaying. The way Notion does this is an excellent model.

### The Week View

The simplest form of calendar view, showing tasks organized by one or many of their date properties. The most obvious use case for this is scheduling tasks for the forthcoming week by dragging them to the correct day.

## Task Ordering & Reordering

Planning views (today, project planning) need manual task reordering. This is a UI concern, not a task property—the same task might be #1 in "today" but #5 in its project view.

## Keyboard Navigation

Keyboard navigation must work as expected. whatever view I am in, if I am in a Kanban view, a task list, or a grid view, it should be possible to move between different tasks or other items intuitively and natively using the keyboard. Keyboard shortcuts should work contextually, allowing me to edit and create new tasks as well as navigate the main interface of the application without needing to use my mouse. There is plenty of prior art here in the form of other similar applications like linear cello things, etcetera.

## The Command Palette

The command pallet should support general app-wide commands, as well as contextual ones. For example, if I currently have a task selected in the UI, Opening the command palette should surface operations I can conduct on that task at the top and fuzzy match for them.

## The Quick Search

It must be possible to quickly search for and open any task area or project using a command palette-like Interface. This must support fuzzy matching. And ideally it would also give preference to the most recently opened items. The main purpose here is being able to hit a ke ke ke ke ke ke ke ke ke keyboard shortcut and very quickly find and open the area project or task we are looking for in the app.

## Item Contex Menus

Right clicking on any task, project, or area anywhere in the app will present a context menu containing at least:

- Reveal in Finder/Explorer/erx - Reveals the file on disk in the OS file manager.
- Open in Default App - Opens the file on disk in the OS default application.
- Open in Obsidian - Opens the file on disk in obsidian using the Obsidian URL Scheme. Only shown if the file is within an obsidian vault.
- Copy Path - copies the full file path to the clipboard.
- Copy local URL - copies the `taskdn://` URL to the clipboard.
- Copy as Markdown - copies the full contents of the file on disk to the clipboard, direct from disk, appending the full file path at the end.

In certain contexts, context menus may include additional items. But they must ALWAYS include these ones.

## Quick Capture Pane

- A global keyboard shortcut opens a clean "new task" panel on the currently focussed screen. By default it's just a "Title" text area. Esc cancels, Cmd+Enter submits.
- The user can type (or dictate with a third party tool) the title of their task and have it immediatly created with status "inbox".
- Command + Shift + Enter opens a "body" textarea below the title. Text entered here will be added to the body of the task doc.
- "Mentions"
  - Typing `/` in either text area opens a completion dropdown which shows all active areas and projects with fuzzy matching, allowing the user to assign a projects and/or area to the task. Doing so inserts a "pill" which can be deleted like normal text.
  - Typing `@` will open a similar dropdown which allows the user to select sates for scheduled, due and defer-until, using both natural language and a datepicker. These also appear as "pills" in the text.
  - While these appear as "mentions" in the text, they are not. They are a keyboard-friendly way to assign a project, task, due, scheduled or defer-until. It is not possible to assign these more than once, so once the user has "mentioned" a project they will no longer appear in the dropdowns. Likewise for all the others.
- When creating a task, these "pills" are removed from the text.

## Quick Capture LLM Post-Processing

Mainly intended for users who dictate new tasks into the quick capture box.

- The contents of the inout field are sent to a local LLM with a short prompt. This returns a properly-structured task for creation in the app.
- The prompt will include a list of the current areas and projects along with additional context about "now", along with instructions for lightly cleaning the user input, extracting frontmatter fields and (if long) generating a suitable title. The raw input text will always be incluede in the body of the task doc.
- This prompt is not customizable by the user.
- Only Apple Intelligence is supported for V1. Installed ollama models may also be supported.
- There is NO INTENT to ship downloadable LLMs with this product, or provide an interface for managing them.

## URL Scheme

The app supports a `taskdn://` local URL scheme for opening tasks, projects and areas in the desktop app. The scheme should also include special URLs for commonly-accessed app-level views (eg. "today", "new task", "calendar" etc). These will be dictated by the eventual design of the app.

## Future Ideas
