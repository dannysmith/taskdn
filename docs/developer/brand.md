# Taskdn Brand

This document provides a brief overview of the Taskdn brand aesthetic. For detailed color specifications and status/entity styling, see [Semantics and Visual Design](./semantics-and-visual-design.md). Individual products have their own detailed style guides.

---

## Brand Personality

Taskdn feels **warm, approachable, and empowering**. It's software that respects your data and gets out of your way. Not corporate, not flashy—more like a well-crafted tool you'd find in a woodworker's shop.

Key attributes:
- **Honest** — No dark patterns, no lock-in, no pretense
- **Calm** — Warm tones, clean layouts, no visual noise
- **Capable** — Powerful features presented simply
- **Personal** — Built for individuals, not teams or enterprises

---

## Visual Language

### Color Philosophy

Taskdn uses a **warm, paper-like palette** inspired by [Flexoki](https://stephango.com/flexoki). Backgrounds are cream/beige rather than stark white—easier on the eyes and evocative of paper notebooks.

The website uses the Flexoki theme directly. The desktop app adapts this warmth while using shadcn/ui conventions.

### Primary Accent Color

Blue is the primary accent color across all products:

| Format | Value |
|--------|-------|
| OKLCH | `oklch(0.488 0.243 264)` |
| Hex (approximate) | `#4D6BF8` |

Use this for primary buttons, links, focus states, and brand accents.

### General Aesthetic

- **Clean and minimal** — Generous whitespace, no clutter
- **Markdown-first** — Code blocks and file snippets are first-class citizens
- **Warm, not cold** — Avoid stark blacks and whites; prefer warm neutrals
- **Functional beauty** — UI elements serve a purpose; decoration is minimal

---

## Logo

The Taskdn logo is a **hash symbol (#)** in a blue rounded square with a subtle 3D effect. The hash represents both markdown (headings) and the structured nature of task metadata.

### Assets

Logo files are located in:
- `images/` — High-resolution source files
- `website/public/` — Web-optimized versions

| File | Usage |
|------|-------|
| `icon-1024-trans.png` | Full logo with transparency |
| `icon-crop.png` | Cropped version for favicons |
| `Icon-1024-fat.png` | Full bleed version |

### Usage

- Maintain the blue background when placing the logo
- Don't stretch, rotate, or alter the proportions
- Ensure adequate contrast with surrounding colors

---

## Typography

Typography choices are product-specific. The website uses system fonts via Starlight defaults. The desktop app uses the system sans-serif with Geist Mono for code.

When in doubt, prefer clean sans-serif fonts that pair well with markdown content.

---

## Related Resources

- [Flexoki Color Scheme](https://stephango.com/flexoki) — The warm color palette that inspires Taskdn's aesthetic
- [Semantics and Visual Design](./semantics-and-visual-design.md) — Detailed status colors, icons, and entity styling
- [Product Principles](../product-principles.md) — The design philosophy behind these choices
