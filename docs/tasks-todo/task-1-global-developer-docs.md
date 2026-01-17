# Tasks: Global Developer Docs

We should add some high-level documents to `docs/` And also make some updates and tweaks to the internal documentation which we have. Now the purpose of all of this documentation is to make it easy for both human developers and AI agent developers to have and find the information they need to consistently work well across all of these products in this system. These are internal documents.

## 1. `products.md` [✅ DONE]

Succinct one-file overview of each major product in taskdn. Should simply provide a list of the products which form part of this system. This is intended for both humans and AI agents to read to get an overview of the different products that we have here. For each we should provide:

- Human Name (eg "Claude Code Plugin")
- Shortname (eg "tdn-claude-plugin")
- Path to local folder in this repo
- (for seperate repos) path to local folder (eg `~/dev/obsidian-taskdn`)
- Emoji (see website files)
- URL of main README on GitHub
- Path to docs folder in website (eg `website/src/content/docs/claude-code/`)
- URL to live docs site (eg "https://tdn.danny.is/claude-code/overview/)
- Short 1-2 para description of what the product is
- Brief overview of core tech if appropriate (Eg. "Tauri v2/React Desktop App")

we can draw on the documentation in `website/src/content/docs/` as well as `docs/product-overviews` and any other documentation where we can get this information. 

## 2. `product-principles.md` [✅ DONE]

Extract from `overview.md` and `/Users/danny/dev/taskdn/website/src/content/docs/philosophy.mdx`. We Should probably do our best to create some numbered clearly defined principles. Uh these principles should in general apply to all products in this suite. The purpose of this document is to allow humans and AI agents to quickly understand some of the core product design principles so they can better make decisions about product design. Uh we will almost certainly have to iterate on this together. This should not just be a cut and paste from our philosophy. This should actually be the kind of document that we would want new product managers working on this suite to really read and fully understand when making decisions about new products to develop or new features in existing products. It is essentially a overall guidelines and set of principles, but also a reference document in this regard. 

## 3. `developer/semantics-and-visual-design.md` [✅ DONE]

The purpose of this document is to provide a simple canonical reference on semantics, naming, colouring etc. This is intended for designers and product managers and AI agents to reference when designing and building new products, when writing new documentation, etcetera. It is a core reference for helping us keep things consistent Across our various products. it should begin by referencing `product-principles.md` and explaining that individual products will have in addition to this their own more granular visual design guides and that this guide is intended to explain the higher level stuff.

### Entity: Area

- Icon (folder)
- Emoji (AI context output)
- Color (Green?)

### Entity: Project

- Icon (Circle)
- Emoji (AI Context Output)
- Color (default, see below - changeswith status)

#### Project Statuses

Table showing for each project status:

- Human Name
- YAML Key
- Description
- Color
- Icon (progress ring, cross in circle etc)
- Emoji (from ai context output)

### Entity: Task

- Icon (checkbox)
- Emoji (AI Context Output)
- Color (default, see below - changes with status)

#### Task Statuses

Table showing for each project status:

- Human Name
- YAML Key
- Description
- Color
- Icon (what does theckeckbox look like?)
- Emoji (from ai context output)

#### Task Visual Treatments

- Completed tasks generally have a line through, are subdued and optionally gren.
- Blocked tasks ...
- Overdue tasks ...
- Tasks not yet available generally show an hourglass and have a grey dotted border.

### Fields

Table showing various fields and their visual representation (eg defer-until, due etc)

- Area - suitable icon & emoju
- Project - suitable icon & emoji
- Defer Until - Hourglass
- Due - Little red flag
- Scheduled - Little calendar icon
- Any others?

## 4. `developer/brand.md` [✅ DONE]

The taskdn colour palette, design aesthetic, reference to the icons in `images/` etc. We should be able to keep this one relatively simple. The intent of this document is simply to provide a place for us to keep the design reference, basically. Again, this document should point out that different products will potentially have more detailed or granular guidelines on this. 


## 5. `monorepo-architecture.md`

Technical overview of how the monorepo is set up and configured. This can probably be a very simple stub document for now.

## 6. `README.md`

Update `docs/README.md` to includeonly an intro sentance and a table containing an index of all docs in  `docs/` and `docs/developer` - one row per item. This is the only index of these and can be mentioned in AGENTS.md to provide a single source of truth for the top level monorepo documentation. 


## 7. Remove `product-overviews/`

Remove this entirely and all references to it everywhere in the codebase. Before we do that we should check that there is no incredibly important information in here that we want to retain. These documents were originally written uh before we built these products and now we've built the products and we have the website documentation and their internal documentation. Much of what is in these is no longer necessary and we can clean this up a little bit by removing these.

## 8. Simplify `overview.md` 

Make this into a simple document which I can point an AI at and it will get a full understanding of the entire suite without using loads of tokens in the context window. Should probably include:

- Some basic background information on the project.
- Pointers or `@document.md` to some of the files above To provide the high level context and other important information.

Doing this will allow us to slim down the top level `AGENTS.md` significantly, reducing duplication.

## 9. `docs/tasks.md`

Update `docs/tasks.md` to include a note on task management within sub projects and also to differentiate the whole task thing that we currently have in AGENTS.md Which is there to avoid confusion re "dev tasks" and "tasks the part of the product". This should definitely be sourced with `@docs/tasks.md` in the top-level AGENTS.md. We may also be able to take this opportunity to remove or simplify some of the `docs/tasks.md` files which exist in the sub project directories. 

## 10. `AGENTS.md`

Update global AGENTS.md to be better and accurate now the suite is almost done. Include pointer to `website/src/content/docs/` as a good place to read docs and descriptions of how all this stuff works. include mentions and links to many of the documents above, being extremely clear about when to look at these each of these documents. And also generally tweak rules/guidance etc.
