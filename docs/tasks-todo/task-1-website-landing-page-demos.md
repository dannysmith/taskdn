# Task: Website Landing Page Demos

Working Dir: `website/`

Read First: `website/src/content/docs/getting-started.mdx` and other docs in `website/src/content/docs/` as needed.

---

# Requirements

## Overview

Redesign "The Suite" section of the landing page (`/website/src/pages/index.astro`). Replace the current 2x2 grid with four full-width product sections, each featuring an animated demo.

Keep everything above "The Suite" unchanged (hero, file example, hierarchy visualization).

## Layout & Styling

**Section structure:** Each product gets a full-width section with two columns—text (title, description, features, CTA) and demo.

**Ordering and alternation:**
1. Desktop App — demo on right
2. CLI — demo on left
3. Obsidian Plugin — demo on right
4. Claude Code — demo on left

**Responsive:** On mobile, stack vertically with text above demo.

**Visual styling:**
- Flexoki colors throughout (not a separate terminal dark theme)
- Terminal/editor chrome (title bar, traffic lights) uses site colors
- Syntax highlighting uses site palette
- Background illustrations optional—very faded if included

**Animation timing:**
- 5-6 seconds per scene before transitioning
- Typing animations feel natural, not slow
- All demos auto-loop

## Out of Scope

- Actual video/GIF files
- Backend integration
- Mobile-specific demo variants

---

## Product Sections

### Desktop App

**Title:** Desktop App
**Icon:** 🖥️
**Badge:** "Coming Soon"

**Description:**
A task app that actually feels good to use—fast, keyboard-driven, thoughtfully designed—but your files stay on disk as markdown. No lock-in. No wondering what happens when the company gets acquired.

**Features:**
- Global shortcut captures tasks without breaking your flow
- Today, Inbox, This Week views work out of the box—no configuration
- Keyboard-first for people who find clicking slow
- Lists, Kanban, or calendar—whatever fits how you're thinking

**CTA:** "Learn More" → `/desktop/overview`

**Demo:** Simple placeholder with "Coming Soon" text.

---

### CLI

**Title:** Command Line Interface
**Icon:** ⌨️

**Description:**
Two modes for two audiences. For you: pretty output, fuzzy search, natural language dates. For AI agents: structured markdown designed for context windows—token-efficient, still useful if truncated.

**Features:**
- See what's overdue, due today, and in progress—one command
- Give AI full context in a single call: project, tasks, timeline, relationships
- Search the way you'd say it, not how files are named
- "Next Friday" instead of ISO dates

**CTA:** "Get Started" → `/cli/overview`

**Demo:** Terminal cycling through three scenes.

**Scene 1 — `tdn today`:**
```
$ tdn today

TODAY — Wed Jan 15

⚠️  OVERDUE (2)
   Fix critical security issue        Q1 Planning    due Jan 10
   Submit expense report              Work           due Jan 12

📅  DUE TODAY (2)
   Review PR #847                     Q1 Planning
   Call insurance company             Personal

▶️  IN PROGRESS (3)
   Fix authentication bug             Q1 Planning
   Document API v2 endpoints          Q1 Planning
   Get contractor quotes              Home Renovation
```

**Scene 2 — `tdn context --ai`:**
```
$ tdn context --ai

3 areas · 8 projects · 34 tasks · ⚠️ 2 overdue · 📅 3 due today

📁 Work
├── 🔵 Q1 Planning [in-progress] — 8 tasks
│   ├── ▶️ Fix authentication bug
│   └── ▶️ Document API v2 endpoints
├── 🟢 Client Onboarding [ready] — 4 tasks
└── 📋 Direct: 4 tasks

📁 Personal
├── 🔵 Home Renovation [in-progress] — 6 tasks
│   └── ▶️ Get contractor quotes
└── 📋 Direct: 3 tasks
```

**Scene 3 — `tdn new`:**
```
$ tdn new "Review quarterly report" --due friday --project "Q1 Planning"

✓ Created task: Review quarterly report
  → due: Fri Jan 17
  → project: Q1 Planning
  → status: inbox
  → path: tasks/review-quarterly-report.md
```

---

### Obsidian Plugin

**Title:** Obsidian Plugin
**Icon:** 💎

**Description:**
You're in Obsidian to write, not manage tasks. Link to a task and see its status, project, and due date right there. Check it off without opening another file.

**Features:**
- Task links become widgets showing what you need to know
- One click to mark done—no context switch
- Colors tell you what's blocked or overdue at a glance
- Turn any checklist item into a proper task when it grows up

**CTA:** "Install Plugin" → `/obsidian/plugin`

**Demo:** Editor window with two phases, looping.

**Phase 1 — Typing (2-3 seconds):**
```
- [ ] Buy Milk
- [[Finish Q1 Planning Doc]]
```

**Phase 2 — Rendered view (5-6 seconds):**
- First line: Checkbox (unchecked) with "Buy Milk"
- Second line: Task widget showing:
  - Checkbox (unchecked)
  - Title: "Finish Q1 Planning Doc"
  - Status: "in-progress" (yellow/amber indicator)
  - Project: "Q1 Planning"
  - Due: "Jan 15"

