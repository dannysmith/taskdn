# Task: Docs Update

Pre work: Move `tdn-desktop/docs/tasks-todo/task-7-command-registry.md` into developer docs, rnaming and generally cleaning up a little.

Having now implemented most of the UI and backend and having fully implemented tasks 6-10, Now feels like an appropriate time to update our developer documentation. Read `docs/developer/writing-docs.md` for some basic guidance. Then review all the docs in `developer/` using the checklist below. For those that probably don't need touching, you can just do a quick skim for anything that looks extremely um out of date and make any changes that I've suggested. And then for the individual docs, we probably need to go through these a little bit in a little bit more detail. So try to identify uh where we need to update them. You may need to explore the current code base a little bit. If necessary, work in phases making recommendations for changes to related sets of docs together. Remember these documents are intended both for humans to help them understand the patterns and best practices in this project, but they're also intended as reference for AI agents to help them better understand the why behind certain patterns and how they should be writing code. These are often provided to AI agents by the user as background context when working on new features.

# Phase 1

## Probably don't need touching

- [ ] bundle-optimization.md - No change
- [ ] external-apis.md - Not relevant in this application at the moment. However, we should keep this document but add a note to the top saying that we're not currently using this, it's just here to demonstrate a pattern. If we do need to make external calls.
- [ ] logging.md - Probably nothing needed here.
- [ ] notifications.md - Probably no change here.
- [ ] quick-pane.md - Do not change. We will update this once we have built our own quick pane.
- [ ] releases.md - No change
- [ ] static-analysis - No change
- [ ] writing-ast-grep-rules.md - No change
- [ ] writing-docs.md - No change

## Individual Docs

- [ ] command-system.md - Should already be fairly updated. Might be worth a quick pass.
- [ ] cross-platform.md - May need tweaking to remove outdated code examples and reference other docs.
- [ ] data-persistance.md - We'll definitely need updating to include details on how we do data persistents for the actual vault files. And may also need uh a little bit of updating to remove some stuff we don't need in here. Let's be careful not to remove stuff that we do want in the future though.
- [ ] error-handling.md - may need a small update.
- [ ] i18n-patterns.md - Uh can mostly stay as is. We should add a note to the top of this to say that internationalisation is not a priority for us at the moment. So it's permissible to have some parts of the application not fully internationalised. Uh we'll also need to possibly rework some of the examples and guidance on dealing with menus here. possibly make reference to the command system too.
- [ ] keyboard-shortcuts.md - This should also be mostly up to date, should cross-link heavily with the command system menus and so on. We should make sure this is accurate.
- [ ] menus.md - This will probably need heavily reworking to describe our approach to menus. In fact, it may well be that we are better off combining this with keyboard shortcuts and context menus and I I don't know. Be because now we have a unified command system, it may actually make sense to join these together. But having said that, I think it's valuable to have them as separate documents because it's a lot easier for humans and AI agents to find if there's a document called menus or keyboard shortcuts.
- [ ] rust-architecture.md - may need an update to include some of the patterns which we are using in Rust. I think this is probably fairly reflective of how things are. Uh but we should just check that all the code examples and patterns are actually representative of how we do things and want to do things.
- [ ] state-management.md - This is an important document. We should ensure that it is fully up to date with proper patterns for using TanStack query, zustand etc. We could perhaps include a few examples using kind of real stripped down code, i.e. real code from the code base, but strip back so it's a minimum e example of the pattern. if we are doing state management differently to this or significantly differently to this anywhere in the app, uh we should look at that because we either need to update this document or we need to update our code.
- [ ] tauri-commands.md - We should probably update the examples in here with something a bit more specific to the use case of this app. You know, maybe uh the example is adding code to I don't know, delete a task or something like that. Um we should obviously also check that this is accurate.
- [ ] tauri-plugins.md - Um this is straight out of the template. We can probably strip some of this out. We should make sure that we've got an accurate list of the plugins we've currently got installed, along with what they do and the patterns needed for them.
- [ ] testing.md - This will almost certainly need updating to provide good examples of how we're doing testing and the different types of tests we have. Should also include notes on the dummy demo vault for manual testing and also on the fixtures vault in this project for some of the automated testing.
- [ ] ui-design-guidelines.md and ui-patterns.md - The UI design guidelines was originally intended to be uh more a reference for the kinds of colours to use for things and their semantic meanings and so on. Um, and also some of the kind of patterns that we expect to use in a more general sense, whereas the UI patterns originally came in from a template and that basically just has a bunch of stuff in it to help make AI agents better at um working with CSS and Tailwind and Shadien in this kind of project. We could maybe consider merging them or perhaps even splitting them down but in a different way. Uh I need to think about this one together probably. Obviously, this should also include some basic information about how we do light and dark mode and the kind of UI patterns that we have here.

# Phase 2

## Overview/pointer docs

- [ ] architecture-guide.md - update this so that it includes the most crucial and important patterns uh from the other docs but in shortened format liberally cross link to other docs. This is regularly referenced by AI agents to check their own work.
- [ ] AGENTS.md - We haven't updated this for a long time. Let's make sure that it's correct in terms of the structure in the file tree. And the absolutely crucial patterns should go in here very briefly with a link to the way to find the docs, so we should obviously have suitable links so that our agents can discover what they need. Don't make this long and ensure you don't add a load of nonsense AI checklists to it. But also it needs to be helpful for the agent.

## Finish up and Housekeeping

- [ ] Final review of all developer docs for inconsistencies. Also check cross-linking is present where appropriate.
- [ ] Update the index in `docs/developer/README.md` to be accurate.
- [ ] Check all other docs in `tdn-desktop` (including claude commands, agents etc) for any stale references to our developer documentation.
- [ ] Update tdn-desktop/README.md appropriately now we have a functioning app - keep it short and succinct, remember this is part of a larger monorepo.
