# Task: Markdown Editor Improvements

## Overview

Improve the Markdown editor in the right panel with better styling and a source view toggle.

## Current State

- Editor uses Milkdown v7.18.0 (built on ProseMirror + remark)
- Has custom checkboxes styled to match app design
- Has URL-over-selection linking feature
- Located in `src/components/tasks/milkdown-editor.tsx`
- Styling in `src/App.css` (lines 65-282)

## Goals

1. Improve live preview typography/spacing
2. Add toggle between "live preview" and "source view" modes

---

## Phase 1: Improve Live Preview Styling

**Deliverable:** Editor content has better visual spacing and typography, closer to GitHub markdown rendering.

### Background

Current CSS uses `margin: 0` on all elements for a compact look. This makes content feel cramped. GitHub markdown CSS provides good reference values.

### Tasks

- [x] Add spacing above headings (`margin-top: 1.25em` for h1-h3)
- [x] Add spacing below headings (`margin-bottom: 0.5em`)
- [x] Ensure first heading has no top margin
- [x] Add subtle spacing between paragraphs (`margin-bottom: 0.5em`)
- [x] Add spacing between consecutive list items (`margin-top: 0.25em` on `li + li`)
- [x] Consider adding `line-height: 1.6` for better readability
- [x] Added spacing for code blocks, blockquotes, and hr
- [ ] Test with various content types (headers, lists, code blocks, mixed content)
- [ ] Ensure spacing feels right for a note-taking context (not too loose)

### Reference Values (GitHub Markdown CSS)

```css
/* Headings */
margin-top: 1.5rem; /* 24px */
margin-bottom: 1rem; /* 16px */
line-height: 1.25;

/* Paragraphs */
margin-bottom: 10px;

/* List items (li + li) */
margin-top: 0.25em;
```

Note: We may want tighter spacing than GitHub since this is a note-taking context, not documentation.

---

## Phase 2: Source View Toggle

**Deliverable:** User can toggle between WYSIWYG "preview" and raw "source" modes via a unified MarkdownEditor component.

### Background

Users sometimes want to see/edit raw markdown directly. This phase adds a toggle and creates a reusable component that wraps both editing modes.

### Component Architecture

```
MarkdownEditor (new unified component)
├── ViewToggle (button group: Preview | Source)
├── MilkdownEditor (existing, for preview mode - WYSIWYG)
└── MarkdownSourceTextarea (new, for source mode - raw markdown)

MilkdownPreview (unchanged, separate concern - read-only rendering)
```

**Note:** `MilkdownPreview` remains a separate component for read-only markdown rendering (used in `CollapsibleNotesSection`). It's not part of this editing component.

### Tasks

#### 2.1 Create MarkdownSourceTextarea Component

- [ ] Create `src/components/ui/markdown-source-textarea.tsx`
- [ ] Style with monospace font (`ui-monospace, monospace`)
- [ ] Match editor padding and sizing from Milkdown editor
- [ ] Handle controlled value/onChange
- [ ] Good line-height for readability (1.5 or 1.6)
- [ ] Subtle styling (consider muted background to differentiate from preview)
- [ ] Full height, resize: none, proper overflow handling

#### 2.2 Create Unified MarkdownEditor Component

- [ ] Create `src/components/ui/markdown-editor.tsx`
- [ ] Implement props interface (see below)
- [ ] Internal state for current view mode (uncontrolled)
- [ ] Render toggle (conditionally based on `showToggle`)
- [ ] Render MilkdownEditor or MarkdownSourceTextarea based on mode
- [ ] Sync content between views when toggling:
  - Preview → Source: content already in state, just switch view
  - Source → Preview: remount Milkdown with current content
- [ ] Handle `editorKey` changes (reset to defaultValue)

#### 2.3 Create ViewToggle Component

- [ ] Inline in MarkdownEditor or separate small component
- [ ] Use shadcn ToggleGroup or button group pattern
- [ ] Labels: "Preview" / "Source" (keep it simple)
- [ ] Position: top-right corner of editor, subtle styling
- [ ] Small size, doesn't distract from content

#### 2.4 Create Lazy Wrapper

- [ ] Create `src/components/ui/lazy-markdown-editor.tsx`
- [ ] Code-split the unified component (React.lazy)
- [ ] Wrap in error boundary (reuse existing pattern)
- [ ] Suspense fallback with skeleton

#### 2.5 Integration

- [ ] Update `task-detail-panel.tsx` to use `LazyMarkdownEditor`
- [ ] Test editing in both modes, toggling back and forth
- [ ] Test with various content (checkboxes, links, code blocks, nested lists)
- [ ] Verify custom features work in preview mode (URL linking, checkbox shortcut)

### Component Props Interface

```typescript
interface MarkdownEditorProps {
  /** Unique key to reset editor (e.g., task ID) - remounts on change */
  editorKey: string

  /** Initial markdown content */
  defaultValue: string

  /** Called when content changes (fires in both modes) */
  onChange: (value: string) => void

  /** Initial view mode (default: 'preview') */
  defaultMode?: 'preview' | 'source'

  /** Show the view toggle? (default: true) */
  showToggle?: boolean

  /** Placeholder text when empty */
  placeholder?: string

  className?: string
}
```

### Example Usage

**Standard usage (task detail panel):**

```tsx
<LazyMarkdownEditor
  editorKey={task.id}
  defaultValue={task.body ?? ''}
  onChange={handleBodyChange}
  className="h-full"
/>
// Toggle visible, defaults to preview mode
```

**User prefers source mode by default:**

```tsx
<LazyMarkdownEditor
  editorKey={task.id}
  defaultValue={task.body ?? ''}
  onChange={handleBodyChange}
  defaultMode="source"
/>
```

**Source-only mode (no toggle):**

```tsx
<LazyMarkdownEditor
  editorKey="quick-capture"
  defaultValue=""
  onChange={setDraftContent}
  defaultMode="source"
  showToggle={false}
  placeholder="Type markdown here..."
/>
```

**Preview-only mode (no toggle, WYSIWYG only):**

```tsx
<LazyMarkdownEditor
  editorKey={task.id}
  defaultValue={task.body ?? ''}
  onChange={handleBodyChange}
  showToggle={false}
/>
```

---

## Future Enhancements (Out of Scope)

- Syntax highlighting in source view (would require CodeMirror, ~150KB bundle)
- Split view (side-by-side preview and source)
- Vim keybindings in source mode
- Custom markdown extensions

---

## Technical Notes

### Content Management Strategy

The unified `MarkdownEditor` maintains content in a single `useState`:

1. **On mount:** Initialize state from `defaultValue`
2. **In preview mode:** Milkdown's `onChange` updates state
3. **In source mode:** Textarea's `onChange` updates state
4. **On toggle:** State is already current, just switch which component renders
5. **Preview → Source:** Instant (state already has markdown)
6. **Source → Preview:** Remount Milkdown with current state as `defaultValue`

The key insight: we always keep markdown string in React state. Milkdown is just a view into that state.

### Milkdown Remounting

Milkdown doesn't support controlled `value` updates - it only reads `defaultValue` on mount. When switching from source to preview, we change the Milkdown `key` to force remount:

```typescript
// Internal to MarkdownEditor
const [milkdownKey, setMilkdownKey] = useState(0)

// When switching to preview mode:
setMilkdownKey(k => k + 1)
```

### Bundle Impact

- No new dependencies (Phase 1 is CSS only, Phase 2 uses native textarea)

---

## References

- [Milkdown Documentation](https://milkdown.dev/)
- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css)
- [ProseMirror Markdown Example](https://prosemirror.net/examples/markdown/)
