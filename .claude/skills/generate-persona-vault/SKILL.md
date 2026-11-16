---
name: generate-persona-vault
description: Generate a realistic Taskdn test vault for an invented person, with a persona, a plan and a playbook of things to try. Use whenever you need test data shaped a particular way, such as a kind of user, a size, or a scenario like "a new user", "lots of overdue tasks" or "30 active projects". Takes freeform instructions.
argument-hint: "[freeform: who, how big, what it's for]"
---

# Generate a Persona Vault

Build a test vault that looks like a real person's tasks, in `demo-vaults/<name>/`, using the vault toolkit (`bun run vault`). Run everything from the repo root.

The vault is for testing Taskdn: the desktop app, the `tdn` CLI, the Obsidian plugin and the Claude Code skill. For bulk data with no particular person behind it, `bun run vault generate` is faster; for every status and date case in one place, `bun run vault render demo`.

## 1. Read the instructions

Whoever invoked this may say anything about the vault: who the person is, its size, which tool they live in, what it's for ("to test the weekly review", "projects blocked by other projects", "someone who has just started"), even specific tasks to include. **Their instructions override every default below.** If they're testing something, bias the vault towards it while keeping it believable.

Decide everything they didn't say yourself. Make choices that differ from the obvious: not every persona is a freelance developer.

## 2. Invent the persona

Turn these knobs, unless the instructions set them:

| Knob             | Range                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Tech-savviness   | From someone's grandma to a nerdy programmer. Shapes their tasks, their tools and how they phrase things |
| Preferred tool   | Desktop app, Obsidian, the `tdn` CLI, or Claude Code                                           |
| Areas            | Few broad ones, or many fine-grained ones                                                      |
| Active projects  | A disciplined handful, or 20+ in flight with more in planning                                  |
| Length of use    | Days (no history at all) to years (big archive, dropped and paused projects, archived areas)   |
| Task granularity | Tiny GTD-style next actions, or big tasks with checklists in the body                          |

Every persona keeps their life in plain files and is comfortable with at least one of the tools above. Beyond that, anyone goes: parents, students, retirees, executives, tradespeople, researchers.

**Size**, unless told otherwise (default small):

| Size   | Areas | Projects | Tasks      |
| ------ | ----- | -------- | ---------- |
| tiny   | 1–3   | 1–3      | 15–30      |
| small  | 3–6   | 4–10     | 60–120     |
| medium | 5–10  | 10–25    | 200–400    |
| large  | 8–15  | 25–50    | 600–1,000  |
| huge   | 12–25 | 50–100   | 1,500+     |

Archived tasks count towards the total. A long-time user's archive can be most of it.

## 3. Create the vault

```bash
bun run vault new <name>      # e.g. priya-shah; dated to today unless --date YYYY-MM-DD
```

`new` refuses a name that exists, so pick another. The vault comes set up for every tool: entity folders, `.taskdn.json`, Obsidian config and the plugin.

Write `demo-vaults/<name>/persona.md`: name, age, where they live, what they do, a description of them, how they manage tasks and what a typical day looks like, how they use the tools, a short summary, and hard constraints from the knobs ("no more than 5 active projects", "nothing older than three weeks").

Then `vault-plan.md`: each area and project with a line on why it exists, its status and dates, and the kinds of tasks in it. These notes sit in the vault root, outside the entity folders, so Taskdn's tools ignore them.

## 4. Write plans and populate

Describe areas, projects, tasks and other notes as JSON plans, then load them:

```bash
bun run vault populate <name> demo-vaults/<name>/.plans/01-areas-projects.json
```

Keep plans in the vault's `.plans/` folder, numbered in order. Each run adds to the vault, and the whole plan is checked before anything is written, so a mistake leaves the vault unchanged. Areas and projects go first, since tasks link to them.

```json
{
  "areas": [
    { "title": "Home", "type": "life-area", "description": "The house and garden." },
    { "title": "Volunteering", "status": "archived" }
  ],
  "projects": [
    {
      "title": "Kitchen Refit",
      "status": "in-progress",
      "area": "Home",
      "startDate": "D-40",
      "endDate": "D+20",
      "blockedBy": ["Loft Clear-out"],
      "body": "## Budget\n\nAbout 8k. Fitter booked for {{D+6}}."
    }
  ],
  "tasks": [
    {
      "title": "Choose worktop samples",
      "status": "in-progress",
      "createdAt": "D-12",
      "updatedAt": "D-1",
      "due": "D+2",
      "project": "Kitchen Refit",
      "body": "- [x] Order samples\n- [ ] Compare in daylight"
    },
    {
      "title": "Cancel old broadband",
      "status": "done",
      "createdAt": "D-60",
      "completedAt": "D-45",
      "area": "Home",
      "archived": true
    }
  ],
  "notes": [{ "path": "day-notes/{{D-1}}.md", "body": "Fitter confirmed for {{D+6}}." }]
}
```

