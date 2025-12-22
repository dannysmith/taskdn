# Roadmap and Approach

## General Development Principles

We will add any fundamental product development principles here as we decide upon them.

### Minimal by Default

We start with the simplest possible implementation and only add complexity when it provides clear value. This applies to both the file format (few required fields, sensible defaults) and the user interfaces (no bells and whistles unless they're actually necessary). Features earn their place by solving real problems, not by looking impressive.

## Historical Context

The original plan for implementing this went something like this:

- Produce single spec covering file formats and _some_ implementation details
- Implement a Rust SDK (now in `/archived-projects/taskdn-rust`) to be used in the Tauri app.
- Implement a TS SDK based on NAPI-RS Um essentially generating bindings from the rust app (now in `/archived-projects/taskdn-ts`).
- Publish both of these to npm and Cargo Package registries online.
- Begin work on the CLI, starting by spending a long time and a lot of effort really thinking through the best external interface for this CLI. The idea was that this would use the TypeScript SDK to do its stuff.
- When the CLI was done we'd work on the Tauri desktop app which would use the Rust SDK we already built and published.

However, having spent so much time looking at at the external interface for the CLI it became apparent that there were a lot of decisions which we hadn't made earlier on about how things should work. We solved a lot of these by designing an interface for the CLI, but it seems to me that many of these decisions should also be supported in the underlying SDKs. many of the decisions we've made here about how to interact with these various tasks Feel like they should form part of a general specification (will be S2) uh about how implementations should think about interacting with these things. Now this doesn't need to be anywhere near as detailed as the actual detail of the implementation for our CLI. But using some of that to write a I guess some kind of guidance for implementations that's general should also help us to make sure that we have at least some some some some some some some some some some some general kind of interface principles which we can apply to both the Rust SDK that we need to build and to the CLI. And of course do any other things we make in the future.

It was also the original plan to have most of the work done in this project be done in very separate sub project folders (originally taskdn-rust, taskdn-ts, taskdn-cli, taskdn-claude` taskdn-tauri, taskdn-obsidian-plugin etc). I was imagining work in the top level directory to really only be about planning and kinda high level stuff. Now we probably will end up working very much like that in the future once we have the basis of all of these apps built and working properly. But I was constantly finding the need when working in say the CLI subdirectory to refer out to other directories. And documentation in other places.

So Today I have done a huge reorganisation of this project. I've completely archived the SDKs that we built because I don't think it made sense to start with them and I'd like to rethink our whole approach to doing that. Although I do think it's important that we end up with a Rust SDK and probably a TypeScript one as well. There is some good stuff that we should extract from that. I've also removed all of the sub-projects And started referring to them as products. There are now only four in here. And they're all basically empty. Except for the specs one, which I've moved out of the docs directory, because effectively it is a product here. Um and that now lives in its own product folder. I've also reworked all of the documentation. I've removed the user guide, which was here, and I have tried to consolidate that into overview.md.

So I think our new approach here should be to finalise all three specifications. I've added a task for that. That will need to pull in information from some other places. Then we should extract any useful information from the archived projects, and I suspect most of that will be technical. And then we need to basically decide on an approach to how we should be building the CLI and SDK, etc. together. And then finally I've added a third task um to just do a little bit of clean up and rationalisation on everything that that we've got here. And that's all just um really finishing the work I've done manually so far today. And I'm hoping that will get us in a position where we can actually start building uh the CLI uh very quickly and sensibly.

I should also mention that there is another project which I found recently which is a different scope, but it has some very very very interesting approaches to effectively simplifying how A A A A A A A A A AI agents work with task files in Markdown. It uses GraphQL as a query language, and generally seems to have a good interface, external interface for working with markdown files like this. So the first part of the first task we're going to do next is reviewing that.

## Current Roadmap

[WILL COMPLETE LATER]
