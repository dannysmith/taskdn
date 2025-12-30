# Obsidian Integration

> **When does this apply?**
> Only when the tdn vault directories (`tasksDir`, `projectsDir`, `areasDir`) are located inside an Obsidian vault. If the user's tdn files are standalone markdown outside Obsidian, this document is irrelevant.

## Detecting an Obsidian Vault

Signs you're working inside an Obsidian vault:
- A `.obsidian/` folder exists in the vault root
- User mentions Obsidian, or their paths suggest it (e.g., `~/notes/`, `~/vault/`)
- Files contain `[[wikilinks]]` or Obsidian-specific syntax

When in doubt, ask the user.

## Wikilinks

Obsidian's core feature is `[[wikilinks]]` — internal links between notes:

```markdown
See [[Project Alpha]] for details.
Related to [[Health]] area.
```

- Links create bidirectional connections (backlinks)
- Links to non-existent notes are valid — they become "breadcrumbs for future"
- When creating tdn files, consider adding relevant wikilinks to connect tasks/projects/areas

## Bases (Data Display)

Obsidian Bases (v1.9.0+) are `.base` files that display and filter vault data — like a native database view.

**Location:** Usually `Templates/Bases/` or similar

**Embedding:** Use `![[BaseName.base]]` or `![[BaseName.base#ViewName]]` to embed a base view in any note.

**Common bases:**
- `Projects.base`, `Areas.base` — Overview of projects/areas
- `Inbox.base` — Unprocessed items
- Category-specific bases (People, Books, etc.)

**When relevant:** If the user wants dashboards, filtered views, or data tables of their tdn items, suggest creating or updating a base rather than using DataView queries.

## Templates

Obsidian templates provide consistent structure for new notes.

**Location:** Usually `/Templates` folder

**Usage:** Templates can auto-apply when creating notes via Calendar or other plugins.

**Syntax:**
- Core templates: `{{date}}`, `{{title}}`
- Templater plugin: `<% tp.date.now("YYYY-MM-DD") %>`, `<% tp.file.title %>`

**For tdn:** The CLI handles file creation with proper frontmatter. Templates are more relevant for non-tdn notes in the same vault.

## Frontmatter Link Syntax

**CRITICAL:** Links inside YAML frontmatter MUST be quoted:

```yaml
# Correct
area: "[[Work]]"
categories: ["[[People]]", "[[Clients]]"]

# Wrong - breaks YAML parsing
area: [[Work]]
categories: [[[People]]]
```

The tdn CLI handles this correctly, but be careful when editing frontmatter directly.

## Folder Notes

The Folder Notes plugin creates index notes with the same name as their folder:
- `tasks/tasks.md` — Index for tasks folder
- `projects/projects.md` — Index for projects folder

These notes are hidden in Obsidian's file browser (merged with folder icon) but exist on disk. They often contain embedded bases or folder overviews.

**Implication:** When listing or querying files, these index notes may appear. Base views typically filter them out.

## Tags

Tags (`#tagname`) categorize content across the vault:
- Can be nested: `#work/meetings`
- Often appear in frontmatter: `tags: [work, urgent]`
- Searchable and queryable

Tags complement the tdn hierarchy — use them for cross-cutting concerns that span multiple areas/projects.

## Sync Awareness

Obsidian vaults often sync across devices via Obsidian Sync or other methods. Changes made locally will propagate. This is usually transparent, but:
- Avoid creating/deleting many files rapidly (sync conflicts)
- Large batch operations should be done carefully
