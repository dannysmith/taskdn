# Create Obsidian Starter Vault

Create `tdn-obsidian-starter-vault/` - a minimal, downloadable starter vault demonstrating the taskdn system with templates, bases, and just enough example content to understand how it works.

## Goal

A vault users can clone and immediately understand:
- The directory structure (areas/, projects/, tasks/)
- How to create new items using templates
- How Bases provide filtered views
- How the obsidian-taskdn plugin renders task links

**Guiding principle:** Minimal viable content. Just enough to demonstrate features, not a comprehensive test suite (that's what demo-vault is for).

---

## Implementation Plan

### Phase 1: Directory Structure

```
tdn-obsidian-starter-vault/
├── areas/
│   └── Overview.md
├── projects/
│   └── Overview.md
├── tasks/
│   ├── Overview.md
│   └── archive/
├── templates/
│   └── bases/
├── example-note.md
├── getting-started.md
├── CLAUDE.md
└── README.md
```

**Tasks:**
- [ ] Create root `tdn-obsidian-starter-vault/`
- [ ] Create `areas/`, `projects/`, `tasks/`, `tasks/archive/`
- [ ] Create `templates/` and `templates/bases/`

---

### Phase 2: Templates

Use `{{date}}` syntax (core Templates plugin). No Templater.

**Task.md**
```yaml
---
title:
status: ready
created-at: {{date}}
updated-at: {{date}}
due:
scheduled:
defer-until:
projects:
area:
---
```

**Project.md**
```yaml
---
title:
status: planning
area:
description:
start-date: {{date}}
end-date:
---

## Overview



## Next Steps

- [ ]
```

**Area.md** (simple - NO AreaProjects embed)
```yaml
---
title:
type: life-area
status: active
description:
---

I'm doing well in this area if...

-
```

**Trip Project.md** (S1-compliant project template)
```yaml
---
title:
status: planning
area:
description:
start-date:
end-date:
---

## Dates & Itinerary



## Transport



## Accommodation



## Planning Checklist

- [ ] Confirm dates
- [ ] Book transport
- [ ] Book accommodation
- [ ] Check passport/visas

## Kit List

- [ ] Passport

## Notes

```

**Tasks:**
- [ ] Create `templates/Task.md`
- [ ] Create `templates/Project.md`
- [ ] Create `templates/Area.md`
- [ ] Create `templates/Trip Project.md`

---

### Phase 3: Bases

Adapt from personal vault bases. Use simple folder paths (`tasks`, `projects`, `areas`). Filter out Overview.md files with `file.name != "Overview"`.

**Tasks.base** - Views:
1. All Tasks
2. Active (not done/dropped/icebox, respects defer-until)
3. Inbox
4. Ready
5. In Progress
6. Blocked
7. Overdue (due < today, not completed)

**Projects.base** - Views:
1. All Projects
2. Active (in-progress, planning, ready)
3. On Hold (paused, blocked)

**Areas.base** - Views:
1. All Areas
2. Active (not archived)

**AreaProjects.base** - For embedding in area docs:
- Filter: `note.area.contains(this.file.name)` and status is active
- Single view showing that area's projects

**Tasks:**
- [ ] Create `templates/bases/Tasks.base`
- [ ] Create `templates/bases/Projects.base`
- [ ] Create `templates/bases/Areas.base`
- [ ] Create `templates/bases/AreaProjects.base`

---

### Phase 4: Example Area

**One area only:** `areas/Side Projects.md`

```yaml
---
title: Side Projects
type: life-area
status: active
description: Personal coding and creative projects.
---
```

Body includes:
- Brief description
- "I'm doing well if..." section
- **Embedded AreaProjects base** (demonstrates the feature, even though template doesn't include it)
- "Potential Future Projects" section

**Tasks:**
- [ ] Create `areas/Side Projects.md` with AreaProjects embed

---

### Phase 5: Example Projects

Three projects total:
- 2 belong to Side Projects area
- 1 standalone (no area)
- Statuses: 2 in-progress, 1 paused
- **No** planning or done projects

**Website Redesign** (`projects/Website Redesign.md`)
- status: **in-progress**
- area: `"[[Side Projects]]"`
- Has Overview, Next Steps sections
- Will have 2 tasks

**Learn Rust** (`projects/Learn Rust.md`)
- status: **paused**
- area: `"[[Side Projects]]"`
- Brief body explaining why paused
- Will have 1 task

**Japan Trip 2025** (`projects/Japan Trip 2025.md`)
- status: **in-progress**
- area: (none - standalone)
- Uses Trip Project template style
- Will have 2 tasks

**Tasks:**
- [ ] Create `projects/Website Redesign.md`
- [ ] Create `projects/Learn Rust.md`
- [ ] Create `projects/Japan Trip 2025.md`

---

### Phase 6: Example Tasks

**Minimal set: 7 active + 1 archived = 8 total**

Every project has at least one task. Two projects have 2 tasks. Cover key statuses and date fields.

| Task | Status | Project/Area | Dates |
|------|--------|--------------|-------|
| `update-homepage.md` | in-progress | Website Redesign | due: soon |
| `fix-mobile-nav.md` | ready | Website Redesign | — |
| `read-rust-chapter.md` | ready | Learn Rust | — |
| `book-flights.md` | blocked | Japan Trip 2025 | — |
| `research-ryokans.md` | ready | Japan Trip 2025 | defer-until: future |
| `backup-laptop.md` | ready | area: Side Projects | scheduled: soon |
| `random-idea.md` | inbox | — | — |
| `archive/setup-dev-env.md` | done | — | completed-at |

**Statuses covered:** inbox, ready (×4), in-progress, blocked, done
**Not covered:** icebox, dropped (acceptable - these are less common)

**Date fields covered:**
- due (update-homepage)
- scheduled (backup-laptop)
- defer-until (research-ryokans)
- completed-at (archived task)

**Tasks:**
- [ ] Create 7 active task files
- [ ] Create 1 archived task file (keeps archive/ in git)

---

### Phase 7: Overview Pages

Each main directory gets an Overview.md with embedded bases.

**tasks/Overview.md**
- Brief intro: "Your tasks live here..."
- Embed: `![[Tasks.base]]` (shows default view)

**projects/Overview.md**
- Brief intro
- Embed: `![[Projects.base]]`

**areas/Overview.md**
- Brief intro
- Embed: `![[Areas.base]]`

**Tasks:**
- [ ] Create `tasks/Overview.md`
- [ ] Create `projects/Overview.md`
- [ ] Create `areas/Overview.md`

---

### Phase 8: Demo Notes

Two notes in root demonstrating features.

**example-note.md**
Simplified version of demo-vault's test document:
- Shows task links as widgets (list items)
- Shows inline task links
- Shows links to projects/areas (render normally)
- Brief explanation of what's happening

**getting-started.md**
Welcome/orientation page:
- What this vault is
- Links to the three Overview pages
- Pointer to README for setup details
- Link to taskdn docs site

**Tasks:**
- [ ] Create `example-note.md`
- [ ] Create `getting-started.md`

---

### Phase 9: Documentation

**README.md**
1. What this is (one paragraph)
2. Installation:
   - Clone repo
   - `rm -rf .git README.md`
   - Open in Obsidian, trust vault
   - Enable core plugins: Bases, Templates
   - Ensure Wikilinks enabled
3. Vault structure (brief)
4. Plugin configuration:
   - obsidian-taskdn: set tasks dir to `tasks`, exclude `Overview.md`
   - (optional) Folder Notes: set folder note name to `Overview.md`
5. Creating new items (use templates)
6. Links to docs: CLI, desktop app, full documentation

**CLAUDE.md**
Barebones instructions:
- This is a taskdn vault
- Link to spec/docs
- Directory structure
- Don't modify Overview.md files
- Point to `tdn` CLI for task operations

**Tasks:**
- [ ] Create `README.md`
- [ ] Create `CLAUDE.md`

---

### Phase 10: Last Bits

- [ ] Test in Obsidian
- [ ] Create WebClipper Template and add to relevant page in docs site and to README.md
- [ ] Move to own repo
- [ ] Update top-level taskdn README table to show this as a seperate project with done status.
- [ ] Update starter-vault with screenshot and instructions. ensure that what's in there matches what's in the repository. Also update setup-guide appropriately.

#### WebClipper Template 

Below is a webclipper template JSON thing for a kind of default note that I've just exported from my webclipper. We just need to change the fields to match those of a new task, injecting any data which we think is important into it, and setting the relevant fields automatically, Either based on data that's been pulled out of the web thing or just based on standard things. Like the status for this should definitely be inbox. All it needs to do is create tasks. 

{
	"schemaVersion": "0.1.0",
	"name": "Default",
	"behavior": "create",
	"noteContentFormat": "{{content}}",
	"properties": [
		{
			"name": "title",
			"value": "{{title}}",
			"type": "text"
		},
		{
			"name": "source",
			"value": "{{url}}",
			"type": "text"
		},
		{
			"name": "author",
			"value": "{{author|split:\\\", \\\"|wikilink|join}}",
			"type": "multitext"
		},
		{
			"name": "published",
			"value": "{{published}}",
			"type": "date"
		},
		{
			"name": "created",
			"value": "{{date}}",
			"type": "date"
		},
		{
			"name": "description",
			"value": "{{description}}",
			"type": "text"
		},
		{
			"name": "tags",
			"value": "clippings",
			"type": "multitext"
		}
	],
	"triggers": [],
	"noteNameFormat": "{{title}}",
	"path": "tasks"
}```

---

## Technical Notes

### WikiLinks in YAML
All frontmatter links must be quoted:
```yaml
area: "[[Side Projects]]"
projects:
  - "[[Website Redesign]]"
```

### Projects array format
Per S1 spec, `projects` is always an array (even with one element):
```yaml
projects:
  - "[[Project Name]]"
```

### Base file paths
Use simple paths without numbers:
- `file.inFolder("tasks")` not `file.inFolder("7-tasks")`
- `file.name != "Overview"` to exclude overview pages

### AreaProjects filter
The key filter for AreaProjects.base:
```yaml
note.area.contains(this.file.name)
```
This makes it work when embedded in any area file - `this.file.name` resolves to the embedding file's name.

### What's NOT included
- Templater templates (requires extra plugin)
- Web clipper template (user will add separately)
- .obsidian folder (user configures fresh)
- icebox/dropped example tasks (not essential for demo)
