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

Build each demo as a self-contained component.

### 2.1 CLI Demo

**Resolved decisions:**
- Cursor: visible, contrasting color, not blinking
- Output: line-by-line, quickly
- Transitions: clear screen, type new command

**Technical research:**
- Typing animation approach (CSS vs JS)
- Colored output handling (pre-styled spans)
- Scene data structure
- Box-drawing Unicode font support

### 2.2 Obsidian Demo

**Resolved decisions:**
- Editor state: syntax highlighting (colored brackets, checkbox syntax)
- Window chrome: simplified (title bar + traffic lights only)
- Transition: instant cut between phases
- Widget: closely match actual plugin styling (reference implementation)

**Technical research:**
- Reference actual plugin widget design
- Markdown highlighting approach
- Static checkbox styling

### 2.3 Claude Code Demo

**Resolved decisions:**
- Prompt: `>` chevron
- Visual style: same terminal style as CLI
- Response: streams in character-by-character
- Content: single Q&A, loops

**Technical research:**
- "Thinking" state rendering (spinner, dots, pulse)
- Command display (muted text appearing)
- Streaming animation approach
- Markdown in response (bold, lists, emoji)

---

## Phase 2.5: Polish & Integration

- Full page flow—do sections feel balanced?
- Animation performance (no jank)
- `prefers-reduced-motion` behavior
- Test on real mobile devices
- Accessibility review
