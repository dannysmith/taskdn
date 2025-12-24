---
title: Implement user filtering for dashboard
status: in-progress
created-at: 2025-01-10
updated-at: 2025-01-21
projects:
  - "[[Acme Dashboard Redesign]]"
due: 2025-01-24
---

Add ability to filter dashboard data by user. This is a key feature request from the operations team. [[Sarah Chen]] flagged this as high priority in last week's sync.

## Requirements

- Filter by individual user
- Filter by user role
- Filter by department
- Filters should persist in URL for shareability

## Progress

- [x] Design filter UI component
- [x] Add filter state management
- [ ] Implement API endpoint for filtered data
- [ ] Connect UI to API
- [ ] Testing

## Technical Notes

Using TanStack Query for data fetching. Need to add query params to the existing dashboard query.

The API team said they can have the endpoint ready by Wednesday. See [[2025-01-16 Acme Sync]] for details.
