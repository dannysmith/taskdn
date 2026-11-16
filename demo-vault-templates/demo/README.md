# Demo Vault

A realistic vault for manually testing and demoing Taskdn: one freelancer's work and life, with a client engagement, side projects, a half-marathon, a trip to Japan and the usual household admin. It conforms to the [S1 Core spec](../../tdn-specs/S1-core.md).

This is a template. Don't open it with `tdn`, the desktop app or the plugin: they would write real dates into it. Render a copy instead:

```bash
bun run vault render demo          # demo-vaults/demo, dated as if today were the reference date
bun run vault tdn demo today --ai
```

The rendered vault comes with Obsidian set up and the Taskdn plugin linked in from a local build (`~/dev/obsidian-taskdn`, or set `TASKDN_OBSIDIAN_PLUGIN_DIR`). Obsidian asks once whether to trust it before it loads the plugin.

## Dates

Every date is written as if today were the reference date in `.vault.json` (2026-01-15). Rendering shifts every full ISO date, in frontmatter and in prose, so that day lands on today. Day note filenames move with them.

When editing this vault:

- Write dates as `YYYY-MM-DD` relative to the reference date, including dates in prose ("Tom's birthday is 2026-01-20").
- Avoid weekdays, month names, years and quarters in titles and prose. They can't move with the dates.
- Keep it consistent as of the reference date: nothing created in the future, nothing completed after today.
- Check what it covers with `bun run vault report demo-vault-templates/demo`.

## Structure

```
areas/        10 areas, one archived
projects/     18 projects
tasks/        101 tasks
  archive/    40 completed or dropped tasks
day-notes/    Daily notes, named by date
templates/    Obsidian templates, plus Bases definitions in templates/bases/
```

Project and area files are named after their titles, as Obsidian users usually name notes, so `[[Japan Trip]]` resolves in Obsidian as well as in Taskdn. Task files use slugs, as the CLI and the Obsidian plugin create them.

`obsidian-dashboard.md` shows the Bases views. `Obsidian Plugin Test Document.md` shows every way the Obsidian plugin renders task links.

## Coverage

Relative to the reference date (D):

| Case                         | Examples                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Every task status            | inbox, icebox, ready, in-progress, blocked, done, dropped                      |
| Overdue                      | `car-mot` (D-3), `renew-domain` (D-1), `review-insurance-renewal` (D-10)       |
| Due today                    | `send-invoice-acme`, `return-library-books`                                    |
| Due in the next two weeks    | `buy-birthday-card-for-tom`, `book-jr-pass` (blocked), `gather-client-1099s`   |
| Scheduled today              | `fix-api-rate-limiting`, `book-dentist`, `call-dad`, `plan-long-run-route`     |
| Scheduled in the past, open  | `clean-out-email-inbox` (D-2), `update-linkedin` (D-40)                        |
| Scheduled in the next weeks  | `haircut` (D+1) through `eye-test` (D+11)                                      |
| Newly available today        | `book-beach-holiday-flights`, `tidy-desktop-folders`                           |
| Deferral already passed      | `review-side-hustle-idea` (D-7)                                                |
| Deferred into the future     | `review-website-analytics` (D+14) through `renew-passport` (D+150)             |
| Completed recently           | `wash-car` (D), `setup-project-repo` (D-1), `confirm-japan-dates` (D-7)        |
| Done but not archived        | `wash-car`, `create-training-plan`                                             |
| Datetimes                    | `fix-api-rate-limiting`, `review-acme-metrics`, `review-side-hustle-idea`      |
| Tasks with project and area  | `learn-japanese`, `review-website-analytics`                                   |
| Orphan tasks                 | `call-dad`, `haircut`, `random-app-idea`                                       |
| Every project status         | planning, ready, in-progress, paused, blocked, done                            |
| Project past its end date    | Personal Website Rebuild (D-5)                                                 |
| Project ending this week     | Tech Blog Relaunch (D+5)                                                       |
| Projects starting soon       | Side Hustle App (D+10), Newsletter Setup (D+7)                                 |
| Blocked by another project   | Garden Renovation, blocked by Home Office Setup                                |
| Archived area                | Volunteering                                                                   |
| Title differs from filename  | Most tasks, e.g. `book-dentist.md` is "Book dentist appointment"               |
| Links by title and filename  | Frontmatter links by title; the plugin test document and day notes by filename |
| Links to missing notes       | People and places, e.g. `[[Sarah Chen]]`, `[[River Loop Route]]`               |
