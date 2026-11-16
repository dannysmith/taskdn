---
title: Refactor authentication module
status: ready
created-at: 2026-01-11
updated-at: 2026-01-12
projects:
  - "[[Side Hustle App]]"
---

The auth code has gotten messy. Need to clean it up before adding OAuth support.

## Technical debt to address

- Separate concerns (token management vs session handling)
- Add proper error types
- Write tests for edge cases
- Document the auth flow