**Fields.** Areas: `title`, `status` (`active` or `archived`), `type`, `description`, `body`. Projects: `title`, `status` (`planning`, `ready`, `in-progress`, `paused`, `blocked`, `done`), `area`, `startDate`, `endDate`, `blockedBy`, `description`, `body`. Tasks: `title`, `status` (`inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `done`, `dropped`), `createdAt` (all three required), `updatedAt` (defaults to `completedAt`, then `createdAt`), `completedAt`, `due`, `scheduled`, `deferUntil`, `project`, `area`, `archived`, `body`. Notes: `path` and `body`, for anything else, like day notes or meeting notes.

**Dates** are relative to the vault's reference date: `D`, `D+3`, `D-10`, or `D+1T17:00` with a time. Inside titles, descriptions, bodies and note paths, write `{{D+3}}`. Never write a weekday, month name or year in titles or prose: those can't move when the vault is shifted to a new date.

**Links.** `project`, `area` and `blockedBy` take exact titles. Project and area files are named after their titles; task files get a slug of the title (`Choose worktop samples` → `choose-worktop-samples.md`). In bodies, link tasks by filename (`[[choose-worktop-samples]]`), projects and areas by title, and people or places freely (`[[Sam]]`), since links to notes that don't exist are normal in Obsidian.

**Batches.** For medium and bigger vaults, hand tasks to subagents: one per area or group of projects, each writing its own numbered plan file and running `populate` on it. Give each one `persona.md`, `vault-plan.md`, this section of the skill, and the exact project and area titles it may use.

### What makes it believable

- **The date layer.** Unless the persona rules it out, include: overdue tasks, some due today and soon, some scheduled today, a few scheduled in the past and still open, one or two deferred until today, more deferred into the future, things completed in the last week, a project past its end date, one ending soon and one starting soon. `demo-vault-templates/demo/README.md` has the full checklist.
- **History that matches the length of use.** Old `done` and `dropped` tasks mostly `archived`; `createdAt` spread over the time they've used it; `updatedAt` never before `createdAt`; in-progress tasks touched recently; completed projects with dates in the past.
- **Their voice.** Titles the way this person would write them: terse, chatty, misspelt, emoji-heavy or formal. Granularity to match the knob.
- **Texture.** Notes, checklists and links in some bodies; a few orphan tasks with no project or area; some inbox clutter; blocked tasks that say what they're waiting for. Day notes if they use Obsidian.
- **Valid by default.** Only spec statuses and well-formed files, unless the instructions ask for mess. For deliberately broken files, see `demo-vault-templates/edge-cases/`.

## 5. Review

Hand the vault to a fresh subagent to review critically against `persona.md`: does it read like this person's real system? Look for repetitive or generic titles, impossible dates, projects with no tasks, statuses that contradict bodies, and anything that breaks the persona's constraints. It fixes what it finds, by adding a plan or editing files carefully so the frontmatter stays valid.

## 6. Write the playbook

`playbook.md`: scenarios to try with this vault, written for this persona and for what the vault is for. Cover each tool, weighted towards their preferred one. For example:

- "Do a weekly review in the desktop app. Does the overdue list match what this person would worry about?"
- "Ask Claude Code with the Taskdn skill what to focus on today."
- "In Obsidian, open yesterday's day note and tick off a task from its link."
- "`tdn list --project \"Kitchen Refit\"`: is anything blocked?"

## 7. Check

```bash
bun run vault report <name>                  # date layer, statuses, links, problems
cd demo-vaults/<name> && tdn doctor
```

Fix any problems and unresolved entity links, unless they're deliberate. Check the report shows the date cases you meant to include.

## 8. Hand back

Tell the caller, briefly: who the persona is, the counts, anything notable you built in, and how to use it:

- **CLI:** `cd demo-vaults/<name> && tdn today --ai`
- **Obsidian:** the link from `bun run vault open <name>` (it asks once to trust the vault)
- **Desktop app:** set the tasks, projects and areas folders in Preferences to the paths in the vault's `.taskdn.json`

The vault is dated to its reference date. To move it to another day later, `bun run vault shift <name> --to YYYY-MM-DD`. To rebuild it, `bun run vault new` a fresh one and populate it from the same `.plans/`. To keep a vault for good, copy it into `demo-vault-templates/` without `.obsidian/`, `.taskdn.json` or `.plans/`; its `.vault.json` makes it a template that renders on any date.
