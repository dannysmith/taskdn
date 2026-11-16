---
title: 'Obsidian Plugin v0.3.0'
description: 'Release notes for Obsidian Plugin v0.3.0'
date: 2026-11-16
product: obsidian
---

Requires Obsidian 1.13 or later.

## Improvements

- Settings now appear in Obsidian's settings search and apply immediately. "Tasks directory" has a folder picker.
- Widgets work in pop-out windows.
- Widgets update when a task's project or area changes. In Reading mode they update in place, so the view no longer jumps.
- Clicking just after a task widget and pressing Enter starts a new checkbox line.
- Ready task notes have a neutral left border, so they're distinguishable from done tasks.

## Fixes

- Task widgets sometimes rendered as blank lines.
- Clicking into a task's inline title and away again (or pressing Escape) renamed the file to the task title.
- Editing an inline title could save it twice.
- Turning off "Use task title as inline title", or disabling the plugin, now restores the filename straight away.
- `completed-at` and `updated-at` could be a day off around midnight outside UTC.
- Clicking the desktop app button no longer moves the cursor.

Full details: #3

---

[View on GitHub](https://github.com/dannysmith/obsidian-taskdn/releases/tag/0.3.0)
