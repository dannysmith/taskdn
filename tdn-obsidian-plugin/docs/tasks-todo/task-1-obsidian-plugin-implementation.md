# Task: Implement Taskdn Obsidian Plugin

## Overview

Build a lightweight Obsidian plugin that:
1. Renders wikilinks to task files as interactive checklist widgets
2. Allows converting regular checklist items into proper Taskdn tasks

This plugin focuses on these two features only - no calendar, time tracking, or other complexity.

---

## Research Findings

### S1 Spec Summary (Task File Format)

Task files are Markdown with YAML frontmatter:

**Required fields:**
- `title` (string)
- `status` (enum: `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`)
- `created-at` (date)
- `updated-at` (date)

**Optional fields:**
- `area` (wikilink to area file)
- `projects` (array with one wikilink)
- `due` (date/datetime)
- `scheduled` (date)
- `defer-until` (date)
- `completed-at` (date/datetime)

**File location:** Tasks must be in a designated `tasks/` directory (configurable).

---

### Obsidian Plugin Architecture

#### Tech Stack
- **Language:** TypeScript
- **Bundler:** esbuild
- **Node.js:** v16+
- **Package Manager:** bun

#### Key Files
```
tdn-obsidian-plugin/
├── main.ts              # Plugin entry point
├── manifest.json        # Plugin metadata
├── package.json         # Dependencies
├── styles.css           # Custom styling
├── esbuild.config.mjs   # Build configuration
├── tsconfig.json        # TypeScript config
└── src/
    ├── decorations/     # Live Preview CM6 extensions
    ├── postprocessors/  # Reading Mode processors
    ├── widgets/         # Custom widget classes
    └── utils/           # Helpers
```

#### Plugin Lifecycle
```typescript
export default class TaskdnPlugin extends Plugin {
  async onload() {
    // Register editor extensions (Live Preview)
    // Register markdown post-processors (Reading Mode)
    // Register context menus and commands
    // Load settings
  }

  async onunload() {
    // Cleanup
  }
}
```

#### Development Setup
- Use `.hotreload` file in plugin directory + "Hot Reload" community plugin for fast iteration
- Plugin builds to vault's `.obsidian/plugins/taskdn/` directory
- Test with `dummy-demo-vault/` (reset via `./scripts/reset-dummy-vault.sh` from repo root)

---

### Two Rendering Modes

Obsidian has two different rendering engines requiring separate implementations:

| Mode | Engine | API | When Used |
|------|--------|-----|-----------|
| **Live Preview** | CodeMirror 6 | `registerEditorExtension()` | Editing with preview |
| **Reading Mode** | HTML/DOM | `registerMarkdownPostProcessor()` | Read-only view |

**Important:** Most users work in Live Preview mode. Both modes need support for good UX.

#### Live Preview (CodeMirror 6)

Uses decorations to replace wikilink syntax with custom widgets:

```typescript
class TaskLinkWidget extends WidgetType {
  constructor(private task: TaskData) { super(); }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('span');
    container.className = 'taskdn-inline-task';
    // Render checkbox, title, project, due date...
    return container;
  }
}

const decoration = Decoration.replace({
  widget: new TaskLinkWidget(taskData),
});
```

**StateField vs ViewPlugin:**
- ViewPlugin is generally preferred for better performance
- StateField needed only if decorations significantly affect vertical space
- For inline task widgets, ViewPlugin should work fine

#### Reading Mode (Post-Processor)

Manipulates rendered DOM after markdown conversion:

```typescript
this.registerMarkdownPostProcessor((element, context) => {
  const links = element.querySelectorAll('a.internal-link');

  links.forEach(link => {
    const linkText = link.getAttribute('data-href');
    if (linkText) {
      // Resolve link to actual file
      const file = this.app.metadataCache.getFirstLinkpathDest(linkText, context.sourcePath);
      if (file && isTaskFile(file.path)) {
        const taskData = getTaskDataFromCache(file);
        const widget = createTaskWidget(taskData, file);
        link.replaceWith(widget);
      }
    }
  });
});
```

**Caching caveat:** Obsidian caches post-processor results. When frontmatter changes, the widget won't auto-update. Solution: update the DOM directly after status toggle (see "Widget Update Strategy" below).