Instant cut between phases, then loop.

---

### Claude Code

**Title:** Claude Code
**Icon:** 🤖

**Description:**
Claude can already read your markdown files. This teaches it how your system works—so "What's overdue?" gets a real answer, not a frontmatter tutorial.

**Features:**
- Ask naturally: "What should I focus on today?"
- Create tasks mid-conversation without opening another app
- Help with the tedious parts—inbox processing, weekly reviews
- Works from any project directory, not just your vault

**CTA:** "Set Up Claude" → `/claude-code/overview`

**Demo:** Terminal-style conversation, single Q&A looping.

**Scene 1 — User question (typing):**
```
> What's next on Q1 Planning? Anything urgent?
```

**Scene 2 — Processing (~2 seconds):**
- Spinner or pulsing indicator
- Muted text: `✓ tdn context project "Q1 Planning" --ai`

**Scene 3 — Response (streams in, 5-6 seconds):**
```
Looking at Q1 Planning:

⚠️ **Urgent:** "Fix critical security issue" is 5 days overdue

**In Progress:**
- Fix authentication bug (due Jan 18)
- Document API v2 endpoints

**Ready to start:**
- Update deployment scripts
- Review PR #847 (due today!)

I'd prioritize the security issue and PR #847 today.
```

Clear and loop.

---

# Implementation Plan

## Phase 1: Static Layout & Content

Build the full section structure with placeholder boxes for demos. By the end, the page looks complete—just with static demo areas.

### 1.1 Section Layout

Replace the 2x2 grid with four full-width sections.

- Full-width container, generous vertical padding (~80-100px)
- Two-column grid: text column (~500px max) and demo column
- Alternating layout via `reverse` prop or similar
- Mobile: single column, text above demo

Consider a `ProductSection.astro` component accepting title, icon, badge, description, features, CTA, demo slot, and reverse flag.

### 1.2 Typography & Styling

**Titles:** Large, bold. Emoji sized to feel balanced. Badge as label, not banner.

**Description:** ~18px, muted color, comfortable line-height.

**Features:** Styled bullets, slightly smaller than description, good spacing.

**CTA:** Primary button style, enough margin above.

### 1.3 Demo Placeholders

Styled boxes with ~16:10 aspect ratio, subtle border/background, rounded corners.

Desktop gets "Coming Soon" text. Others get generic placeholders until Phase 2.

### 1.4 Background Illustrations (Optional)

If included: 5-10% opacity, behind demo column or bleeding off edge. Skip if it adds clutter.

### 1.5 Responsive & Accessibility

- Test at 375px, 768px, 1200px+
- Demos should have `aria-hidden="true"` (decorative)
- Respect `prefers-reduced-motion`—show static final state

---

## Phase 2: Interactive Demos

**Approach:** Custom Astro components with vanilla JS. No external libraries—our requirements are specific enough that custom code will be cleaner and more maintainable (~200-300 lines JS total).

### 2.0 Shared Infrastructure

Create these shared pieces first:

**File structure:**
```
website/src/components/demos/
├── WindowChrome.astro      # Shared window frame
├── TerminalDemo.astro      # CLI demo
├── EditorDemo.astro        # Obsidian demo
├── ClaudeDemo.astro        # Claude Code demo
├── animation-utils.js      # Shared JS utilities
└── demo-styles.css         # Shared demo styles
```

**WindowChrome component:**
Reusable window frame with traffic light buttons, optional title. Used by all three demos.

```astro
<div class="window-chrome" data-variant={variant}>
  <div class="window-titlebar">
    <div class="window-buttons">
      <span class="btn-close"></span>
      <span class="btn-minimize"></span>
      <span class="btn-maximize"></span>
    </div>
    {title && <span class="window-title">{title}</span>}
  </div>
  <div class="window-content">
    <slot />
  </div>
</div>
```

**Animation utilities (animation-utils.js):**

