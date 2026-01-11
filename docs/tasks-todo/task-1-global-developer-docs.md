# Tasks: Global Developer Docs

We should add and update a couple of high level global developer docs. These should include:

- [ ] Product Semantics and Visual Design
  - This is intended to make the various different apps consistent in the way they use colour, emoji, etcetera. 
  - [ ] Entities - Wording, Colour, Icons and Emoji for Areas/Projects and Tasks
  - [ ] Task Statuses - Wording, colour, emoji and descriptions of task statuses (including meta-statuses like "active")
  - [ ] Project Statuses - Wording, colour, emoji and descriptions of project statuses
  - [ ] Task fields - wording, emoji, icons and colour to use for fields like "defer-until" or "due" etc
  - [ ] Project fields - as above
  - [ ] Products  - official names, emoji, icons and colour for wach product.
  - [ ] the taskdn colour palette, design aesthetic and the icons in `images/`
- [ ] `products.md` - Succinct one-file overview of each major product in taskdn. Should provide name, emoji, short user-facing description, path to local folder, path to README.md **on github**, URL for docs site overview, path (in this repo) to docs directory and short 1-para "technical" explanation of that the codebase is and how it works. Meant for AI. 
- [ ] `principles.md` - Extract from `overview.md` and website. Intended to explain the core principles of this system as a whole. 
- [ ] `repo-architecture.md` - technical overview of the technologies used for each product, how the monorepo is set up and configured, etcetera.

## Other Updates to Global Setup

- [ ] Update `docs/README.md` to be a simple table which is an index of all docs in  `docs/` and `docs/developer` - one row per item. This is the only index and can men mentioned in CLAUDE.md etc to always have it loaded. 
- [ ] Remove `product-overviews/` entirely.
- [ ] Simplify `overview.md` – make this into a document which I can point AI at and it will get a full understanding of the entire suite both by reading this and being pointed at the correct places in the docs.
  - Include some background on goals/non-goals etc. This is the stuff that isn't on the public website or in any other internal doc.
  - `@mention` relevant overview docs in the website so they are directly loaded.
  - Mention `@./REAMDE.md` to it is always read as part of the overview (it's the index of docs.)
  - Include an index of docs and developer docs.
- [ ] update `docs/tasks.md` to include a note on task management within sub projects and also to differentiate the whole task task thing that we currently have in Claude.md.
- [ ] Update global CLAUDE.md to be better and accurate now the suite is almost done. Include pointer to `website/src/content/docs/` as a good place to read docs and descriptions of how all this stuff works. Generally tweak rules etc.
