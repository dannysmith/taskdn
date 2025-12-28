# Task: Desktop App UI & Architecture Explaration

## UI Exploration

We'll use this branch to experiment with building good React UIs in the fastest way possible. All actual data values will be hard coded. Because the only goal here is working out what the UI should look and feel like. However, since AI will be building much of this, I need to be sure that it won't introduce weird things which are not actually going to be in the data for tasks, projects and areas. So the first thing we need to do is work out how do I set this up such that when I ask an AI agent to design something about a task, it always has a very clear idea of the mandatory fields for tasks, projects and areas, the optional fields for them and the types of things they are. This could just look like a big JSON file of test data, which we always load "data" in from. Or it could look like a temporary rule in CLAUDE.md. And but whatever it is, the least complicated thing possible is the idea here.

- [ ] Experiment with designs for Fundamental Components
  - These should bend up as general, reusable and composable wherever appropriate.
  - [ ] Task Card
  - [ ] Project Card
  - [ ] Area Card
  - [ ] New/Edit Task Card (a la things quick-add etc?)
  - [ ] Task ListItem
  - [ ] Project ListItem/Header
  - [ ] Area ListItem/Header
  - [ ] List
  - [ ] Card Grid
  - [ ] Kanban Board
  - [ ] Week View (a la Notion week Calendar)
  - [ ] Left Sidebar
  - [ ] Status Picker
  - [ ] Date Picker
- [ ] Build out the basic layouts with dummy info
- [ ] Experiment on interaction options

## Architecture Discussions

How will we handle state management for the files on disk such that it's responsive to the user, easy to work with and also performant. changes made in the UI need to be immediately reflected everywhere, and also on disk. Changes made on disk should update whatever store we use, which then should automatically update the UI. We'll need a mechanism for making the relationships between things easier to work with: Remember: A task can have one project. A project can have zero to many tasks. A project can have one area. An area can have zero to many projects. A task can have one "Directly assigned" Area. An area can have many "directly assigned tasks". A task can have one area "via its project". An area can have zero to many tasks "via it's projects". If a task has a directly assigned area which is different to the area to which its project belongs, we should prefer the directly assigned area when asking "what is this tasks area?" but itshould still be included when asking either area for its tasks" - This situation should rarely arise And when it does, it's basically user error. Ideally we would use tanstack query. We are going to need some sort of file watcher here, obviously. I wonder if a good approach would be to have an almost separate module of the system constantly watching the three directories for changes and then updating some internal state store. This could also load those things to begin with. We could conceivably do writes in a different way. And then the watcher would pick that up and update the UI. But that might not be performant.

### Looking at the CLI for inspiration

What parts of the Rust infrastructure in the CLI could we reuse? Is it worth extracting this into a shared Rust package? Or are the needs significantly different? The CLI deliberately uses different approaches for reading and writing, Which is fine there, because each command is

### Major Early Architectural Decisions

What other fundamental architectural decisions do we need to make when it comes to the interaction of the front end with the back end data? Let's hash out these now.
