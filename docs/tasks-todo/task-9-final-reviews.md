# Task: Final Reviews

## Full Reviews

the output of each review should write a full and detailed analysis document to disk. These documents can then be assessed for recommendations to change. The focus should be on fundamental problems or issues and things that we can generally improve to make this a more robust and higher quality code base. Each review should be conducted and then theoutput doc reviewed in a new session. Changes from one review should be implemented in full before running the next review.

- [ ] Feature conformity with S1 and S2 specs
- [ ] Performance issues
- [ ] "Clean Code"
- [ ] Error handling
- [ ] Test Coverage
- [ ] Security Review
- [ ] Rust Refactoring in preparation for extracting the Rust SDK (maybe including NAPI TS Bindings so we get a TS API for free?) into a package which can be used in the Tauri app (and eventually published)

## Documentation

### 1. Developer documentation

Review and update all developer documentation so it is accurate, consistent, and effective for AI Agents to use. This will likely require the creation of a number of new developer documents Describing the "why" of non-obvious patterns and the rules associated with them.

### 2. Code Comments

Review the entire code base for opportunities to improve commenting, With a particular focus on helping AI agents understand non obvious patterns and parts of the code base. We should also remove any useless comments which were added during development.
