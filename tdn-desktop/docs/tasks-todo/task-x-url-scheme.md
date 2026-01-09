# Task: URL Scheme

https://github.com/dannysmith/taskdn/issues/19

The app supports a `taskdn://` local URL scheme for opening tasks, projects, and areas in the desktop app. The scheme should also include special URLs for commonly-accessed views (e.g., "today", "new task", "calendar"). Exact URLs to be determined by the final app design.

We should try to follow similar conventions to those used in Obsidian and Things:

- https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
- https://culturedcode.com/things/support/articles/2803573/

And we should also try to follow similar conventions to the CLI commands.

## Open

The obsidian plugin is configured to use "taskdn://open?path=<url encoded absolute path to  file>" which is the same structure and names as Obsidian's URL scheme and also matches how our CLI works. We haven't yet made any d other decisions about the structure of this scheme.

If the path provided points at a valid task file, we should open the desktop app and select the task. If the task is a loose task, it should open the no area view and select the task. Which should also open the right task editing panel. If the task belongs to an area but not a project, we should open the area view and select the task in a similar way. If the task belongs to a project, we should open the project view and select the task in a similar way. The one exception to this is if the status is inbox, in which case the inbox view should be opened and it's selected. 

If the path provided points to a valid project file, we should simply open the project view. If the path points to a valid area file, we should open the area view. 

We should also support `taskdn://open?view={view}` for views not attached to entities: today, this week, inbox, calendar, No Area. This should simply open the relevant view in the app. 

## New
We should also support creating new tasks via `taskdn://new?title={title}` . The parameters here should be all of the relevant fields which are available to edit in the app on a task: title, due, defer-until, scheduled, project, area, status, body. The area and project should just be strings representing the area/project title. any invalid area project status or schedule date or defer date or anything should simply be ignored and not set. Even title should be optional. The way this should behave is that it should create the task and then effectively open it in exactly the same way as the open command does. So if only a title was provided It will create an inbox task. And so it should show the inbox view. If we provided a area, then the area view should be opened, and that task selected. If we provided a status and a title only, and that status was anything other than inbox, then the no area view should be opened. Basically, this should should create a new task and open it for editing in the sidebar pane. Unlike the open command, it should Focus the task title field in the sidebar. 

## Other commands

We do not need any other commands besides these because for the moment because the CLI can handle all sorts of other creation and basically every other task. 
