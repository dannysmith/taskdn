---
title: API Migration
unique-id: techstart-api-v2
status: in-progress
area: "[[TechStart]]"
start-date: 2024-11-01
end-date: 2025-02-28
description: Migrate legacy REST API to new Go-based service with improved performance.
---

## Overview

TechStart's current API is a Node.js monolith with performance issues. We're rebuilding it in Go with a cleaner architecture.

## Milestones

1. ✅ Architecture design and approval
2. ✅ Core endpoints (users, auth)
3. 🔄 Business logic endpoints (in progress)
4. ⬜ Data migration scripts
5. ⬜ Performance testing
6. ⬜ Gradual rollout

## Technical Notes

- Using Chi router
- PostgreSQL with pgx driver
- Auth0 integration for authentication
- OpenAPI spec for documentation