---

### Feature 1: Task Wikilink Rendering

**Visual design:**
```
☐ Task Title                    Project Name    📅 Jan 31
```

**Components:**
1. **Checkbox** - Shows done/not-done state, clickable to toggle
2. **Title** - Click to open task file (v1); inline editing deferred to v2
3. **Project/Area** - Rendered as clickable wikilinks (show whichever is present, or both)
4. **Due date** - Small date indicator (if present)

**Key implementation details:**

```typescript
// Resolving wikilinks to task files
// IMPORTANT: Wikilinks contain just the filename, not the path.
// Must resolve first, then check path.
function resolveAndCheckTaskFile(
  linkText: string,
  sourcePath: string,
  app: App
): TFile | null {
  const file = app.metadataCache.getFirstLinkpathDest(linkText, sourcePath);
  if (file && file.path.startsWith(settings.tasksDirectory)) {
    return file;
  }
  return null;
}

// Reading task metadata from cache (fast, no file read)
function getTaskDataFromCache(file: TFile): TaskData {
  const cache = this.app.metadataCache.getFileCache(file);
  return {
    title: cache?.frontmatter?.title ?? file.basename,
    status: cache?.frontmatter?.status ?? 'inbox',
    due: cache?.frontmatter?.due,
    projects: cache?.frontmatter?.projects,
    area: cache?.frontmatter?.area,
  };
}

// Updating task status
// Toggle between done and ready (simple binary toggle)
// Note: This loses nuance of other statuses (inbox, blocked, etc.)
// but matches checkbox UX expectations.
async function toggleTaskStatus(file: TFile) {
  await this.app.fileManager.processFrontMatter(file, (fm) => {
    const wasDone = fm.status === 'done';
    fm.status = wasDone ? 'ready' : 'done';
    fm['updated-at'] = new Date().toISOString().split('T')[0];

    if (!wasDone) {
      // Completing the task
      fm['completed-at'] = new Date().toISOString().split('T')[0];
    } else {
      // Un-completing - remove completed-at
      delete fm['completed-at'];
    }
  });
}
```

#### Widget Update Strategy

When status is toggled via checkbox click:

1. **Update frontmatter** via `processFrontMatter()` (persists to disk)
2. **Update DOM directly** - modify the widget element immediately (checkbox state, any visual indicators)
3. **Don't rely on post-processor re-run** - Obsidian caches results, won't automatically refresh

For Live Preview: CM6 decorations rebuild on document changes, so this should work naturally.

For Reading Mode: Need to manually update the DOM element after frontmatter change.

```typescript
// After processFrontMatter succeeds:
checkboxEl.checked = newStatus === 'done';
widgetEl.dataset.status = newStatus;
// Update any other visual elements...
```

---

### Feature 2: Checklist-to-Task Conversion

**Approach:** Context menu (right-click / long-press on mobile) + command palette command

```typescript
// Context menu
this.registerEvent(
  this.app.workspace.on('editor-menu', (menu, editor, view) => {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    if (isChecklistLine(line)) {
      menu.addItem((item) => {
        item.setTitle('Convert to Taskdn task')
          .setIcon('check-square')
          .onClick(() => this.convertChecklistToTask(editor, cursor));
      });
    }
  })
);

// Command palette (for keyboard users and mobile)
this.addCommand({
  id: 'convert-checklist-to-task',
  name: 'Convert checklist item to Taskdn task',
  editorCheckCallback: (checking, editor, view) => {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    if (!isChecklistLine(line)) return false;
    if (checking) return true;

    this.convertChecklistToTask(editor, cursor);
    return true;
  }
});
```

**Conversion logic:**
```typescript
async function convertChecklistToTask(editor: Editor, cursor: EditorPosition) {
  const line = editor.getLine(cursor.line);
  const { text: taskText, checked } = extractChecklistInfo(line);

  // Generate safe filename, handle collisions
  const filename = await generateUniqueFilename(taskText, settings.tasksDirectory);

  const taskContent = `---
