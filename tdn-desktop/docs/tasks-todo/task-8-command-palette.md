# Task: Command Palette


## Global Commands

This is about ensuring that the global commands available in the command palette are appropriate and correctly wired up. There is a test one we should remove But all the others actually look sensible at the moment. I feel like we should add some global "navigation" commands:

- Today (Cmd 1)
- This Week (Cmd 2)
- Inbox (Cmd 3)
- Calendar (Cmd 4)
- NoArea (No keyboard shortcut)

I also feel like we should have commands to open each active Area and Project in a similar way. This should exclude any areas with status "archived" and any projects which are done or dropped?

We might also want:

- Collapse all areas (in sidebar)
- Expand all areas (in sidebar)

I can't think of any other global commands that we want at this point. 

## Contextual Commands

When in an area view we should see commands to open the Area file, copy the file path and open in Obsidian. Likewise for projects. When a task is selected we should see similar for the task. These are probably going to be very similar to the context menu commands.
