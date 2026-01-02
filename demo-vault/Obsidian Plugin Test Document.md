# Obsidian Plugin Test Document

This document tests all the different ways task widgets can be displayed. Use it for visual testing of the obsidian-taskdn plugin.

---

## Status Reference

### Task Statuses (7 total)

| Status | Description | Example Task |
|--------|-------------|--------------|
| `inbox` | Newly captured, not yet processed | [[check-new-coffee-shop]] |
| `icebox` | Intentionally deferred indefinitely | [[learn-piano]] |
| `ready` | Processed and ready to be worked on | [[book-dentist]] |
| `in-progress` | Currently being worked on | [[implement-dark-mode]] |
| `blocked` | Cannot proceed due to external dependency | [[schedule-accountant-call]] |
| `done` | Completed successfully | [[archive/setup-bitwarden]] |
| `dropped` | Abandoned, will not be completed | [[archive/try-coworking-space]] |

### Project Statuses (6 total)

| Status | Description | Example Project |
|--------|-------------|-----------------|
| `planning` | Still being scoped or planned | [[Side Hustle App]] |
| `ready` | Planned and ready to begin | [[Garden Renovation]] |
| `blocked` | Cannot proceed due to dependency | — |
| `in-progress` | Active work is happening | [[Acme Dashboard Redesign]] |
| `paused` | Temporarily on hold | — |
| `done` | Completed | [[Holiday Party 2024]] |

---

## Frontmatter Combinations

### Tasks with Area Only

- [[check-new-coffee-shop]] — area: House, Family & Friends
- [[think-summer-travel]] — area: Travel
- [[backup-laptop]] — area: Coding
- [[learn-piano]] — area: Learning

### Tasks with Project Only

- [[implement-user-filtering]] — project: Acme Dashboard Redesign
- [[complete-week-2-runs]] — project: Half Marathon Training
- [[finish-rust-chapter-4]] — project: Learn Rust
- [[draft-first-blog-post]] — project: Tech Blog Relaunch

### Tasks with Both Area and Project

- [[learn-japanese]] — area: Learning, project: Japan Trip 2025
- [[review-website-analytics]] — area: Marketing & Sales, project: Personal Website Rebuild

### Tasks with Due Date

- [[implement-user-filtering]] — due: 2025-01-24
- [[prep-quarterly-review-slides]] — due: 2025-01-30
- [[review-insurance-renewal]] — due: 2025-02-15
- [[plan-valentines-dinner]] — due: 2025-02-14
- [[write-newsletter-issue-3]] — due: 2025-01-24

### Tasks with Scheduled Date

- [[backup-laptop]] — scheduled: 2025-01-25
- [[clean-out-email-inbox]] — scheduled: 2025-01-26
- [[meal-prep-sunday]] — scheduled: 2025-01-26
- [[review-website-analytics]] — scheduled: 2025-01-28

### Tasks with Defer-Until Date

- [[mums-birthday-present]] — defer-until: 2025-03-15
- [[buy-birthday-card-for-tom]] — defer-until: 2025-02-03
- [[review-insurance-renewal]] — defer-until: 2025-02-01
- [[print-japan-photos]] — defer-until: 2025-11-20

### Tasks with Multiple Date Fields

- [[prep-quarterly-review-slides]] — due + scheduled
- [[plan-valentines-dinner]] — due + scheduled
- [[mums-birthday-present]] — due + defer-until
- [[plan-dinner-with-alex]] — due + scheduled

### Tasks with DateTime (not just date)

- [[fix-api-rate-limiting]] — updated with time: 2025-01-22T14:30
- [[archive/migrate-to-buttondown]] — completed-at with time: 2025-01-12T18:45

### Completed Tasks (with completed-at)

- [[archive/setup-bitwarden]] — done, completed: 2025-01-10
- [[archive/book-flights-tokyo]] — done, completed: 2025-01-15
- [[archive/write-year-in-review-post]] — done, completed: 2025-01-02
- [[archive/cancel-gym-membership]] — done, completed: 2025-01-08

