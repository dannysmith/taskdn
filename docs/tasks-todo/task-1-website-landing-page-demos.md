# Task: Website Landing Page Demos

Working Dir: `website/`
Read First: `website/src/content/docs/getting-started.mdx` and any other docs in `website/src/content/docs/` you think you need.

---

## Overview

Redesign "The Suite" section of the landing page (`/website/src/pages/index.astro`). Replace the current 2x2 grid with four full-width product sections, each featuring an animated demo that shows the product in action.

Keep everything above "The Suite" unchanged (hero, file example, hierarchy visualization).

---

## General Layout & Styling

### Section Structure

Each product gets a full-width section containing:

1. **Text column** — Title, emoji icon, status badge (if applicable), description, feature bullets, CTA button
2. **Demo column** — Animated HTML/CSS/JS demonstration of the product

### Layout

- **Desktop:** Side-by-side, alternating which side the demo appears on:
  - Section 1 (Desktop): Demo on right
  - Section 2 (CLI): Demo on left
  - Section 3 (Obsidian): Demo on right
  - Section 4 (Claude Code): Demo on left
- **Mobile/narrow viewports:** Stack vertically with text above demo

### Visual Styling

- Use **Flexoki colors** consistent with the rest of the site (not a separate "terminal dark theme")
- Terminal/editor demos should have appropriate chrome (title bar with traffic light buttons, rounded corners) but use site colors
- Syntax highlighting for code/markdown should use the existing site palette
- Subtle background illustrations are optional and should be very faded/watermarked if included

### Animation Timing

- Each "scene" in a demo should display for **5-6 seconds** before transitioning
- Typing animations should feel natural but not slow
- All demos auto-loop

---

## Section Order

1. Desktop App (coming soon)
2. CLI
3. Obsidian Plugin
4. Claude Code Plugin

---

## Section 1: Desktop App

### Content

**Title:** Desktop App
**Icon:** 🖥️
**Status Badge:** "Coming Soon"

**Description:**
A task app that actually feels good to use—fast, keyboard-driven, thoughtfully designed—but your files stay on disk as markdown. No lock-in. No wondering what happens when the company gets acquired.

**Features:**
- Global shortcut captures tasks without breaking your flow
- Today, Inbox, This Week views work out of the box—no configuration
- Keyboard-first for people who find clicking slow
- Lists, Kanban, or calendar—whatever fits how you're thinking

**CTA:** "Learn More" → `/desktop/overview`

### Demo

Since the app isn't built yet, show a **simple SVG placeholder**:

- Mac-style window chrome (three dots top-left, title bar)
- Sidebar with area/project icons
- Main panel with 4-5 checklist items (some checked, some not)
- Subtle, clean, monochrome or very muted colors
- Static (no animation needed)

If the SVG proves complex, fallback to a styled box with "Demo coming soon" text.

---

## Section 2: CLI

### Content

**Title:** Command Line Interface
**Icon:** ⌨️
**Status Badge:** None (already available)

**Description:**
Two modes for two audiences. For you: pretty output, fuzzy search, natural language dates. For AI agents: structured markdown designed for context windows—token-efficient, still useful if truncated.

**Features:**
- See what's overdue, due today, and in progress—one command
- Give AI full context in a single call: project, tasks, timeline, relationships
- Search the way you'd say it, not how files are named
- "Next Friday" instead of ISO dates

**CTA:** "Get Started" → `/cli/overview`

### Demo

A terminal window cycling through three scenes:

#### Scene 1: `tdn today`

```
$ tdn today
```

Output (formatted, colorful for humans):

```
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

#### Scene 2: `tdn context --ai`

```
$ tdn context --ai
```

Output (stats line + structure tree only, keep it tight):

```
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

#### Scene 3: `tdn new`

```
$ tdn new "Review quarterly report" --due friday --project "Q1 Planning"
```

Output:

```
✓ Created task: Review quarterly report
  → due: Fri Jan 17
  → project: Q1 Planning
  → status: inbox
  → path: tasks/review-quarterly-report.md
```

---

## Section 3: Obsidian Plugin

### Content

**Title:** Obsidian Plugin
**Icon:** 💎
**Status Badge:** None (already available)

**Description:**
You're in Obsidian to write, not manage tasks. Link to a task and see its status, project, and due date right there. Check it off without opening another file.

**Features:**
- Task links become widgets showing what you need to know
- One click to mark done—no context switch
- Colors tell you what's blocked or overdue at a glance
- Turn any checklist item into a proper task when it grows up

**CTA:** "Install Plugin" → `/obsidian/plugin`

### Demo

An editor-style window showing the transformation from raw markdown to rendered view.

#### Phase 1: Typing (2-3 seconds)

Show text being typed into an editor:

```
- [ ] Buy Milk
- [[Finish Q1 Planning Doc]]
```

#### Phase 2: Rendered View (5-6 seconds)

Cut directly to the rendered Obsidian-style view:

- First line: A proper checkbox (unchecked) with "Buy Milk" text
- Second line: A task widget showing:
  - Checkbox (unchecked)
  - Title: "Finish Q1 Planning Doc"
  - Status indicator (colored border or badge): "in-progress" (yellow/amber)
  - Project: "Q1 Planning"
  - Due: "Jan 15"

The widget should look polished—rounded corners, subtle shadow, clean typography.

#### Loop

After showing the rendered view, fade/clear and restart from Phase 1.

---

## Section 4: Claude Code Plugin

### Content

**Title:** Claude Code
**Icon:** 🤖
**Status Badge:** None (already available)

**Description:**
Claude can already read your markdown files. This teaches it how your system works—so "What's overdue?" gets a real answer, not a frontmatter tutorial.

**Features:**
- Ask naturally: "What should I focus on today?"
- Create tasks mid-conversation without opening another app
- Help with the tedious parts—inbox processing, weekly reviews
- Works from any project directory, not just your vault

**CTA:** "Set Up Claude" → `/claude-code/overview`

### Demo

A Claude Code-style terminal interface showing a conversation.

#### Scene 1: User Question (typing animation)

```
> What's next on Q1 Planning? Anything urgent?
```

#### Scene 2: Processing (2 seconds)

Show Claude "thinking" with:
- A subtle spinner or pulsing indicator
- Commands being run (muted text):
  ```
  ✓ tdn context project "Q1 Planning" --ai
  ```

#### Scene 3: Response (5-6 seconds)

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

#### Loop

Clear and restart from Scene 1. Could optionally rotate through 2-3 different question/response pairs:
- "What's overdue?"
- "Create a task to call the dentist, due Friday"
- "Help me process my inbox"

---

## Technical Notes

### Component Structure

Consider creating reusable Astro components:

- `ProductSection.astro` — The full-width section layout with text/demo columns
- `TerminalDemo.astro` — Animated terminal with typing effect and scene cycling
- `EditorDemo.astro` — Obsidian-style editor with transformation
- `ClaudeDemo.astro` — Claude Code conversation interface

### Animation Implementation

- Use CSS animations where possible (typing cursor, transitions)
- JavaScript for scene cycling and timing
- Consider using CSS `@keyframes` for typing effects rather than character-by-character JS
- Ensure animations don't cause layout shifts

### Accessibility

- Demos should have `aria-hidden="true"` (decorative)
- Ensure text content in the text column conveys all important information
- Respect `prefers-reduced-motion` — show static final state instead of animations

---

## Out of Scope

- Actual video/GIF files
- Backend integration (demos are purely frontend)
- Mobile-specific demo variants (just stack the same demos)