```javascript
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function typeText(element, text, charDelay = 50) {
  for (const char of text) {
    element.textContent += char;
    await sleep(charDelay);
  }
}

export async function revealLines(container, lines, lineDelay = 80) {
  for (const line of lines) {
    const el = document.createElement('div');
    el.innerHTML = line;
    container.appendChild(el);
    await sleep(lineDelay);
  }
}

export function checkReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

---

### 2.1 CLI Demo

**Behavior:**
- Cursor: solid block (`▌`) via `::after` pseudo-element, contrasting color, not blinking
- Output: line-by-line reveal (~50-100ms per line)
- Transitions: clear screen, type new command
- Timing: ~40-60ms per character when typing commands

**Scene data structure:**
```javascript
const scenes = [
  {
    command: 'tdn today',
    outputLines: [
      '<span class="term-heading">TODAY — Wed Jan 15</span>',
      '',
      '<span class="term-emoji">⚠️</span>  <span class="term-section">OVERDUE (2)</span>',
      '   <span class="term-task">Fix critical security issue</span>        <span class="term-project">Q1 Planning</span>    <span class="term-date">due Jan 10</span>',
      // ... more lines
    ],
    displayTime: 5000
  },
  // ... more scenes
];
```

**Colored output:** Pre-styled `<span>` elements with CSS classes. No syntax highlighting library.

```css
.term-emoji { /* inherits color */ }
.term-section { color: var(--color-text); font-weight: 600; }
.term-task { color: var(--color-text); }
.term-project { color: var(--color-accent); opacity: 0.8; }
.term-date { color: var(--color-text-muted); }
.term-tree { color: var(--color-text-muted); } /* for ├── └── */
.term-status-blue { color: var(--color-blue); }
.term-status-green { color: var(--color-green); }
```

**Animation loop:**
```javascript
async function runDemo() {
  while (true) {
    for (const scene of scenes) {
      clearTerminal();
      await typeCommand(scene.command);
      await sleep(300);
      await revealLines(outputContainer, scene.outputLines);
      await sleep(scene.displayTime);
    }
  }
}
```

**Font:** Use a monospace font that supports box-drawing characters (SF Mono, Menlo, Consolas all work).

---

### 2.2 Obsidian Demo

**Behavior:**
- Phase 1: Type markdown with syntax highlighting (~40ms per char)
- Phase 2: Instant cut to rendered widget view
- Loop after ~5-6 seconds on rendered view

**Editor state styling:**
```css
.editor-checkbox { color: var(--color-text-muted); }  /* - [ ] */
.editor-bracket { color: var(--color-accent); }        /* [[ ]] */
.editor-link-text { color: var(--color-text); }        /* link text */
```

**Widget styling (from actual plugin):**

```css
.taskdn-widget {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4em;
  padding: 0.1em 0.4em;
  border-radius: 4px;
  background-color: var(--color-bg-2);
  font-size: 0.95em;
}

/* Status borders */
.taskdn-widget[data-status="inbox"] {
  border-inline-start: 3px solid var(--color-blue);
}
.taskdn-widget[data-status="in-progress"] {
  border-inline-start: 3px solid var(--color-yellow);
}
.taskdn-widget[data-status="blocked"] {
  border-inline-start: 3px solid var(--color-red);
}

.taskdn-checkbox {
  width: 1em;
  height: 1em;
  accent-color: var(--color-accent);
}

.taskdn-title {
  color: var(--color-text);
}

.taskdn-meta {
  font-size: 0.8em;
  color: var(--color-text-muted);
  opacity: 0.75;
}
```

Map Obsidian CSS variables to Flexoki site equivalents.

**Animation sequence:**
```javascript
async function runDemo() {
  while (true) {
    // Phase 1: Editor
    showEditorView();
    await typeMarkdown();
    await sleep(500);

    // Phase 2: Rendered (instant cut)
    showRenderedView();
    await sleep(5500);
  }
}
```

---

### 2.3 Claude Code Demo

**Behavior:**
- Same terminal chrome as CLI demo
- User question types with `>` prompt (~40ms per char)
- "Thinking" state: pulsing opacity animation (~2 seconds)
- Command appears as muted text: `✓ tdn context project "Q1 Planning" --ai`
- Response streams in character-by-character (~20-30ms per char)

**Thinking state:**
```css
.thinking-indicator {
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

Or animated dots: `Thinking...` with dots appearing one by one.

**Response streaming:**
```javascript
async function streamResponse(element, html, charDelay = 25) {
  // Pre-render HTML, then reveal character by character
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent;

  let currentIndex = 0;
  element.innerHTML = '';

  for (const char of text) {
    currentIndex++;
    // Re-render HTML up to current position
    element.innerHTML = truncateHTML(html, currentIndex);
    await sleep(charDelay);
  }
}
```

Alternative simpler approach: stream plain text, then swap in formatted HTML at the end.

**Response formatting:** Pre-styled HTML spans for bold, lists, emoji:
```html
<span class="claude-bold">Urgent:</span>
<span class="claude-emoji">⚠️</span>
<div class="claude-list-item">- Fix authentication bug (due Jan 18)</div>
```

**Animation sequence:**
```javascript
async function runDemo() {
  while (true) {
    clearTerminal();

    // User question
    await typeWithPrompt('>', 'What\'s next on Q1 Planning? Anything urgent?');
    await sleep(400);

    // Thinking
    showThinking();
    await sleep(1000);
    showCommand('✓ tdn context project "Q1 Planning" --ai');
    await sleep(1000);
    hideThinking();

    // Response
    await streamResponse(responseContainer, responseHTML);
    await sleep(5000);
  }
}
```

---

## Phase 2.5: Polish & Integration

- Full page flow—do sections feel balanced?
- Animation performance (no jank, test with DevTools Performance tab)
- `prefers-reduced-motion`: show static final state, skip all animations
- Test on real mobile devices (not just responsive mode)
- Accessibility: `aria-hidden="true"` on demo containers
- Verify monospace font renders box-drawing chars correctly across browsers
- Check animation doesn't cause layout shifts