### Dropped Tasks (with completed-at)

- [[archive/try-coworking-space]] — dropped, completed: 2025-01-10
- [[archive/build-ios-app]] — dropped, completed: 2025-01-05
- [[archive/attend-react-conf]] — dropped, completed: 2025-01-02
- [[archive/start-podcast]] — dropped, completed: 2024-12-15

---

## Task List Items (Full Line Strikethrough When Done)

These task links are **first in a bullet point**, so they should behave like native Obsidian tasks with full line strikethrough when complete.

### All Seven Statuses

- [[random-app-idea]] — inbox
- [[learn-piano]] — icebox
- [[book-dentist]] — ready
- [[implement-dark-mode]] — in-progress
- [[schedule-dentist-cleaning]] — blocked
- [[archive/setup-bitwarden]] — done (should have full strikethrough)
- [[archive/try-coworking-space]] — dropped (should have full strikethrough)

### Done Tasks (Archived)

- [[archive/book-flights-tokyo]] — done, archived
- [[archive/set-up-home-gym]] — done, archived
- [[archive/cancel-gym-membership]] — done, archived
- [[archive/migrate-to-buttondown]] — done, archived

### Dropped Tasks (Archived)

- [[archive/build-ios-app]] — dropped, archived
- [[archive/attend-react-conf]] — dropped, archived
- [[archive/start-podcast]] — dropped, archived

### With Extra Text After

- [[buy-sarah-present]] remember to check her wishlist first
- [[archive/christmas-shopping]] all done and under budget!
- [[car-mot]] due in March, don't forget

### Nested Task Lists

- [[draft-first-blog-post]]
  - [[create-dashboard-wireframes]]
    - [[submit-dashboard-review]]
  - [[write-cli-readme]]
- [[complete-week-2-runs]]
  - [[plan-long-run-route]]

---

## Inline Task Links (Only Title Strikethrough)

These task links appear **inline within text** or after other content in a list item. Only the task title should be struck through, not the surrounding text.

### Within Paragraphs

I need to remember to do [[book-dentist]] before the end of the month. Also, Sarah mentioned I should look at [[check-meditation-app]] when I get a chance.

Here's a completed task inline: [[archive/setup-bitwarden]] was finished last week. Password management is now sorted.

Multiple tasks in one paragraph: Start with [[check-typescript-library]], then move on to [[setup-astro-project]], and finally [[merge-cli-refactor-pr]] when everything is ready.

### In Bullet Lists (Not First)

- Remember to check on [[book-summer-flights]] when prices drop
- Sarah mentioned [[check-meditation-app]] at dinner last week
- The [[archive/start-podcast]] idea was dropped in favour of newsletter
- For the party, see [[archive/party-buy-drinks]] which is already done

### Inside Native Checkboxes

These are native Obsidian checkboxes with task links inside. Obsidian controls the line strikethrough based on the checkbox state:

- [ ] Need to complete [[create-dashboard-wireframes]] before the meeting
- [ ] Check if [[book-dentist]] appointment is confirmed
- [x] Already finished [[archive/book-flights-tokyo]] — Japan here we come!
- [ ] Review [[implement-user-filtering]] for any blockers
- [x] The [[archive/cancel-gym-membership]] audit saved us money

---

## Tasks by Life Area

### Work & Clients ([[Acme Corp]])

- [[implement-user-filtering]] — In-progress Acme work
- [[review-acme-metrics]] — Client deliverable
- [[setup-analytics-dashboard]] — Blocked on IT access
- [[fix-api-rate-limiting]] — Active bug fix

### Personal Development ([[Learning]])

- [[finish-rust-chapter-4]] — Learning Rust
- [[read-rust-book-ch5]] — Currently reading
- [[learn-webassembly]] — Icebox for later
- [[book-recommendation-from-podcast]] — New book to check