title: ${taskText}
status: ${checked ? 'done' : 'inbox'}
created-at: ${today()}
updated-at: ${today()}${checked ? `\ncompleted-at: ${today()}` : ''}
---
`;

  await this.app.vault.create(
    `${settings.tasksDirectory}/${filename}`,
    taskContent
  );

  // Replace checklist with wikilink, preserving list structure
  const indent = line.match(/^(\s*)/)?.[1] ?? '';
  const listMarker = line.match(/^[\s]*(-|\*|\d+\.)\s/)?.[1] ?? '-';
  editor.setLine(cursor.line, `${indent}${listMarker} [[${taskText}]]`);
}

// Handle filename collisions
async function generateUniqueFilename(text: string, dir: string): Promise<string> {
  const base = sanitizeFilename(text);
  let filename = `${base}.md`;
  let counter = 1;

  while (await this.app.vault.adapter.exists(`${dir}/${filename}`)) {
    filename = `${base}-${counter}.md`;
    counter++;
  }

  return filename;
}

// Extract info from checklist line
function extractChecklistInfo(line: string): { text: string; checked: boolean } {
  const match = line.match(/^[\s]*[-*]?\s*\[([ xX])\]\s*(.+)$/);
  if (!match) return { text: '', checked: false };
  return {
    text: match[2].trim(),
    checked: match[1].toLowerCase() === 'x'
  };
}
```

**Edge cases handled:**
- **Filename collisions**: Append `-1`, `-2`, etc.
- **Checked items** (`- [x]`): Convert with `status: done` and `completed-at`
- **List structure**: Preserve indentation and list marker, replace only checkbox portion

---

### Potential Challenges

#### 1. Wikilink Resolution
**Problem:** Wikilinks contain just filenames, not paths. Need to resolve before checking if task.

**Solution:** Always use `metadataCache.getFirstLinkpathDest()` to resolve link to TFile, then check `file.path`. If file doesn't exist (broken link), resolution returns null - just skip (renders as normal unresolved wikilink).

#### 2. Live Preview Cursor Handling
**Problem:** When cursor is inside a wikilink, CodeMirror shows raw syntax.

**Solution:** Only apply decorations when cursor is NOT inside the link. Check cursor position in ViewPlugin update method.

#### 3. Post-Processor Caching
**Problem:** Obsidian caches post-processor output. Widget won't auto-update when task changes.

**Solution:** Update DOM directly after status changes. Don't rely on post-processor re-running.

#### 4. Inline Title Editing
**Problem:** Allowing title edits without opening the file adds significant complexity.

**Solution (v1):** Click opens the task file. Inline editing deferred to v2.

#### 5. Keeping Widget in Sync (External Changes)
**Problem:** If task file is edited elsewhere (another pane, external editor), widget needs to update.

**Solution:** Listen to metadataCache changes and trigger re-render:
```typescript
this.registerEvent(
  this.app.metadataCache.on('changed', (file) => {
    if (isTaskFile(file.path)) {
      // For Live Preview: decorations will rebuild on next update
      // For Reading Mode: may need to find and update DOM elements
      this.refreshTaskWidgets(file);
    }
  })
);
```

---

### Reference Plugins

