# Task: URL Scheme

https://github.com/dannysmith/taskdn/issues/19

The app supports a `taskdn://` local URL scheme for opening tasks, projects, and areas in the desktop app. The scheme should also include special URLs for commonly-accessed views (e.g., "today", "new task", "calendar"). Exact URLs to be determined by the final app design.

We should try to follow similar conventions to those used in Obsidian and Things:

- https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
- https://culturedcode.com/things/support/articles/2803573/

And we should also try to follow similar conventions to the CLI commands.

The obsidian plugin will be configured to use "taskdn://open?path=<url encoded absolute path to task file>" which is the same structure and names as Obsidian's URL scheme and also matches how our CLI works. We haven't yet made any d other decisions about the structure of this scheme.