### Health & Fitness ([[Fitness, Health & Self-Care]])

- [[complete-week-2-runs]] — Marathon training
- [[order-new-running-shoes]] — Equipment
- [[schedule-dentist-cleaning]] — Blocked on booking
- [[meal-prep-sunday]] — Nutrition planning

### Finance ([[Finance]])

- [[review-insurance-renewal]] — Deferred until February
- [[review-investment-allocation]] — Annual review
- [[gather-client-1099s]] — Tax prep
- [[schedule-accountant-call]] — Blocked on response

### Travel ([[Travel]])

- [[book-jr-pass]] — Blocked on dates
- [[confirm-japan-dates]] — Trip planning
- [[plan-long-weekend-getaway]] — Inbox item
- [[print-japan-photos]] — Deferred until after trip

### Home & Family ([[House, Family & Friends]])

- [[mums-birthday-present]] — Deferred gift planning
- [[buy-birthday-card-for-tom]] — Friend's birthday
- [[order-new-sofa]] — Blocked on measurements
- [[declutter-office]] — In-progress cleanup

---

## Mixed Content for Stress Testing

### Complex Paragraph

The [[Acme Dashboard Redesign]] project is progressing well. We've already done [[archive/complete-acme-onboarding]] and [[archive/book-flights-tokyo]], though [[implement-user-filtering]] is currently in progress. Next up is [[create-dashboard-wireframes]] which ties into the [[Content Calendar Q1]] planning. Don't forget to also check [[review-acme-metrics]] for the latest numbers.

### Mixed List

- [[draft-first-blog-post]] this is the main priority
- Regular bullet point with no task
- Another regular item mentioning the [[Tech Blog Relaunch]] project
- [ ] Native checkbox item
- [[write-ai-workflow-post]] for the newsletter
- Text before [[setup-buttondown]] and text after
- [x] Completed native checkbox
- [[archive/backup-photos]] was finished ages ago
- Final regular item linking to [[Coding]] area

### Deeply Nested

- Top level item
  - [[book-dentist]]
    - Nested under task: [[check-meditation-app]]
      - Even deeper: [[archive/dentist-checkup-june]]
    - Another nested item
  - Regular nested bullet
- [[create-training-plan]]
  - Sub-task: [[complete-week-2-runs]]
  - See also: [[plan-long-run-route]]

---

## Comparison Section

### Native Obsidian Tasks (for reference)

- [ ] This is a native unchecked task
- [x] This is a native checked task (should be struck through)
- [ ] Another unchecked task
  - [ ] Nested native task
  - [x] Nested checked task

### Our Task Widgets as List Items

- [[book-dentist]]
- [[archive/setup-bitwarden]]
- [[archive/try-coworking-space]]

### Side by Side in Same List

- [ ] Native unchecked
- [[book-dentist]] — our widget (ready)
- [x] Native checked
- [[archive/setup-bitwarden]] — our widget (done)
- [ ] Native with link inside: see [[check-meditation-app]]
- Regular bullet with inline [[archive/cancel-gym-membership]] reference

---

## Edge Cases

### Very Long Task Titles

- [[research-ergonomic-chairs]] — this task has a lot of metadata and notes

### Tasks with Special Characters in Content

The task [[buy-sarah-present]] contains wiki links like Sarah and Diptyque in its body.

### Empty Area After Task Link

- [[haircut]]
- [[wash-car]]
- [[return-library-books]]

### Multiple Inline Tasks Back to Back

Check out [[book-dentist]] and [[eye-test]] and [[haircut]] — all health-related tasks in a row.

---

## Links to Non-Task Files

These should render as normal Obsidian links, not our widgets:

- [[Japan Trip 2025]] — project file
- [[Half Marathon Training]] — project file
- [[Coding]] — area file
- [[Finance]] — area file
- [[README]] — regular note

Inline: The [[Acme Dashboard Redesign]] project connects to the [[Acme Corp]] area.
