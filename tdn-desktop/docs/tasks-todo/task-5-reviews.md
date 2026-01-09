# Task: Reviews & Cleanup

## Remove UI Mockup

- [ ] Review the whole mockup codebase looking for any functionality we've missed or behaves fundamentally differently to how we have it. I think we've got everything. But I want you to do one full check. Don't actually implement anything, just give me a report if there's anything we have missed.
- [ ] Add "visual design guidelines" doc to developer docs based on that in the mockup docs folder. We should generally not edit this too much at this stage. Maybe just copy it over and tweak if necessary.
- [ ] Remove UI mockup entirely (manual) and remove migration section from AGENTS.md

## Initial Quick Reviews

- [ ] Review Zustand stores - are they all sensible? Is the separation logical and sensible?
- [ ] Keyboard shortcuts - ensure this is handled in a predictable, sensible way And that we have one authoritative pattern for doing this Uh it's okay if we do end up with two patterns actually. Let's just make sure that it's all very sensible and we know exactly how and when to add keyboard shortcuts in the future, etcetera.

## Full Review of codebase

- [ ] Conduct a full review of the current React codebase. What issues do we find which we should fix now? I'm thinking about any general restructuring of files, renaming of files and components, any major performance issues we've got, any major bugs, any unused code, and any leftovers from the mock up stuff, which we don't need in the production app. Make a full report recommending any changes. If there are no changes. We'll do that later.
- [ ] Review codebase for improvements to Error Handling and logging

## Update Developer Documentation

- [ ] Developer docs updates. We should review and update all developer docs. Some may be able to be removed. Some need slight updates and tweaks. And we may need to add one or two additional developer documents at this stage to describe some of the core patterns that we now have in the app.
