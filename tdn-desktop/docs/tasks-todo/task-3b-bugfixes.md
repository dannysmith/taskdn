# Task 3A: Bugfixes

After implementing Task 3 (UI Integration) we have a few bugfixes and tweaks to make:

- [x] When a new task has been created with Cmd + N etc, it should be "selected" as well as having the title field focussed for etiting. This means that when enter is pressed to confirm that the title edit, the currently selected task is the new one.
- [x] Escape works for cancelling (ie deleting) newly created tasks.
- [ ] Cmd + N tasks (see seperate task doc)
- [ ] In the mockup we originally had the right sidebar only appear when the little chevron in a circle was clicked. Now it's entirely contained in our RightsideBar component, Which can be toggled to be visible and hidden with a keyboard shortcut, we should leave the Chevron functionality, but we should also make it so that if a task is currently selected (in any kind of view) The right sidebar shows the currently selected task. If no task is selected, it should simply show the last task that was selected, i.e. no change to current behavior.
- [ ] UI Cleaning - user directed

## Reviews & Cleanup

- [ ] Review the whole mockup codebase looking for any functionality we've missed or behaves fundamentally differently to how we have it. I think we've got everything. But I want you to do one full check. Don't actually implement anything, just give me a report if there's anything we have missed.
- [ ] Add "visual design guidelines" doc to developer docs based on that in the mockup docs folder. We should generally not edit this too much at this stage. Maybe just copy it over and tweak if necessary.
- [ ] Remove UI mockup entirely (manual) and remove migration section from AGENTS.md
- [ ] Review Zustand stores - are they all sensible? Is the separation logical and sensible? etc
- [ ] Disk persistance for some zustand state (order, headings in todayview And anything else that's appropriate to persist the disk.) This should be persistd all when the app is closed. And I guess also periodically. And then it should probably be loaded when the app is opened. Now this obviously isn't gonna be persisted to the actual vault files on disk. It's gonna be stored in the application data directory. See the developer doc on data persistance for some possible guidance. Uh we need to make sure when we are reading this that we deal well with stale data. So it's likely, for instance, that the state of the project's task and areas on disc has changed since the app was last open and the actual state on disc should obviously be the the authoritative truth but we should be intelligent about how we do this where we can. This one needs some proper thinking.
- [ ] Keyboard shortcuts - ensure this is handled in a predictable, sensible way And that we have one authoritative pattern for doing this Uh it's okay if we do end up with two patterns actually. Let's just make sure that it's all very sensible and we know exactly how and when to add keyboard shortcuts in the future, etcetera.

## Prep for Hardening Task

- [ ] Conduct a full review of the current React codebase. What issues do we find which we should fix now? I'm thinking about any general restructuring of files, renaming of files and components, any major performance issues we've got, any major bugs, any unused code, and any leftovers from the mock up stuff, which we don't need in the production app. Make a full report recommending any changes. If there are no changes. We'll do that later.
- [ ] Review hardening doc and completely replan. Main focus should be tests and test coverage, Error handling where necessary, suitable logging where necessary and performance improvements. we should incorporate into this any important outputs of the previous reviews. It should also include a task to update the developer documents:
  - Developer docs updates. We should review and update all developer docs. Some may be able to be removed. Some need slight updates and tweaks. And we may need to add one or two additional developer documents at this stage to describe some of the core patterns that we now have in the app.
