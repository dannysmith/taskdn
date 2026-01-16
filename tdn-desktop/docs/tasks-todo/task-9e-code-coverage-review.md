# Task: Code Coverage

Read `docs/developer/testing.md` and fully review this codebase for test coverage both in terms of Rust tests and TS/React. Make recommendations for meaningful improvements to test coverage.

Also review the current test suites for any useless or extremely low value tests, Especially when those tests are higher level, i.e. integration or e2e And are expensive to run. review the current test suite for any improvements we could make to its structure or how it reports or the kinds of stuff it's testing.

And then having done both of these come up with recommendations for improving the test suite overall. Remember that the entire goal of testing is to prevent bugs and assist both humans and AI agents in understanding when they have broken something through refactoring or adding new features. The tests should also be helpful in helping humans and AI agents understand the behaviour of this application and how parts of it are supposed to work. Remember that we are in a Tauri desktop app.
