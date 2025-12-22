# Overview

## Background

Many people use two distinct systems to manage their notes and tasks. Notes, project plans etc are stored as documents in a knowledge management app; actionable todos are stored as tasks in a task management app. Tools like Notion provide the best of both worlds: every database record is both a document and a task. A "tasks" database in Notion with the right views, templates and automations configured has some major advantages:

- Everything is in one app.
- Database Relations allow us to connect tasks to records in other databases (eg. projects, areas, clients) and so create complex filtered views.
- The record representing a project (or area/client/etc) is **also** the "project document" where we can keep freeform notes, future plans etc. Likewise, a task record is just a document, so we can keep freeform notes about it in the body if we want.
- Wherever we are in notion, we can mention tasks, projects, areas etc just as we would any other page, and can freely mention other Notion docs in the bodies of our tasks, projects etc.

Tools like Notion have some downsides tho:

1. We have to use Notion's official apps, which don't have a good UI for every context.
2. Our data is in a proprietry format (and we don't own it).
3. We can't easily interact with our data using CLI tools, code or local file-based LLMs.

File-based apps like Obsidian solve these issues. With the new bases feature, we can fairly easily replicate most Notion setups in Obsidian, and by storing our documents (including areas, projects etc) as markdown files on disk we can interact with them via both the Obsidian app and anything else which can operate on a filesystem containing Markdown files with YAML frontmatter, including AI coding tools.

This works great for documents, but **not for Tasks**. The ideal UI for task management is very different to that required for document management. I want to write my project plans in an Obsidian-like UI, but view and complete tasks in an app like [Things](https://culturedcode.com/things/). This also applies to AI agents: tools like `grep`, `ls`, `ReadFile` & `WriteFile` are fine for working with directories of project docs, but terrible for operations like _"get me all the uncompleted tasks for all projects in my 'Side Projects' area"_. To be effective, agents need a n interface where queries like this reliably and quickly return the info in a form appropriate for LLMs.

## Goal

**To have the best of both worlds: Tasks as markdown-on-disk and tools specifically designed to work with them brilliantly in specific contexts.**

This _definitely_ means at least two products: a beautiful desktop app for humans and a CLI tool for AI. It _probably_ means a bunch of other stuff too.

### General Requirements

- Our products are **interfaces** for working with files on disk: all user data must be stored as markdown files with YAML frontmatter.
- Zero dependency on third-party tools & conventions: We don't care if a user chooses to **also** use Obsidian or Git or Claude Code to work with their data, so we don't depend on their features (eg. Obsidian Bases or CC slash commands).
- We play well with third-party tools & conventions: Anything which can read & maniuplate markdown with YAML frontmatter can also do so with our data. Witha few specific exceptions, we don't care where users keep their files, what other frontmatter they include or how they're named.
- Wherever appropriate, we make our tools AI-friendly.

And wherever possible...

- The mental model required to use our products is logical and shared accross them.
- We take care to support common Obsidian conventions, and try to maintain compatibility with other file-based task systems like [TaskNotes](https://tasknotes.dev/).
- We prefer open, well-understood standards for things like querying and data transfer.

### Explicit Non-Goals

- Anything beyond task & project management.
- Tteam collaboration features – this is for **individuals**.
- Syncing, cloud storage, online stuff.

## The Fundamentals

We draw on GTD and PARA methods when it comes to hierarchy.

- **Tasks** are actionable and small. The system should only contain _actually actionable_ tasks. Vague planning checklists should probably belong somewhere else.
- **Projects** are collections of tasks, and should be "finishable".
- **Areas** are ongoing areas of responsibility.

### Principles

#### 1. Opinionated about tasks, agnostic about the rest

We are intentionally opinionated about how tasks are managed, and users don't have much scope for configuration or customisation. We are totally unopinionated about everything else. Users are free to keep their task docs wherever they want on disk, format their project and Area docs however they wish, add additional frontmatter to task docs etc.

#### 2. Low-friction UI, optimised for the context

The whole point of this project is to provide an interface which is **appropriate** for task management in a given context. The frictions felt by users depends on context: if we're working on something else, capturing a task must be fast and require few clicks. If we're in "doing mode" our task list should only show us tasks which are up next. If we're in "planning mode" we probably need more contextual information available.

This applies to the CLI too – human users should see well-formatted output and perhaps interactive UIs; robot users should see output optimised for their needs. Likewise, the developer libraries should expose sensible, predictable, typesafe APIs etc.

### Files on disk

The specification contains far more detail on these three main types, but a basic overview of their structure can be seen below.

#### Area

These represent a life area.

```yaml
---
title: Acme Corp
type: client
status: active
description: Ongoing client relationship with Acme Corporation.
---
## Context

Key contacts, agreements, and background information...
```

### Projects

Projects can optionally belong to areas.

```yaml
---
title: Q1 Planning
status: in-progress
area: '[[Work]]'
start-date: 2025-01-01
end-date: 2025-03-31
description: Quarterly planning and budget review for Q1 2025.
---
## Overview

This project covers all Q1 planning activities...
```

### Tasks

Tasks can be loose, belong to an area directly, or belong to a project.

```yaml
---
title: Review quarterly report
status: in-progress
created-at: 2025-01-10
updated-at: 2025-01-14
due: 2025-01-15
scheduled: 2025-01-14
projects:
  - "[[Q1 Planning]]"
---

## Notes

Key points to review:
- Revenue projections
- Budget allocations

## Meeting Notes

Discussion with finance team on 2025-01-10...
```

## Product Suite

Eventually, this project will include the following products:

### 1. Protocol Specification

A set of unambiguous formal specifications describing the protocol and core APIs of the system. Tools which implement these will be compatible with each other.

1. **S1: Core (Data Storage)** - A formal specification for the data files on disk (naming, frontmatter, location, data types) etc. Includes JSON schemas for these.
2. **S2: Interface Design** - A formal specification for the design of interfaces which interact with S1-compliant data. Includes guidance on types, data structures, commands language (eg. "verb first"), workflows, input & output formats, query & filter language, sorting, interface modes, error handling etc.
3. **S3: Guidance for Reading & Writing Data** - Guidance for implementations when reading, writing & mutating S1-compliant data on disk.

**All software which implements S1 will be mutually compatible when reading/writing task files on disk.** Implementing S2 will ensure a consistent & predictable external interface.

See [tdn-specs README](../tdn-specs/README.md).

### 2. CLI App

A command-line interface for both humans and AI agents to use. Human users can manage their tasks in an interactive TUI-like interface, or use the CLI in bash scripts. AI agents have a different interface, optimised for them.

The CLI includes an embedded Rust core library (connected via NAPI-RS bindings) that handles all file parsing, validation, and manipulation. When the desktop app is ready, this core will be extracted to a shared workspace crate that both products can use.

See [CLI Requirements](product-overviews/cli/cli-requirements.md) and [CLI Technical Overview](product-overviews/cli/cli-tech.md).

### 3. Desktop App

A cross-platform Tauri app for day-to-day task management which feels as slick as [Things](https://culturedcode.com/things/).

If they're in _planning mode_ they'll want to see contextual views and have important information surfaced where it's needed. If they're in _doing mode_ they'll want to see and work with their short-term task list without distractions.

See [Desktop Requirements](product-overviews/desktop/desktop-requirements.md).

### 4. Obsidian Plugin [DEFERRED PROJECT]

A lightweight integration which renders any links to task documents as special widgets, which show some meta-data about the task and allows their status to be changed. Also allows any regular checklist item to be easily turned into a task in-place.

### 5. Extras [DEFERRED PROJECT]

- Templates and bases for Obsidian
- Claude Code Plugin with skill & commands