- **[TaskNotes](https://github.com/callumalpass/tasknotes)** - Full-featured task management. Uses `TaskLinkOverlay.ts` for Live Preview, `ReadingModeTaskLinkProcessor.ts` for Reading Mode. Much more complex than needed.

- **[obsidian-tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)** - Task queries and checkbox handling. Good reference for checkbox toggle patterns.

- **[obsidian-cm6-attributes](https://github.com/nothingislost/obsidian-cm6-attributes)** - Reference implementation for CM6 ViewPlugin with decorations.

---

### Key Resources

**Official:**
- [Obsidian Developer Docs](https://docs.obsidian.md/Home)
- [Sample Plugin Template](https://github.com/obsidianmd/obsidian-sample-plugin)

**Community:**
- [Marcus Olsson's Plugin Docs - Decorations](https://marcusolsson.github.io/obsidian-plugin-docs/editor/extensions/decorations)
- [CodeMirror 6 System Guide](https://codemirror.net/docs/guide/)

---

## Implementation Plan

### Phase 1: Foundation

1. **Set up project structure**
   - Clone/adapt obsidian-sample-plugin template
   - Configure esbuild, TypeScript, bun
   - Create manifest.json with plugin metadata
   - Set up `.hotreload` for development

2. **Implement core utilities**
   - Wikilink resolution helper (using `getFirstLinkpathDest`)
   - Task file detection (path-based check after resolution)
   - Frontmatter reading helpers using metadataCache
   - Frontmatter writing helpers using processFrontMatter
   - Date formatting utilities
   - Filename sanitization and collision handling

3. **Create settings infrastructure**
   - Settings interface (tasks directory path)
   - Settings tab UI
   - Settings persistence

### Phase 2: Shared Widget Component

4. **Create task widget renderer**
   - Shared function that creates widget DOM structure
   - HTML structure: checkbox + title + project/area + due date
   - CSS styling to match Obsidian's look
   - Dark/light theme support

5. **Implement widget interactions**
   - Checkbox click → toggleTaskStatus() → update DOM directly
   - Title click → open task file
   - Project/area clicks → navigate to those files

### Phase 3: Live Preview (Priority)

6. **Create CM6 ViewPlugin**
   - Set up ViewPlugin structure
   - Parse visible ranges for wikilinks using syntax tree
   - Resolve links, check if task files

7. **Create TaskLinkWidget (WidgetType)**
   - Extend WidgetType class
   - Implement toDOM() using shared widget renderer
   - Handle widget events

8. **Implement decorations**
   - Create Decoration.replace() for each task link
   - Build DecorationSet from decorations
   - Handle cursor-in-link case (show raw syntax when editing)

9. **Handle updates**
   - Re-build decorations on document changes
   - Re-build on viewport changes
   - Listen for task file metadata changes

### Phase 4: Reading Mode

10. **Implement post-processor**
    - Register markdown post-processor
    - Find all internal links in rendered content
    - Resolve and check if task files
    - Replace with widget using shared renderer

11. **Handle Reading Mode updates**
    - Direct DOM manipulation after status toggle
    - Listen for metadata changes, update affected widgets

### Phase 5: Checklist Conversion

12. **Add context menu and command**
    - Register editor-menu event for context menu
    - Add command for command palette
    - Detect checklist lines

13. **Implement conversion logic**
    - Extract text and checked state from checklist
    - Generate unique filename (handle collisions)
    - Create task file with appropriate frontmatter
    - Replace checklist line, preserving list structure

### Phase 6: Polish

14. **Refine styling**
    - Match Obsidian's native checkbox styling
    - Responsive layout for narrow panes
    - Ensure theme compatibility

15. **Add settings options**
    - Tasks directory path (required)
    - Default status for new tasks (optional)

16. **Testing**
    - Test with demo-vault (use dummy-demo-vault from repo root)
    - Handle missing/malformed frontmatter gracefully
    - Test both rendering modes
    - Test on mobile if possible

---

## V1 Scope

V1 includes both rendering modes since Live Preview is essential for good UX:

1. **Live Preview + Reading Mode** - Both modes supported
2. **Context menu + command** for conversion - Accessible on desktop and mobile
3. **Click-to-open** - Inline title editing deferred to v2
4. **Simple status toggle** - done ↔ ready (checkbox semantics)
5. **Basic styling** - Functional, matches Obsidian, theme-aware

---

## Testing Strategy

Use `dummy-demo-vault/` for testing. Reset from repo root with:
```bash
./scripts/reset-dummy-vault.sh
```

**Test cases:**
- Wikilink to task in `tasks/` directory renders as widget
- Wikilink to non-task file renders normally
- Wikilink to non-existent file renders as normal (unresolved) wikilink
- Checkbox click toggles status and updates file
- Checkbox click updates widget immediately (no mode switch needed)
- Title click opens task file
- Project/area links navigate correctly
- Context menu appears on checklist items (desktop)
- Command works from command palette (desktop + mobile)
- Conversion creates valid task file
- Conversion handles filename collisions
- Conversion handles checked items (`- [x]`)
- Conversion preserves list structure
- Widget updates when task file changes externally
- Works in both Live Preview and Reading Mode
