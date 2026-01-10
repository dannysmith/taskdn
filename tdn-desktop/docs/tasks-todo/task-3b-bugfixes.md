# Task 3A: Bugfixes

## Remove UI Mockup

- [ ] Add "visual design guidelines" doc to developer docs based on that in the mockup docs folder. We should generally not edit this too much at this stage. Maybe just copy it over and tweak if necessary.
- [ ] Remove UI mockup entirely (manual) and remove migration section from AGENTS.md

## Bugfixes

- [x] When a new task has been created with Cmd + N etc, it should be "selected" as well as having the title field focussed for etiting. This means that when enter is pressed to confirm that the title edit, the currently selected task is the new one.
- [x] Escape works for cancelling (ie deleting) newly created tasks.
- [ ] In the mockup we originally had the right sidebar only appear when the little chevron in a circle was clicked. Now it's entirely contained in our RightsideBar component, Which can be toggled to be visible and hidden with a keyboard shortcut, we should leave the Chevron functionality, but we should also make it so that if a task is currently selected (in any kind of view) The right sidebar shows the currently selected task. If no task is selected, it should simply show the last task that was selected, i.e. no change to current behavior.
- [ ] UI Cleaning - user directed
