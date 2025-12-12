---
title: Set up CI/CD pipeline
status: done
created-at: 2024-11-05
updated-at: 2024-11-15
completed-at: 2024-11-15
projects:
  - "[[API Migration]]"
area: "[[TechStart]]"
---

## Completed

GitHub Actions workflow for the new Go API:

- Linting (golangci-lint)
- Unit tests
- Integration tests (with test containers)
- Build and push Docker image
- Deploy to staging on merge to main

Workflow file: `.github/workflows/ci.yml`
