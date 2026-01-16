# Task 3A: Bugfixes

Okay, I have some small fixes I want to make. Let's try and keep these changes as small as possible While doing what we need to make it work.

## Active Task is always in Rightsidebar

In the mockup we took this UI from we originally had the right sidebar only appear when the little chevron in a circle was clicked. Now it's entirely contained in our RightsideBar component, Which can be toggled to be visible and hidden with a keyboard shortcut and menubar item, should make it so that if a task is currently selected (in any kind of view: selected with the blue background in any taskList view; or equivilent in a kanban/calendar view), the right sidebar shows the currently selected task. In the CalendarView there is no concept of "selecting" items, so in this case the right sidebar should be updated to show a tasks details when its clicked on. We may have to do something similar for certain other Kanban or Calendar views?

If no task is selected, it should simply show the last task that was selected until a new one is selected. i.e. no change to current behavior.

This will probably require us to track the currently active task in the global UI state store? But perhaps not.

Once we have this functionality working, we can then go through and remove the little chevron blue chevron icons. But we should only do this once everything's working. those seven icons won't be needed because a user can just click on a task and then toggle the right sidebar open or closed and the task will have its details there.

## Small UI Changes

[Guided by the user]
