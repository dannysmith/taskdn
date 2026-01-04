# Example Note

This note demonstrates how the **obsidian-taskdn** plugin renders task links as interactive widgets.

---

## Task Links as List Items

When a task link is the first thing in a bullet point, it renders as a widget with checkbox, status, and metadata. Click the checkbox to mark a task done.

- [[update-homepage]]
- [[fix-mobile-nav]]
- [[book-flights]]
- [[random-idea]]

Completed tasks show with strikethrough:

- [[archive/setup-dev-env]]

---

## Inline Task Links

Task links within paragraphs render inline. Here are some tasks I'm tracking: [[update-homepage]] is in progress, while [[fix-mobile-nav]] is ready to start.

The [[book-flights]] task is currently blocked - I need to confirm dates first.

---

## Different Statuses

The plugin shows different visual indicators for each status:

- [[random-idea]] - inbox (unprocessed)
- [[fix-mobile-nav]] - ready
- [[update-homepage]] - in-progress
- [[book-flights]] - blocked
- [[archive/setup-dev-env]] - done

---

## Links to Projects and Areas

Links to projects and areas render as normal Obsidian links (not task widgets):

- [[Website Redesign]] - a project
- [[Japan Trip 2025]] - another project
- [[Side Projects]] - an area

This is intentional - only files in the `tasks/` directory become task widgets.

---

## Mixed Content

Real notes often mix task links with other content:

Working on the [[Website Redesign]] project this week. Main priorities:

- [[update-homepage]] - need to finish by Friday
- [[fix-mobile-nav]] - quick fix, do this first

Also want to look at [[research-ryokans]] but that's deferred until closer to the trip.

The [[backup-laptop]] task is scheduled for the weekend - it's a routine maintenance thing that belongs to the [[Side Projects]] area rather than any specific project.
