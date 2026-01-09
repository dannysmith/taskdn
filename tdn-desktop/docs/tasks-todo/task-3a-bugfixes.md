# Task 3A: Bugfixes

After implementing Task 3 (UI Integration) we have a few bugfixes and tweaks to make:

- When a new task has been created with Cmd + N etc, it should be "selected" as well as having the title field focussed for etiting. This means that when enter is pressed to confirm that the title edit, the currently selected task is the new one. 
- When the currently selected task is any TaskListItem in a TaskList, Cmd + N should create a new task **immediatly below the selected one** - this just means setting it's order immediatly I think. And also, depending on the view it's in, it should be set up with the correct field values. ie if we're in a project list it should obviously have that project assigned. If we're in loose tasks in an Area page it should have the area assigned. If we're in "Scheduled for Today" in the Roday page it should have today set as the scheduled date. Etc.
- In the mockup we originally had the right sidebar only appear when the little chevron in a circle was clicked. Now it's entirely contained in our RightsideBar component, Which can be toggled to be visible and hidden with a keyboard shortcut, we should leave the Chevron functionality, but we should also make it so that if a task is currently selected (in any kind of view) The right sidebar shows the currently selected task. If no task is selected, it should simply show the last task that was selected, i.e. no change to current behavior. 
- 
