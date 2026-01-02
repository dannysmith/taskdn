# Task: Quick Capture Pane

- A global keyboard shortcut opens a clean "new task" panel on the currently focused screen. By default it shows just a "Title" text area. Esc cancels, Cmd+Enter submits.
- The user can type (or dictate with a third-party tool) the title of their task and have it immediately created with status "inbox".
- Cmd+Shift+Enter opens a "body" textarea below the title. Text entered here will be added to the body of the task doc.
- **"Mentions"**
  - Typing `/` in either text area opens a completion dropdown showing all active areas and projects with fuzzy matching, allowing the user to assign a project and/or area to the task. This inserts a "pill" which can be deleted like normal text.
  - Typing `@` opens a similar dropdown for selecting dates for scheduled, due, and defer-until, using both natural language and a datepicker. These also appear as "pills".
  - While these appear as "mentions" in the text, they are actually a keyboard-friendly way to assign metadata. Each can only be assigned once—once a project is "mentioned", it no longer appears in the dropdown. Same for dates.
- When the task is created, these "pills" are stripped from the text.
