# Task X: CLI Human Output Polish

Improve the visual presentation of human-mode CLI output for better readability and hierarchy.

## Context

The human formatter (`src/output/human.ts`) currently produces functional but visually flat output. This task adds visual polish while keeping things simple and terminal-friendly.

**Affected commands:** `show`, `list`, `context`

## Requirements

### 1. Entity Headers (Detail Views)

Use boxed headers for primary entities in `show` and `context` commands.

```
┌─────────────────────────────────────────────────────────────┐
│  Work                                             work.md active │
└─────────────────────────────────────────────────────────────┘
```

- Sharp corners (not rounded)
- Title bold on left, status colored on right
- Filename (not full path) on line below, dimmed
- Whitespace above the box for breathing room

Use **boxen** library with `borderStyle: 'single'`.

### 2. Task Status Checkboxes

Render task status as checkbox symbols:

| Status      | Symbol | Color                            |
| ----------- | ------ | -------------------------------- |
| done        | `[✓]`  | dim, with strikethrough on title |
| dropped     | `[✗]`  | dim, with strikethrough on title |
| in-progress | `[▸]`  | yellow                           |
| ready       | `[ ]`  | default                          |
| blocked     | `[!]`  | red                              |
| inbox       | `[?]`  | blue                             |
| icebox      | `[❄]`  | dim                              |

Apply in: list views, context views, show headers.

### 3. Section Separators

Use light horizontal rules between major sections:

```
───────────────────────────────────────────────────────────────

Projects (4)
```

- Single thin line (`─`), not heavy (`━`)
- Blank line above and below
- Section headers bold with count in parentheses

### 4. Date Formatting

- **List views:** Short format (`Jan 20`, `Feb 01`)
- **Detail views:** Full human format (`20 January 2025`)
- Prefix with `due` in lists, label with `Due:` in detail

### 5. Path Display

- Show **filename only** (e.g., `work.md`, `full-metadata.md`)
- Dimmed color
- In detail views: in header
- In list views: omit entirely (too cluttered)

### 6. Metadata Display (Detail Views)

Clean key-value pairs with consistent formatting:

```
  Project: Test Project
  Area: Work
  Due: January 20, 2025
  Scheduled: January 15, 2025
```

- Labels in default color, values in appropriate color (cyan for references)
- Two-space indent from left edge
- Only show fields that have values

### 7. Markdown Body Rendering

Use **marked-terminal** to syntax-highlight markdown bodies:

- Headers: bold
- Bold/italic: preserve emphasis
- Code spans: colored (cyan)
- Lists: properly indented bullets
- Links: show as `text (url)` or just text
- Blockquotes: dimmed/italic

Configure colors to match existing ansis palette.

### 8. Warnings

Use clack's `log.warn()` for validation warnings:

```
▲  Project "Test Project" has no due date
```

This provides visual consistency with future interactive prompts.

### 9. List Grouping

Group items by status with status as section header:

```
  In Progress
  [▸] Full Metadata Task              Work/Test Project   due Jan 20
  [▸] Another Active Task             Work                due Jan 22

  Ready
  [ ] Direct Work Task                Work                due Feb 01
```

- Status header bold, no symbol
- Consistent column alignment within groups
- Context shown as `Area` or `Area/Project` (no labels)

### 10. Context Views (Hierarchical)

For `context area` and `context project`, show nested structure with simple indentation:

```
Projects (4)

  Test Project                                      in-progress
  test-project.md                                       2 tasks

    [▸] Full Metadata Task            in-progress   due Jan 20
    [▸] Test Project Task             in-progress   due Jan 25

  Another Project                                          done
  another.md                                            0 tasks
```

- Projects at 2-space indent and are bold
- Tasks at 4-space indent under their project
- Project shows task count aligned right
- No complex brackets or box-drawing for nested items

## Dependencies

Add to package.json:

```json
{
  "boxen": "^8.0.0",
  "marked": "^15.0.0",
  "marked-terminal": "^7.0.0"
}
```

## Implementation Notes

### Approach

1. **Add dependencies** - Install boxen, marked, marked-terminal
2. **Create formatting helpers** in `src/output/human.ts`:
   - `formatHeader(title, status, filename)` - boxen wrapper
   - `formatTaskCheckbox(status)` - returns symbol string
   - `formatDate(date, short?)` - date formatting
   - `formatSeparator()` - horizontal rule
   - `renderMarkdownBody(body)` - marked-terminal wrapper
3. **Update existing formatters** to use new helpers
4. **Configure marked-terminal** colors to match ansis palette
5. **Replace warning output** with clack's `log.warn()`

### Files to Modify

- `src/output/human.ts` - main changes
- `package.json` - new dependencies

### Testing

- Run existing E2E tests to ensure no regressions
- Manual testing with `dummy-demo-vault/` for visual review
- Test in different terminal widths

### Consistency Considerations

- Apply same patterns across `show`, `list`, `context` commands
- Ensure checkbox symbols render correctly in common terminals
- Verify colors work with light and dark terminal themes

## Out of Scope

- AI and JSON formatters (already work well)
- Interactive prompts (future work)
- Clickable terminal links
- Dynamic terminal width detection (can add later)

## Success Criteria

- Visually distinct hierarchy between entities
- Task status immediately recognizable via checkbox
- Markdown bodies readable with syntax highlighting
- Clean, professional appearance without being over-designed
- Works correctly in standard terminal emulators
